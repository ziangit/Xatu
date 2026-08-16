"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LANG_COOKIE,
  count,
  htmlLang,
  joinList,
  translate,
  type Lang,
  type Params,
} from "./translate";

/**
 * The chosen language, seeded on the server from a cookie so the first paint is
 * already in the right language. localStorage would have meant rendering English
 * and swapping after mount — a whole-page reflow on every load, which is the one
 * thing the header rules forbid.
 */

type LangValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translate. `en` is the key and the fallback. */
  t: (en: string, params?: Params) => string;
  /** A counted noun, pluralised only where the language pluralises. */
  n: (n: number, one: string, many: string) => string;
  /** "a and b" / "a、b". */
  list: (parts: string[]) => string;
};

const LangContext = createContext<LangValue | null>(null);

export function LangProvider({
  initial,
  children,
}: {
  initial: Lang;
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initial);
  const router = useRouter();

  const setLang = useCallback(
    (next: Lang) => {
      // State first: every client subtree re-renders in the same tick, so the
      // page is already translated before anything touches the network.
      setLangState(next);
      // A year, path-wide, lax: a display preference, never a credential.
      document.cookie = `${LANG_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
      // The server rendered the other value into <html lang>; keep it honest
      // for screen readers and for the CJK typography rules in globals.css.
      document.documentElement.lang = htmlLang(next);
      // Only the <title> from generateMetadata is server-owned now, and it
      // won't follow without this. Invisible on the page itself.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LangValue>(
    () => ({
      lang,
      setLang,
      t: (en, params) => translate(lang, en, params),
      n: (n, one, many) => count(lang, n, one, many),
      list: (parts) => joinList(lang, parts),
    }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/**
 * Throws outside the provider on purpose: a component rendering untranslated
 * text because it sat outside the tree is a bug that should be loud, and the
 * provider wraps the whole body.
 */
export function useLang(): LangValue {
  const value = useContext(LangContext);
  if (!value) throw new Error("useLang must be used inside <LangProvider>");
  return value;
}

/** The common case — `const t = useT()`. */
export const useT = () => useLang().t;
