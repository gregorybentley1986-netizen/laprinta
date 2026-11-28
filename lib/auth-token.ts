// Edge-compatible session token helpers (used by middleware and server code).
export const SESSION_COOKIE = "lp_admin";
export const SESSION_TTL_S = 60 * 60 * 24 * 14;

const DEV_PASSWORD = "laprinta";

export function adminPassword(): string | null {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return process.env.NODE_ENV === "production" ? null : DEV_PASSWORD;
}

function secret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || adminPassword();
}

const enc = new TextEncoder();

function toB64url(buf: ArrayBuffer) {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, key: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toB64url(await crypto.subtle.sign("HMAC", k, enc.encode(payload)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  const key = secret();
  if (!key) throw new Error("ADMIN_PASSWORD is not configured");
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_S;
  return `${exp}.${await sign(String(exp), key)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const key = secret();
  if (!token || !key) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await sign(exp, key));
}

export async function checkPassword(input: string): Promise<boolean> {
  const expected = adminPassword();
  if (!expected) return false;
  // Compare digests so timing does not depend on the password length.
  const [a, b] = await Promise.all([sign(input, "pw"), sign(expected, "pw")]);
  return safeEqual(a, b);
}
