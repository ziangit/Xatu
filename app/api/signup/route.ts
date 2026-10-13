import { createClient } from "@supabase/supabase-js";
import { checkUsername, loginAddress } from "../../auth/handle";

/**
 * Username + password sign-up, Showdown style.
 *
 * This is a route handler rather than a direct client call for exactly one
 * reason: **it is the only point in the flow that can see the client's IP.**
 * The browser talks to Supabase Auth directly for everything else, so neither
 * our server nor Postgres ever learns an address — which is why the per-IP cap
 * the user asked for was impossible until sign-up came through here.
 *
 * The password passes through this handler on its way to Supabase. It is never
 * logged and never stored; `xatu never stores credentials` (CLAUDE.md) still
 * holds, and sign-*in* does not come through here at all, so the exposure is
 * one request at account creation.
 */

const CAP_PER_DAY = 3;

/** Vercel sets `x-forwarded-for`; the left-most entry is the client. */
function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim();
  return ip || null;
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SIGNUP_GUARD_SECRET;
  if (!url || !key || !secret) {
    // Fail closed. A missing secret means the cap cannot be enforced, and
    // silently creating accounts without it is the failure worth avoiding.
    return Response.json({ error: "unconfigured" }, { status: 503 });
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const problem = checkUsername(username);
  if (problem) return Response.json({ error: problem }, { status: 400 });
  if (password.length < 8)
    return Response.json({ error: "weak-password" }, { status: 400 });

  const ip = clientIp(req);
  if (!ip) return Response.json({ error: "no-ip" }, { status: 400 });

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: allowed, error: slotError } = await supabase.rpc(
    "claim_signup_slot",
    { p_ip: ip, p_secret: secret, p_cap: CAP_PER_DAY },
  );
  if (slotError) return Response.json({ error: "error" }, { status: 500 });
  if (allowed === false)
    return Response.json({ error: "ip-limit" }, { status: 429 });

  // The address is derived, never asked for. `.invalid` is reserved by
  // RFC 2606, so it can never resolve and cannot be mailed.
  const { error } = await supabase.auth.signUp({
    email: loginAddress(username),
    password,
    // The signup trigger prefers `name` over the address's local part, which
    // is how the chosen capitalisation survives.
    options: { data: { name: username } },
  });

  if (error) {
    // Supabase reports an existing address rather than an existing username,
    // which is the same thing here.
    const taken = /already|exists|registered/i.test(error.message);
    return Response.json(
      { error: taken ? "taken" : "error" },
      { status: taken ? 409 : 500 },
    );
  }
  return Response.json({ ok: true });
}
