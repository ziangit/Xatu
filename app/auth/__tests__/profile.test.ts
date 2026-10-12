import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkUsername } from "../profile";

describe("checkUsername", () => {
  it("accepts ordinary handles, preserving case", () => {
    for (const ok of [
      "Phalap",
      "ck49",
      "abc",
      "a_b-c",
      "A1234567890123456789",
    ]) {
      expect(checkUsername(ok), ok).toBeNull();
    }
  });

  it("rejects by length", () => {
    expect(checkUsername("ab")).toBe("too-short");
    expect(checkUsername("a".repeat(21))).toBe("too-long");
  });

  it("rejects characters that don't belong in a byline", () => {
    // Spaces and punctuation invite impersonation and break URLs later.
    for (const bad of [
      "has space",
      "emoji🙂",
      "semi;colon",
      "with.dot",
      "sla/sh",
    ]) {
      expect(checkUsername(bad), bad).toBe("charset");
    }
  });

  it("requires an alphanumeric first character", () => {
    expect(checkUsername("-lead")).toBe("charset");
    expect(checkUsername("_lead")).toBe("charset");
  });

  it("refuses names that would pose as the site, in any case", () => {
    for (const bad of ["xatu", "XATU", "Admin", "moderator", "official"]) {
      expect(checkUsername(bad), bad).toBe("reserved");
    }
  });

  it("trims before judging, so a stray space isn't an error", () => {
    expect(checkUsername("  Phalap  ")).toBeNull();
  });
});

/**
 * The shape rule exists twice on purpose — once here for an instant error, once
 * as a CHECK constraint so the database is the real authority. If they drift,
 * the UI accepts a name the insert then rejects, which reads as a broken app.
 */
describe("the shape rule matches the database", () => {
  it("uses the same regex as supabase/profiles.sql", () => {
    const sql = readFileSync(
      join(import.meta.dirname, "..", "..", "..", "supabase", "profiles.sql"),
      "utf8",
    );
    const inSql = /username ~ '(\^[^']+)'/.exec(sql)?.[1];
    const inCode = /const SHAPE = \/([^/]+)\//.exec(
      readFileSync(join(import.meta.dirname, "..", "profile.ts"), "utf8"),
    )?.[1];
    expect(inSql, "no regex found in profiles.sql").toBeTruthy();
    expect(inCode, "no SHAPE found in profile.ts").toBeTruthy();
    expect(inCode).toBe(inSql);
  });
});

describe("usernames never come from the email", () => {
  /**
   * Deriving a default from the address would publish the local part of
   * something the user never chose to show — the exact leak the separate
   * `profiles` table exists to prevent.
   */
  it("the module never reads an email", () => {
    const src = readFileSync(
      join(import.meta.dirname, "..", "profile.ts"),
      "utf8",
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\.email/);
  });
});
