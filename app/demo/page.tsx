"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { yoshimapGuide } from "@/lib/schema/fixtures/yoshimap-sand-staraptor";
import { importTeamText } from "@/lib/team";
import { ImportPanel, MonIcon, TeamPanel, FORMATS } from "./components";
import { SAMPLE_TEAMS } from "./demo-data";
import {
  deleteMatchup,
  loadMatchups,
  loadSavedTeams,
  rememberTeam,
  saveSetup,
  setActiveMatchupId,
  type SavedMatchup,
  type StoredTeam,
} from "./storage";

// Page 1 of the matchup builder (per the xatu.png reference sketch): choose
// My Team and Opposing Team — import a paste or reuse an existing team — then
// Simulate jumps to the turn-by-turn simulation page.

const PRESETS: StoredTeam[] = [
  {
    id: "preset-sand",
    name: yoshimapGuide.title,
    format: FORMATS[0],
    exportText: yoshimapGuide.ownTeam.exportText,
    parsed: yoshimapGuide.ownTeam.parsed,
  },
  ...SAMPLE_TEAMS.map((s, i) => ({
    id: `preset-${i}`,
    name: s.label,
    format: FORMATS[0],
    exportText: s.text,
    parsed: importTeamText(s.text)?.parsed ?? [],
  })),
];

type SlotChoice = "closed" | "import" | "existing";

function TeamSlot({
  label,
  team,
  onPick,
}: {
  label: string;
  team: StoredTeam | null;
  onPick: (team: StoredTeam) => void;
}) {
  const [mode, setMode] = useState<SlotChoice>("closed");
  const [existing, setExisting] = useState<StoredTeam[]>([]);

  const openExisting = () => {
    // localStorage is browser-only; read on interaction, not at render.
    setExisting([...loadSavedTeams(), ...PRESETS]);
    setMode("existing");
  };

  const pick = (t: StoredTeam) => {
    onPick(t);
    setMode("closed");
  };

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
          {label}
        </h2>
        {team && (
          <button
            onClick={() => setMode(mode === "closed" ? "import" : "closed")}
            className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
          >
            replace
          </button>
        )}
      </div>

      <div className="mt-2 space-y-3">
        {team ? (
          <TeamPanel team={team} />
        ) : (
          mode === "closed" && (
            <div className="flex h-32 items-center justify-center gap-3 rounded-lg border border-dashed border-stone-300">
              <button
                onClick={() => setMode("import")}
                className="rounded-md bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:opacity-80"
              >
                Import a team
              </button>
              <button
                onClick={openExisting}
                className="rounded-md border border-stone-300 bg-white px-4 py-1.5 text-xs text-stone-600 hover:border-stone-500"
              >
                Use existing
              </button>
            </div>
          )
        )}

        {mode === "import" && (
          <ImportPanel
            label={label}
            onImport={(t) => {
              const stored: StoredTeam = { ...t, id: crypto.randomUUID() };
              rememberTeam(stored);
              pick(stored);
            }}
          />
        )}

        {mode === "existing" && (
          <div className="rounded-lg border border-stone-200 bg-white py-1">
            {existing.map((t) => (
              <button
                key={t.id}
                onClick={() => pick(t)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-stone-50"
              >
                <span className="text-xs font-medium text-stone-700">
                  {t.name}
                </span>
                <span className="ml-auto text-[10px] text-stone-400">
                  {t.id.startsWith("preset-") ? "sample" : "saved"}
                </span>
              </button>
            ))}
            <button
              onClick={() => setMode("import")}
              className="w-full px-3 py-1.5 text-left text-xs text-stone-400 hover:bg-stone-50"
            >
              + import a new one instead
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [my, setMy] = useState<StoredTeam | null>(null);
  const [opp, setOpp] = useState<StoredTeam | null>(null);
  const [matchups, setMatchups] = useState<SavedMatchup[]>([]);

  useEffect(() => {
    // localStorage is browser-only; defer the read past the effect body.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setMatchups(loadMatchups());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const simulate = () => {
    if (!my || !opp) return;
    saveSetup({ my, opp });
    setActiveMatchupId(null);
    router.push("/demo/sim");
  };

  const openMatchup = (m: SavedMatchup) => {
    saveSetup(m.setup);
    setActiveMatchupId(m.id);
    router.push("/demo/sim");
  };

  const removeMatchup = (id: string) => {
    deleteMatchup(id);
    setMatchups(loadMatchups());
  };

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <header className="flex items-baseline justify-between border-b border-stone-200 pb-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              xatu — matchup builder
            </h1>
            <p className="text-xs text-stone-400">
              set both teams, then simulate the matchup turn by turn
            </p>
          </div>
          <Link
            href="/demo/lookup"
            className="text-xs text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
          >
            guide lookup demo →
          </Link>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          <TeamSlot label="My Team" team={my} onPick={setMy} />
          <TeamSlot label="Opposing Team" team={opp} onPick={setOpp} />
        </div>

        <div className="mt-10 flex justify-center">
          <button
            onClick={simulate}
            disabled={!my || !opp}
            className="rounded-md bg-[#e5484d] px-8 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-85 disabled:opacity-30"
          >
            Simulate
          </button>
        </div>

        {matchups.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-400">
              Saved matchups
            </h2>
            <div className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
              {matchups.map((m) => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2">
                  <button
                    onClick={() => openMatchup(m)}
                    title={`open ${m.name}`}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left hover:opacity-75"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-700">
                      {m.name}
                    </span>
                    <span className="flex shrink-0">
                      {m.setup.my.parsed.slice(0, 6).map((p, i) => (
                        <MonIcon key={i} species={p.species} scale={0.5} />
                      ))}
                    </span>
                    <span className="shrink-0 text-[10px] text-stone-300">
                      vs
                    </span>
                    <span className="flex shrink-0">
                      {m.setup.opp.parsed.slice(0, 6).map((p, i) => (
                        <MonIcon key={i} species={p.species} scale={0.5} />
                      ))}
                    </span>
                  </button>
                  <span className="shrink-0 text-[10px] text-stone-400">
                    {new Date(m.savedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => removeMatchup(m.id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-stone-300 hover:text-red-600"
                  >
                    delete
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-16 border-t border-stone-200 pt-4 text-[11px] leading-relaxed text-stone-400">
          xatu is an unaffiliated, non-commercial fan project. Pokémon is owned
          by Nintendo, The Pokémon Company, Game Freak, and Creatures.
        </footer>
      </main>
    </div>
  );
}
