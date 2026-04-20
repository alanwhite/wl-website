import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteInfo } from "@/lib/config";
import { AnnouncementsPanel } from "@/components/shared/announcements-panel";
import { PasskeyPrompt } from "@/components/auth/passkey-prompt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const passkeysEnabled = process.env.AUTH_CREDENTIALS_TEST !== "true";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const siteInfo = await getSiteInfo();

  // Check if we should show the passkey setup prompt
  let showPasskeyPrompt = false;
  if (passkeysEnabled) {
    const [passkeyCount, profile] = await Promise.all([
      prisma.authenticator.count({ where: { userId: session.user.id } }),
      prisma.userProfile.findUnique({
        where: { userId: session.user.id },
        select: { extra: true },
      }),
    ]);
    const extra = (profile?.extra as Record<string, unknown>) ?? {};
    showPasskeyPrompt = passkeyCount === 0 && !extra.passkeyPromptDismissed;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name ?? "Member"}!
        </p>
      </div>

      {showPasskeyPrompt && <PasskeyPrompt />}

      <AnnouncementsPanel />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to {siteInfo.name}</CardTitle>
            <CardDescription>You are an approved member</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You have access to all member resources. Use the navigation menu to explore.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Keep your profile up to date. Visit the{" "}
              <a href="/profile" className="text-primary underline">
                profile page
              </a>{" "}
              to make changes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
