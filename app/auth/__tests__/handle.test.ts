import { describe, expect, it } from "vitest";
import { isHandleAddress, loginAddress } from "../handle";

/**
 * The address a sign-up creates and the one a sign-in looks for are derived by
 * the same function on the server and in the browser. If they ever disagree,
 * accounts become unreachable rather than merely broken — hence these.
 */
describe("login handles", () => {
  it("lower-cases, so a username's capitalisation can't fork the account", () => {
    expect(loginAddress("ZiangSun")).toBe("ziangsun@xatu.invalid");
    expect(loginAddress("ziangsun")).toBe(loginAddress("ZIANGSUN"));
  });

  it("trims, because the signup field is free text", () => {
    expect(loginAddress("  Phalap  ")).toBe("phalap@xatu.invalid");
  });

  it("uses a domain that can never resolve", () => {
    // RFC 2606 reserves `.invalid`. This is what makes the address safe to
    // mint without owning a mailbox — and why there is no password reset.
    expect(loginAddress("x")).toMatch(/@xatu\.invalid$/);
  });

  it("recognises its own addresses and nothing else", () => {
    expect(isHandleAddress("phalap@xatu.invalid")).toBe(true);
    // A real mailbox must never be mistaken for one of ours: `login_address()`
    // refuses to return these, or the username list would be an email
    // directory.
    expect(isHandleAddress("someone@gmail.com")).toBe(false);
    expect(isHandleAddress("spoof@xatu.invalid.evil.com")).toBe(false);
    expect(isHandleAddress(null)).toBe(false);
  });
});
