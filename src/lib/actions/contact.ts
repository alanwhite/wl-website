"use server";

import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/registration";
import { sendBrandedEmail, shouldNotifyAdmin } from "@/lib/email";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

const contactLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

export async function submitContact(formData: FormData) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
  try {
    await contactLimiter.check(10, ip);
  } catch {
    throw new Error("Too many submissions. Please try again later.");
  }

  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    subject: (formData.get("subject") as string) || undefined,
    message: formData.get("message") as string,
  };

  const validated = contactSchema.parse(data);

  await prisma.contactSubmission.create({ data: validated });

  if (await shouldNotifyAdmin()) {
    const admins = await prisma.user.findMany({
      where: { tierLevel: 999, status: "APPROVED" },
      select: { email: true },
    });
    const adminEmails = admins.map((a) => a.email).filter(Boolean) as string[];
    if (adminEmails.length > 0) {
      const { contactNotificationHtml } = await import("@/lib/email-template");
      await sendBrandedEmail({
        to: adminEmails,
        subject: `Contact Form: ${validated.subject ?? "New Message"}`,
        bodyHtml: contactNotificationHtml(validated.name, validated.email, validated.subject, validated.message),
      }).catch(console.error);
    }
  }

  return { success: true };
}

export async function markContactRead(id: string) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) throw new Error("Unauthorized");

  await prisma.contactSubmission.update({
    where: { id },
    data: { read: true },
  });
  revalidatePath("/admin/contacts");
}

export async function deleteContact(id: string) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) throw new Error("Unauthorized");

  await prisma.contactSubmission.delete({ where: { id } });
  revalidatePath("/admin/contacts");
}
