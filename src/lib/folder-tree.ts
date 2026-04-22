import { prisma } from "./prisma";

export interface FolderNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: FolderNode[];
}

export async function buildFolderTree(): Promise<FolderNode[]> {
  const categories = await prisma.libraryCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, parentId: true },
  });

  const map = new Map<string, FolderNode>();
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  const roots: FolderNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
