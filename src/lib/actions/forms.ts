"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getFormCreatorRoles, canCreateForms } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";

const submitLimiter = rateLimit({ interval: 60_000 });

function canManageForm(
  user: { roleSlugs?: string[]; tierLevel?: number },
  form: { managerRoleSlugs: string[] },
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (form.managerRoleSlugs.length === 0) return false;
  return form.managerRoleSlugs.some((slug) => user.roleSlugs?.includes(slug));
}

async function requireFormCreator() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    throw new Error("Unauthorized");
  }
  const creatorRoles = await getFormCreatorRoles();
  if (!canCreateForms(session.user, creatorRoles)) {
    throw new Error("Unauthorized: requires form creator role");
  }
  return session.user;
}

async function requireFormManager(formId: string) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    throw new Error("Unauthorized");
  }
  const form = await prisma.publicForm.findUnique({
    where: { id: formId },
    select: { managerRoleSlugs: true },
  });
  if (!form) throw new Error("Form not found");
  if (!canManageForm(session.user, form)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// ── Form CRUD (admin only) ──

export async function createForm(data: {
  title: string;
  slug: string;
  description?: string;
  fields: string;
  heroImageUrl?: string;
  managerRoleSlugs: string[];
}) {
  const user = await requireFormCreator();
  JSON.parse(data.fields);

  const form = await prisma.publicForm.create({
    data: {
      title: data.title,
      slug: data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      description: data.description || null,
      fields: JSON.parse(data.fields),
      heroImageUrl: data.heroImageUrl || null,
      managerRoleSlugs: data.managerRoleSlugs,
      createdBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Admin",
    action: "form.create",
    targetType: "PublicForm",
    targetId: form.id,
    details: { title: form.title, slug: form.slug },
  });

  revalidatePath("/forms");
  return form;
}

export async function updateForm(
  formId: string,
  data: {
    title: string;
    slug: string;
    description?: string;
    fields: string;
    heroImageUrl?: string;
    published: boolean;
    managerRoleSlugs: string[];
  },
) {
  const user = await requireFormCreator();
  JSON.parse(data.fields);

  await prisma.publicForm.update({
    where: { id: formId },
    data: {
      title: data.title,
      slug: data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      description: data.description || null,
      fields: JSON.parse(data.fields),
      heroImageUrl: data.heroImageUrl || null,
      published: data.published,
      managerRoleSlugs: data.managerRoleSlugs,
    },
  });

  revalidatePath("/forms");
}

export async function closeForm(formId: string) {
  const user = await requireFormCreator();
  await prisma.publicForm.update({
    where: { id: formId },
    data: { closedAt: new Date() },
  });
  revalidatePath("/forms");
}

export async function deleteForm(formId: string) {
  const user = await requireFormCreator();
  const form = await prisma.publicForm.findUnique({
    where: { id: formId },
    select: { title: true },
  });

  await prisma.publicForm.delete({ where: { id: formId } });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Admin",
    action: "form.delete",
    targetType: "PublicForm",
    targetId: formId,
    details: { title: form?.title },
  });

  revalidatePath("/forms");
}

// ── Public submission ──

export async function submitForm(formId: string, formData: FormData) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";

  try {
    await submitLimiter.check(5, ip);
  } catch {
    throw new Error("Too many submissions. Please try again later.");
  }

  // Verify Turnstile if configured
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

  const form = await prisma.publicForm.findUnique({ where: { id: formId } });
  if (!form) throw new Error("Form not found");
  if (!form.published) throw new Error("This form is not currently available");
  if (form.closedAt) throw new Error("This form is no longer accepting submissions");

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  if (!name?.trim() || !email?.trim()) throw new Error("Name and email are required");

  // Extract custom field values
  const fields = form.fields as any[];
  const data: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "file") continue;
    if (field.type === "checkbox") {
      data[field.name] = formData.get(field.name) === "on";
    } else {
      data[field.name] = formData.get(field.name) ?? "";
    }
  }

  // Check if user is logged in
  const session = await auth();
  const userId = session?.user?.id ?? null;

  await prisma.formSubmission.create({
    data: {
      formId,
      userId,
      name: name.trim(),
      email: email.trim(),
      data: data as any,
    },
  });

  revalidatePath(`/forms/${form.slug}/submissions`);
}

// ── Submission management (role-gated) ──

export async function approveSubmission(submissionId: string, notes?: string) {
  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    select: { formId: true },
  });
  if (!submission) throw new Error("Submission not found");

  const user = await requireFormManager(submission.formId);

  await prisma.formSubmission.update({
    where: { id: submissionId },
    data: {
      status: "approved",
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "form.submission.approve",
    targetType: "FormSubmission",
    targetId: submissionId,
  });

  const sub = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    include: { form: { select: { slug: true } } },
  });
  revalidatePath(`/forms/${sub?.form.slug}/submissions`);
}

export async function rejectSubmission(submissionId: string, notes?: string) {
  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    select: { formId: true },
  });
  if (!submission) throw new Error("Submission not found");

  const user = await requireFormManager(submission.formId);

  await prisma.formSubmission.update({
    where: { id: submissionId },
    data: {
      status: "rejected",
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "form.submission.reject",
    targetType: "FormSubmission",
    targetId: submissionId,
  });

  const sub = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    include: { form: { select: { slug: true } } },
  });
  revalidatePath(`/forms/${sub?.form.slug}/submissions`);
}

export async function deleteSubmission(submissionId: string) {
  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    select: { formId: true },
  });
  if (!submission) throw new Error("Submission not found");

  const user = await requireFormManager(submission.formId);

  await prisma.formSubmission.delete({ where: { id: submissionId } });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "form.submission.delete",
    targetType: "FormSubmission",
    targetId: submissionId,
  });
}
