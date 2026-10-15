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
      className="grow-in flex h-full flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(28,25,23,0.08)]"
    >
      <span className="self-start rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        {post.regulation.replace(/^\[.*?\]\s*/, "")}
      </span>
      <h3 className="font-display mt-2.5 text-lg font-bold leading-tight tracking-tight text-stone-900">
        {post.title}
      </h3>
      <p className="mt-1.5 text-[11px] text-stone-500">
        {/* Username only. Nothing else about an account is public. */}
        <span className="font-medium text-stone-700">
          {post.author
            ? t("by {author}", { author: post.author })
            : t("by a deleted account")}
        </span>
        {" · "}
        {new Date(post.createdAt).toLocaleDateString(htmlLang(lang))}
      </p>
      {post.description && (
        <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-stone-600">
          {post.description}
        </p>
      )}
      {/* The footer is pinned to the bottom with `mt-auto`, which squares up a
          grid row on the landing page and does nothing in the feed's list. */}
      <span className="mt-auto block pt-4">
        <span className="flex flex-wrap items-center gap-1.5">
          {post.species.map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50"
            >
              <MonIcon species={s} scale={0.8} />
            </span>
          ))}
        </span>
        <span className="mt-2.5 flex items-center gap-2.5 text-[11px] text-stone-500">
          <span className="min-w-0 flex-1 truncate">{post.teamName}</span>
          <span className="shrink-0 whitespace-nowrap">
            {n(post.opponentCount, "opposing team", "opposing teams")}
          </span>
          <span className="shrink-0 whitespace-nowrap text-[#e5484d]">
            ♥ {post.likeCount}
          </span>
          <span className="shrink-0 whitespace-nowrap">
            💬 {post.commentCount}
          </span>
        </span>
      </span>
    </Link>
  );
}
