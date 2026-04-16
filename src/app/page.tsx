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

  return (
    <Providers session={session}>
      <div className="flex min-h-screen flex-col">
        <Header siteName={siteInfo.name} logoUrl={logoUrl} navLinks={navLinks} />
        <main className="flex-1">
          <HeroSlideshow images={heroImages}>
            <div className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 py-24 text-center">
              <h1 className={`text-4xl font-bold tracking-tight sm:text-6xl ${heroImages.length > 0 ? "text-white" : ""}`}>
                {siteInfo.heroTitle}
              </h1>
              <p className={`max-w-2xl text-lg ${heroImages.length > 0 ? "text-white/80" : "text-muted-foreground"}`}>
                {siteInfo.heroSubtitle}
              </p>
              <div className="flex gap-4">
                <Button asChild size="lg" variant={heroImages.length > 0 ? "secondary" : "default"}>
                  <Link href="/login">Get Started</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className={heroImages.length > 0 ? "border-white text-white hover:bg-white/20" : ""}>
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
            </div>
          </HeroSlideshow>
        </main>
        <Footer siteName={siteInfo.name} />
      </div>
    </Providers>
  );
}
