"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeaderNav, LegalFooter, NavLink, Wordmark } from "../../nav";
import { useLang } from "../../i18n/provider";
import { MonIcon } from "../../demo/components";
import { decodeWorkflowGroup } from "../../demo/workflow-io";
import { loadPublished, type PublishedGroup } from "../../demo/publish";
import { htmlLang } from "../../i18n/translate";
import { BoardView } from "../board-view";
import { Discussion } from "../discussion";
import { ForkButton } from "../fork";
import { AuthorControls } from "../author-controls";
import { ReportProse } from "../report-prose";
import { reportKey } from "../../demo/report";

/**
 * A published group, read-only, at a short slug fit to post on X.
 *
 * Read-only is structural rather than a permission check: this page renders a
 * different component tree from the builder, with no handlers in it at all.
 * There is nothing to disable and nothing to forget to disable.
 *
 * It works signed out — that is the entire point of a shared link — so every
 * read here goes through the anon key against world-readable rows.
 *
 * The body is a client component and the route's `page.tsx` is not: a crawler
 * runs no JavaScript, so the share card's title and author have to be in the
 * server-rendered `<head>`. See `generateMetadata` there.
 */
export function PublishedView({ slug }: { slug: string }) {
  const { t, lang, n } = useLang();
  const [post, setPost] = useState<PublishedGroup | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">(
    "loading",
  );

  useEffect(() => {
    let alive = true;
    void loadPublished(slug).then((p) => {
      if (!alive) return;
      setPost(p);
      setState(p ? "ready" : "missing");
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  const decoded = post ? decodeWorkflowGroup(post.document, lang) : null;
  const group = decoded?.ok ? decoded : null;

  return (
    <div className="min-h-screen w-full bg-[#fafaf8] font-sans text-stone-900">
      {/* Wider than the usual max-w-5xl: a turn card is 520px, so two columns
          plus the gap need ~1,100 and were being clipped at the right edge,
          which reads as broken rather than scrollable. The prose below keeps
          its own narrow measure. */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="flex items-baseline justify-between border-b border-stone-200 pb-4">
          <Wordmark />
          <HeaderNav back="/">
            <NavLink href="/feed">{t("published")}</NavLink>
            <NavLink href="/matchups">{t("matchups")}</NavLink>
          </HeaderNav>
        </header>

        {state === "loading" && (
          <p className="late-fade-in mt-10 text-xs text-stone-400">
            {t("Loading…")}
          </p>
        )}

        {state === "missing" && (
          <div className="mt-10">
            <p className="text-sm text-stone-600">
              {t(
                "This matchup isn’t here — the link may be wrong, or its author removed it.",
              )}
            </p>
            <Link
              href="/"
              className="mt-3 inline-block text-xs text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline"
            >
              {t("back to the home page")}
            </Link>
          </div>
        )}

        {state === "ready" && post && (
          <>
            {/* Above the post, not inside it: controls *over* the page rather
                than parts of it. The reader's control (fork) stays below. */}
            <AuthorControls
              slug={post.slug}
              authorId={post.userId}
              teamId={post.teamId}
            />
            <div className="mt-8">
              <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">
                {post.regulation.replace(/^\[.*?\]\s*/, "")}
              </span>
              <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-stone-900">
                {post.title}
              </h1>
              <p className="mt-1.5 text-xs text-stone-500">
                {/* A username and a date. Nothing else is public — see
                    docs/PRODUCT.md and app/auth/profile.ts. */}
                {post.author
                  ? t("by {author}", { author: post.author })
                  : t("by a deleted account")}
                {" · "}
                {new Date(post.createdAt).toLocaleDateString(htmlLang(lang))}
                {" · "}
                {n(post.opponentCount, "opposing team", "opposing teams")}
              </p>
              <span className="mt-3 flex flex-wrap items-center gap-1">
                {post.species.map((s, i) => (
                  <MonIcon key={`${s}-${i}`} species={s} scale={0.8} />
                ))}
                <span className="ml-1 text-xs font-medium text-stone-600">
                  {post.teamName}
                </span>
              </span>
              {post.description && (
                <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                  {post.description}
                </p>
              )}
              {/* Only offered when the document actually decoded — forking
                  something we couldn't read would write a broken group. */}
              {group && <ForkButton slug={post.slug} group={group} />}
            </div>

            {!group && (
              <p className="mt-8 text-xs text-amber-700">
                {t(
                  "This matchup couldn’t be read — it may have been published by a newer version.",
                )}
              </p>
            )}

            {group?.boards.map((board) => (
              <section key={board.opp.id} className="mt-10">
                {/* The author's words above the matchup they are about. A post
                    with no report renders nothing here and reads exactly as it
                    did before reports existed. */}
                <ReportProse
                  text={post.report?.before?.[reportKey(board.opp)]}
                  className="mb-4"
                />
                <h2 className="flex items-center gap-2 text-sm font-bold text-stone-800">
                  <span className="flex">
                    {board.opp.parsed.map((m, i) => (
                      <MonIcon
                        key={`${m.species}-${i}`}
                        species={m.species}
                        scale={0.7}
                      />
                    ))}
                  </span>
                  {t("vs. {team}", { team: board.opp.name })}
                </h2>
                {board.nodes.length === 0 ? (
                  <p className="mt-2 text-xs text-stone-400">
                    {t("no plan yet")}
                  </p>
                ) : (
                  <div className="mt-3">
                    <BoardView
                      myRoster={group.my.parsed.map((m) => m.species)}
                      oppRoster={board.opp.parsed.map((m) => m.species)}
                      nodes={board.nodes}
                    />
                  </div>
                )}
              </section>
            ))}

            <ReportProse text={post.report?.outro} className="mt-10" />

            <Discussion slug={post.slug} />
          </>
        )}

        <LegalFooter />
      </main>
    </div>
  );
}
