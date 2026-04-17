import { getConfigJson } from "./config";

export interface NavLink {
  label: string;
  href: string;
  isExternal: boolean;
  sortOrder: number;
  minTierLevel: number | null;
  requiredRoleSlug: string | null;
  icon?: string; // lucide icon name, e.g. "FolderOpen", "BarChart3"
  // Backward compat: old format used `visibility`
  visibility?: "public" | "members" | "all";
}

function normalizeLink(link: NavLink): NavLink {
  // Migrate old visibility format to new tier/role format
  if (link.minTierLevel === undefined && link.visibility) {
    return {
      ...link,
      minTierLevel: link.visibility === "public" ? null : 1,
      requiredRoleSlug: null,
    };
  }
  return {
    ...link,
    minTierLevel: link.minTierLevel ?? null,
    requiredRoleSlug: link.requiredRoleSlug ?? null,
  };
}

const defaultLinks: NavLink[] = [
  { label: "About", href: "/about", isExternal: false, sortOrder: 0, minTierLevel: null, requiredRoleSlug: null },
  { label: "Contact", href: "/contact", isExternal: false, sortOrder: 1, minTierLevel: null, requiredRoleSlug: null },
];

export async function getNavLinks(): Promise<NavLink[]> {
  const links = await getConfigJson<NavLink[]>("site.navigation");
  if (!links || links.length === 0) return defaultLinks;
  return links.map(normalizeLink).sort((a, b) => a.sortOrder - b.sortOrder);
}
