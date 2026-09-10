/**
 * Apply the generated catalogue seed to a Supabase database.
 *
 *   node scripts/vgcpastes/seed.mjs           # uses SUPABASE_CONNECT_STRING
 *   node scripts/vgcpastes/seed.mjs --check   # report the row counts, change nothing
 *   node scripts/vgcpastes/seed.mjs --file seed-community-teams.champions-m-c.sql
 *                                             # apply one regulation's scoped seed
 *
 * WHY THIS EXISTS INSTEAD OF A MIGRATION: the table's DDL is a migration
 * (`supabase/migrations/*_community_teams.sql`) and `supabase db push` applies it
 * fine. The 712-row seed was tried the same way and **the CLI failed to apply
 * it** — the insert is a single ~1.3MB statement carrying a dollar-quoted JSON
 * payload, and pushing it errored without recording anything in the migration
 * history. Sent as one query over a normal Postgres connection it applies in
 * about a second. So: schema through the CLI, data through here.
 *
 * The seed is one `insert … on conflict (paste_url) do update`, so running this
 * again refreshes existing rows and adds new ones rather than duplicating —
 * which is also how a re-ingest is published.
 *
 * Reads the connection string from `SUPABASE_CONNECT_STRING` in the environment
 * or in `.env.local` (gitignored). Nothing here uses the service-role key: this
 * is the database owner connecting directly, out of band from the app, exactly
 * as intended for a table the anon key deliberately cannot write.
 */

import dns from "node:dns/promises";
import { readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
/**
 * Which seed to apply. `ingest.mjs --only <tab>` writes a suffixed file so a
 * regulation rotation publishes just that regulation; the upsert means applying
 * it adds and refreshes only its own rows and leaves the others alone.
 */
const seedArg = (() => {
  const i = process.argv.indexOf("--file");
  return i >= 0 ? process.argv[i + 1] : "seed-community-teams.sql";
})();
const SEED = join(HERE, "data", seedArg);

function connectionString() {
  if (process.env.SUPABASE_CONNECT_STRING) {
    return process.env.SUPABASE_CONNECT_STRING;
  }
  let env = "";
  try {
    env = readFileSync(join(REPO, ".env.local"), "utf8");
  } catch {
    throw new Error("no SUPABASE_CONNECT_STRING and no .env.local to read it from");
  }
  const match = /^SUPABASE_CONNECT_STRING\s*=\s*(.*)$/m.exec(env);
  if (!match) throw new Error("SUPABASE_CONNECT_STRING is not set in .env.local");
  return match[1].trim().replace(/^["']|["']$/g, "");
}

/** Host only — never log the credentials themselves. */
function redact(url) {
  const u = new URL(url);
  return `${u.username}@${u.host}${u.pathname}`;
}

/**
 * Turn the one failure this script actually hits into an explanation.
 *
 * Supabase's direct database host, `db.<ref>.supabase.co`, is **IPv6-only** —
 * IPv4 there is a paid add-on. On a machine with no global IPv6 address,
 * getaddrinfo suppresses the AAAA (AI_ADDRCONFIG) and `pg` fails with a bare
 * `ENOTFOUND`, which reads exactly like a dead project and isn't one. The fix
 * is the Session Pooler, which is dual-stack.
 */
async function explainHostOrThrow(target) {
  const host = new URL(target).hostname;
  const [v4, v6] = await Promise.all([
    dns.resolve4(host).catch(() => []),
    dns.resolve6(host).catch(() => []),
  ]);
  if (v4.length > 0) return; // reachable the ordinary way
  const hasIPv6 = Object.values(networkInterfaces())
    .flat()
    .some(
      (n) =>
        n &&
        n.family === "IPv6" &&
        !n.internal &&
        !n.address.startsWith("fe80"),
    );
  if (v6.length > 0 && !hasIPv6) {
    console.error(
      `\n${host} has only an IPv6 address, and this machine has no IPv6 route.\n` +
        `That is Supabase's direct connection, which dropped IPv4 — it is not a\n` +
        `paused or missing project.\n\n` +
        `Use the Session Pooler instead (dual-stack). Dashboard → Project Settings\n` +
        `→ Database → Connection string → "Session pooler". It looks like:\n` +
        `  postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres\n` +
        `Put that in SUPABASE_CONNECT_STRING in .env.local and re-run.\n`,
    );
    process.exit(1);
  }
  if (v6.length === 0) {
    console.error(
      `\n${host} does not resolve at all — the project is probably paused or\n` +
        `deleted. Check the Supabase dashboard.\n`,
    );
    process.exit(1);
  }
}

const url = connectionString();
const checkOnly = process.argv.includes("--check");
console.log(`target: ${redact(url)}`);
await explainHostOrThrow(url);

const client = new pg.Client({
  connectionString: url,
  // Supabase terminates TLS at the pooler with its own chain; this is the
  // documented client setting, not a security shortcut we invented.
  ssl: { rejectUnauthorized: false },
  statement_timeout: 120_000,
});
await client.connect();
try {
  if (!checkOnly) {
    console.log(`seed: ${seedArg}`);
    const sql = readFileSync(SEED, "utf8");
    const started = Date.now();
    // Sent as ONE query so the dollar-quoted payload survives intact — the
    // statement splitting is exactly what broke under the CLI.
    await client.query(sql);
    console.log(`seed applied in ${Date.now() - started}ms`);
  }
  const { rows } = await client.query(`
    select count(*)::int as teams,
           count(distinct roster_code)::int as rosters,
           sum(featured::int)::int as featured,
           count(distinct regulation)::int as regulations,
           max(fetched_at) as newest
    from public.community_teams`);
  console.log(rows[0]);
  // Per regulation too: with more than one in the table, a total alone can't
  // tell "the new regulation landed" from "the old one is still all there is".
  const byReg = await client.query(`
    select regulation, count(*)::int as teams
    from public.community_teams group by 1 order by 1 desc`);
  for (const r of byReg.rows) {
    console.log(`  ${String(r.teams).padStart(5)}  ${r.regulation}`);
  }
} finally {
  await client.end();
}
