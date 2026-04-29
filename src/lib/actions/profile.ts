"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isNewsletterEnabled, subscribeContact, unsubscribeContact } from "@/lib/emailoctopus";

const profileSchema = z.object({
  bio: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const data = profileSchema.parse({
    bio: formData.get("bio") as string,
    phone: formData.get("phone") as string,
    address: formData.get("address") as string,
    city: formData.get("city") as string,
    state: formData.get("state") as string,
    zip: formData.get("zip") as string,
  });

  await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  // Update user name and newsletter preference
  const name = formData.get("name") as string;
  const newsletterOptIn = formData.get("newsletterOptIn") === "on";

  const updateData: { name?: string; newsletterOptIn?: boolean } = {};
  if (name) updateData.name = name;
  updateData.newsletterOptIn = newsletterOptIn;

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });
  }

  // Sync newsletter subscription
  if (isNewsletterEnabled() && session.user.email) {
    try {
      if (newsletterOptIn) {
        await subscribeContact(session.user.email, name || session.user.name);
      } else {
        await unsubscribeContact(session.user.email);
      }
    } catch (e) {
      console.error("Newsletter sync failed:", e);
    }
  }

  revalidatePath("/profile");
  redirect("/profile");
}

export async function updateNotificationPreferences(
  preferences: { channel: string; type: string; enabled: boolean }[],
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Upsert each preference
  await prisma.$transaction(
    preferences.map((pref) =>
      prisma.notificationPreference.upsert({
        where: {
          userId_channel_type: {
            userId: session.user!.id,
            channel: pref.channel,
            type: pref.type,
          },
        },
        update: { enabled: pref.enabled },
        create: {
          userId: session.user!.id,
          channel: pref.channel,
          type: pref.type,
          enabled: pref.enabled,
        },
      }),
    ),
  );

  revalidatePath("/profile");
}
