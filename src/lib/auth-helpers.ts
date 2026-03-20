import type { SessionUser } from "@/types";

export const SYSTEM_LEVELS = {
  PENDING: 0,
  ADMIN: 999,
} as const;

export function isAdmin(user: Pick<SessionUser, "tierLevel">): boolean {
  return user.tierLevel >= SYSTEM_LEVELS.ADMIN;
}

export function hasMinTier(user: Pick<SessionUser, "tierLevel">, minLevel: number): boolean {
  return user.tierLevel >= minLevel;
}

export function hasRole(user: Pick<SessionUser, "roleSlugs">, slug: string): boolean {
  return user.roleSlugs.includes(slug);
}
