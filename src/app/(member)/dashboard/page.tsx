import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteInfo } from "@/lib/config";
import { AnnouncementsPanel } from "@/components/shared/announcements-panel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const siteInfo = await getSiteInfo();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name ?? "Member"}!
        </p>
      </div>

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
