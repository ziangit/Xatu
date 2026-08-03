import { GuideSchema, SCHEMA_VERSION, type Guide } from "./guide";

/**
 * Paste-first sharing: the canonical shareable artifact is the guide as JSON
 * text. Zero dependencies, works when the service is down, and it is what the
 * future browser extension ingests.
 */

export function exportGuideText(guide: Guide): string {
  return JSON.stringify(guide, null, 2);
}

export type ImportResult =
  | { ok: true; guide: Guide }
  | { ok: false; error: string; issues?: { path: string; message: string }[] };

/**
 * Import a pasted guide. Branches on `schemaVersion` from the very first
 * version so that when v2 exists, v1 documents in the wild keep importing via
 * a migration instead of failing.
 */
export function importGuideText(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "Not valid JSON. Paste the full guide text, unmodified." };
  }

  if (typeof data !== "object" || data === null || !("schemaVersion" in data)) {
    return { ok: false, error: "Not a xatu guide: missing schemaVersion." };
  }

  const version = (data as { schemaVersion: unknown }).schemaVersion;
  switch (version) {
    case SCHEMA_VERSION: {
      const result = GuideSchema.safeParse(data);
      if (result.success) return { ok: true, guide: result.data };
      return {
        ok: false,
        error: "The pasted guide has an invalid structure.",
        issues: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      };
    }
    // Future schemaVersion migrations plug in here (case 2: migrate v1 → v2, ...)
    default:
      return {
        ok: false,
        error: `Unsupported schemaVersion ${String(version)} — this build of xatu understands version ${SCHEMA_VERSION}. The guide may come from a newer xatu.`,
      };
  }
}
