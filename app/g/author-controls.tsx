"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InlineConfirm } from "../ui";
import { useT } from "../i18n/provider";
import { getSupabase } from "../auth/client";
import { unpublishGroup } from "../demo/publish";

/**
 * What the author of a post can do to it, on the post.
 *
 * This is the delete path that works for **every** post. `/matchups` can only
 * offer one for a set it can match to a published row by `team_id`, and posts
 * published before that column existed carry none. Here the question is just
 * "is this mine", which is answerable for any post.
 *
 * Nothing here is load-bearing for security: RLS refuses a delete from anyone
 * but the author, so the worst a forged `isAuthor` buys is a button that fails.
 */
export function AuthorControls({
  slug,
  authorId,
}: {
  slug: string;
  authorId: string;
}) {
  const t = useT();
  const router = useRouter();
  const [mine, setMine] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void getSupabase()
      ?.auth.getUser()
      .then(({ data }) => {
        if (alive) setMine(data.user?.id === authorId);
      });
    return () => {
      alive = false;
    };
  }, [authorId]);

  if (!mine) return null;

  const remove = async () => {
    setBusy(true);
    const ok = await unpublishGroup(slug);
    setBusy(false);
    setConfirming(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    // The page it was showing is gone, so staying on it would 404 on reload.
    router.push("/feed");
  };

  return (
    <div className="mt-4 flex items-center gap-3">
      {confirming ? (
        <InlineConfirm
          question={t(
            "Take this off the web? Your set stays in your matchups.",
          )}
          confirmLabel={t("Unpublish")}
          busy={busy}
          onConfirm={() => void remove()}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-500 transition-colors hover:border-[#e5484d] hover:text-[#e5484d]"
        >
          {t("unpublish")}
        </button>
      )}
      {!confirming && (
        <span className="text-[11px] text-stone-400">
          {t("Only you can see this — it's your post.")}
        </span>
      )}
      {failed && (
        <span className="text-[11px] text-amber-700">
          {t("Couldn’t take it down — try again.")}
        </span>
      )}
    </div>
  );
}
