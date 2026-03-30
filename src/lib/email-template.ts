import { getSiteInfo, getConfig, getThemeConfig } from "./config";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface BrandingOptions {
  siteName: string;
  logoUrl: string | null;
  primaryColor: string;
}

async function getBranding(): Promise<BrandingOptions> {
  const [siteInfo, logoUrl, theme] = await Promise.all([
    getSiteInfo(),
    getConfig("site.logoUrl"),
    getThemeConfig(),
  ]);
  return {
    siteName: siteInfo.name,
    logoUrl,
    primaryColor: theme.primary,
  };
}

export function wrapEmailHtml({
  body,
  siteName,
  logoUrl,
}: {
  body: string;
  siteName: string;
  logoUrl: string | null;
  primaryColor?: string;
}): string {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const logoHtml = logoUrl
    ? `<img src="${baseUrl}${logoUrl}" alt="${siteName}" style="max-height:48px;max-width:200px;margin-bottom:16px;" /><br/>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:24px 32px;text-align:center;border-bottom:1px solid #e4e4e7;">
              ${logoHtml}
              <span style="font-size:20px;font-weight:bold;color:#18181b;">${siteName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;text-align:center;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px;">
              &copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function approvalEmailHtml(dashboardUrl: string): string {
  return `
<h2 style="margin:0 0 16px;color:#18181b;">Registration Approved!</h2>
<p style="color:#3f3f46;line-height:1.6;">
  Great news! Your registration has been approved. You can now access the member area and all its resources.
</p>
<p style="margin:24px 0;text-align:center;">
  <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#18181b;color:#fafafa;text-decoration:none;border-radius:6px;font-weight:500;">
    Go to Dashboard
  </a>
</p>`;
}

export function rejectionEmailHtml(reason?: string): string {
  return `
<h2 style="margin:0 0 16px;color:#18181b;">Registration Update</h2>
<p style="color:#3f3f46;line-height:1.6;">
  Your registration has been reviewed.
  ${reason ? `<br/><br/><strong>Reason:</strong> ${escapeHtml(reason)}` : ""}
</p>
<p style="color:#3f3f46;line-height:1.6;">
  If you have questions, please contact us.
</p>`;
}

export function contactNotificationHtml(name: string, email: string, subject: string | undefined, message: string): string {
  return `
<h2 style="margin:0 0 16px;color:#18181b;">New Contact Form Submission</h2>
<table style="width:100%;border-collapse:collapse;">
  <tr>
    <td style="padding:8px 0;color:#71717a;width:80px;">From:</td>
    <td style="padding:8px 0;color:#18181b;">${escapeHtml(name)} (${escapeHtml(email)})</td>
  </tr>
  ${subject ? `<tr><td style="padding:8px 0;color:#71717a;">Subject:</td><td style="padding:8px 0;color:#18181b;">${escapeHtml(subject)}</td></tr>` : ""}
</table>
<div style="margin-top:16px;padding:16px;background:#f4f4f5;border-radius:6px;color:#3f3f46;line-height:1.6;">
  ${escapeHtml(message)}
</div>`;
}

export async function buildBrandedEmail(bodyHtml: string): Promise<string> {
  const branding = await getBranding();
  return wrapEmailHtml({
    body: bodyHtml,
    siteName: branding.siteName,
    logoUrl: branding.logoUrl,
    primaryColor: branding.primaryColor,
  });
}
