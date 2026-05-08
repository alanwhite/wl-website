import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PasskeyManager } from "@/components/auth/passkey-manager";
import { getNotificationTypes, getNotificationDefaults } from "@/lib/config";
import { NotificationPreferences } from "@/components/profile/notification-preferences";
import { PushSubscriptionManager } from "@/components/profile/push-subscription";
import { InstallApp } from "@/components/profile/install-app";
import { getVapidPublicKey, isPushEnabled } from "@/lib/push";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const passkeysEnabled = process.env.AUTH_CREDENTIALS_TEST !== "true";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [profile, userRoles, authenticators, notifTypes, notifDefaults, savedPrefs, pushSubCount] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.userRole.findMany({
      where: { userId: session.user.id },
      include: { role: { select: { name: true } } },
    }),
    passkeysEnabled
      ? prisma.authenticator.findMany({
          where: { userId: session.user.id },
          select: {
            credentialID: true,
            credentialDeviceType: true,
            credentialBackedUp: true,
            transports: true,
          },
        })
      : [],
    getNotificationTypes(),
    getNotificationDefaults(),
    prisma.notificationPreference.findMany({
      where: { userId: session.user.id },
      select: { channel: true, type: true, enabled: true },
    }),
    prisma.pushSubscription.count({ where: { userId: session.user.id } }),
  ]);

  const vapidPublicKey = getVapidPublicKey();

  const extra = (profile?.extra as Record<string, unknown>) ?? {};
  const passkeyPending = passkeysEnabled && authenticators.length === 0 && !extra.passkeyPromptDismissed;
  const pushPending =
    isPushEnabled() && pushSubCount === 0 && !extra.notificationsPromptDismissed;
  const pendingItems: { label: string; anchor: string }[] = [];
  if (passkeyPending) pendingItems.push({ label: "Set up a passkey", anchor: "passkeys" });
  if (pushPending) pendingItems.push({ label: "Turn on notifications", anchor: "notifications" });

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "?";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button asChild>
          <Link href="/profile/edit">Edit Profile</Link>
        </Button>
      </div>

      {pendingItems.length > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-start gap-3 py-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="text-sm">
              <p className="mb-1 font-medium">
                {pendingItems.length === 1
                  ? "One thing left to set up"
                  : `${pendingItems.length} things left to set up`}
              </p>
              <p className="text-muted-foreground">
                {pendingItems.map((item, i) => (
                  <span key={item.anchor}>
                    {i > 0 && (i === pendingItems.length - 1 ? " and " : ", ")}
                    <a href={`#${item.anchor}`} className="font-medium text-primary underline">
                      {item.label.toLowerCase()}
                    </a>
                  </span>
                ))}
                {" — scroll down or tap a link to jump straight to it."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={session.user.image ?? undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{session.user.name ?? "No name set"}</CardTitle>
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="secondary">{session.user.tierName}</Badge>
                {userRoles.map((ur) => (
                  <Badge key={ur.roleId} variant="outline">{ur.role.name}</Badge>
                ))}
                <Badge variant="outline">{session.user.status}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile && (
            <div className="grid gap-4 sm:grid-cols-2">
              {profile.phone && (
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{profile.phone}</p>
                </div>
              )}
              {profile.address && (
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.address}
                    {profile.city && `, ${profile.city}`}
                    {profile.state && `, ${profile.state}`}
                    {profile.zip && ` ${profile.zip}`}
                  </p>
                </div>
              )}
              {profile.bio && (
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium">Bio</p>
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}
            </div>
          )}
          {!profile && (
            <p className="text-sm text-muted-foreground">
              No profile information yet.{" "}
              <Link href="/profile/edit" className="text-primary underline">
                Add your details
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

      {notifTypes.length > 0 && (
        <NotificationPreferences
          types={notifTypes}
          defaults={notifDefaults}
          saved={savedPrefs}
        />
      )}

      <InstallApp />

      {vapidPublicKey && (
        <Card id="notifications" className={cn("scroll-mt-20", pushPending && "ring-2 ring-primary/40")}>
          <CardHeader>
            <CardTitle className="text-lg">Push Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Receive notifications on this device when new items are posted.
            </p>
            <PushSubscriptionManager
              vapidPublicKey={vapidPublicKey}
              hasSubscription={pushSubCount > 0}
            />
          </CardContent>
        </Card>
      )}

      {passkeysEnabled && (
        <Card id="passkeys" className={cn("scroll-mt-20", passkeyPending && "ring-2 ring-primary/40")}>
          <CardHeader>
            <CardTitle className="text-lg">Passkeys</CardTitle>
          </CardHeader>
          <CardContent>
            <PasskeyManager passkeys={authenticators} />
          </CardContent>
        </Card>
      )}

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button variant="outline" type="submit" className="w-full">
          Sign Out
        </Button>
      </form>
    </div>
  );
}
