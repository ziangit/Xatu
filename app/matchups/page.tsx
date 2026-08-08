"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountLink } from "../auth/AccountLink";
import { MonIcon } from "../demo/components";
import {
  deleteCloudMatchup,
  listCloudMatchups,
  upsertCloudMatchup,
} from "../demo/cloud";
import {
  deleteMatchup,
  loadMatchups,
  saveSetup,
  setActiveMatchupId,
  upsertMatchup,
  type SavedMatchup,
} from "../demo/storage";

// My matchups: every saved board in one list — the ones in this browser and
// the ones synced to the signed-in account — with where each copy lives.

interface Row {
  id: string;
  /** Freshest copy wins for name/date/opening. */
  entry: SavedMatchup;
  inBrowser: boolean;
  inCloud: boolean;
}

function mergeRows(
  local: SavedMatchup[],
  cloud: SavedMatchup[] | null,
): Row[] {
  const rows = new Map<string, Row>();
  for (const m of local) {
    rows.set(m.id, { id: m.id, entry: m, inBrowser: true, inCloud: false });
  }
  for (const m of cloud ?? []) {
    const existing = rows.get(m.id);
    if (!existing) {
      rows.set(m.id, { id: m.id, entry: m, inBrowser: false, inCloud: true });
    } else {
      existing.inCloud = true;
      if (m.savedAt > existing.entry.savedAt) existing.entry = m;
    }
  }
  return [...rows.values()].sort((a, b) =>
    b.entry.savedAt.localeCompare(a.entry.savedAt),
  );
}

export default function MatchupsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [cloud, setCloud] = useState<
    "loading" | "off" | "ok" | { error: string }
  >("loading");
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    const local = loadMatchups();
    setRows(mergeRows(local, null));
    const result = await listCloudMatchups();
    if (result.state === "ok") {
      setCloud("ok");
      setRows(mergeRows(local, result.matchups));
    } else if (result.state === "off") {
      setCloud("off");
    } else {
      setCloud({ error: result.message });
    }
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = (row: Row) => {
    // Make sure a local copy exists (cloud-only boards get pulled down),
    // then resume it on the sim page.
    upsertMatchup(row.entry);
    saveSetup(row.entry.setup);
    setActiveMatchupId(row.id);
    router.push("/demo/sim");
  };

  const upload = async (row: Row) => {
    setBusyId(row.id);
    const result = await upsertCloudMatchup(row.entry);
    setBusyId(null);
    if (result === "ok") void refresh();
    else if (result !== "off") setCloud({ error: result });
  };

  const remove = async (row: Row) => {
    const places = [
      row.inBrowser && "this browser",
      row.inCloud && "your account",
    ]
      .filter(Boolean)
      .join(" and ");
    if (!window.confirm(`Delete “${row.entry.name}” from ${places}?`)) return;
    setBusyId(row.id);
    if (row.inBrowser) deleteMatchup(row.id);
    if (row.inCloud) {
      const result = await deleteCloudMatchup(row.id);
      if (result !== "ok" && result !== "off") setCloud({ error: result });
    }
    setBusyId(null);
    void refresh();
  };

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="flex items-baseline justify-between border-b border-stone-200 pb-4">
          <div>
            <Link
              href="/"
              className="font-display text-lg font-bold tracking-tight"
            >
              xatu
            </Link>
            <p className="text-xs text-stone-400">my matchups</p>
          </div>
          <span className="flex items-center gap-4">
            <AccountLink />
            <Link
              href="/demo"
              className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
            >
              builder →
            </Link>
          </span>
        </header>

        {cloud === "off" && (
          <p className="mt-4 text-xs leading-relaxed text-stone-400">
            Showing the matchups saved in this browser.{" "}
            <Link
              href="/login"
              className="underline underline-offset-2 hover:text-stone-800"
            >
              Sign in
            </Link>{" "}
            to also see the ones synced to your account.
          </p>
        )}
        {typeof cloud === "object" && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-800">
            Couldn&rsquo;t load your account matchups: {cloud.error}. The
            browser ones are shown below.
          </p>
        )}

        {rows.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-stone-300 p-10 text-center text-sm text-stone-400">
            No saved matchups yet.{" "}
            <Link
              href="/demo"
              className="underline underline-offset-2 hover:text-stone-800"
            >
              Build one →
            </Link>
          </div>
        ) : (
          <div className="mt-6 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => open(row)}
                  title={`open ${row.entry.name}`}
                  className="flex min-w-0 flex-1 flex-col gap-1 text-left hover:opacity-75"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-stone-800">
                      {row.entry.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-stone-400">
                      {new Date(row.entry.savedAt).toLocaleDateString()}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex">
                      {row.entry.setup.my.parsed.slice(0, 6).map((p, i) => (
                        <MonIcon key={i} species={p.species} scale={0.5} />
                      ))}
                    </span>
                    <span className="text-[10px] text-stone-300">vs</span>
                    <span className="flex">
                      {row.entry.setup.opp.parsed.slice(0, 6).map((p, i) => (
                        <MonIcon key={i} species={p.species} scale={0.5} />
                      ))}
                    </span>
                  </span>
                </button>
                <span className="flex shrink-0 gap-1">
                  {row.inBrowser && (
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-stone-500">
                      browser
                    </span>
                  )}
                  {row.inCloud && (
                    <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sky-700">
                      account
                    </span>
                  )}
                </span>
                {cloud === "ok" && row.inBrowser && !row.inCloud && (
                  <button
                    onClick={() => upload(row)}
                    disabled={busyId === row.id}
                    className="shrink-0 rounded border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600 hover:border-stone-400 disabled:opacity-40"
                  >
                    upload
                  </button>
                )}
                <button
                  onClick={() => remove(row)}
                  disabled={busyId === row.id}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-stone-300 hover:text-red-600 disabled:opacity-40"
                >
                  delete
                </button>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-16 border-t border-stone-200 pt-4 text-[11px] leading-relaxed text-stone-400">
          xatu is an unaffiliated, non-commercial fan project. Pokémon is owned
          by Nintendo, The Pokémon Company, Game Freak, and Creatures.
        </footer>
      </main>
    </div>
  );
}
