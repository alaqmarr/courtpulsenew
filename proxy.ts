import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authEdgeConfig } from "@courtpulse/auth/auth.edge";

const { auth } = NextAuth(authEdgeConfig);

const PUBLIC_PREFIXES = ["/sign-in", "/sign-up", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  if (/^\/team\/[^/]+\/stats(\/.*)?$/.test(pathname)) {
    return true;
  }
  if (/^\/tournament\/[^/]+(\/.*)?$/.test(pathname)) {
    return true;
  }
  if (/^\/api\/tournament\/[^/]+\/auction-state$/.test(pathname)) {
    return true;
  }
  return false;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth?.user);

  if (!isLoggedIn && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (isLoggedIn && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
