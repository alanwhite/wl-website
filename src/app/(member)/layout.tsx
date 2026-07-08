import { auth } from "@/lib/auth";
import { getSiteInfo, getConfig } from "@/lib/config";
import { Header } from "@/components/layout/header";
import { MemberSidebar } from "@/components/layout/member-sidebar";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { Providers } from "@/components/layout/providers";
import { getNavLinks } from "@/lib/navigation";
import { getPinnedProjectNavItems } from "@/lib/project-access";
import { getContactManagerRoles, canManageContacts, getContactNavSortOrder } from "@/lib/config";
import { SYSTEM_LEVELS } from "@/lib/auth-helpers";
import { getNotificationCounts } from "@/lib/notifications";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";

export const dynamic = "force-dynamic";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, siteInfo, logoUrl, logoDarkUrl, navLinks] = await Promise.all([
    auth(),
    getSiteInfo(),
    getConfig("site.logoUrl"),
    getConfig("site.logoDarkUrl"),
    getNavLinks(),
  ]);

  const user = session?.user;

  // Filter nav links to member-visible internal links (for sidebar/bottom nav)
  const memberLinks = navLinks
    .filter((link) => {
      if (link.isExternal) return false;
      // Must require at least member access (not public links like About/Contact)
      if (link.minTierLevel === null && !link.requiredRoleSlug) return false;
      if (!user || user.status !== "APPROVED") return false;
      if ((user.tierLevel ?? 0) >= SYSTEM_LEVELS.ADMIN) return true;
      if (link.minTierLevel !== null && (user.tierLevel ?? 0) < link.minTierLevel) return false;
      if (link.requiredRoleSlug && !(user.roleSlugs ?? []).includes(link.requiredRoleSlug)) return false;
      return true;
    })
    .map((link) => ({
      label: link.label,
      href: link.href,
      icon: link.icon,
      sortOrder: link.sortOrder,
    }));

  // Auto-injected member nav items carry a sortOrder so they interleave with the
  // configured links rather than always landing at the end.
  if (user?.status === "APPROVED") {
    const existingHrefs = new Set(memberLinks.map((l) => l.href));

    // Pinned projects the user can access (default near the end, after config links)
    const pinnedProjects = await getPinnedProjectNavItems(user);
    pinnedProjects
      .filter((p) => !existingHrefs.has(p.href))
      .forEach((p, i) => memberLinks.push({ ...p, sortOrder: 900 + i }));

    // Contact inbox for users who can manage submissions — tied to the real
    // permission (never drifts), positioned via a configurable sort order
    const contactManagerRoles = await getContactManagerRoles();
    if (canManageContacts(user, contactManagerRoles) && !existingHrefs.has("/inbox")) {
      const inboxSort = await getContactNavSortOrder();
      memberLinks.push({ label: "Inbox", href: "/inbox", icon: "Inbox", sortOrder: inboxSort });
    }
  }

  memberLinks.sort((a, b) => a.sortOrder - b.sortOrder);

  // Fetch notification counts for badge display
  const notificationCounts = user?.status === "APPROVED"
    ? await getNotificationCounts(user)
    : {};

  // Public nav links (visible to everyone, including logged-out visitors) are
  // also surfaced in the logged-in header — so members can still reach things
  // like About, Contact, and event landing pages without leaving the app shell.
  const publicNavLinks = navLinks.filter(
    (link) => !link.isExternal && link.minTierLevel === null && !link.requiredRoleSlug,
  );

  return (
    <Providers session={session}>
      <div className="flex min-h-screen flex-col">
        <div className={process.env.STEALTH_MODE === "true" ? "hidden md:block" : ""}>
          <Header siteName={siteInfo.name} logoUrl={logoUrl} logoDarkUrl={logoDarkUrl} navLinks={publicNavLinks} />
        </div>
        <div className="flex flex-1">
          <MemberSidebar items={memberLinks} notificationCounts={notificationCounts} />
          <main className="min-w-0 flex-1 overflow-hidden px-4 py-8 pb-20 md:px-6 md:pb-8 print:overflow-visible print:p-0">
            {children}
          </main>
        </div>
        <MemberBottomNav items={memberLinks} notificationCounts={notificationCounts} />
        <ServiceWorkerRegister />
      </div>
    </Providers>
  );
}
