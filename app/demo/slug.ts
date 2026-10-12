/**
 * Short slugs for published groups.
 *
 * Its own module, framework-free, because `generateMetadata` and the Open
 * Graph image run on the server and must not pull in `publish.ts` — that is a
 * `"use client"` module holding the browser Supabase client. `publish.ts`
 * re-exports these, so no existing importer changed (same move as
 * `formats.ts` and `mon-icon.tsx`).
 */

/** Slug alphabet: no vowels, so a random slug cannot spell something. */
const ALPHABET = "23456789bcdfghjkmnpqrstvwxyz";
const SLUG_LENGTH = 8;

/** Mirrors `published_slug_shape` in supabase/published.sql. */
export const SLUG_RE = /^[a-z0-9]{6,12}$/;

export function newSlug(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < SLUG_LENGTH; i++) {
    out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return out;
}
