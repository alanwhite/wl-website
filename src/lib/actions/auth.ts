"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getRegistrationFields, getRegistrationTerms } from "@/lib/config";
import { buildRegistrationSchema } from "@/lib/validations/registration";
import { sendEmail, shouldNotifyAdmin } from "@/lib/email";
import { redirect } from "next/navigation";

export async function submitRegistration(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const fields = await getRegistrationFields();
  const terms = await getRegistrationTerms();
  const schema = buildRegistrationSchema(fields);

  const data: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "file") continue;
    if (field.type === "checkbox") {
      data[field.name] = formData.get(field.name) === "on";
    } else {
      data[field.name] = formData.get(field.name) ?? "";
    }
  }

  const validated = schema.parse(data);

  // Handle file uploads
  const uploadedDocs: { fileName: string; fileType: string; filePath: string; fileSize: number }[] = [];
  const fileFields = fields.filter((f) => f.type === "file");

  for (const field of fileFields) {
    const ALLOWED_DOC_TYPES = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const file = formData.get(field.name) as File | null;
    if (!file || file.size === 0) {
      if (field.required) throw new Error(`${field.label} is required`);
      continue;
    }

    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      throw new Error(`${field.label}: file type not allowed. Use images, PDF, or Word documents.`);
    }

    const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
    const { mkdir, writeFile } = await import("fs/promises");
    await mkdir(uploadDir, { recursive: true });

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = `${uploadDir}/${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    uploadedDocs.push({
      fileName: file.name,
      fileType: file.type,
      filePath: safeName,
      fileSize: file.size,
    });
  }

  // Server-side terms validation
  const termsAccepted = formData.get("termsAccepted") === "on";
  if (terms.enabled && !termsAccepted) {
    throw new Error("You must accept the terms to register");
  }
  const termsAcceptedAt = terms.enabled && termsAccepted ? new Date() : null;

  await prisma.registration.upsert({
    where: { userId: session.user.id },
    update: {
      customFields: validated as Record<string, string | boolean>,
      termsAcceptedAt,
      documents: {
        createMany: uploadedDocs.length > 0 ? { data: uploadedDocs } : undefined,
      },
    },
    create: {
      userId: session.user.id,
      customFields: validated as Record<string, string | boolean>,
      termsAcceptedAt,
      documents: {
        createMany: uploadedDocs.length > 0 ? { data: uploadedDocs } : undefined,
      },
    },
  });

  // Send admin notification
  if (await shouldNotifyAdmin()) {
    const admins = await prisma.user.findMany({
      where: { tierLevel: 999, status: "APPROVED" },
      select: { email: true },
    });
    const adminEmails = admins.map((a) => a.email).filter(Boolean) as string[];
    if (adminEmails.length > 0) {
      await sendEmail({
        to: adminEmails,
        subject: "New Registration Pending Review",
        html: `<p>A new registration from <strong>${session.user.name ?? session.user.email}</strong> is pending review.</p><p><a href="${process.env.AUTH_URL}/admin/registrations">Review now</a></p>`,
      }).catch(console.error);
    }
  }

  redirect("/register/pending");
}
