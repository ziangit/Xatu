import type { Guide, Rule } from "@/lib/schema";
import { yoshimapGuide } from "@/lib/schema/fixtures/yoshimap-sand-staraptor";

/**
 * Demo-only data: the acceptance fixture extended with turn 2–3 branches so the
 * demo has something to reveal on every turn. Each added rule is lifted from
 * prose already in the fixture's `reason`/`gameplan` text — the fixture itself
 * stays the untouched Phase 1 acceptance gate.
 */

const demoRulesByPlan: Record<string, Rule[]> = {
  "plan-default": [
    {
      id: "demo-r-chomp-t2",
      turn: 2,
      conditions: [{ kind: "opponentSwitchesIn", species: "Garchomp" }],
      actions: [
        { species: "Milotic", action: { move: "Icy Wind" } },
        { species: "Tyranitar", action: { move: "Knock Off" } },
      ],
      reason:
        "The expected pivot. Icy Wind blunts Garchomp's speed while Knock Off " +
        "takes its Life Orb — momentum stays with you.",
    },
    {
      id: "demo-r-gambit-t3",
      turn: 3,
      conditions: [{ kind: "opponentSwitchesIn", species: "Kingambit" }],
      actions: [{ species: "Milotic", action: { move: "Haze" } }],
      reason:
        "Defiant turns your Icy Winds into free attack boosts for Kingambit — " +
        "Haze resets it before it snowballs.",
    },
  ],
  "plan-sylveon": [
    {
      id: "demo-r-tailwind-t2",
      turn: 2,
      conditions: [{ kind: "tailwindUp", side: "opponent" }],
      actions: [
        { species: "Gholdengo", action: { protect: true } },
        { species: "Milotic", action: { move: "Icy Wind" } },
      ],
      reason:
        "Stall their Tailwind turns out with Protect and pivots, then set your " +
        "own speed control.",
    },
  ],
  "plan-tr": [
    {
      id: "demo-r-tr-t3",
      turn: 3,
      conditions: [{ kind: "trickRoomUp" }],
      actions: [
        { species: "Sinistcha", action: { move: "Rage Powder" } },
        { species: "Milotic", action: { move: "Scald" } },
      ],
      reason:
        "Rage Powder soaks the hits while Scald fishes for burns — Trick Room " +
        "has at most two turns left at this point.",
    },
  ],
};

export const demoGuide: Guide = {
  ...yoshimapGuide,
  matchups: yoshimapGuide.matchups.map((mu) => ({
    ...mu,
    plans: mu.plans.map((plan) => ({
      ...plan,
      rules: [...plan.rules, ...(demoRulesByPlan[plan.id] ?? [])],
    })),
  })),
};

/** Sample opposing teams for one-click testing of the paste flow. */
export const SAMPLE_TEAMS: { label: string; text: string }[] = [
  {
    label: "Aero + Zard team",
    text: `Aerodactyl @ Focus Sash
Ability: Unnerve
Level: 50
- Rock Slide
- Sky Drop
- Taunt
- Protect

Charizard @ Charizardite Y
Ability: Blaze
Level: 50
- Heat Wave
- Solar Beam
- Air Slash
- Protect

Garchomp @ Life Orb
Ability: Rough Skin
Level: 50
- Dragon Claw
- Earthquake
- Rock Slide
- Protect

Sylveon @ Pixie Plate
Ability: Pixilate
Level: 50
- Hyper Voice
- Moonblast
- Helping Hand
- Protect

Kingambit @ Black Glasses
Ability: Defiant
Level: 50
- Kowtow Cleave
- Sucker Punch
- Iron Head
- Protect

Dragonite @ Lum Berry
Ability: Multiscale
Level: 50
- Extreme Speed
- Dragon Claw
- Tailwind
- Protect
`,
  },
  {
    label: "Hard Trick Room team",
    text: `Farigiraf @ Electric Seed
Ability: Armor Tail
Level: 50
- Trick Room
- Psychic Noise
- Helping Hand
- Protect

Torkoal @ Charcoal
Ability: Drought
Level: 50
- Eruption
- Heat Wave
- Body Press
- Protect

Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
- Fake Out
- Knock Off
- Flare Blitz
- Parting Shot

Kangaskhan @ Kangaskhanite
Ability: Scrappy
Level: 50
- Fake Out
- Double-Edge
- Sucker Punch
- Protect

Hatterene @ Life Orb
Ability: Magic Bounce
Level: 50
- Trick Room
- Dazzling Gleam
- Expanding Force
- Protect

Ursaluna @ Flame Orb
Ability: Guts
Level: 50
- Facade
- Headlong Rush
- Crunch
- Protect
`,
  },
];
