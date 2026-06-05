"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import {
  getProjectManagerRoles,
  canManageProjects,
  canContributeToProject,
  getPollManagerRoles,
  canManagePolls,
  getDocumentManagerRoles,
  canManageDocuments,
  getCalendarManagerRoles,
  canManageCalendar,
  getAnnouncementManagerRoles,
  canManageAnnouncements,
  getFormCreatorRoles,
  canCreateForms,
} from "@/lib/config";

export type ProjectArtifactType = "poll" | "category" | "event" | "announcement" | "form";

async function requireApprovedMember() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED" || (session.user.tierLevel ?? 0) <= 0) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function requireProjectManager() {
  const user = await requireApprovedMember();
  const managerRoles = await getProjectManagerRoles();
  if (!canManageProjects(user, managerRoles)) {
    throw new Error("Unauthorized: requires project manager role");
  }
  return user;
}

export async function createProject(formData: FormData) {
  const user = await requireProjectManager();

  const name = (formData.get("name") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const description = (formData.get("description") as string)?.trim() || null;
  const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
  const pinToNav = formData.get("pinToNav") === "on";
  const targetRoleSlugs = formData.getAll("targetRoleSlugs") as string[];
  const targetMinTierLevelRaw = formData.get("targetMinTierLevel") as string;
  const targetMinTierLevel = targetMinTierLevelRaw ? parseInt(targetMinTierLevelRaw, 10) : null;
  const contributorRoleSlugs = formData.getAll("contributorRoleSlugs") as string[];
  const contributorMinTierLevelRaw = formData.get("contributorMinTierLevel") as string;
  const contributorMinTierLevel = contributorMinTierLevelRaw ? parseInt(contributorMinTierLevelRaw, 10) : null;

  if (!name || !slug) throw new Error("Name and slug are required");

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      description,
      sortOrder,
      pinToNav,
      targetRoleSlugs: targetRoleSlugs.filter(Boolean),
      targetMinTierLevel: targetMinTierLevel && !isNaN(targetMinTierLevel) ? targetMinTierLevel : null,
      contributorRoleSlugs: contributorRoleSlugs.filter(Boolean),
      contributorMinTierLevel: contributorMinTierLevel && !isNaN(contributorMinTierLevel) ? contributorMinTierLevel : null,
      createdBy: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "project.create",
    targetType: "Project",
    targetId: project.id,
    details: { name, slug, targetRoleSlugs, targetMinTierLevel },
  });

  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  return project.id;
}

export async function updateProject(id: string, formData: FormData) {
  const user = await requireProjectManager();

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
  const pinToNav = formData.get("pinToNav") === "on";
  const targetRoleSlugs = formData.getAll("targetRoleSlugs") as string[];
  const targetMinTierLevelRaw = formData.get("targetMinTierLevel") as string;
  const targetMinTierLevel = targetMinTierLevelRaw ? parseInt(targetMinTierLevelRaw, 10) : null;
  const contributorRoleSlugs = formData.getAll("contributorRoleSlugs") as string[];
  const contributorMinTierLevelRaw = formData.get("contributorMinTierLevel") as string;
  const contributorMinTierLevel = contributorMinTierLevelRaw ? parseInt(contributorMinTierLevelRaw, 10) : null;

  if (!name) throw new Error("Name is required");

  await prisma.project.update({
    where: { id },
    data: {
      name,
      description,
      sortOrder,
      pinToNav,
      targetRoleSlugs: targetRoleSlugs.filter(Boolean),
      targetMinTierLevel: targetMinTierLevel && !isNaN(targetMinTierLevel) ? targetMinTierLevel : null,
      contributorRoleSlugs: contributorRoleSlugs.filter(Boolean),
      contributorMinTierLevel: contributorMinTierLevel && !isNaN(contributorMinTierLevel) ? contributorMinTierLevel : null,
    },
  });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "project.update",
    targetType: "Project",
    targetId: id,
    details: { name, targetRoleSlugs, targetMinTierLevel },
  });

  revalidatePath("/projects");
  revalidatePath("/admin/projects");
}

export async function setProjectStatus(id: string, status: "ACTIVE" | "ARCHIVED") {
  const user = await requireProjectManager();

  const project = await prisma.project.update({ where: { id }, data: { status } });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: status === "ARCHIVED" ? "project.archive" : "project.reactivate",
    targetType: "Project",
    targetId: id,
    details: { name: project.name },
  });

  revalidatePath("/projects");
  revalidatePath("/admin/projects");
}

export async function deleteProject(id: string) {
  const user = await requireProjectManager();

  // projectId FKs are ON DELETE SET NULL, so linked artifacts revert to standalone
  const project = await prisma.project.delete({ where: { id } });

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Manager",
    action: "project.delete",
    targetType: "Project",
    targetId: id,
    details: { name: project.name, slug: project.slug },
  });

  revalidatePath("/projects");
  revalidatePath("/admin/projects");
}

// ── Artifact linking ──
//
// Linking an artifact into a project can restrict who sees it (the project's
// read gate layers on top), so it requires BOTH the right to contribute to the
// project AND manage rights over the artifact type.

const ARTIFACT_LABEL: Record<ProjectArtifactType, string> = {
  poll: "Poll",
  category: "LibraryCategory",
  event: "CalendarEvent",
  announcement: "Announcement",
  form: "PublicForm",
};

async function canManageArtifactType(
  user: { roleSlugs?: string[]; tierLevel?: number },
  type: ProjectArtifactType,
): Promise<boolean> {
  switch (type) {
    case "poll":
      return canManagePolls(user, await getPollManagerRoles());
    case "category":
      return canManageDocuments(user, await getDocumentManagerRoles());
    case "event":
      return canManageCalendar(user, await getCalendarManagerRoles());
    case "announcement":
      return canManageAnnouncements(user, await getAnnouncementManagerRoles());
    case "form":
      return canCreateForms(user, await getFormCreatorRoles());
  }
}

async function setArtifactProject(type: ProjectArtifactType, artifactId: string, projectId: string | null) {
  switch (type) {
    case "poll":
      return prisma.poll.update({ where: { id: artifactId }, data: { projectId } });
    case "category":
      return prisma.libraryCategory.update({ where: { id: artifactId }, data: { projectId } });
    case "event":
      return prisma.calendarEvent.update({ where: { id: artifactId }, data: { projectId } });
    case "announcement":
      return prisma.announcement.update({ where: { id: artifactId }, data: { projectId } });
    case "form":
      return prisma.publicForm.update({ where: { id: artifactId }, data: { projectId } });
  }
}

export async function linkArtifactToProject(
  type: ProjectArtifactType,
  artifactId: string,
  projectId: string,
) {
  const user = await requireApprovedMember();

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  const managerRoles = await getProjectManagerRoles();
  const isProjectManager = canManageProjects(user, managerRoles);
  if (!isProjectManager && !canContributeToProject(user, project)) {
    throw new Error("You don't have permission to add items to this project");
  }
  if (!(await canManageArtifactType(user, type))) {
    throw new Error("You don't have permission to manage this type of content");
  }

  await setArtifactProject(type, artifactId, projectId);

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Unknown",
    action: "project.artifact.link",
    targetType: ARTIFACT_LABEL[type],
    targetId: artifactId,
    details: { projectId, projectName: project.name },
  });

  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/projects");
}

export async function unlinkArtifactFromProject(type: ProjectArtifactType, artifactId: string) {
  const user = await requireApprovedMember();

  // Resolve the current project (for permission check + audit detail)
  let current: { projectId: string | null } | null = null;
  switch (type) {
    case "poll":
      current = await prisma.poll.findUnique({ where: { id: artifactId }, select: { projectId: true } });
      break;
    case "category":
      current = await prisma.libraryCategory.findUnique({ where: { id: artifactId }, select: { projectId: true } });
      break;
    case "event":
      current = await prisma.calendarEvent.findUnique({ where: { id: artifactId }, select: { projectId: true } });
      break;
    case "announcement":
      current = await prisma.announcement.findUnique({ where: { id: artifactId }, select: { projectId: true } });
      break;
    case "form":
      current = await prisma.publicForm.findUnique({ where: { id: artifactId }, select: { projectId: true } });
      break;
  }
  if (!current) throw new Error("Item not found");
  if (!current.projectId) return; // already standalone

  const project = await prisma.project.findUnique({ where: { id: current.projectId } });

  const managerRoles = await getProjectManagerRoles();
  const isProjectManager = canManageProjects(user, managerRoles);
  if (!isProjectManager && !(project && canContributeToProject(user, project))) {
    throw new Error("You don't have permission to remove items from this project");
  }
  if (!(await canManageArtifactType(user, type))) {
    throw new Error("You don't have permission to manage this type of content");
  }

  await setArtifactProject(type, artifactId, null);

  await logAudit({
    userId: user.id,
    userName: user.name ?? "Unknown",
    action: "project.artifact.unlink",
    targetType: ARTIFACT_LABEL[type],
    targetId: artifactId,
    details: { projectId: current.projectId, projectName: project?.name },
  });

  if (project) revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/projects");
}

