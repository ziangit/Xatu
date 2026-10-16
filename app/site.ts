/**
 * The site's own origin, for absolute URLs in share cards.
 *
 * Next derives `metadataBase` from `VERCEL_URL` when it isn't set, and on
 * Vercel that is the *deployment-specific* host — a different hostname on
 * every push. An Open Graph image URL has to keep working after the next
 * deploy, because X and Discord cache the card and re-fetch it later, so the
 * canonical domain is stated here instead of inferred.
 */
export const SITE_URL =
  process.env.VERCEL_ENV === "production"
    ? "https://xatu-six.vercel.app"
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:7317";

/**
 * The project's source. One constant, because it is now linked from the header
 * of every page as well as the landing footer, and two copies would drift.
 */
export const GITHUB_URL = "https://github.com/ziangit/Xatu";
