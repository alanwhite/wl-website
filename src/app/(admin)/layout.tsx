import { getSiteInfo, getConfig } from "@/lib/config";
import { Header } from "@/components/layout/header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Providers } from "@/components/layout/providers";
import { getNavLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [siteInfo, logoUrl, navLinks] = await Promise.all([
    getSiteInfo(),
    getConfig("site.logoUrl"),
    getNavLinks(),
  ]);

  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header siteName={siteInfo.name} logoUrl={logoUrl} navLinks={navLinks} />
        <div className="flex flex-1">
          <AdminSidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
