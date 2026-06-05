import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteInfo, getDashboardWelcomePageSlug, getDashboardWelcomeDismissible, getDashboardCards } from "@/lib/config";
import { DashboardActivity } from "@/components/dashboard/dashboard-activity";
import { DashboardProjects } from "@/components/dashboard/dashboard-projects";
import { DismissWelcomeButton, ShowWelcomeAgainLink } from "@/components/dashboard/welcome-toggle";
import { prisma } from "@/lib/prisma";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { collapseBlankLinesBetweenTags } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [siteInfo, welcomeSlug, welcomeDismissible, dashboardCards, profile] = await Promise.all([
    getSiteInfo(),
    getDashboardWelcomePageSlug(),
    getDashboardWelcomeDismissible(),
    getDashboardCards(),
    prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { extra: true },
    }),
  ]);
  const extra = (profile?.extra as Record<string, unknown>) ?? {};
  const welcomeDismissed = welcomeDismissible && !!extra.dashboardWelcomeDismissed;

  // Opt-in projects card (the only dashboard.cards type currently rendered)
  const projectsCard = dashboardCards.find((c) => c.type === "projects");

  // Welcome page mode — render CMS page full-bleed (unless the member's hidden it)
  if (welcomeSlug) {
    const page = await prisma.page.findUnique({
      where: { slug: welcomeSlug, published: true },
      select: { content: true },
    });

    const contentHasHtml = page?.content.trimStart().startsWith("<") ?? false;
    const renderContent = page && contentHasHtml ? collapseBlankLinesBetweenTags(page.content) : page?.content;

    return (
      <>
        {!welcomeDismissed && page && (
          <>
            <div className="mx-auto max-w-3xl">
              <div className={contentHasHtml ? "max-w-none" : "prose prose-lg dark:prose-invert max-w-none prose-img:rounded-lg prose-img:shadow-md"}>
                <Markdown rehypePlugins={[rehypeRaw]}>{renderContent}</Markdown>
              </div>
            </div>
            {welcomeDismissible && (
              <div className="mx-auto mt-6 max-w-3xl px-4 text-center">
                <DismissWelcomeButton />
              </div>
            )}
          </>
        )}
        {welcomeDismissed && page && (
          <div className="mx-auto max-w-3xl px-4 pt-4 text-right">
            <ShowWelcomeAgainLink />
          </div>
        )}
        {!page && (
          <p className="text-center text-muted-foreground">Welcome page not found.</p>
        )}
        {projectsCard && (
          <div className="mx-auto mt-8 max-w-3xl px-4">
            <DashboardProjects user={session.user} title={projectsCard.title} />
          </div>
        )}
        <DashboardActivity user={session.user} standalone />
      </>
    );
  }

  // Standard dashboard (no welcome page configured)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hello, {session.user.name ?? "there"}</h1>
        <p className="text-muted-foreground">Good to see you.</p>
      </div>

      {projectsCard && <DashboardProjects user={session.user} title={projectsCard.title} />}

      <DashboardActivity user={session.user} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to {siteInfo.name}</CardTitle>
            <CardDescription>Glad to have you with us</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Have a look around using the menu — being a member is about staying in touch and being part of what&apos;s going on, no obligation attached.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Update your details any time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You can review or change your details on your{" "}
              <Link href="/profile" className="text-primary underline">
                profile page
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
