import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSiteInfo } from "@/lib/config";
import Markdown from "react-markdown";
import type { RegistrationField } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function PrintFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const form = await prisma.publicForm.findUnique({ where: { slug } });
  if (!form || !form.published) notFound();

  const siteInfo = await getSiteInfo();
  const fields = form.fields as unknown as RegistrationField[];

  // Look for a linked terms page in the description (markdown link pattern)
  const termsMatch = (form.description ?? "").match(/\[.*?\]\((\/p\/[a-z-]+)\)/);
  let termsContent: string | null = null;
  if (termsMatch) {
    const termsSlug = termsMatch[1].replace("/p/", "");
    const termsPage = await prisma.page.findUnique({
      where: { slug: termsSlug },
      select: { content: true },
    });
    termsContent = termsPage?.content ?? null;
  }

  return (
    <html>
      <head>
        <title>{form.title} — {siteInfo.name}</title>
        <style>{`
          @page { size: A4; margin: 12mm 15mm; }
          html { color-scheme: light !important; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #111; background: #fff; line-height: 1.4; }
          h1 { font-size: 18px; text-align: center; margin-bottom: 2px; }
          h2 { font-size: 14px; margin-top: 12px; margin-bottom: 4px; }
          h3 { font-size: 12px; margin-top: 8px; margin-bottom: 3px; }
          .subtitle { text-align: center; color: #666; font-size: 11px; margin-bottom: 12px; }
          .field { margin-bottom: 10px; }
          .field-label { font-weight: 600; font-size: 11px; margin-bottom: 2px; }
          .field-line { border-bottom: 1px solid #999; min-height: 20px; }
          .field-box { border: 1px solid #999; min-height: 40px; padding: 3px; }
          .field-help { font-size: 9px; color: #666; margin-top: 1px; }
          .checkbox-field { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 8px; }
          .checkbox-box { width: 14px; height: 14px; border: 2px solid #333; flex-shrink: 0; margin-top: 1px; }
          .checkbox-text { font-size: 10px; }
          .options { font-size: 10px; color: #444; margin-top: 1px; }
          .divider { border-top: 1.5px solid #333; margin: 12px 0; }
          .terms { font-size: 10px; line-height: 1.6; }
          .terms h3 { font-size: 12px; margin-top: 10px; margin-bottom: 4px; }
          .terms ol, .terms ul { padding-left: 18px; margin: 4px 0; }
          .terms li { margin-bottom: 3px; }
          .terms p { margin: 4px 0; }
          .terms strong { font-weight: 600; }
          .signature { margin-top: 16px; display: flex; gap: 40px; }
          .sig-field { flex: 1; }
          .sig-line { border-bottom: 1px solid #999; min-height: 24px; margin-top: 20px; }
          .sig-label { font-size: 10px; color: #666; margin-top: 4px; }
          @media screen { body { max-width: 700px; margin: 40px auto; padding: 0 20px; } }
        `}</style>
      </head>
      <body>
        <h1>{form.heroTitle ?? form.title}</h1>
        <div className="subtitle">{siteInfo.name}</div>

        {/* Name and Email — always present */}
        <div className="field">
          <div className="field-label">Name</div>
          <div className="field-line" />
        </div>
        <div className="field">
          <div className="field-label">Email</div>
          <div className="field-line" />
        </div>

        {/* Dynamic fields */}
        {fields.map((field) => {
          if (field.type === "checkbox") {
            return (
              <div key={field.name} className="checkbox-field">
                <div className="checkbox-box" />
                <div className="checkbox-text">
                  {field.helpText ?? field.label}
                </div>
              </div>
            );
          }

          if (field.type === "select") {
            return (
              <div key={field.name} className="field">
                <div className="field-label">{field.label}</div>
                <div className="options">
                  {field.options?.map((opt) => (
                    <span key={opt} style={{ marginRight: 16 }}>
                      &#9744; {opt}
                    </span>
                  ))}
                </div>
                {field.helpText && <div className="field-help">{field.helpText}</div>}
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
              <div key={field.name} className="field">
                <div className="field-label">{field.label}</div>
                <div className="field-box" />
                {field.helpText && <div className="field-help">{field.helpText}</div>}
              </div>
            );
          }

          return (
            <div key={field.name} className="field">
              <div className="field-label">{field.label}</div>
              <div className="field-line" />
              {field.helpText && <div className="field-help">{field.helpText}</div>}
            </div>
          );
        })}

        {/* Terms section */}
        {termsContent && (
          <>
            <div className="divider" />
            <div className="terms">
              <Markdown>{termsContent}</Markdown>
            </div>
          </>
        )}

        {/* Signature */}
        <div className="signature">
          <div className="sig-field">
            <div className="sig-line" />
            <div className="sig-label">Signature</div>
          </div>
          <div className="sig-field">
            <div className="sig-line" />
            <div className="sig-label">Date</div>
          </div>
        </div>
      </body>
    </html>
  );
}
