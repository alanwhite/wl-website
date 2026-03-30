import { auth } from "@/lib/auth";
import { getSiteInfo, getConfig } from "@/lib/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/layout/providers";
import { getNavLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, siteInfo, logoUrl, navLinks] = await Promise.all([
    auth(),
    getSiteInfo(),
    getConfig("site.logoUrl"),
    getNavLinks(),
  ]);

  return (
    <Providers session={session}>
      <div className="flex min-h-screen flex-col">
        <Header siteName={siteInfo.name} logoUrl={logoUrl} navLinks={navLinks} />
        <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
        <Footer siteName={siteInfo.name} />
      </div>
    </Providers>
  );
}
