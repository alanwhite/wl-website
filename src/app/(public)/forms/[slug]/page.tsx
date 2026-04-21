import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSiteInfo, getConfig } from "@/lib/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/layout/providers";
import { getNavLinks } from "@/lib/navigation";
import { PublicFormComponent } from "@/components/forms/public-form";
import { HeroSlideshow } from "@/components/shared/hero-slideshow";
import { Card, CardContent } from "@/components/ui/card";
import type { RegistrationField } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const form = await prisma.publicForm.findUnique({ where: { slug } });

  if (!form || !form.published) notFound();

  const [session, siteInfo, logoUrl, navLinks] = await Promise.all([
    auth(),
    getSiteInfo(),
    getConfig("site.logoUrl"),
    getNavLinks(),
  ]);

  const isClosed = !!form.closedAt;
  const hasHero = !!form.heroImageUrl;

  if (hasHero) {
    return (
      <Providers session={session}>
        <div className="relative min-h-screen">
          {!form.hideHeader && (
            <div className="absolute inset-x-0 top-0 z-20">
              <Header
                siteName={siteInfo.name}
                logoUrl={logoUrl}
                navLinks={navLinks.filter((l) => l.minTierLevel === null && !l.requiredRoleSlug)}
                transparent
              />
            </div>
          )}
          {/* Fixed hero background */}
          <div className="fixed inset-0 z-0">
            <HeroSlideshow images={[form.heroImageUrl!]} fullScreen>
              <div />
            </HeroSlideshow>
          </div>
          <div className="relative z-10 min-h-screen">
            <div className="container mx-auto max-w-2xl px-4 pt-16 pb-12">
              {/* Hero title — big heading above the form */}
              {form.heroTitle && (
                <h1 className="mb-8 text-center text-3xl font-bold text-white drop-shadow-lg sm:text-5xl">
                  {form.heroTitle}
                </h1>
              )}
              {isClosed ? (
                <Card className="bg-background/85 backdrop-blur-sm shadow-xl">
                  <CardContent className="py-12 text-center">
                    <h2 className="text-xl font-semibold">{form.title}</h2>
                    <p className="mt-2 text-muted-foreground">
                      This form is no longer accepting submissions.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="[&_[data-slot=card]]:bg-background/85 [&_[data-slot=card]]:backdrop-blur-sm [&_[data-slot=card]]:shadow-xl">
                  <PublicFormComponent
                    formId={form.id}
                    title={form.title}
                    description={form.description}
                    fields={form.fields as unknown as RegistrationField[]}
                    userName={session?.user?.name}
                    userEmail={session?.user?.email}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Providers>
    );
  }

  return (
    <Providers session={session}>
      <div className="flex min-h-screen flex-col">
        <Header
          siteName={siteInfo.name}
          logoUrl={logoUrl}
          navLinks={navLinks.filter((l) => l.minTierLevel === null && !l.requiredRoleSlug)}
        />
        <main className="container mx-auto max-w-2xl flex-1 px-4 py-12">
          {isClosed ? (
            <Card>
              <CardContent className="py-12 text-center">
                <h2 className="text-xl font-semibold">{form.title}</h2>
                <p className="mt-2 text-muted-foreground">
                  This form is no longer accepting submissions.
                </p>
              </CardContent>
            </Card>
          ) : (
            <PublicFormComponent
              formId={form.id}
              title={form.title}
              description={form.description}
              fields={form.fields as unknown as RegistrationField[]}
              userName={session?.user?.name}
              userEmail={session?.user?.email}
            />
          )}
        </main>
        <Footer siteName={siteInfo.name} />
      </div>
    </Providers>
  );
}
