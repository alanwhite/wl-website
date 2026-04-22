import { prisma } from "./prisma";
import { canAccessPoll } from "./config";

export interface FolderNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: FolderNode[];
}

/**
 * Build a folder tree filtered by user access.
 * Admins see everything. Other users only see categories they can access.
 * If a parent is inaccessible, its children are also hidden (even if they
 * would be accessible on their own) to avoid revealing the parent's existence.
 */
export async function buildFolderTree(user: {
  roleSlugs?: string[];
  tierLevel?: number;
}): Promise<FolderNode[]> {
  const isAdmin = (user.tierLevel ?? 0) >= 999;

  const categories = await prisma.libraryCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      targetRoleSlugs: true,
      targetMinTierLevel: true,
    },
  });

  // Filter by access — admin sees all
  const accessible = isAdmin
    ? categories
    : categories.filter((c) => canAccessPoll(user, c));

  const accessibleIds = new Set(accessible.map((c) => c.id));

  const map = new Map<string, FolderNode>();
  for (const cat of accessible) {
    map.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId,
      children: [],
    });
  }

  const roots: FolderNode[] = [];
  for (const node of map.values()) {
    // Only nest under parent if parent is also accessible
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      // Parent not accessible or no parent — show as root
      roots.push(node);
    }
  }

  return roots;
}
