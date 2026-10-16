/**
 * Ingest the VGCPastes Repository into a seedable team catalogue.
 *
 *   node scripts/vgcpastes/ingest.mjs            # Champions M-B (the default)
 *   node scripts/vgcpastes/ingest.mjs --limit 20 # a quick smoke run
 *
 * Source: the public "VGCPastes Repository" Google Sheet, read through the
 * gviz CSV endpoint (no API key, no auth). Each row gives a team's metadata and
 * a pokepast.es link but NOT the export, so every paste is fetched once from
 * `pokepast.es/<id>/json` — that endpoint also reports the paste's own format
 * string, which is more trustworthy than inferring the regulation from the tab.
 *
 * Three properties this script is built around:
 * - **Resumable.** Every paste is cached as its own file under `data/pastes/`,
 *   so a re-run only fetches what's missing and an interrupted run costs
 *   nothing. Delete a file to refetch it.
 * - **Polite.** Small fixed concurrency plus a delay between requests, with
 *   backoff on failure. ~700 requests is nothing to a CDN, but we're a guest.
 * - **Honest about losses.** Dead pastes and unparseable exports are counted
 *   and listed at the end rather than quietly dropped.
 *
 * Output (all gitignored — the database is the artifact, this is just the way
 * there, and the script is re-runnable):
 *   data/community-teams.ndjson   one record per team, for inspection
 *   data/seed-community-teams.sql idempotent upsert; apply with seed.mjs
 *
 * The parsed species list comes from the repo's own `importTeamText`, so the
 * catalogue's idea of a team matches the app's exactly. Export text is stored
 * verbatim (the round-trip rule); nothing here validates legality.
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { importTeamText } from "../../lib/team/import.ts";
import { matchSpecies, rosterCode } from "../../lib/match/roster.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "data");
const PASTES = join(DATA, "pastes");

const SHEET_ID = "1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw";

/**
 * The app's closed list, imported rather than restated. Every regulation this
 * script can write has to be one the app can also ask for — `catalogue.ts`
 * filters `.eq("regulation", …)` on exactly these strings, so a row written
 * under a label the app doesn't list is a row nothing will ever find.
 */
const { FORMATS } = await import("../../app/demo/formats.ts");

/**
 * The tabs to ingest, newest regulation first. `featured` tabs are strict
 * subsets of their main tab (checked: all 184 M-B featured IDs and paste URLs
 * appear in the main tab), so they contribute a flag and the archetype
 * `Category`, never extra rows. A regulation without one simply omits
 * `featuredGid` — M-C has no Featured tab yet.
 *
 * Adding a regulation is adding an entry here. The two not listed are
 * "Champions M-A" (gid 791705272, featured 417374305) and "SV Regulation I"
 * (gid 972834435, featured 1863148622).
 *
 * Use `--only <label>` to ingest one of these on its own; that is the normal
 * shape of a regulation rotation, and it leaves the other regulations' rows in
 * the database exactly as they are (the seed upserts, it never deletes).
 */
const TABS = [
  {
    gid: "2001945654",
    label: "Champions M-C",
    /** Fallback when a paste doesn't declare its own format. */
    regulation: "[Gen 9 Champions] VGC 2026 Reg M-C",
  },
  {
    gid: "1458357160",
    label: "Champions M-B",
    regulation: "[Gen 9 Champions] VGC 2026 Reg M-B",
    featuredGid: "1774271567",
  },
];

/**
 * Paste format strings → the app's closed FORMATS list (app/demo/components).
 * Every Showdown regulation ships a Bo3 variant with its own id, and a paste
 * saved from that ladder declares it, so each regulation needs both ids — a
 * missing one silently falls back to the tab's regulation, which is only right
 * by luck when the paste happens to sit on its own tab.
 */
const FORMAT_BY_ID = {
  gen9championsvgc2026regmc: "[Gen 9 Champions] VGC 2026 Reg M-C",
  gen9championsvgc2026regmcbo3: "[Gen 9 Champions] VGC 2026 Reg M-C",
  gen9championsvgc2026regmb: "[Gen 9 Champions] VGC 2026 Reg M-B",
  gen9championsvgc2026regmbbo3: "[Gen 9 Champions] VGC 2026 Reg M-B",
  gen9championsvgc2026regma: "[Gen 9 Champions] VGC 2026 Reg M-A",
  gen9championsvgc2026regmabo3: "[Gen 9 Champions] VGC 2026 Reg M-A",
  gen9vgc2025regi: "[Gen 9] SV VGC Reg I",
  gen9vgc2025regibo3: "[Gen 9] SV VGC Reg I",
};

// Checked at startup rather than trusted: both tables above are hand-written
// against Showdown's format names, and a typo in one produces rows the app can
// never query — silently, months later, as an empty catalogue lookup.
for (const [where, label] of [
  ...Object.entries(FORMAT_BY_ID).map(([id, l]) => [`FORMAT_BY_ID.${id}`, l]),
  ...TABS.map((t) => [`TABS "${t.label}"`, t.regulation]),
]) {
  if (!FORMATS.includes(label)) {
    console.error(
      `${where} maps to "${label}", which is not in the app's FORMATS ` +
        `(app/demo/formats.ts). Add it there first.`,
    );
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const LIMIT = Number(flag("limit", "0")) || 0;
const CONCURRENCY = Number(flag("concurrency", "4"));
const DELAY_MS = Number(flag("delay", "120"));

/**
 * `--only "Champions M-C"` ingests that tab alone. A scoped run writes to its
 * own suffixed files rather than overwriting the full-corpus ones, because the
 * NDJSON beside the seed is the readable record of what a previous ingest
 * published — silently replacing a 712-team record with a 68-team one would
 * lose it. The seed upserts on `paste_url`, so applying a scoped seed adds and
 * refreshes only its own rows and leaves every other regulation untouched.
 */
const ONLY = flag("only", "");
const SELECTED = ONLY
  ? TABS.filter((t) => t.label.toLowerCase() === ONLY.toLowerCase())
  : TABS;
if (ONLY && SELECTED.length === 0) {
  console.error(
    `--only "${ONLY}" matches no tab. Known: ${TABS.map((t) => t.label).join(", ")}`,
  );
  process.exit(1);
}
/** A scoped run gets its own filenames; a full run keeps the canonical ones. */
const SUFFIX = ONLY
  ? `.${SELECTED[0].label.toLowerCase().replace(/\s+/g, "-")}`
  : "";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * CSV reader: quoted fields, doubled quotes, and newlines inside cells — the
 * sheet has all three (a "Replica Code" header spans two lines).
 */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function fetchTab(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const cache = join(DATA, `tab-${gid}.csv`);
  if (existsSync(cache) && !args.includes("--refresh-sheet")) {
    return parseCSV(await readFile(cache, "utf8"));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sheet tab ${gid}: HTTP ${res.status}`);
  const text = await res.text();
  await writeFile(cache, text);
  return parseCSV(text);
}

/**
 * Columns are located by header name, never by index: the main and Featured
 * tabs put Pokepaste in different columns (24 vs 25) and the header sits on the
 * third row, under two rows of banner text.
 */
function tableOf(rows) {
  const headerIdx = rows.findIndex((r) => (r[0] ?? "").trim() === "Team ID");
  if (headerIdx < 0) throw new Error("no 'Team ID' header row found");
  const header = rows[headerIdx].map((h) => h.trim());
  const col = (name) => header.findIndex((h) => h === name);
  const at = (row, name) => {
    const i = col(name);
    return i < 0 ? "" : (row[i] ?? "").trim();
  };
  const data = rows.slice(headerIdx + 1).filter((r) => (r[0] ?? "").trim());
  return { header, col, at, data };
}

const PASTE_RE = /^https?:\/\/pokepast\.es\/(\w+)\/?$/;
const clean = (v) => (v && v !== "-" ? v : "");

/** One sheet row → the fields we keep, or null when there's no usable paste. */
function rowRecord(t, row, tab) {
  const pasteUrl = t.at(row, "Pokepaste");
  const match = PASTE_RE.exec(pasteUrl);
  if (!match) return null;
  return {
    pasteId: match[1],
    source_team_id: t.at(row, "Team ID"),
    paste_url: `https://pokepast.es/${match[1]}`,
    regulation: tab.regulation,
    name: clean(t.at(row, "Team Description")),
    author: clean(t.at(row, "Full Name")),
    owner: clean(t.at(row, "Owner")),
    event: clean(t.at(row, "Tournament / Event")),
    event_rank: clean(t.at(row, "Rank")),
    source_link: clean(t.at(row, "Link to Source")),
    has_evs: t.at(row, "EVs").toLowerCase() === "yes",
    featured: false,
    category: "",
  };
}

async function readSheet() {
  const byPaste = new Map();
  for (const tab of SELECTED) {
    const t = tableOf(await fetchTab(tab.gid));
    for (const row of t.data) {
      const rec = rowRecord(t, row, tab);
      if (rec && !byPaste.has(rec.paste_url)) byPaste.set(rec.paste_url, rec);
    }
    console.log(`${tab.label}: ${t.data.length} rows`);

    if (!tab.featuredGid) continue;
    const f = tableOf(await fetchTab(tab.featuredGid));
    let flagged = 0;
    for (const row of f.data) {
      const rec = rowRecord(f, row, tab);
      const existing = rec && byPaste.get(rec.paste_url);
      if (!existing) continue;
      existing.featured = true;
      existing.category = clean(f.at(row, "Category"));
      flagged++;
    }
    console.log(
      `${tab.label} featured: ${f.data.length} rows, ${flagged} matched`,
    );
  }
  return [...byPaste.values()];
}

/** Fetches one paste, cached per id so re-runs and interruptions are cheap. */
async function fetchPaste(pasteId) {
  const file = join(PASTES, `${pasteId}.json`);
  if (existsSync(file)) return JSON.parse(await readFile(file, "utf8"));
  let lastError = "unknown";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://pokepast.es/${pasteId}/json`);
      if (res.status === 404) {
        const gone = { pasteId, error: "404 — paste is gone" };
        await writeFile(file, JSON.stringify(gone));
        return gone;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const record = {
        pasteId,
        paste: body.paste ?? "",
        pasteAuthor: body.author ?? "",
        notes: body.notes ?? "",
      };
      await writeFile(file, JSON.stringify(record));
      return record;
    } catch (err) {
      lastError = String(err.message ?? err);
      await sleep(500 * (attempt + 1) ** 2);
    }
  }
  return { pasteId, error: lastError };
}

/** Fixed-size worker pool — bounded concurrency, with a gap between requests. */
async function fetchAll(records) {
  let done = 0;
  let queue = 0;
  const results = new Map();
  const worker = async () => {
    while (queue < records.length) {
      const rec = records[queue++];
      results.set(rec.pasteId, await fetchPaste(rec.pasteId));
      done++;
      if (done % 50 === 0 || done === records.length) {
        console.log(`  fetched ${done}/${records.length}`);
      }
      await sleep(DELAY_MS);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, records.length) }, worker),
  );
  return results;
}

/** "Format: gen9championsvgc2026regmb" → the app's format label, if known. */
function regulationFrom(notes, fallback) {
  const match = /format:\s*([a-z0-9]+)/i.exec(notes ?? "");
  return (match && FORMAT_BY_ID[match[1].toLowerCase()]) || fallback;
}

const COLUMNS = [
  "source_team_id",
  "paste_url",
  "regulation",
  "name",
  "author",
  "owner",
  "species",
  "match_species",
  "roster_code",
  "export_text",
  "featured",
  "category",
  "event",
  "event_rank",
  "source_link",
  "has_evs",
];

/**
 * One statement, one dollar-quoted JSON payload: `jsonb_to_recordset` turns it
 * into rows, so there's no per-value quoting to get wrong. `species` rides as
 * jsonb and is converted in the select rather than relying on a jsonb→text[]
 * coercion. Upsert on `paste_url`, so re-running is safe and refreshes.
 */
function toSql(records, seedName) {
  // Minified: this payload is read by Postgres, never by a person (the NDJSON
  // beside it is the human-readable copy), and pretty-printing it cost ~30%.
  const json = JSON.stringify(records);
  const TAG = "$xatu_seed$";
  if (json.includes(TAG)) throw new Error("payload collides with the SQL tag");
  const cols = COLUMNS.join(", ");
  const selects = COLUMNS.map((c) =>
    c === "species" || c === "match_species"
      ? `array(select jsonb_array_elements_text(t.${c}))`
      : `t.${c}`,
  ).join(", ");
  const types = COLUMNS.map((c) => {
    if (c === "species" || c === "match_species") return `${c} jsonb`;
    if (c === "featured" || c === "has_evs") return `${c} boolean`;
    return `${c} text`;
  }).join(", ");
  const updates = COLUMNS.filter((c) => c !== "paste_url")
    .map((c) => `${c} = excluded.${c}`)
    .join(",\n    ");
  return `-- Generated by scripts/vgcpastes/ingest.mjs — do not hand-edit.
-- ${records.length} teams from the VGCPastes Repository.
-- Run: node scripts/vgcpastes/seed.mjs --file ${seedName}
-- Requires supabase/community-teams.sql to have been applied first.
begin;

insert into public.community_teams (${cols})
select ${selects}
from jsonb_to_recordset(${TAG}${json}${TAG}::jsonb) as t(${types})
on conflict (paste_url) do update set
    ${updates},
    fetched_at = now();

commit;
`;
}

async function main() {
  await mkdir(PASTES, { recursive: true });

  const sheet = await readSheet();
  const wanted = LIMIT ? sheet.slice(0, LIMIT) : sheet;
  console.log(
    `\n${sheet.length} teams with a pokepaste link${LIMIT ? ` (limited to ${wanted.length})` : ""}`,
  );
  const cached = (await readdir(PASTES)).length;
  console.log(`${cached} pastes already cached; fetching the rest…`);

  const pastes = await fetchAll(wanted);

  const out = [];
  const failed = [];
  const unparseable = [];
  for (const rec of wanted) {
    const paste = pastes.get(rec.pasteId);
    if (!paste || paste.error) {
      failed.push(`${rec.source_team_id} ${rec.paste_url} — ${paste?.error}`);
      continue;
    }
    const parsed = importTeamText(paste.paste);
    if (!parsed || parsed.parsed.length === 0) {
      unparseable.push(`${rec.source_team_id} ${rec.paste_url}`);
      continue;
    }
    // `pasteId` is the cache key, not a column — destructured off so it
    // cannot reach the seed. Named with a leading underscore so eslint knows
    // the discard is the point.
    const { pasteId: _pasteId, ...fields } = rec;
    out.push({
      ...fields,
      // The paste's own format wins; the tab is only a fallback.
      regulation: regulationFrom(paste.notes, rec.regulation),
      species: parsed.parsed.map((m) => m.species),
      // Identity + overlap keys, from lib/match/roster — never recomputed here.
      match_species: matchSpecies(parsed.parsed.map((m) => m.species)),
      roster_code: rosterCode(parsed.parsed.map((m) => m.species)),
      // Verbatim, exactly as the paste serves it — this must round-trip.
      export_text: parsed.exportText,
    });
  }

  const ndjson = `community-teams${SUFFIX}.ndjson`;
  const seed = `seed-community-teams${SUFFIX}.sql`;
  await writeFile(
    join(DATA, ndjson),
    out.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );
  await writeFile(join(DATA, seed), toSql(out, seed));

  console.log(`\nkept ${out.length} teams`);
  const byReg = {};
  for (const r of out) byReg[r.regulation] = (byReg[r.regulation] ?? 0) + 1;
  for (const [reg, n] of Object.entries(byReg)) console.log(`  ${n}  ${reg}`);
  console.log(`  ${out.filter((r) => r.featured).length} featured`);
  console.log(
    `  ${out.filter((r) => r.species.length !== 6).length} not six Pokémon`,
  );
  if (failed.length) {
    console.log(`\n${failed.length} pastes could not be fetched:`);
    for (const line of failed.slice(0, 20)) console.log(`  ${line}`);
    if (failed.length > 20) console.log(`  …and ${failed.length - 20} more`);
  }
  if (unparseable.length) {
    console.log(`\n${unparseable.length} exports did not parse as a team:`);
    for (const line of unparseable.slice(0, 20)) console.log(`  ${line}`);
  }
  console.log(`\nwrote data/${ndjson} and data/${seed}`);
  if (SUFFIX) {
    console.log(
      `apply it with: node scripts/vgcpastes/seed.mjs --file ${seed}`,
    );
  }
}

await main();
