import { auth } from "@/lib/auth";
import { getSiteInfo, getConfig } from "@/lib/config";
import { Header } from "@/components/layout/header";
import { MemberSidebar } from "@/components/layout/member-sidebar";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { Providers } from "@/components/layout/providers";

export const dynamic = "force-dynamic";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, siteInfo, logoUrl] = await Promise.all([
    auth(),
    getSiteInfo(),
    getConfig("site.logoUrl"),
  ]);

  return (
    <Providers session={session}>
      <div className="flex min-h-screen flex-col">
        <Header siteName={siteInfo.name} logoUrl={logoUrl} navLinks={[]} />
        <div className="flex flex-1">
          <MemberSidebar />
          <main className="flex-1 px-4 py-8 pb-20 md:px-6 md:pb-8">
            {children}
          </main>
        </div>
        <MemberBottomNav />
      </div>
    </Providers>
  );
}
