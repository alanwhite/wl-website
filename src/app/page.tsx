import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getSiteInfo, getConfig } from "@/lib/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/layout/providers";
import { getNavLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
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
        <main className="flex-1">
          <section className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 py-24 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              {siteInfo.heroTitle}
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              {siteInfo.heroSubtitle}
            </p>
            <div className="flex gap-4">
              <Button asChild size="lg">
                <Link href="/login">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/about">Learn More</Link>
              </Button>
            </div>
          </section>
        </main>
        <Footer siteName={siteInfo.name} />
      </div>
    </Providers>
  );
}
