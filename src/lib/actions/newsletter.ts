"use server";

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { createAndSendCampaign, getCampaigns } from "@/lib/emailoctopus";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function sendNewsletter(formData: FormData) {
  const admin = await requireAdmin();

  const subject = (formData.get("subject") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();

  if (!subject) throw new Error("Subject is required");
  if (!content) throw new Error("Content is required");

  // Wrap in simple HTML template
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #18181b; margin-bottom: 16px;">${subject}</h1>
      <div style="color: #3f3f46; line-height: 1.6; white-space: pre-wrap;">${content}</div>
    </div>
  `.trim();

  const campaignId = await createAndSendCampaign(subject, html);

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "newsletter.send",
    details: { subject, campaignId },
  });

  revalidatePath("/admin/newsletters");
  return campaignId;
}

export async function listCampaigns() {
  return getCampaigns();
}
