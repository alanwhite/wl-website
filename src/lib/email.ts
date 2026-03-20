import { Resend } from "resend";
import { getConfig } from "./config";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const from = process.env.EMAIL_FROM ?? "noreply@example.com";

  if (!resend) {
    console.log("[Email] No RESEND_API_KEY set. Would have sent:", {
      from,
      to,
      subject,
    });
    return;
  }

  const { error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  });

  if (error) {
    console.error("[Email] Failed to send:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function shouldNotifyAdmin(): Promise<boolean> {
  const setting = await getConfig("email.adminNotifications");
  return setting === "true";
}

export async function sendBrandedEmail({
  to,
  subject,
  bodyHtml,
}: {
  to: string | string[];
  subject: string;
  bodyHtml: string;
}) {
  const { buildBrandedEmail } = await import("./email-template");
  const html = await buildBrandedEmail(bodyHtml);
  return sendEmail({ to, subject, html });
}
