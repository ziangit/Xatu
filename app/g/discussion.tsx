"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InlineConfirm } from "../ui";
import { useLang } from "../i18n/provider";
import { htmlLang } from "../i18n/translate";
import {
  addComment,
  deleteComment,
  loadComments,
  loadLikes,
  toggleLike,
  type Comment,
} from "../demo/forum";
import { getSupabase } from "../auth/client";

/**
 * Likes and a flat comment list under a published matchup.
 *
 * Flat on purpose — no replies to replies (docs/PRODUCT.md). A thread that can
 * nest needs collapsing, depth limits and a moderation story; a list does not.
 *
 * Signed-out visitors read everything and are told to sign in rather than
 * shown dead controls. The buttons are a courtesy: RLS is what actually
 * refuses, so nothing here is load-bearing for security.
 */
export function Discussion({ slug }: { slug: string }) {
  const { t, lang } = useLang();
  const [signedIn, setSignedIn] = useState(false);
  const [likes, setLikes] = useState({ count: 0, mine: false });
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = getSupabase();
    void supabase?.auth.getUser().then(({ data }) => {
      if (alive) setSignedIn(Boolean(data.user));
    });
    void loadLikes(slug).then((l) => alive && setLikes(l));
    void loadComments(slug).then((c) => alive && setComments(c));
    return () => {
      alive = false;
    };
  }, [slug]);

  const onLike = async () => {
    // Optimistic: the count is cosmetic, and a failed toggle is re-read below.
    const next = !likes.mine;
    setLikes((l) => ({ count: l.count + (next ? 1 : -1), mine: next }));
    const result = await toggleLike(slug, likes.mine);
    if (result === null) void loadLikes(slug).then(setLikes);
  };

  const onSend = async () => {
    setBusy(true);
    const r = await addComment(slug, draft);
    setBusy(false);
    if (r.ok) {
      setDraft("");
      setComments(await loadComments(slug));
    }
  };

  return (
    <section className="mt-12 border-t border-stone-200 pt-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => void onLike()}
          disabled={!signedIn}
          title={signedIn ? undefined : t("Sign in to like or comment.")}
          className={`rounded border px-2.5 py-1 text-xs transition-colors ${
            likes.mine
              ? "border-[#e5484d] bg-[#e5484d] text-white"
              : "border-stone-300 bg-white text-stone-600 hover:border-stone-500"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          ♥ {likes.count}
        </button>
        <span className="text-xs text-stone-400">
          {t("💬 {n}", { n: comments?.length ?? 0 })}
        </span>
      </div>

      {signedIn ? (
        <div className="mt-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={t("Add a comment")}
            className="w-full resize-y rounded border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-800 placeholder:text-stone-300 focus:border-stone-500 focus:outline-none"
          />
          <button
            onClick={() => void onSend()}
            disabled={busy || !draft.trim()}
            className="mt-2 rounded bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:opacity-80 disabled:opacity-40"
          >
            {busy ? t("Posting…") : t("Post comment")}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-stone-500">
          <Link
            href="/login"
            className="underline underline-offset-2 hover:text-stone-900"
          >
            {t("Sign in")}
          </Link>{" "}
          {t("to like or comment.")}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {comments?.map((c) => (
          <div key={c.id} className="border-t border-stone-100 pt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-stone-700">
                {c.author ?? t("a deleted account")}
              </span>
              <span className="text-[10px] text-stone-400">
                {new Date(c.createdAt).toLocaleDateString(htmlLang(lang))}
              </span>
              {c.mine &&
                (confirmId === c.id ? (
                  <span className="ml-auto">
                    <InlineConfirm
                      question={t("Delete this comment?")}
                      onConfirm={() => {
                        setConfirmId(null);
                        void deleteComment(c.id).then(async () =>
                          setComments(await loadComments(slug)),
                        );
                      }}
                      onCancel={() => setConfirmId(null)}
                    />
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmId(c.id)}
                    className="ml-auto text-[10px] text-stone-400 underline-offset-2 hover:text-[#e5484d] hover:underline"
                  >
                    {t("delete")}
                  </button>
                ))}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-stone-700">
              {c.body}
            </p>
          </div>
        ))}
        {comments?.length === 0 && (
          <p className="text-xs text-stone-400">{t("No comments yet.")}</p>
        )}
      </div>
    </section>
  );
}
