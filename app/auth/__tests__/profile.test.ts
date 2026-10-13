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

  it("reserves `trainer`, the stem of the auto-assigned fallback", () => {
    // supabase/initial-username.sql hands out `trainer-0c286a` when it cannot
    // derive a name. A bare "trainer" must not look like one of those.
    expect(checkUsername("trainer")).toBe("reserved");
    expect(checkUsername("Trainer")).toBe("reserved");
    // The suffixed form is a normal name and stays available.
    expect(checkUsername("trainer-0c286a")).toBeNull();
  });

  it("accepts what the signup trigger derives", () => {
    // Round-trips the cases verified against the live database: a Google name
    // with its space stripped, a collision suffix, an email local part, the
    // 20-char truncation, and the fallback.
    for (const name of [
      "ZiangSun",
      "ZiangSun2",
      "megazchomp",
      "BartholomewMaximilia",
      "trainer-0c286a",
    ]) {
      expect(checkUsername(name), name).toBeNull();
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
    // SHAPE moved to `handle.ts` when the username became the login handle
    // as well as the display name — one rule, two callers.
    const inCode = /const SHAPE = \/([^/]+)\//.exec(
      readFileSync(join(import.meta.dirname, "..", "handle.ts"), "utf8"),
    )?.[1];
    expect(inSql, "no regex found in profiles.sql").toBeTruthy();
    expect(inCode, "no SHAPE found in handle.ts").toBeTruthy();
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
