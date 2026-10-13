"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InlineConfirm } from "../ui";
import { useT } from "../i18n/provider";
import { currentUserId } from "../auth/session";
import { unpublishGroup } from "../demo/publish";
import { groupByMyTeam, loadMatchups } from "../demo/storage";

/**
 * What the author of a post can do to it, on the post.
 *
 * **It sits above the title, not in the body.** These are controls over the
 * page rather than parts of it: an author reading their own post should not
 * find a destructive button between the description and the report, and a
 * reader should not have to scroll past a line explaining a button they will
 * never see. Fork stays below, because that one *is* addressed to the reader.
 *
 * It is not in the nav either. The nav is the same on every page, and these
 * belong to this one — and the language toggle's rule (docs/ARCHITECTURE.md →
 * "Header order") says nothing variable may sit to its right.
 *
 * This is also the delete path that works for **every** post. `/matchups` can
 * only offer one for a set it can match to a published row by `team_id`, and
 * posts published before that column existed carry none. Here the question is
 * just "is this mine", which is answerable for any post.
 *
 * Nothing here is load-bearing for security: RLS refuses a delete from anyone
 * but the author, so the worst a forged `isAuthor` buys is a button that fails.
 */
export function AuthorControls({
  slug,
  authorId,
  teamId,
}: {
  slug: string;
  authorId: string;
  teamId: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [mine, setMine] = useState(false);
  const [editable, setEditable] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void currentUserId().then((id) => {
      if (!alive) return;
      setMine(id === authorId);
      // Editing means re-publishing from the composer, which reads the set out
      // of *this browser*. On another device the set may not be here yet, and
      // a link to a page that says "that set isn't in this browser" is worse
      // than no link — so the control appears only when it would work. Read
      // inside the promise, both because storage is browser-only and because
      // only the author's answer matters.
      if (id === authorId && teamId)
        setEditable(
          groupByMyTeam(loadMatchups()).some((g) => g.teamId === teamId),
        );
    });
    return () => {
      alive = false;
    };
  }, [authorId, teamId]);

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
    <div className="mt-6 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-b border-stone-100 pb-3">
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
        <>
          <span className="mr-auto text-[11px] text-stone-400">
            {t("Your post — only you see these.")}
          </span>
          {editable && (
            // Re-publishing updates this same page in place, so the composer
            // is the edit screen; it was reachable only by going to
            // /matchups and finding the set again.
            <Link
              href={`/matchups/${teamId}/report`}
              className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-600 transition-colors hover:border-stone-500 hover:text-stone-900"
            >
              {t("edit this post")}
            </Link>
          )}
          <button
            onClick={() => setConfirming(true)}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-500 transition-colors hover:border-[#e5484d] hover:text-[#e5484d]"
          >
            {t("unpublish")}
          </button>
        </>
      )}
      {failed && (
        <span className="text-[11px] text-amber-700">
          {t("Couldn’t take it down — try again.")}
        </span>
      )}
    </div>
  );
}
