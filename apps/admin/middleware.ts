import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getExpectedSessionToken, isAuthConfigured, SESSION_COOKIE } from "./lib/session";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/_next/")
  );
}

export function middleware(request: NextRequest) {
  if (!isAuthConfigured() || isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const expectedToken = getExpectedSessionToken();
  if (token && token === expectedToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
