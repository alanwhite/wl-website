import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getSiteInfo, getConfig, getHeroImages } from "@/lib/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/layout/providers";
import { getNavLinks } from "@/lib/navigation";
import { HeroSlideshow } from "@/components/shared/hero-slideshow";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [session, siteInfo, logoUrl, navLinks, heroImages] = await Promise.all([
    auth(),
    getSiteInfo(),
    getConfig("site.logoUrl"),
    getNavLinks(),
    getHeroImages(),
  ]);

  // Redirect logged-in users to the appropriate page
  if (session?.user) {
    if (session.user.status === "APPROVED") redirect("/dashboard");
    if (session.user.status === "PENDING_REVIEW") redirect("/register");
    if (session.user.status === "REJECTED") redirect("/register/rejected");
  }

  const hasHero = heroImages.length > 0;

  if (hasHero) {
    return (
      <Providers session={session}>
        <div className="relative min-h-screen">
          {/* Header overlays the hero */}
          <div className="absolute inset-x-0 top-0 z-20">
            <Header siteName={siteInfo.name} logoUrl={logoUrl} navLinks={navLinks} transparent />
          </div>
          <HeroSlideshow images={heroImages} fullScreen>
            <div className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                {siteInfo.heroTitle}
              </h1>
              <p className="max-w-2xl text-lg text-white/80">
                {siteInfo.heroSubtitle}
              </p>
              <div className="flex gap-4">
                <Button asChild size="lg" variant="secondary">
                  <Link href="/login">Get Started</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/70 bg-white/10 text-white hover:bg-white/20">
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
            </div>
          </HeroSlideshow>
          {/* Footer links overlay */}
          <div className="absolute inset-x-0 bottom-0 z-20 py-4 text-center text-xs text-white/60">
            <div className="flex items-center justify-center gap-4">
              <a href="/p/privacy" className="hover:text-white/90">Privacy Policy</a>
              <a href="/p/terms" className="hover:text-white/90">Terms &amp; Conditions</a>
            </div>
            <p className="mt-1">&copy; {new Date().getFullYear()} {siteInfo.name}</p>
          </div>
        </div>
      </Providers>
    );
  }

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
