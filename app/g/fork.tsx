"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "../i18n/provider";
import { applyGroupImport, importSummary } from "../demo/import-group";
import { upsertCloudMatchup } from "../demo/cloud";
import type { DecodedGroup } from "../demo/workflow-io";

/**
 * Fork a published matchup into your own builder.
 *
 * It is the **same write path as pasting the JSON** — `applyGroupImport`, the
 * one place a document is allowed to land (see `app/demo/import-group.ts`).
 * A fork is a paste whose clipboard happens to be a published row, so it
 * inherits every rule that path already enforces: your own plans for the same
 * six Pokémon are left alone and the copy sits beside them, badged.
 *
 * The original is untouched by construction. Nothing here writes to
 * `published_groups`; the fork is rows in *your* library, and re-publishing it
 * would mint a new slug of your own.
 *
 * The document is stamped `pub:<slug>` rather than left to the roster-and-name
 * fallback, so forking the same page twice updates one set instead of forking
 * two, and two authors who publish the same archetype under the same name
 * cannot collide.
 */
export function ForkButton({
  slug,
  group,
}: {
  slug: string;
  group: DecodedGroup;
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function fork() {
    setBusy(true);
    const applied = applyGroupImport({ ...group, docId: `pub:${slug}` });
    setNote(importSummary(applied, lang));
    // Signed in, the copy belongs in the account too — same fire-and-forget
    // mirror every other import does. A failure is silent by design: the rows
    // are in this browser either way, and `/matchups` badges what is
    // browser-only.
    for (const entry of applied.written) void upsertCloudMatchup(entry);
    // Groups sort newest-first, so the copy is at the top when we land.
    router.push("/matchups");
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={fork}
        disabled={busy}
        className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:border-stone-400 hover:text-stone-900 disabled:opacity-50"
      >
        {busy ? t("Copying…") : t("⑂ Fork into my builder")}
      </button>
      <span className="ml-2 text-[11px] text-stone-400">
        {t("Makes your own editable copy. This page doesn’t change.")}
      </span>
      {note && <p className="mt-2 text-[11px] text-stone-600">{note}</p>}
    </div>
  );
}
