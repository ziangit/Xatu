/**
 * Interface language. English is the source: every call site passes the real
 * English sentence, and the Chinese dictionary is keyed by it. A missing entry
 * falls back to readable English rather than to a bare key — there is no build
 * step checking coverage, so the failure mode has to be harmless. It also means
 * editing English copy drops the stale translation instead of keeping it.
 *
 * Pure and React-free, so the non-component string builders (`importSummary`,
 * the paste-decode warnings) use exactly the same function as the JSX does.
 */

import { ZH } from "./zh";

export type Lang = "en" | "zh";

export const LANG_COOKIE = "xatu-lang";

/** `<html lang>` wants a real tag; our own state is the short one. The script
 * subtag is what actually drives font selection and line breaking. */
export const htmlLang = (lang: Lang) => (lang === "zh" ? "zh-Hans" : "en");

/** Anything we didn't write is English — the cookie is user-editable. */
export const readLang = (raw: string | undefined | null): Lang =>
  raw === "zh" ? "zh" : "en";

export type Params = Record<string, string | number>;

/**
 * A key may carry a disambiguating prefix, `"context|English text"`, for the
 * words this UI uses in two senses — `"nav|back"` is leaving the page, `"slot|back"`
 * is the two Pokémon behind your leads. Everything up to the last `|` is
 * stripped for the English fallback.
 */
export const englishOf = (key: string) => key.slice(key.lastIndexOf("|") + 1);

/**
 * `en` is both the key and the fallback. Placeholders are `{named}` — positional
 * ones would freeze word order, and Chinese reorders almost every sentence with
 * more than one moving part.
 *
 * An unknown `{placeholder}` is deliberately left on screen: a typo should be
 * visible, not silently blank.
 */
export function translate(lang: Lang, key: string, params?: Params): string {
  const template = (lang === "zh" ? ZH[key] : undefined) ?? englishOf(key);
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/**
 * A counted noun. English inflects, Chinese doesn't, so both English forms are
 * separate keys that the dictionary is free to map to the same Chinese string.
 *
 *   count(lang, 3, "matchup", "matchups")  →  "3 matchups" / "3 场对局"
 */
export function count(
  lang: Lang,
  n: number,
  one: string,
  many: string,
): string {
  return translate(lang, `{n} ${n === 1 ? one : many}`, { n });
}

/**
 * Joins fragments the way the language does: English wants "a and b", Chinese
 * uses the enumeration comma and no conjunction.
 */
export function joinList(lang: Lang, parts: string[]): string {
  const kept = parts.filter(Boolean);
  if (kept.length < 2) return kept[0] ?? "";
  if (lang === "zh") return kept.join("、");
  return `${kept.slice(0, -1).join(", ")} and ${kept[kept.length - 1]}`;
}
