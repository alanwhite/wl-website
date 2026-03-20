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

export interface RegistrationField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "file";
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select
  helpText?: string;
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
