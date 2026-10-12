"use client";

import { useState } from "react";
import { useCopy } from "../ui";
import { useT } from "../i18n/provider";
import { publishGroup } from "../demo/publish";
import type { SavedMatchup, StoredTeam } from "../demo/storage";

/**
 * Publish a group: a title, an optional description, and a short link back.
 *
 * In place, like every other confirmation in this app — no dialog. The link is
 * the whole point of the feature, so it is shown large with a copy button the
 * moment it exists, rather than a toast that disappears before it can be used.
 */
export function PublishPanel({
  my,
  boards,
  onClose,
}: {
  my: StoredTeam;
  boards: SavedMatchup[];
  onClose: () => void;
}) {
  const t = useT();
  const { copied, copy } = useCopy();
  const [title, setTitle] = useState(my.name);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const url =
    slug && typeof window !== "undefined"
      ? `${window.location.origin}/g/${slug}`
      : null;

  const submit = async () => {
    setBusy(true);
    setProblem(null);
    const r = await publishGroup({ my, boards, title, description });
    setBusy(false);
    if (r.ok) setSlug(r.slug);
    else setProblem(r.reason);
  };

  if (url) {
    return (
      <div className="grow-in mt-2 rounded-lg border border-stone-200 bg-white p-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
          {t("Published")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded bg-stone-50 px-2 py-1.5 text-xs text-stone-700">
            {url}
          </code>
          <button
            onClick={() => copy(url)}
            className="shrink-0 rounded bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:opacity-80"
          >
            {copied ? t("Copied ✓") : t("copy link")}
          </button>
          <a
            href={`/g/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[11px] text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline"
          >
            {t("open it ↗")}
          </a>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
          {t("Anyone with the link can read it. Publish again to update it.")}
        </p>
        <button
          onClick={onClose}
          className="mt-2 text-[11px] text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
        >
          {t("close")}
        </button>
      </div>
    );
  }

  return (
    <div className="grow-in mt-2 rounded-lg border border-stone-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
        {t("Publish this set")}
      </p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder={t("Title")}
        className="mt-2 w-full rounded border border-stone-300 px-2 py-1.5 text-xs text-stone-800 focus:border-stone-500 focus:outline-none"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={4000}
        rows={3}
        placeholder={t("Say something about it — optional")}
        className="mt-2 w-full resize-y rounded border border-stone-300 px-2 py-1.5 text-xs text-stone-800 placeholder:text-stone-300 focus:border-stone-500 focus:outline-none"
      />
      {problem && (
        <p className="mt-2 text-[11px] text-amber-700">
          {problem === "no-username"
            ? t(
                "Pick a username first — it’s your byline. Open the account menu.",
              )
            : problem === "signed-out"
              ? t("Sign in to publish.")
              : problem === "empty"
                ? t("A title is required.")
                : t("Couldn’t publish — try again.")}
        </p>
      )}
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={busy || !title.trim()}
          className="rounded bg-[#e5484d] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-85 disabled:opacity-40"
        >
          {busy ? t("Publishing…") : t("Publish")}
        </button>
        <button
          onClick={onClose}
          className="text-[11px] text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
