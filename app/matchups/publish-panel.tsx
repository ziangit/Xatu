"use client";

import { useState } from "react";
import { InlineConfirm, useCopy } from "../ui";
import { useT } from "../i18n/provider";
import {
  publishGroup,
  unpublishGroup,
  type MyPublished,
} from "../demo/publish";
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
  published,
  onChanged,
  onClose,
}: {
  my: StoredTeam;
  boards: SavedMatchup[];
  /** Where this set is already public, if it is. */
  published?: MyPublished;
  /** Something changed on the server — the list should re-read. */
  onChanged: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const { copied, copy } = useCopy();
  const [title, setTitle] = useState(published?.title ?? my.name);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState<string | null>(published?.slug ?? null);
  const [confirmGone, setConfirmGone] = useState(false);
  const [gone, setGone] = useState(false);
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
    if (r.ok) {
      setSlug(r.slug);
      onChanged();
    } else setProblem(r.reason);
  };

  /** Take it down. The set itself is untouched — only the public copy goes. */
  const unpublish = async () => {
    if (!slug) return;
    setBusy(true);
    const ok = await unpublishGroup(slug);
    setBusy(false);
    setConfirmGone(false);
    if (!ok) {
      setProblem("error");
      return;
    }
    setGone(true);
    setSlug(null);
    onChanged();
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
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-[11px] text-stone-400 underline-offset-2 hover:text-stone-800 hover:underline"
          >
            {t("close")}
          </button>
          {confirmGone ? (
            <InlineConfirm
              question={t("Take this off the web? Your set stays here.")}
              confirmLabel={t("Unpublish")}
              busy={busy}
              onConfirm={() => void unpublish()}
              onCancel={() => setConfirmGone(false)}
            />
          ) : (
            <button
              onClick={() => setConfirmGone(true)}
              className="text-[11px] text-stone-400 underline-offset-2 transition-colors hover:text-[#e5484d] hover:underline"
            >
              {t("unpublish")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grow-in mt-2 rounded-lg border border-stone-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
        {t("Publish this set")}
      </p>
      {gone && (
        <p className="mt-1 text-[11px] text-stone-500">
          {t("Taken down. The link no longer works for anyone.")}
        </p>
      )}
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
                : problem === "rate-limited"
                  ? t(
                      "That’s 5 new posts today — the daily limit. Editing a post you already published still works.",
                    )
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
