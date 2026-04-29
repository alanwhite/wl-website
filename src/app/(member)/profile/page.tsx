import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PasskeyManager } from "@/components/auth/passkey-manager";
import { getNotificationTypes, getNotificationDefaults } from "@/lib/config";

export const dynamic = "force-dynamic";

const passkeysEnabled = process.env.AUTH_CREDENTIALS_TEST !== "true";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [profile, userRoles, authenticators, notifTypes, notifDefaults, savedPrefs] = await Promise.all([
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
  ]);

  // Build a lookup of effective preferences (defaults + overrides)
  const prefLookup: Record<string, boolean> = {};
  for (const t of notifTypes) {
    for (const ch of t.channels) {
      prefLookup[`${ch}:${t.slug}`] = notifDefaults[ch as keyof typeof notifDefaults] ?? true;
    }
  }
  for (const s of savedPrefs) {
    prefLookup[`${s.channel}:${s.type}`] = s.enabled;
  }

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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile/edit">Change</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left font-medium" />
                    <th className="px-3 py-2 text-center font-medium">Push</th>
                    <th className="px-3 py-2 text-center font-medium">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {notifTypes.map((t) => (
                    <tr key={t.slug} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{t.label}</td>
                      {(["push", "email"] as const).map((ch) => (
                        <td key={ch} className="px-3 py-2 text-center">
                          {t.channels.includes(ch) ? (
                            prefLookup[`${ch}:${t.slug}`] ? (
                              <span className="text-green-600">On</span>
                            ) : (
                              <span className="text-muted-foreground">Off</span>
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {passkeysEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Passkeys</CardTitle>
          </CardHeader>
          <CardContent>
            <PasskeyManager passkeys={authenticators} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
