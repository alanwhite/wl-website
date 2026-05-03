import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { SYSTEM_LEVELS } from "@/lib/auth-helpers";

const alwaysPublicPaths = ["/login", "/register", "/api/auth", "/api/health", "/api/postcode-check", "/api/manifest", "/api/export"];
const publicContentPaths = ["/", "/about", "/contact", "/p", "/api/calendar.ics"];
const memberPaths = ["/dashboard", "/profile", "/polls", "/documents", "/members", "/calendar", "/financials", "/announcements", "/forms", "/groups", "/pages", "/manage"];
const adminPaths = ["/admin"];

const stealthMode = process.env.STEALTH_MODE === "true";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // Always-public paths (auth endpoints, health, etc.)
  if (alwaysPublicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Public content paths — blocked in stealth mode
  if (!stealthMode && publicContentPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Public form pages (not in stealth mode)
  if (!stealthMode && pathname.startsWith("/forms/") && !pathname.includes("/submissions") && !pathname.startsWith("/forms/manage")) {
    const segments = pathname.replace("/forms/", "").split("/").filter(Boolean);
    if (segments.length === 1 || (segments.length === 2 && segments[1] === "print")) {
      return NextResponse.next();
    }
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/|sw\\.js).*)"],
};
