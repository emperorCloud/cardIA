//proxy.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/register");

  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

// IMPORTANT : "api" est exclu ici. Sans ça, le proxy intercepte aussi
// /api/auth/callback/credentials, /api/register, etc., et les redirige
// vers /login en conservant leur méthode POST — ce que la page /login
// ne sait pas gérer (405). Chaque route API gère déjà son propre
// contrôle d'authentification via auth() dans son handler.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};