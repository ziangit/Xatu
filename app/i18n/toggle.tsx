"use client";

import { useLang } from "./provider";
import type { Lang } from "./translate";

/**
 * The language control. Both halves are always on screen inside a fixed-width
 * slot, so switching changes emphasis and never geometry — the same rule that
 * gives the account widget its `w-14` slot ("no layout shift from async state").
 *
 * Unlike that widget this one needs no placeholder: the language came from a
 * cookie the server already read, so the first paint is correct.
 *
 * `中` rather than `中文` keeps the two cells the same width; the title spells it
 * out. Not a `<select>` — native menu chrome is banned here for the same reason
 * `window.confirm` is.
 */
export function LangToggle() {
  const { lang, setLang, t } = useLang();

  const cell = (value: Lang, label: string, title: string) => (
    <button
      type="button"
      onClick={() => setLang(value)}
      aria-pressed={lang === value}
      lang={value === "zh" ? "zh-Hans" : "en"}
      title={title}
      className={`flex h-full w-6 cursor-pointer items-center justify-center transition-colors ${
        lang === value
          ? "bg-stone-200 text-stone-700"
          : "text-stone-400 hover:text-stone-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <span className="flex shrink-0 items-center gap-4">
      <span aria-hidden="true" className="h-4 w-px shrink-0 bg-stone-200" />
      <span
        role="group"
        aria-label={t("Language")}
        // Height is pinned, not derived from the text: `中` has a taller line
        // box than `EN`, and the `:lang(zh)` type rules bump 10px labels to
        // 11px — either would otherwise make the control grow by a pixel the
        // moment you used it.
        className="flex h-[18px] shrink-0 overflow-hidden rounded border border-stone-200 text-[10px] leading-none"
      >
        {cell("en", "EN", t("Switch to English"))}
        {cell("zh", "中", t("Switch to Chinese"))}
      </span>
    </span>
  );
}
