import { prisma } from "./prisma";
import {
  canAccessProject,
  canContributeToProject,
  canManageProjects,
  getProjectManagerRoles,
} from "./config";

/**
 * Projects the user may add content to — drives the "Project" dropdown on
 * artifact create/edit forms. Project managers and admins see all ACTIVE
 * projects; everyone else sees ACTIVE projects whose contributor gate they pass.
 */
export async function getContributableProjects(user: {
  roleSlugs?: string[];
  tierLevel?: number;
}): Promise<{ id: string; name: string }[]> {
  const projects = await prisma.project.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      contributorRoleSlugs: true,
      contributorMinTierLevel: true,
    },
  });

  const managerRoles = await getProjectManagerRoles();
  if (canManageProjects(user, managerRoles)) {
    return projects.map(({ id, name }) => ({ id, name }));
  }
  return projects
    .filter((p) => canContributeToProject(user, p))
    .map(({ id, name }) => ({ id, name }));
}

/**
 * Pinned, active projects the user can access — appended to the member
 * sidebar/bottom nav. Visibility always tracks the project's read gate, so
 * links never drift from the actual permissions, and archiving or unpinning
 * removes them automatically.
 */
export async function getPinnedProjectNavItems(user: {
  roleSlugs?: string[];
  tierLevel?: number;
}): Promise<{ label: string; href: string; icon: string }[]> {
  const pinned = await prisma.project.findMany({
    where: { status: "ACTIVE", pinToNav: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      name: true,
      slug: true,
      targetRoleSlugs: true,
      targetMinTierLevel: true,
    },
  });

  return pinned
    .filter((p) => canAccessProject(user, p))
    .map((p) => ({ label: p.name, href: `/projects/${p.slug}`, icon: "FolderKanban" }));
}

/**
 * Resolve the project gate that applies to a library category, walking up the
 * folder tree: a sub-folder inherits the project of its nearest project-linked
 * ancestor.
 */
export async function getCategoryEffectiveProject(
  categoryId: string,
): Promise<{ targetRoleSlugs: string[]; targetMinTierLevel: number | null } | null> {
  let currentId: string | null = categoryId;
  while (currentId) {
    const cat: {
      parentId: string | null;
      project: { targetRoleSlugs: string[]; targetMinTierLevel: number | null } | null;
    } | null = await prisma.libraryCategory.findUnique({
      where: { id: currentId },
      select: {
        parentId: true,
        project: { select: { targetRoleSlugs: true, targetMinTierLevel: true } },
      },
    });
    if (!cat) return null;
    if (cat.project) return cat.project;
    currentId = cat.parentId;
  }
  return null;
}

/**
 * Validate that the user may place content into the given project.
 * Returns the project (including its read gate, for push targeting),
 * or throws. Pass-through for a null/empty projectId.
 */
export async function assertProjectContributor(
  user: { roleSlugs?: string[]; tierLevel?: number },
  projectId: string | null | undefined,
): Promise<{ id: string; name: string; targetRoleSlugs: string[]; targetMinTierLevel: number | null } | null> {
  if (!projectId) return null;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      status: true,
      targetRoleSlugs: true,
      targetMinTierLevel: true,
      contributorRoleSlugs: true,
      contributorMinTierLevel: true,
    },
  });
  if (!project || project.status !== "ACTIVE") throw new Error("Project not found");

  const managerRoles = await getProjectManagerRoles();
  if (!canManageProjects(user, managerRoles) && !canContributeToProject(user, project)) {
    throw new Error("You don't have permission to add items to this project");
  }

  return {
    id: project.id,
    name: project.name,
    targetRoleSlugs: project.targetRoleSlugs,
    targetMinTierLevel: project.targetMinTierLevel,
  };
}
