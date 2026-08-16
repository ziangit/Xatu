import { cookies } from "next/headers";
import { LANG_COOKIE, readLang, type Lang } from "./translate";

/**
 * The chosen language, server-side. Reading a cookie is a request-time API, so
 * this opts the whole route tree into dynamic rendering — the deliberate price
 * of having the first paint already be in the right language. Nothing in this
 * app fetches on the server, so the cost is a server render that was previously
 * a static file, and no data round trip.
 *
 * Importing `next/headers` makes this server-only by construction: a client
 * component that reaches for it fails the build.
 */
export async function readLocale(): Promise<Lang> {
  const store = await cookies();
  return readLang(store.get(LANG_COOKIE)?.value);
}
