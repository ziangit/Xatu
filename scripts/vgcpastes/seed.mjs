/**
 * Apply the generated catalogue seed to a Supabase database.
 *
 *   node scripts/vgcpastes/seed.mjs           # uses SUPABASE_CONNECT_STRING
 *   node scripts/vgcpastes/seed.mjs --check   # report the row counts, change nothing
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

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const SEED = join(HERE, "data", "seed-community-teams.sql");

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

const url = connectionString();
const checkOnly = process.argv.includes("--check");
console.log(`target: ${redact(url)}`);

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
} finally {
  await client.end();
}
