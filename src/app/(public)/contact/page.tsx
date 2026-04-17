import { getSiteInfo, getConfig } from "@/lib/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/layout/providers";
import { getNavLinks } from "@/lib/navigation";
import { ContactForm } from "@/components/shared/contact-form";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const [siteInfo, logoUrl, navLinks] = await Promise.all([
    getSiteInfo(),
    getConfig("site.logoUrl"),
    getNavLinks(),
  ]);

  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header siteName={siteInfo.name} logoUrl={logoUrl} navLinks={navLinks.filter((l) => l.minTierLevel === null && !l.requiredRoleSlug)} />
        <main className="container mx-auto max-w-lg flex-1 px-4 py-12">
          <ContactForm />
        </main>
        <Footer siteName={siteInfo.name} />
      </div>
    </Providers>
  );
}
