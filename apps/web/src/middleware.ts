import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login"];

const ROLE_ROUTES: Record<string, string[]> = {
  "/admin/activity":  ["ADMIN", "ENGINEER"],
  "/admin":           ["ADMIN"],
  "/engineers":       ["ADMIN", "ENGINEER"],
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
    // Find the most specific matching prefix (longest first)
    const sorted = Object.entries(ROLE_ROUTES).sort((a, b) => b[0].length - a[0].length);
    for (const [prefix, allowed] of sorted) {
      if (pathname.startsWith(prefix)) {
        if (!allowed.includes(role)) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        break;
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
