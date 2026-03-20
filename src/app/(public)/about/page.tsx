import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteInfo, getConfig } from "@/lib/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/layout/providers";
import { getNavLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const siteInfo = await getSiteInfo();
  return {
    title: "About",
    description: `About ${siteInfo.name}`,
  };
}

export default async function AboutPage() {
  const [siteInfo, logoUrl, navLinks] = await Promise.all([
    getSiteInfo(),
    getConfig("site.logoUrl"),
    getNavLinks(),
  ]);
  const page = await prisma.page.findUnique({
    where: { slug: "about", published: true },
  });

  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Header siteName={siteInfo.name} logoUrl={logoUrl} navLinks={navLinks} />
        <main className="container mx-auto max-w-3xl flex-1 px-4 py-12">
          <h1 className="mb-6 text-3xl font-bold">{page?.title ?? "About Us"}</h1>
          <div className="prose dark:prose-invert max-w-none">
            {page?.content ?? "Welcome to our community."}
          </div>
        </main>
        <Footer siteName={siteInfo.name} />
      </div>
    </Providers>
  );
}
