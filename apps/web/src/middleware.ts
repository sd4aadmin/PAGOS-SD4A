import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login"];

const ROLE_ROUTES: Record<string, string[]> = {
  "/admin/engineers": ["ADMIN", "ENGINEER"],
  "/admin/activity":  ["ADMIN", "ENGINEER"],
  "/admin":           ["ADMIN"],
  "/engineer":        ["ADMIN", "ENGINEER"],
  "/dashboard":       ["ADMIN", "ENGINEER", "CLIENT"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (req.auth && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (req.auth) {
    const role = req.auth.user?.role;
    for (const [prefix, allowed] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(prefix) && !allowed.includes(role)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
