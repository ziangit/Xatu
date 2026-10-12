import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SLUG_RE, newSlug } from "../publish";

describe("slugs", () => {
  it("are the shape the database accepts", () => {
    for (let i = 0; i < 200; i++) expect(newSlug()).toMatch(SLUG_RE);
  });

  it("cannot spell a word — the alphabet has no vowels", () => {
    // A random slug that reads as something unfortunate would end up in
    // someone's tournament post, so vowels are simply not in the alphabet.
    const joined = Array.from({ length: 300 }, () => newSlug()).join("");
    expect(joined).not.toMatch(/[aeiou]/);
  });

  it("is drawn from the whole alphabet, not a biased slice", () => {
    // A generator that only ever emitted the first few characters would still
    // pass the shape check, and would collide constantly.
    const seen = new Set(
      Array.from({ length: 2000 }, () => newSlug()).join(""),
    );
    expect(seen.size).toBeGreaterThan(20);
  });

  it("maps the random stream across the alphabet", () => {
    expect(newSlug(() => 0)).toBe("22222222");
    expect(newSlug(() => 0.999999)).toBe("zzzzzzzz");
  });

  /**
   * The slug shape lives in this module and as a CHECK constraint. If they
   * drift, publishing fails at the insert with a constraint error rather than
   * anything a caller can explain.
   */
  it("matches the constraint in supabase/published.sql", () => {
    const sql = readFileSync(
      join(import.meta.dirname, "..", "..", "..", "supabase", "published.sql"),
      "utf8",
    );
    const inSql = /slug ~ '(\^[^']+)'/.exec(sql)?.[1];
    expect(inSql).toBeTruthy();
    expect(SLUG_RE.source).toBe(inSql);
  });
});

describe("what a published row may contain", () => {
  /**
   * The byline is a username. If this module ever selected an email — directly
   * or by joining auth.users — a public page would leak one.
   */
  it("never reads an email or auth.users", () => {
    const src = readFileSync(
      join(import.meta.dirname, "..", "publish.ts"),
      "utf8",
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/\.email/);
    expect(code).not.toMatch(/auth\.users/);
    expect(code).not.toMatch(/from\(["']users["']\)/);
  });
});
