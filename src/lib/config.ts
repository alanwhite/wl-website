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
  background?: string;
  foreground?: string;
  card?: string;
  cardForeground?: string;
  muted?: string;
  mutedForeground?: string;
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

export async function getApprovalEmailBody(): Promise<string | null> {
  return getConfig("registration.approvalEmailBody");
}

export async function getFormApprovalEmailBody(): Promise<string | null> {
  return getConfig("form.approvalEmailBody");
}

export async function getAnimateCards(): Promise<boolean> {
  return (await getConfig("ui.animateCards")) === "true";
}

export async function getFormRejectionEmailBody(): Promise<string | null> {
  return getConfig("form.rejectionEmailBody");
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

export async function getContactManagerRoles(): Promise<string[]> {
  const roles = await getConfigJson<string[]>("contacts.managerRoles");
  return roles ?? [];
}

/** Position of the auto-injected Inbox item in the member nav. Lower sorts
 *  higher; defaults high so it lands at the bottom. */
export async function getContactNavSortOrder(): Promise<number> {
  const v = await getConfig("contacts.navSortOrder");
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : 999;
}

/** Who can see the contact inbox and manage submissions (admin always can). */
export function canManageContacts(
  user: { roleSlugs?: string[]; tierLevel?: number },
  managerRoles: string[],
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (managerRoles.length === 0) return false;
  return managerRoles.some((slug) => user.roleSlugs?.includes(slug));
}

/** Opt-in stats charts at the top of the members page (off by default —
 *  tier splits and registration trends make no sense for e.g. a wedding site). */
export async function getMembersShowStats(): Promise<boolean> {
  return (await getConfig("members.showStats")) === "true";
}

export function canManageMembers(
  user: { roleSlugs?: string[]; tierLevel?: number },
  managerRoles: string[],
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (managerRoles.length === 0) return false;
  return managerRoles.some((slug) => user.roleSlugs?.includes(slug));
}

export async function getDocumentManagerRoles(): Promise<string[]> {
  const roles = await getConfigJson<string[]>("documents.managerRoles");
  return roles ?? [];
}

export function canManageDocuments(
  user: { roleSlugs?: string[]; tierLevel?: number },
  managerRoles: string[],
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (managerRoles.length === 0) return false;
  return managerRoles.some((slug) => user.roleSlugs?.includes(slug));
}

export async function getAnnouncementManagerRoles(): Promise<string[]> {
  const roles = await getConfigJson<string[]>("announcements.managerRoles");
  return roles ?? [];
}

export function canManageAnnouncements(
  user: { roleSlugs?: string[]; tierLevel?: number },
  managerRoles: string[],
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (managerRoles.length === 0) return false;
  return managerRoles.some((slug) => user.roleSlugs?.includes(slug));
}

export async function getFormCreatorRoles(): Promise<string[]> {
  const roles = await getConfigJson<string[]>("forms.creatorRoles");
  return roles ?? [];
}

export function canCreateForms(
  user: { roleSlugs?: string[]; tierLevel?: number },
  creatorRoles: string[],
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (creatorRoles.length === 0) return false;
  return creatorRoles.some((slug) => user.roleSlugs?.includes(slug));
}

export async function getCalendarManagerRoles(): Promise<string[]> {
  const roles = await getConfigJson<string[]>("calendar.managerRoles");
  return roles ?? [];
}

export function canManageCalendar(
  user: { roleSlugs?: string[]; tierLevel?: number },
  managerRoles: string[],
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (managerRoles.length === 0) return false;
  return managerRoles.some((slug) => user.roleSlugs?.includes(slug));
}

export async function getFinancialManagerRoles(): Promise<string[]> {
  const roles = await getConfigJson<string[]>("financials.managerRoles");
  return roles ?? [];
}

export async function getFinancialViewerRoles(): Promise<string[]> {
  const roles = await getConfigJson<string[]>("financials.viewerRoles");
  return roles ?? [];
}

export function canManageFinancials(
  user: { roleSlugs?: string[]; tierLevel?: number },
  managerRoles: string[],
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (managerRoles.length === 0) return false;
  return managerRoles.some((slug) => user.roleSlugs?.includes(slug));
}

export function canViewFinancials(
  user: { roleSlugs?: string[]; tierLevel?: number },
  viewerRoles: string[],
  managerRoles: string[],
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (canManageFinancials(user, managerRoles)) return true;
  if (viewerRoles.length === 0) return true; // empty = all members can view
  return viewerRoles.some((slug) => user.roleSlugs?.includes(slug));
}

export async function getSiteTimezone(): Promise<string> {
  const tz = await getConfig("site.timezone");
  return tz ?? "Europe/London";
}

export async function getFinancialYearStart(): Promise<number> {
  const month = await getConfig("financials.yearStartMonth");
  return month ? parseInt(month) : 1; // default January
}

export async function getFinancialCategories(): Promise<{ name: string; type: string }[]> {
  const cats = await getConfigJson<{ name: string; type: string }[]>("financials.categories");
  return cats ?? [
    { name: "Subscriptions", type: "income" },
    { name: "Donations", type: "income" },
    { name: "Events", type: "income" },
    { name: "Other Income", type: "income" },
    { name: "Supplies", type: "expense" },
    { name: "Equipment", type: "expense" },
    { name: "Venue", type: "expense" },
    { name: "Travel", type: "expense" },
    { name: "Other Expense", type: "expense" },
  ];
}

export interface CsvMapping {
  dateColumn: number;
  descriptionColumn: number;
  amountColumn: number;
  creditColumn?: number;  // if bank uses separate credit/debit columns
  debitColumn?: number;
  dateFormat: string;     // "DD/MM/YYYY", "YYYY-MM-DD", etc.
  hasHeader: boolean;
}

export async function getCsvMapping(): Promise<CsvMapping | null> {
  return getConfigJson<CsvMapping>("financials.csvMapping");
}

export async function getAddressData(): Promise<AddressData | null> {
  return getConfigJson<AddressData>("registration.addressData");
}

export async function getHeroImages(): Promise<string[]> {
  const images = await getConfigJson<string[]>("site.heroImages");
  return images ?? [];
}

// ── Notifications ──

export interface NotificationType {
  slug: string;
  label: string;
  description: string;
  channels: ("push" | "email")[];
}

export interface NotificationDefaults {
  push: boolean;
  email: boolean;
}

export async function getNotificationTypes(): Promise<NotificationType[]> {
  const types = await getConfigJson<NotificationType[]>("notifications.types");
  return types ?? [
    { slug: "polls", label: "New polls", description: "When a new poll is published", channels: ["push"] },
    { slug: "announcements", label: "Announcements", description: "New announcements posted", channels: ["push"] },
    { slug: "events", label: "Calendar events", description: "New events added to the calendar", channels: ["push"] },
  ];
}

export async function getNotificationDefaults(): Promise<NotificationDefaults> {
  const defaults = await getConfigJson<NotificationDefaults>("notifications.defaults");
  return defaults ?? { push: true, email: false };
}

// ── Groups ──

export async function getGroupLabel(): Promise<string> {
  const label = await getConfig("groups.label");
  return label ?? "Group";
}

export async function getGroupManagerRoles(): Promise<string[]> {
  const roles = await getConfigJson<string[]>("groups.managerRoles");
  return roles ?? [];
}

// ── Dashboard ──

export interface DashboardCard {
  type: "page" | "group-hub" | "admin-summary" | "projects";
  slug?: string;    // for page cards
  title?: string;   // optional override title
}

export async function getDashboardWelcomePageSlug(): Promise<string | null> {
  return getConfig("dashboard.welcomePageSlug");
}

export async function getDashboardWelcomeDismissible(): Promise<boolean> {
  const value = await getConfig("dashboard.welcomeDismissible");
  // Default: true (allow members to dismiss). Some tenants (e.g. wedding sites where
  // the welcome IS the invitation) opt out by setting this to "false".
  return value !== "false";
}

export async function getDashboardCards(): Promise<DashboardCard[]> {
  const cards = await getConfigJson<DashboardCard[]>("dashboard.cards");
  return cards ?? [];
}

export async function getGroupMemberFields(): Promise<RegistrationField[]> {
  const fields = await getConfigJson<RegistrationField[]>("groups.memberFields");
  return fields ?? [];
}

export async function getGroupConfirmLabel(): Promise<string> {
  const label = await getConfig("groups.confirmLabel");
  return label ?? "Confirm";
}

export async function getGroupsLocked(): Promise<boolean> {
  const locked = await getConfig("groups.locked");
  return locked === "true";
}

export function canManageGroups(
  user: { roleSlugs?: string[]; tierLevel?: number },
  managerRoles: string[],
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (managerRoles.length === 0) return false;
  return managerRoles.some((slug) => user.roleSlugs?.includes(slug));
}

// ── Projects ──

export async function getProjectLabel(): Promise<string> {
  const label = await getConfig("projects.label");
  return label ?? "Project";
}

export async function getProjectManagerRoles(): Promise<string[]> {
  const roles = await getConfigJson<string[]>("projects.managerRoles");
  return roles ?? [];
}

export function canManageProjects(
  user: { roleSlugs?: string[]; tierLevel?: number },
  managerRoles: string[],
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (managerRoles.length === 0) return false;
  return managerRoles.some((slug) => user.roleSlugs?.includes(slug));
}

export function canAccessProject(
  user: { roleSlugs?: string[]; tierLevel?: number },
  project: { targetRoleSlugs: string[]; targetMinTierLevel: number | null },
): boolean {
  // Admin can always access
  if (user.tierLevel && user.tierLevel >= 999) return true;

  // No targeting = everyone can access
  if (project.targetRoleSlugs.length === 0 && project.targetMinTierLevel == null) return true;

  // Check tier requirement
  if (project.targetMinTierLevel != null && (user.tierLevel ?? 0) < project.targetMinTierLevel) {
    return false;
  }

  // Check role requirement
  if (project.targetRoleSlugs.length > 0) {
    if (!project.targetRoleSlugs.some((slug) => user.roleSlugs?.includes(slug))) {
      return false;
    }
  }

  return true;
}

export function canContributeToProject(
  user: { roleSlugs?: string[]; tierLevel?: number },
  project: { contributorRoleSlugs: string[]; contributorMinTierLevel: number | null },
): boolean {
  // Admin can always contribute
  if (user.tierLevel && user.tierLevel >= 999) return true;

  // No contributor settings = nobody except admin (mirrors canUploadToCategory)
  if (project.contributorRoleSlugs.length === 0 && project.contributorMinTierLevel == null) return false;

  // Check tier requirement
  if (project.contributorMinTierLevel != null && (user.tierLevel ?? 0) < project.contributorMinTierLevel) {
    return false;
  }

  // Check role requirement
  if (project.contributorRoleSlugs.length > 0) {
    if (!project.contributorRoleSlugs.some((slug) => user.roleSlugs?.includes(slug))) {
      return false;
    }
  }

  return true;
}

// ── Layout plans ──

export async function getLayoutManagerRoles(): Promise<string[]> {
  const roles = await getConfigJson<string[]>("layouts.managerRoles");
  return roles ?? [];
}

export function canManageLayouts(
  user: { roleSlugs?: string[]; tierLevel?: number },
  managerRoles: string[],
): boolean {
  if (user.tierLevel && user.tierLevel >= 999) return true;
  if (managerRoles.length === 0) return false;
  return managerRoles.some((slug) => user.roleSlugs?.includes(slug));
}

export function canEditLayoutPlan(
  user: { roleSlugs?: string[]; tierLevel?: number },
  plan: { editorRoleSlugs: string[]; editorMinTierLevel: number | null },
): boolean {
  // Admin can always edit
  if (user.tierLevel && user.tierLevel >= 999) return true;

  // No editor settings = nobody except admin/layout managers (mirrors canUploadToCategory)
  if (plan.editorRoleSlugs.length === 0 && plan.editorMinTierLevel == null) return false;

  // Check tier requirement
  if (plan.editorMinTierLevel != null && (user.tierLevel ?? 0) < plan.editorMinTierLevel) {
    return false;
  }

  // Check role requirement
  if (plan.editorRoleSlugs.length > 0) {
    if (!plan.editorRoleSlugs.some((slug) => user.roleSlugs?.includes(slug))) {
      return false;
    }
  }

  return true;
}

/**
 * Layered access check for an artifact that may belong to a project:
 * the user must pass the project's read gate (if linked) AND the
 * artifact's own targeting.
 */
export function canAccessProjectArtifact(
  user: { roleSlugs?: string[]; tierLevel?: number },
  artifact: { targetRoleSlugs: string[]; targetMinTierLevel: number | null },
  project: { targetRoleSlugs: string[]; targetMinTierLevel: number | null } | null | undefined,
): boolean {
  if (project && !canAccessProject(user, project)) return false;
  return canAccessPoll(user, artifact);
}
