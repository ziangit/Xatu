/**
 * Interface language. English is the source: every call site passes the real
 * English sentence, and each translation is keyed by it. A missing entry falls
 * back to readable English rather than to a bare key — there is no build step
 * checking coverage, so the failure mode has to be harmless. It also means
 * editing English copy drops the stale translation instead of keeping it, and
 * that a newly added language can ship page by page.
 *
 * Pure and React-free, so the non-component string builders (`importSummary`,
 * the paste-decode warnings) use exactly the same function as the JSX does.
 */

import { JA } from "./ja";
import { ZH } from "./zh";

export type Lang = "en" | "zh" | "ja";

export const LANG_COOKIE = "xatu-lang";

/** English is the keys, so it has no dictionary of its own. */
const DICTIONARIES: Record<Exclude<Lang, "en">, Record<string, string>> = {
  zh: ZH,
  ja: JA,
};

/** `<html lang>` wants a real tag; our own state is the short one. The subtag
 * is what actually drives font selection and line breaking — and it is what
 * separates Chinese from Japanese, which share thousands of code points but
 * draw a good many of them differently. Also passed to `toLocaleTimeString`. */
const HTML_LANG: Record<Lang, string> = {
  en: "en",
  zh: "zh-Hans",
  ja: "ja",
};
export const htmlLang = (lang: Lang) => HTML_LANG[lang];

/** Anything we didn't write is English — the cookie is user-editable. */
export const readLang = (raw: string | undefined | null): Lang =>
  raw === "zh" || raw === "ja" ? raw : "en";

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
 * ones would freeze word order, and both Chinese and Japanese reorder almost
 * every sentence with more than one moving part — Japanese most of all, since
 * its verb goes last.
 *
 * An unknown `{placeholder}` is deliberately left on screen: a typo should be
 * visible, not silently blank.
 */
export function translate(lang: Lang, key: string, params?: Params): string {
  const template =
    (lang === "en" ? undefined : DICTIONARIES[lang][key]) ?? englishOf(key);
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/**
 * A counted noun. English inflects; neither Chinese nor Japanese does, so both
 * English forms are separate keys that a dictionary is free to map to one
 * string — and Japanese uses the opportunity to insert its counter word.
 *
 *   count(lang, 3, "matchup", "matchups")  →  "3 matchups" / "3 个对阵" / "3 件のマッチアップ"
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
 * Joins fragments the way the language does: English wants "a and b", while
 * Chinese and Japanese both use the same enumeration comma and no conjunction
 * at all. (Japanese could use と, but that reads as an exhaustive "and" and
 * these lists are short label fragments — 、is what a UI writes.)
 */
export function joinList(lang: Lang, parts: string[]): string {
  const kept = parts.filter(Boolean);
  if (kept.length < 2) return kept[0] ?? "";
  if (lang !== "en") return kept.join("、");
  return `${kept.slice(0, -1).join(", ")} and ${kept[kept.length - 1]}`;
}
