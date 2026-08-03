import { SCHEMA_VERSION, type Guide } from "../guide";

/**
 * Phase 1 acceptance-gate fixture: sections ② (vs. Aerodactyl + Charizard
 * core) and ⑥ (vs. Hard Trick Room) of the Champions Reg M-B team guide at
 * https://note.com/yoshimap/n/n411fe0271c75, hand-encoded to verify the model
 * survives real content. Moves/EV details the article doesn't state are
 * approximated; the prose is a condensed translation, not a quote.
 *
 * Section ② deliberately contains the tier trap: the article says "★ If they
 * lead Aerodactyl + Sylveon → you must lead Gholdengo". The stated condition
 * is turn-tier, but the outcome is OUR lead, which is locked before their
 * lead is visible. What the author MEANS is a preview-tier guard —
 * hasSpecies(Aerodactyl) AND hasSpecies(Sylveon) → the Gholdengo plan — and
 * that is how it's encoded here. Authors will write this mistake naturally;
 * the Phase 2 editor should detect it and offer the conversion.
 *
 * Section ⑥ has multiple turn-tier branches sharing one plan, verifying that
 * rules-inside-Plan doesn't force duplication.
 */

const OWN_TEAM_EXPORT = `Tyranitar @ Tyranitarite
Ability: Sand Stream
Level: 50
- Rock Slide
- Knock Off
- Low Kick
- Protect

Excadrill @ Focus Sash
Ability: Sand Rush
Level: 50
- High Horsepower
- Iron Head
- Swords Dance
- Protect

Milotic @ Sitrus Berry
Ability: Competitive
Level: 50
- Scald
- Icy Wind
- Haze
- Protect

Gholdengo @ Life Orb
Ability: Good as Gold
Level: 50
- Make It Rain
- Shadow Ball
- Nasty Plot
- Protect

Sinistcha @ Colbur Berry
Ability: Hospitality
Level: 50
- Matcha Gotcha
- Rage Powder
- Strength Sap
- Protect

Staraptor @ Staraptite
Ability: Intimidate
Level: 50
- Brave Bird
- Close Combat
- Tailwind
- Protect
`;

export const yoshimapGuide: Guide = {
  id: "yoshimap-sand-staraptor",
  schemaVersion: SCHEMA_VERSION,
  regulation: "champions-m-b",
  title: "Sand + Mega Staraptor",
  authorName: "yoshimap",
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
  ownTeam: {
    exportText: OWN_TEAM_EXPORT,
    parsed: [
      {
        species: "Tyranitar",
        item: "Tyranitarite",
        ability: "Sand Stream",
        moves: ["Rock Slide", "Knock Off", "Low Kick", "Protect"],
      },
      {
        species: "Excadrill",
        item: "Focus Sash",
        ability: "Sand Rush",
        moves: ["High Horsepower", "Iron Head", "Swords Dance", "Protect"],
      },
      {
        species: "Milotic",
        item: "Sitrus Berry",
        ability: "Competitive",
        moves: ["Scald", "Icy Wind", "Haze", "Protect"],
      },
      {
        species: "Gholdengo",
        item: "Life Orb",
        ability: "Good as Gold",
        moves: ["Make It Rain", "Shadow Ball", "Nasty Plot", "Protect"],
      },
      {
        species: "Sinistcha",
        item: "Colbur Berry",
        ability: "Hospitality",
        moves: ["Matcha Gotcha", "Rage Powder", "Strength Sap", "Protect"],
      },
      {
        species: "Staraptor",
        item: "Staraptite",
        ability: "Intimidate",
        moves: ["Brave Bird", "Close Combat", "Tailwind", "Protect"],
      },
    ],
  },
  matchups: [
    // ── Section ② — vs. Aerodactyl + Charizard core ────────────────────────
    {
      id: "mu-aero-zard",
      name: "Aerodactyl + Charizard core",
      opponentSpecies: [
        { species: "Aerodactyl", tag: "required", note: "Focus Sash; mostly ignorable once chipped" },
        { species: "Charizard", tag: "required", note: "Solar Beam" },
        { species: "Garchomp", tag: "common", note: "Life Orb" },
        { species: "Sylveon", tag: "common", note: "Wide Guard" },
        { species: "Kingambit", tag: "optional" },
      ],
      plans: [
        {
          id: "plan-default",
          // Unguarded fallback plan.
          lead: ["Milotic", "Gholdengo"],
          back: ["Tyranitar", "Staraptor"],
          gameplan:
            "Milotic absorbs Charizard's Solar Beam and keeps ~50% after Sitrus Berry. " +
            "Any hit breaks Aerodactyl's Focus Sash; beyond that, ignore Aerodactyl. " +
            "Get Tyranitar in and Mega Evolve on turn 2 to control the weather.",
          rules: [
            {
              id: "r-lead-zard-aero",
              turn: 1,
              conditions: [
                { kind: "opponentLeads", species: "Charizard" },
                { kind: "opponentLeads", species: "Aerodactyl" },
              ],
              actions: [
                { species: "Milotic", action: { move: "Scald" } },
                { species: "Gholdengo", action: { switchTo: "Tyranitar" } },
              ],
              reason:
                "Scald into Aerodactyl breaks its Sash. Tyranitar Mega Evolves turn 2. " +
                "Expect Garchomp to switch in — answer with Icy Wind + Knock Off for momentum.",
            },
            {
              id: "r-lead-zard-chomp",
              turn: 1,
              conditions: [
                { kind: "opponentLeads", species: "Charizard" },
                { kind: "opponentLeads", species: "Garchomp" },
              ],
              actions: [
                { species: "Gholdengo", action: { switchTo: "Staraptor" } },
                { species: "Milotic", action: { move: "Icy Wind" } },
              ],
              reason:
                "Milotic always lives Life Orb Dragon Claw + Solar Beam at -1. Keep spamming " +
                "Icy Wind while bringing Tyranitar in. If Kingambit switches in and picks up " +
                "an attack boost from Defiant, switch to Haze.",
            },
          ],
        },
        {
          id: "plan-sylveon",
          // The ② trap, encoded correctly: the article words this as "if they
          // LEAD Aerodactyl + Sylveon, you must lead Gholdengo" — impossible as
          // written (our lead locks before theirs is visible). As a preview
          // guard it is exactly expressible.
          when: [
            { kind: "hasSpecies", species: "Aerodactyl" },
            { kind: "hasSpecies", species: "Sylveon" },
          ],
          lead: ["Gholdengo", "Milotic"],
          back: ["Tyranitar", "Staraptor"],
          gameplan:
            "Gholdengo will win you this game. Ignore Wide Guard. Once Aerodactyl is down, " +
            "stall out Tailwind with Protect and pivots, then set your own speed control.",
          rules: [
            {
              id: "r-sylveon-t1",
              turn: 1,
              conditions: [
                { kind: "opponentLeads", species: "Aerodactyl" },
                { kind: "opponentLeads", species: "Sylveon" },
              ],
              actions: [
                { species: "Gholdengo", action: { move: "Make It Rain" } },
                { species: "Milotic", action: { move: "Scald" } },
              ],
              reason: "Both attacks into Aerodactyl; it must not stay on the field.",
            },
          ],
        },
      ],
    },
    // ── Section ⑥ — vs. Hard Trick Room ────────────────────────────────────
    {
      id: "mu-hard-tr",
      name: "Hard Trick Room",
      opponentSpecies: [
        { species: "Farigiraf", tag: "required", note: "ignore it entirely" },
        { species: "Torkoal", tag: "common" },
        { species: "Incineroar", tag: "common" },
        { species: "Kangaskhan", tag: "common" },
      ],
      plans: [
        {
          id: "plan-tr",
          // One plan, several turn-tier branches — no duplication.
          lead: ["Milotic", "Tyranitar"],
          back: ["Sinistcha", "Gholdengo"],
          gameplan:
            "Usually a very easy matchup. Ignore Farigiraf entirely. Hold Tyranitar's Mega " +
            "Evolution until Torkoal is on the field so sand wins the weather war. Protect " +
            "strategically to burn Trick Room turns.",
          rules: [
            {
              id: "r-tr-incineroar",
              turn: 1,
              conditions: [{ kind: "opponentLeads", species: "Incineroar" }],
              actions: [{ species: "Tyranitar", action: { move: "Rock Slide" } }],
              reason:
                "Incineroar will Fake Out Milotic (Competitive → +2 SpA). At -1, Knock Off " +
                "can't OHKO Farigiraf, so Rock Slide instead. Watch for Thunderbolt + " +
                "Assurance stacking onto Milotic.",
            },
            {
              id: "r-tr-up",
              turn: 2,
              conditions: [{ kind: "trickRoomUp" }],
              actions: [
                { species: "Milotic", action: { protect: true } },
                { species: "Tyranitar", action: { switchTo: "Sinistcha" } },
              ],
              reason:
                "Under Trick Room, pivot to Sinistcha; next turn Rage Powder + Scald into " +
                "Incineroar.",
            },
            {
              id: "r-tr-kangaskhan",
              turn: 1,
              conditions: [{ kind: "opponentLeads", species: "Kangaskhan" }],
              actions: [
                { species: "Milotic", action: { move: "Scald" } },
                { species: "Tyranitar", action: { switchTo: "Sinistcha" } },
              ],
              reason:
                "Scald the Kangaskhan, then cycle Scald + Matcha Gotcha to spread burns. " +
                "Ignore Farigiraf. Protect to deplete Trick Room turns.",
            },
          ],
        },
      ],
    },
  ],
};
