import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "@/lib/actions/profile";
import { isNewsletterEnabled } from "@/lib/emailoctopus";
import { getNotificationTypes, getNotificationDefaults } from "@/lib/config";
import { NotificationPreferences } from "@/components/profile/notification-preferences";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [profile, user, notificationTypes, notificationDefaults, savedPrefs] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { newsletterOptIn: true } }),
    getNotificationTypes(),
    getNotificationDefaults(),
    prisma.notificationPreference.findMany({
      where: { userId: session.user.id },
      select: { channel: true, type: true, enabled: true },
    }),
  ]);

  const showNewsletter = isNewsletterEnabled();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">Edit Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" name="name" defaultValue={session.user.name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={profile?.address ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={profile?.city ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">County / Region</Label>
                <Input id="state" name="state" defaultValue={profile?.state ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">Postcode</Label>
                <Input id="zip" name="zip" defaultValue={profile?.zip ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" name="bio" rows={4} defaultValue={profile?.bio ?? ""} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="newsletterOptIn"
                name="newsletterOptIn"
                defaultChecked={user?.newsletterOptIn ?? false}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="newsletterOptIn">Subscribe to email updates and newsletters</Label>
            </div>
            <div className="flex gap-4">
              <Button type="submit">Save Changes</Button>
              <Button variant="outline" asChild>
                <a href="/profile">Cancel</a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6">
        <NotificationPreferences
          types={notificationTypes}
          defaults={notificationDefaults}
          saved={savedPrefs}
        />
      </div>
    </div>
  );
}
