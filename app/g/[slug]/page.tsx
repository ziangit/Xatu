import type { Metadata } from "next";
import { SITE_URL } from "../../site";
import { cardSubtitle, fetchPublishedMeta } from "../published-meta";
import { PublishedView } from "./view";

/**
 * The server half of a published page: the share card.
 *
 * This exists because a link to `/g/<slug>` is meant to be posted on X, and X
 * runs no JavaScript — whatever the client component renders is invisible to
 * it. Title, author and the six sprites have to be in the server response, so
 * the route is a server component that renders the client body.
 *
 * A failed lookup falls through to the root layout's metadata rather than
 * throwing: a card is a nicety, and the page itself still tells the reader
 * that the link is wrong.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = await fetchPublishedMeta(slug);
  if (!meta) return {};

  // The author's own description if they wrote one, otherwise the facts.
  const description = meta.description.trim()
    ? meta.description.trim().slice(0, 200)
    : cardSubtitle(meta);

  return {
    metadataBase: new URL(SITE_URL),
    title: `${meta.title} — xatu`,
    description,
    // The canonical URL is the slug, never the deployment host, so a card
    // scraped from a preview deploy still points at the real page.
    alternates: { canonical: `/g/${slug}` },
    openGraph: {
      type: "article",
      title: meta.title,
      description,
      url: `/g/${slug}`,
      siteName: "xatu",
    },
    twitter: { card: "summary_large_image", title: meta.title, description },
  };
}

export default async function PublishedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublishedView slug={slug} />;
}
