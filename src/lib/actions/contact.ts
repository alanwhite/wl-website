"use server";

import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/registration";
import { sendBrandedEmail, shouldNotifyAdmin } from "@/lib/email";
import { auth } from "@/lib/auth";
import { getContactManagerRoles, canManageContacts } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

const contactLimiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

async function requireContactManager() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") throw new Error("Unauthorized");
  const managerRoles = await getContactManagerRoles();
  if (!canManageContacts(session.user, managerRoles)) throw new Error("Unauthorized");
  return session.user;
}

export async function submitContact(formData: FormData) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";
  try {
    await contactLimiter.check(10, ip);
  } catch {
    throw new Error("Too many submissions. Please try again later.");
  }

  // Verify Turnstile token if configured
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const token = formData.get("cf-turnstile-response") as string;
    if (!token) throw new Error("Verification required");

    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: turnstileSecret, response: token, remoteip: ip }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) throw new Error("Verification failed. Please try again.");
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
  await requireContactManager();

  await prisma.contactSubmission.update({
    where: { id },
    data: { read: true },
  });
  revalidatePath("/admin/contacts");
  revalidatePath("/inbox");
}

export async function deleteContact(id: string) {
  await requireContactManager();

  await prisma.contactSubmission.delete({ where: { id } });
  revalidatePath("/admin/contacts");
  revalidatePath("/inbox");
}
