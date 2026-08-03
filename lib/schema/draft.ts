import { z } from "zod";
import {
  ActionAssignmentSchema,
  GuideSchema,
  OpponentSpeciesSchema,
  ParsedMonSchema,
  PlanGuardSchema,
  SCHEMA_VERSION,
  TurnConditionSchema,
  type Guide,
} from "./guide";

/**
 * Draft types: what the editor operates on end to end. Permissive — always
 * saveable, valid while incomplete. A draft with an empty title, one lead
 * Pokémon, or a matchup with zero plans is a legitimate autosave state.
 *
 * Full `GuideSchema` validation runs ONLY at the publish and export
 * boundaries (see `validateDraft`). Do not tighten draft schemas to "help"
 * the author — incomplete is legal by design.
 */

const DraftRuleSchema = z.object({
  id: z.string().min(1),
  turn: z.number().int().min(1),
  conditions: z.array(TurnConditionSchema).default([]),
  actions: z.array(ActionAssignmentSchema).max(2).default([]),
  reason: z.string().optional(),
});
export type DraftRule = z.infer<typeof DraftRuleSchema>;

const DraftPlanSchema = z.object({
  id: z.string().min(1),
  when: z.array(PlanGuardSchema).optional(), // may be empty mid-edit
  lead: z.array(z.string()).max(2).default([]), // may be underfilled
  back: z.array(z.string()).max(2).default([]),
  gameplan: z.string().default(""),
  rules: z.array(DraftRuleSchema).default([]),
});
export type DraftPlan = z.infer<typeof DraftPlanSchema>;

const DraftMatchupSchema = z.object({
  id: z.string().min(1),
  name: z.string().default(""),
  opponentSpecies: z.array(OpponentSpeciesSchema).max(6).default([]),
  plans: z.array(DraftPlanSchema).default([]),
});
export type DraftMatchup = z.infer<typeof DraftMatchupSchema>;

export const GuideDraftSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(SCHEMA_VERSION),
  regulation: z.string().default(""),
  title: z.string().default(""),
  authorName: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
  forkedFrom: z.string().optional(),
  ownTeam: z
    .object({
      exportText: z.string().default(""),
      parsed: z.array(ParsedMonSchema).max(6).default([]),
    })
    .default({ exportText: "", parsed: [] }),
  matchups: z.array(DraftMatchupSchema).default([]),
});
export type GuideDraft = z.infer<typeof GuideDraftSchema>;

export type DraftValidation =
  | { ok: true; guide: Guide }
  | { ok: false; issues: { path: string; message: string }[] };

/**
 * The publish/export gate: run the strict schema over a draft. Every valid
 * Guide is structurally a valid GuideDraft, so drafts that pass come back as
 * fully-typed Guides.
 */
export function validateDraft(draft: GuideDraft): DraftValidation {
  const result = GuideSchema.safeParse(draft);
  if (result.success) return { ok: true, guide: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  };
}
