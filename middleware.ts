import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth-token";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  // Build the redirect URL from the public host (nginx sends Host=$host and
  // X-Forwarded-Proto=$scheme) so the Location header points at the real
  // domain, not the internal localhost:3000 that req.nextUrl reports here.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : req.nextUrl.origin;
  const url = new URL("/admin/login", base);
  url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

// Upload route handlers authenticate themselves, so large bodies skip middleware buffering.
export const config = { matcher: ["/admin", "/admin/:path*"] };
