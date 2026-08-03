import { z } from "zod";

/**
 * The xatu guide schema — simultaneously the platform's storage format, the
 * copy-paste sharing format, and the future browser extension's input format.
 * Treat changes as breaking: bump SCHEMA_VERSION and add a migration branch in
 * `io.ts` rather than mutating shapes in place.
 *
 * Validation philosophy: zod enforces document STRUCTURE only. Species, moves,
 * items, and regulations are open strings — legality/dex checks are advisory
 * warnings (see `warnings.ts`), never schema failures. The author is the
 * authority; xatu is not a legality checker.
 */

export const SCHEMA_VERSION = 1;

const speciesName = z.string().trim().min(1);
const moveName = z.string().trim().min(1);

// ---------------------------------------------------------------------------
// Turn-tier conditions (CLOSED SET — resist adding to it).
// Every predicate must be mechanically detectable from the Showdown battle
// protocol. Anything an author can't express here goes in `reason`/`gameplan`
// as prose. Conditions in a rule are combined with AND only.
// ---------------------------------------------------------------------------

export const TurnConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("opponentLeads"), species: speciesName }),
  z.object({ kind: z.literal("opponentSwitchesIn"), species: speciesName }),
  z.object({
    kind: z.literal("opponentUsesMove"),
    move: moveName,
    // Optional qualifier: "if Incineroar uses Fake Out" vs. "if anyone does".
    species: speciesName.optional(),
  }),
  z.object({ kind: z.literal("opponentMegaEvolves"), species: speciesName.optional() }),
  z.object({ kind: z.literal("opponentTerastallizes"), species: speciesName.optional() }),
  z.object({
    kind: z.literal("weatherIs"),
    weather: z.enum(["sun", "rain", "sand", "snow", "none"]),
  }),
  z.object({
    kind: z.literal("terrainIs"),
    terrain: z.enum(["electric", "grassy", "misty", "psychic", "none"]),
  }),
  z.object({ kind: z.literal("tailwindUp"), side: z.enum(["own", "opponent"]) }),
  z.object({ kind: z.literal("trickRoomUp") }),
  z.object({ kind: z.literal("ownFainted"), species: speciesName }),
]);
export type TurnCondition = z.infer<typeof TurnConditionSchema>;

// ---------------------------------------------------------------------------
// Preview-tier guard. Same predicate shape as turn conditions (an AND array of
// {kind, ...} objects), but a deliberately separate, single-entry vocabulary:
// at team preview the ONLY information is which six species the opponent has.
// No `lacksSpecies` — "otherwise" is the unguarded plan.
// ---------------------------------------------------------------------------

export const PlanGuardSchema = z.object({
  kind: z.literal("hasSpecies"),
  species: speciesName,
});
export type PlanGuard = z.infer<typeof PlanGuardSchema>;

// ---------------------------------------------------------------------------
// Actions. Keyed by the author's own SPECIES, not slot position — slot A/B is
// meaningless once switches happen. 0–2 entries; a species with no entry is
// simply unspecified (omission carries that meaning; there is no sentinel).
// ---------------------------------------------------------------------------

export const ActionSchema = z.union([
  z.object({ move: moveName }), // one of that Pokémon's four moves
  z.object({ switchTo: speciesName }), // an own-team species on the bench
  z.object({ protect: z.literal(true) }),
]);
export type Action = z.infer<typeof ActionSchema>;

export const ActionAssignmentSchema = z.object({
  species: speciesName, // one of the author's own team
  action: ActionSchema,
});
export type ActionAssignment = z.infer<typeof ActionAssignmentSchema>;

// ---------------------------------------------------------------------------
// Rule: one conditional branch. Turn-tier conditions can only ever produce
// actions — never bring/lead. That restriction is structural: rules live
// inside a Plan and have no lead/back fields to affect.
// ---------------------------------------------------------------------------

export const RuleSchema = z.object({
  id: z.string().min(1),
  turn: z.number().int().min(1),
  conditions: z.array(TurnConditionSchema), // AND only; no OR, no nesting
  actions: z
    .array(ActionAssignmentSchema)
    .max(2)
    .refine(
      (a) => new Set(a.map((x) => x.species)).size === a.length,
      "each species may have at most one action per rule",
    ),
  reason: z.string().optional(), // free text, arbitrarily long, never parsed
});
export type Rule = z.infer<typeof RuleSchema>;

// ---------------------------------------------------------------------------
// Plan: the team-preview-level decision, plus the rules that only make sense
// under it (if two plans lead different Pokémon, the same rule text means
// different things — so rules belong here, not on the Matchup).
//
// `lead` + `back` instead of a flat `bring`: lead ⊆ bring becomes
// unrepresentable rather than validated. Derive bring with `bringOf()` —
// a getter would not survive JSON round-tripping.
//
// Guarded-plan evaluation is by SPECIFICITY, not array index: among satisfied
// guarded plans the one with more predicates wins; the unguarded plan is the
// fallback regardless of its position. See `selectPlan()` in plan.ts. Do not
// reintroduce a "plans[0] is the default" convention — it silently breaks
// first-match semantics.
// ---------------------------------------------------------------------------

export const PlanSchema = z.object({
  id: z.string().min(1),
  when: z.array(PlanGuardSchema).min(1).optional(), // absent = the unguarded fallback plan
  lead: z.tuple([speciesName, speciesName]),
  back: z.array(speciesName).max(2), // may be short — an author may only care about the lead
  gameplan: z.string(), // free text, never parsed
  rules: z.array(RuleSchema),
});
export type Plan = z.infer<typeof PlanSchema>;

// ---------------------------------------------------------------------------
// Matchup: one "vs. archetype" section.
// ---------------------------------------------------------------------------

export const OpponentSpeciesSchema = z.object({
  species: speciesName,
  tag: z.enum(["required", "common", "optional"]),
  note: z.string().optional(), // e.g. "usually Choice Scarf"
});
export type OpponentSpecies = z.infer<typeof OpponentSpeciesSchema>;

export const MatchupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1), // author's label, e.g. "Big Six"
  opponentSpecies: z.array(OpponentSpeciesSchema).max(6),
  plans: z
    .array(PlanSchema)
    .refine(
      (plans) => plans.filter((p) => !p.when).length <= 1,
      "at most one unguarded plan per matchup",
    ),
  // Zero plans is draft-only; a published matchup answers at least preview.
});
export type Matchup = z.infer<typeof MatchupSchema>;

// ---------------------------------------------------------------------------
// Guide: one document.
// ---------------------------------------------------------------------------

export const ParsedMonSchema = z.object({
  species: speciesName,
  nickname: z.string().optional(),
  item: z.string().optional(),
  ability: z.string().optional(),
  teraType: z.string().optional(),
  moves: z.array(moveName).max(4),
});
export type ParsedMon = z.infer<typeof ParsedMonSchema>;

export const OwnTeamSchema = z.object({
  // Verbatim Showdown export — the source of truth; must round-trip losslessly.
  exportText: z.string().min(1),
  // Derived view for UI only. Never computed with.
  parsed: z.array(ParsedMonSchema).max(6),
});
export type OwnTeam = z.infer<typeof OwnTeamSchema>;

export const GuideSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(SCHEMA_VERSION),
  // Open string, not an enum: new regulations ship every few months and must
  // not force a schema bump. Known values ("champions-m-b", ...) are input
  // hints in the UI only.
  regulation: z.string().min(1),
  title: z.string().min(1),
  authorName: z.string(), // free text, no account
  createdAt: z.string(),
  updatedAt: z.string(),
  forkedFrom: z.string().optional(),
  ownTeam: OwnTeamSchema,
  matchups: z.array(MatchupSchema),
});
export type Guide = z.infer<typeof GuideSchema>;
