"use client";

import Link from "next/link";
import { MonIcon } from "../demo/components";
import { useLang } from "../i18n/provider";
import { htmlLang } from "../i18n/translate";
import type { FeedPost } from "../demo/forum";

/**
 * One published matchup, as a card.
 *
 * Shared by `/feed` (a one-column list) and the landing page (a three-column
 * row) so the two cannot drift — the same reason `ExistingTeamList` and
 * `BoardView` exist. It carries `h-full` and pushes its sprite row down with
 * `mt-auto`, which squares up a grid row and does nothing at all in a list,
 * so one component covers both without a variant prop.
 */
export function PostCard({ post }: { post: FeedPost }) {
  const { t, lang, n } = useLang();
  return (
    <Link
      href={`/g/${post.slug}`}
      className="grow-in flex h-full flex-col rounded-lg border border-stone-200 bg-white p-4 transition-colors hover:border-stone-300"
    >
      <span className="self-start rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">
        {post.regulation.replace(/^\[.*?\]\s*/, "")}
      </span>
      <h3 className="mt-1.5 text-base font-bold leading-snug text-stone-900">
        {post.title}
      </h3>
      <p className="mt-1 text-[11px] text-stone-500">
        {/* Username only. Nothing else about an account is public. */}
        {post.author
          ? t("by {author}", { author: post.author })
          : t("by a deleted account")}
        {" · "}
        {new Date(post.createdAt).toLocaleDateString(htmlLang(lang))}
        {" · "}
        {n(post.opponentCount, "opposing team", "opposing teams")}
        {" · ♥ "}
        {post.likeCount}
        {" · 💬 "}
        {post.commentCount}
      </p>
      {post.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-600">
          {post.description}
        </p>
      )}
      <span className="mt-auto flex flex-wrap items-center gap-1 pt-2">
        {post.species.map((s, i) => (
          <MonIcon key={`${s}-${i}`} species={s} scale={0.7} />
        ))}
        <span className="ml-1 text-[11px] text-stone-500">{post.teamName}</span>
      </span>
    </Link>
  );
}
