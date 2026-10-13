"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeaderNav, LegalFooter, NavLink, Wordmark } from "../nav";
import { useLang } from "../i18n/provider";
import { loadFeed, type FeedPost, type FeedSort } from "../demo/forum";
import { PostCard } from "./post-card";

/**
 * Published matchups, newest or most liked.
 *
 * Not "trending": that wants time decay and view counts, both of which need
 * tuning against traffic that does not exist yet. Two honest orderings beat one
 * ranking nobody can explain. See docs/PRODUCT.md.
 */
export default function FeedPage() {
  const { t } = useLang();
  const [sort, setSort] = useState<FeedSort>("new");
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  // Which ordering the rows in `posts` belong to. Comparing it with `sort` is
  // the loading flag — clearing `posts` in the effect body would be a
  // synchronous setState during an effect, i.e. a cascading render.
  const [loadedSort, setLoadedSort] = useState<FeedSort | null>(null);

  useEffect(() => {
    let alive = true;
    void loadFeed(sort).then((p) => {
      if (!alive) return;
      setPosts(p);
      setLoadedSort(sort);
    });
    return () => {
      alive = false;
    };
  }, [sort]);

  const loading = loadedSort !== sort;

  const tab = (value: FeedSort, label: string) => (
    <button
      onClick={() => setSort(value)}
      aria-pressed={sort === value}
      className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
        sort === value
          ? "bg-stone-200 text-stone-800"
          : "text-stone-400 hover:text-stone-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <header className="flex items-baseline justify-between border-b border-stone-200 pb-4">
          <div>
            <Wordmark />
            <p className="mt-1 text-xs text-stone-500">
              {t("Published matchups")}
            </p>
          </div>
          <HeaderNav back="/">
            <NavLink href="/demo">{t("builder")}</NavLink>
            <NavLink href="/matchups">{t("matchups")}</NavLink>
          </HeaderNav>
        </header>

        <div className="mt-4 flex items-center gap-1">
          {tab("new", t("Newest"))}
          {tab("liked", t("Most liked"))}
        </div>

        {loading && (
          <p className="late-fade-in mt-8 text-xs text-stone-400">
            {t("Loading…")}
          </p>
        )}

        {!loading && posts?.length === 0 && (
          <div className="mt-8">
            <p className="text-sm text-stone-600">
              {t("Nothing published yet.")}
            </p>
            <Link
              href="/matchups"
              className="mt-2 inline-block text-xs text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline"
            >
              {t("Publish one from My matchups →")}
            </Link>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {!loading && posts?.map((p) => <PostCard key={p.slug} post={p} />)}
        </div>

        <LegalFooter />
      </main>
    </div>
  );
}
