"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { UserNav } from "./user-nav";
import { SYSTEM_LEVELS } from "@/lib/auth-helpers";

interface NavLink {
  label: string;
  href: string;
  isExternal: boolean;
  minTierLevel: number | null;
  requiredRoleSlug: string | null;
  // Backward compat
  visibility?: "public" | "members" | "all";
}

interface HeaderProps {
  siteName: string;
  logoUrl?: string | null;
  navLinks?: NavLink[];
}

export function Header({ siteName, logoUrl, navLinks }: HeaderProps) {
  const { data: session, status } = useSession();

  const defaultLinks: NavLink[] = [
    { label: "About", href: "/about", isExternal: false, minTierLevel: null, requiredRoleSlug: null },
    { label: "Contact", href: "/contact", isExternal: false, minTierLevel: null, requiredRoleSlug: null },
  ];

  const links = navLinks && navLinks.length > 0 ? navLinks : defaultLinks;
  const user = session?.user;

  const visibleLinks = links.filter((link) => {
    // Backward compat for old visibility format
    if (link.visibility && link.minTierLevel === undefined) {
      if (link.visibility === "public") return true;
      if (link.visibility === "members") return !!user;
      return true;
    }

    // New tier/role format
    if (link.minTierLevel === null && !link.requiredRoleSlug) return true; // public
    if (!user) return false;
    if (user.status !== "APPROVED") return false;

    // Admin sees everything
    if ((user.tierLevel ?? 0) >= SYSTEM_LEVELS.ADMIN) return true;

    if (link.minTierLevel !== null && (user.tierLevel ?? 0) < link.minTierLevel) return false;
    if (link.requiredRoleSlug && !(user.roleSlugs ?? []).includes(link.requiredRoleSlug)) return false;
    return true;
  });

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          {logoUrl ? (
            <Image src={logoUrl} alt={siteName} width={32} height={32} className="h-8 w-auto" />
          ) : null}
          {siteName}
        </Link>
        <nav className="flex items-center gap-4">
          {visibleLinks.map((link) =>
            link.isExternal ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            )
          )}
          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : session?.user ? (
            <UserNav user={session.user} />
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
