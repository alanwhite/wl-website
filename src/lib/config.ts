import { prisma } from "./prisma";

const configCache = new Map<string, { value: string; timestamp: number }>();
const CACHE_TTL = 60_000; // 1 minute

export async function getConfig(key: string): Promise<string | null> {
  const cached = configCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  const config = await prisma.siteConfig.findUnique({ where: { key } });
  if (config) {
    configCache.set(key, { value: config.value, timestamp: Date.now() });
    return config.value;
  }
  return null;
}

export async function getConfigJson<T>(key: string): Promise<T | null> {
  const value = await getConfig(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setConfig(key: string, value: string): Promise<void> {
  await prisma.siteConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  configCache.set(key, { value, timestamp: Date.now() });
}

export function invalidateConfigCache(key?: string): void {
  if (key) {
    configCache.delete(key);
  } else {
    configCache.clear();
  }
}

export interface ThemeConfig {
  primary: string;
  primaryForeground: string;
  radius: string;
}

export interface SiteInfo {
  name: string;
  description: string;
  heroTitle: string;
  heroSubtitle: string;
}

export interface RegistrationFieldCondition {
  field: string;
  operator: "equals" | "not-equals" | "in" | "not-in";
  value: string | string[];
}

export interface RegistrationField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "file" | "address";
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select
  helpText?: string;
  showWhen?: RegistrationFieldCondition;
}

export async function getSiteInfo(): Promise<SiteInfo> {
  const [name, description, heroTitle, heroSubtitle] = await Promise.all([
    getConfig("site.name"),
    getConfig("site.description"),
    getConfig("site.heroTitle"),
    getConfig("site.heroSubtitle"),
  ]);
  return {
    name: name ?? "Community Site",
    description: description ?? "Welcome to our community",
    heroTitle: heroTitle ?? "Welcome",
    heroSubtitle: heroSubtitle ?? "Join our community today",
  };
}

export async function getThemeConfig(): Promise<ThemeConfig> {
  const theme = await getConfigJson<ThemeConfig>("site.theme");
  return theme ?? {
    primary: "oklch(0.205 0 0)",
    primaryForeground: "oklch(0.985 0 0)",
    radius: "0.625rem",
  };
}

export async function getRegistrationFields(): Promise<RegistrationField[]> {
  const fields = await getConfigJson<RegistrationField[]>("registration.fields");
  return fields ?? [];
}

export interface RegistrationTermsLink {
  text: string;
  url: string;
}

export interface RegistrationTermsConfig {
  enabled: boolean;
  label: string;
  content: string;
  links: RegistrationTermsLink[];
}

export async function getRegistrationTerms(): Promise<RegistrationTermsConfig> {
  const terms = await getConfigJson<RegistrationTermsConfig>("registration.terms");
  return terms ?? { enabled: false, label: "", content: "", links: [] };
}

export async function getPollManagerRoles(): Promise<string[]> {
  const roles = await getConfigJson<string[]>("polls.managerRoles");
  return roles ?? [];
}

export function canAccessPoll(
  user: { roleSlugs?: string[]; tierLevel?: number },
  poll: { targetRoleSlugs: string[]; targetMinTierLevel: number | null },
): boolean {
  // No targeting = everyone can access
  if (poll.targetRoleSlugs.length === 0 && poll.targetMinTierLevel == null) return true;

  // Check tier requirement
  if (poll.targetMinTierLevel != null && (user.tierLevel ?? 0) < poll.targetMinTierLevel) {
    return false;
  }

  // Check role requirement
  if (poll.targetRoleSlugs.length > 0) {
    if (!poll.targetRoleSlugs.some((slug) => user.roleSlugs?.includes(slug))) {
      return false;
    }
  }

  return true;
}

export function canUploadToCategory(
  user: { roleSlugs?: string[]; tierLevel?: number },
  category: { uploaderRoleSlugs: string[]; uploaderMinTierLevel: number | null },
): boolean {
  // Admin can always upload
  if (user.tierLevel && user.tierLevel >= 999) return true;

  // No uploader restrictions = nobody except admin
  if (category.uploaderRoleSlugs.length === 0 && category.uploaderMinTierLevel == null) return false;

  // Check tier requirement
  if (category.uploaderMinTierLevel != null && (user.tierLevel ?? 0) < category.uploaderMinTierLevel) {
    return false;
  }

  // Check role requirement
  if (category.uploaderRoleSlugs.length > 0) {
    if (!category.uploaderRoleSlugs.some((slug) => user.roleSlugs?.includes(slug))) {
      return false;
    }
  }

  return true;
}

export function canManagePolls(user: { roleSlugs?: string[]; tierLevel?: number }, managerRoles: string[]): boolean {
  // Admin can always manage polls
  if (user.tierLevel && user.tierLevel >= 999) return true;
  // Check if user holds any of the configured manager roles
  if (managerRoles.length === 0) return false;
  return managerRoles.some((slug) => user.roleSlugs?.includes(slug));
}

export interface SiteAssets {
  logoUrl: string | null;
  faviconUrl: string | null;
}

export async function getSiteAssets(): Promise<SiteAssets> {
  const [logoUrl, faviconUrl] = await Promise.all([
    getConfig("site.logoUrl"),
    getConfig("site.faviconUrl"),
  ]);
  return { logoUrl, faviconUrl };
}

export async function getRegistrationGuidance(): Promise<string | null> {
  return getConfig("registration.guidance");
}

export interface TierRule {
  field: string;
  operator: "starts-with" | "matches" | "equals" | "in";
  value: string | string[];
  tierSlug: string;
}

export interface TierRulesConfig {
  rules: TierRule[];
  defaultTierSlug: string;
  eligiblePostcodes?: string[];
}

export async function getTierRules(): Promise<TierRulesConfig | null> {
  return getConfigJson<TierRulesConfig>("registration.tierRules");
}

export interface AddressDataEntry {
  street: string;
  town: string;
  addresses: string[];
}

export type AddressData = Record<string, AddressDataEntry>;

export async function getMemberManagerRoles(): Promise<string[]> {
  const roles = await getConfigJson<string[]>("members.managerRoles");
  return roles ?? [];
}

export function canManageMembers(
  user: { roleSlugs?: string[]; tierLevel?: number },
  managerRoles: string[],
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (managerRoles.length === 0) return false;
  return managerRoles.some((slug) => user.roleSlugs?.includes(slug));
}

export async function getAddressData(): Promise<AddressData | null> {
  return getConfigJson<AddressData>("registration.addressData");
}

export async function getHeroImages(): Promise<string[]> {
  const images = await getConfigJson<string[]>("site.heroImages");
  return images ?? [];
}
