import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { SYSTEM_LEVELS } from "@/lib/auth-helpers";

const publicPaths = ["/", "/login", "/register", "/about", "/contact", "/p", "/api/auth", "/api/health"];
const memberPaths = ["/dashboard", "/profile", "/polls", "/documents"];
const adminPaths = ["/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // Allow public paths
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Not logged in -> login
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Pending users can only access registration-related pages
  if (user.status === "PENDING_REVIEW") {
    if (!pathname.startsWith("/register")) {
      return NextResponse.redirect(new URL("/register", req.url));
    }
    return NextResponse.next();
  }

  // Rejected users
  if (user.status === "REJECTED") {
    if (!pathname.startsWith("/register")) {
      return NextResponse.redirect(new URL("/register/rejected", req.url));
    }
    return NextResponse.next();
  }

  // Suspended users
  if (user.status === "SUSPENDED") {
    return NextResponse.redirect(new URL("/login?error=suspended", req.url));
  }

  // Admin paths require Admin tier
  if (adminPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if ((user.tierLevel ?? 0) < SYSTEM_LEVELS.ADMIN) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Member paths require tier > PENDING and APPROVED status
  if (memberPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if ((user.tierLevel ?? 0) <= SYSTEM_LEVELS.PENDING || user.status !== "APPROVED") {
      return NextResponse.redirect(new URL("/register/pending", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
