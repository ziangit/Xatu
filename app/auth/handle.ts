/**
 * Usernames as login handles.
 *
 * Framework-free and shared by the signup route (server) and the login page
 * (browser), so the address a sign-up creates and the one a sign-in looks for
 * can never drift apart.
 */

/** Mirrors `profiles_username_shape` in supabase/profiles.sql — keep both. */
const SHAPE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,19}$/;

/**
 * Names that would let someone pose as the site, plus `trainer` — the stem of
 * the auto-assigned fallback. Keep in step with `v_reserved` in
 * supabase/initial-username.sql.
 */
const RESERVED = new Set([
  "xatu",
  "admin",
  "administrator",
  "moderator",
  "mod",
  "support",
  "official",
  "system",
  "root",
  "trainer",
]);

export type UsernameProblem = "too-short" | "too-long" | "charset" | "reserved";

/** Null when the name is usable. Pure, so it is unit-tested. */
export function checkUsername(raw: string): UsernameProblem | null {
  const name = raw.trim();
  if (name.length < 3) return "too-short";
  if (name.length > 20) return "too-long";
  if (!SHAPE.test(name)) return "charset";
  if (RESERVED.has(name.toLowerCase())) return "reserved";
  return null;
}

/**
 * The address an account is stored under. Never shown, never typed.
 *
 * `.invalid` is reserved by RFC 2606 and can never resolve, so this cannot be
 * mistaken for a mailbox or mailed to — which is also why there is no password
 * reset for these accounts.
 */
export const LOGIN_DOMAIN = "xatu.invalid";
export const loginAddress = (username: string) =>
  `${username.trim().toLowerCase()}@${LOGIN_DOMAIN}`;

/** True for an account created through the username flow. */
export const isHandleAddress = (email: string | null | undefined) =>
  Boolean(email?.endsWith(`@${LOGIN_DOMAIN}`));
