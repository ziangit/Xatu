"use client";

import { Fragment, type ReactNode } from "react";
import { useLang } from "./provider";
import type { Params } from "./translate";

/**
 * One sentence that contains an element — a link, an emphasis — instead of only
 * text. Numbered slots (`{0}`, `{1}`) mark where the elements go.
 *
 *   <T
 *     k="Showing the matchups saved in this browser. {0} to also see the ones synced to your account."
 *     parts={[<Link href="/login">{t("Sign in")}</Link>]}
 *   />
 *
 * The point is that the spacing around the element belongs to the sentence, so
 * it is translatable too: English wants a space either side of the link, Chinese
 * wants none. Writing it as `{t("…")}{" "}<Link/>{" "}{t("…")}` freezes English
 * word order and English spacing, which is why that shape is worth replacing
 * wherever it appears.
 */
export function T({
  k,
  parts,
  params,
}: {
  k: string;
  parts: ReactNode[];
  params?: Params;
}) {
  const { t } = useLang();
  return (
    <>
      {t(k, params)
        .split(/(\{\d+\})/)
        .map((segment, i) => {
          const slot = /^\{(\d+)\}$/.exec(segment);
          return slot ? (
            <Fragment key={i}>{parts[Number(slot[1])]}</Fragment>
          ) : (
            segment
          );
        })}
    </>
  );
}
