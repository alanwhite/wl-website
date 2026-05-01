import { auth } from "@/lib/auth";
import { getSiteInfo, getConfig } from "@/lib/config";
import { Header } from "@/components/layout/header";
import { MemberSidebar } from "@/components/layout/member-sidebar";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { Providers } from "@/components/layout/providers";
import { getNavLinks } from "@/lib/navigation";
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
    }));

  // Fetch notification counts for badge display
  const notificationCounts = user?.status === "APPROVED"
    ? await getNotificationCounts(user)
    : {};

  return (
    <Providers session={session}>
      <div className="flex min-h-screen flex-col">
        <Header siteName={siteInfo.name} logoUrl={logoUrl} logoDarkUrl={logoDarkUrl} navLinks={[]} />
        <div className="flex flex-1">
          <MemberSidebar items={memberLinks} notificationCounts={notificationCounts} />
          <main className="flex-1 px-4 py-8 pb-20 md:px-6 md:pb-8">
            {children}
          </main>
        </div>
        <MemberBottomNav items={memberLinks} notificationCounts={notificationCounts} />
        <ServiceWorkerRegister />
      </div>
    </Providers>
  );
}
