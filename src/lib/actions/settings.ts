"use server";

import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";
import { setConfig, invalidateConfigCache } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { saveFile, deleteFile } from "@/lib/upload";
import { getConfig } from "@/lib/config";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

const ALLOWED_SITE_KEYS = [
  "site.name",
  "site.description",
  "site.heroTitle",
  "site.heroSubtitle",
];

export async function updateSiteSettings(settings: Record<string, string>) {
  const admin = await requireAdmin();

  for (const [key, value] of Object.entries(settings)) {
    if (!ALLOWED_SITE_KEYS.includes(key)) continue;
    await setConfig(key, value);
  }

  invalidateConfigCache();
  revalidatePath("/", "layout");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.update",
    details: { keys: Object.keys(settings) },
  });
}

export async function updateTheme(theme: { primary: string; primaryForeground: string; radius: string }) {
  const admin = await requireAdmin();
  await setConfig("site.theme", JSON.stringify(theme));
  invalidateConfigCache("site.theme");
  revalidatePath("/", "layout");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.theme.update",
    details: theme,
  });
}

export async function updateRegistrationFields(fields: string) {
  const admin = await requireAdmin();
  // Validate it's valid JSON array
  JSON.parse(fields);
  await setConfig("registration.fields", fields);
  invalidateConfigCache("registration.fields");
  revalidatePath("/register");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.registrationFields.update",
  });
}

export async function updateLogo(formData: FormData) {
  const admin = await requireAdmin();
  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided");

  const oldLogoUrl = await getConfig("site.logoUrl");
  if (oldLogoUrl) await deleteFile(oldLogoUrl).catch(() => {});

  const url = await saveFile(file, "branding");
  await setConfig("site.logoUrl", url);
  invalidateConfigCache("site.logoUrl");
  revalidatePath("/", "layout");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.logo.update",
  });

  return url;
}

export async function updateFavicon(formData: FormData) {
  const admin = await requireAdmin();
  const file = formData.get("favicon") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided");

  const oldFaviconUrl = await getConfig("site.faviconUrl");
  if (oldFaviconUrl) await deleteFile(oldFaviconUrl).catch(() => {});

  const url = await saveFile(file, "branding");
  await setConfig("site.faviconUrl", url);
  invalidateConfigCache("site.faviconUrl");
  revalidatePath("/", "layout");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.favicon.update",
  });

  return url;
}

export async function updateNavigation(links: NavLink[]) {
  const admin = await requireAdmin();
  await setConfig("site.navigation", JSON.stringify(links));
  invalidateConfigCache("site.navigation");
  revalidatePath("/", "layout");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.navigation.update",
    details: { linkCount: links.length },
  });
}

export async function updatePollManagerRoles(rolesJson: string) {
  const admin = await requireAdmin();
  JSON.parse(rolesJson); // validate
  await setConfig("polls.managerRoles", rolesJson);
  invalidateConfigCache("polls.managerRoles");
  revalidatePath("/polls");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.pollManagerRoles.update",
  });
}

export async function updateDocumentManagerRoles(rolesJson: string) {
  const admin = await requireAdmin();
  JSON.parse(rolesJson);
  await setConfig("documents.managerRoles", rolesJson);
  invalidateConfigCache("documents.managerRoles");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.documentManagerRoles.update",
  });
}

export async function updateFormCreatorRoles(rolesJson: string) {
  const admin = await requireAdmin();
  JSON.parse(rolesJson);
  await setConfig("forms.creatorRoles", rolesJson);
  invalidateConfigCache("forms.creatorRoles");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.formCreatorRoles.update",
  });
}

export async function updateAnnouncementManagerRoles(rolesJson: string) {
  const admin = await requireAdmin();
  JSON.parse(rolesJson);
  await setConfig("announcements.managerRoles", rolesJson);
  invalidateConfigCache("announcements.managerRoles");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.announcementManagerRoles.update",
  });
}

export async function updateCalendarManagerRoles(rolesJson: string) {
  const admin = await requireAdmin();
  JSON.parse(rolesJson);
  await setConfig("calendar.managerRoles", rolesJson);
  invalidateConfigCache("calendar.managerRoles");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.calendarManagerRoles.update",
  });
}

export async function updateFinancialRoles(data: { managerRoles: string; viewerRoles: string; yearStartMonth?: string }) {
  const admin = await requireAdmin();
  JSON.parse(data.managerRoles);
  JSON.parse(data.viewerRoles);
  await setConfig("financials.managerRoles", data.managerRoles);
  await setConfig("financials.viewerRoles", data.viewerRoles);
  if (data.yearStartMonth) {
    await setConfig("financials.yearStartMonth", data.yearStartMonth);
    invalidateConfigCache("financials.yearStartMonth");
  }
  invalidateConfigCache("financials.managerRoles");
  invalidateConfigCache("financials.viewerRoles");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.financialRoles.update",
  });
}

export async function updateMemberManagerRoles(rolesJson: string) {
  const admin = await requireAdmin();
  JSON.parse(rolesJson); // validate
  await setConfig("members.managerRoles", rolesJson);
  invalidateConfigCache("members.managerRoles");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.memberManagerRoles.update",
  });
}

export async function updateRegistrationTerms(terms: string) {
  const admin = await requireAdmin();
  JSON.parse(terms); // validate
  await setConfig("registration.terms", terms);
  invalidateConfigCache("registration.terms");
  revalidatePath("/register");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.registrationTerms.update",
  });
}

export async function updateAnalyticsScript(script: string) {
  const admin = await requireAdmin();
  await setConfig("site.analyticsScript", script);
  invalidateConfigCache("site.analyticsScript");
  revalidatePath("/", "layout");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.analytics.update",
  });
}

export async function updateRegistrationGuidance(guidance: string) {
  const admin = await requireAdmin();
  await setConfig("registration.guidance", guidance);
  invalidateConfigCache("registration.guidance");
  revalidatePath("/register");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.registrationGuidance.update",
  });
}

export async function updateTierRules(rules: string) {
  const admin = await requireAdmin();
  JSON.parse(rules); // validate
  await setConfig("registration.tierRules", rules);
  invalidateConfigCache("registration.tierRules");
  revalidatePath("/register");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.tierRules.update",
  });
}

export async function updateAddressData(data: string) {
  const admin = await requireAdmin();
  const parsed = JSON.parse(data); // validate
  const postcodes = Object.keys(parsed).length;
  const addresses = Object.values(parsed).reduce(
    (sum: number, entry: unknown) =>
      sum + ((entry as { addresses: unknown[] }).addresses?.length ?? 0),
    0,
  );
  await setConfig("registration.addressData", data);
  invalidateConfigCache("registration.addressData");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.addressData.update",
    details: { postcodes, addresses },
  });

  return { postcodes, addresses };
}

export async function addHeroImage(formData: FormData) {
  const admin = await requireAdmin();
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) throw new Error("No file provided");

  const url = await saveFile(file, "hero");

  const existing = await getConfig("site.heroImages");
  const images: string[] = existing ? JSON.parse(existing) : [];
  images.push(url);

  await setConfig("site.heroImages", JSON.stringify(images));
  invalidateConfigCache("site.heroImages");
  revalidatePath("/");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.heroImages.add",
    details: { url },
  });

  return { url, images };
}

export async function removeHeroImage(url: string) {
  const admin = await requireAdmin();

  const existing = await getConfig("site.heroImages");
  const images: string[] = existing ? JSON.parse(existing) : [];
  const updated = images.filter((img) => img !== url);

  await setConfig("site.heroImages", JSON.stringify(updated));
  invalidateConfigCache("site.heroImages");
  await deleteFile(url).catch(() => {});
  revalidatePath("/");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.heroImages.remove",
    details: { url },
  });

  return updated;
}

export interface NavLink {
  label: string;
  href: string;
  isExternal: boolean;
  sortOrder: number;
  minTierLevel: number | null;
  requiredRoleSlug: string | null;
  icon?: string;
}

export async function updateNotificationTypes(typesJson: string) {
  const admin = await requireAdmin();
  JSON.parse(typesJson); // validate JSON
  await setConfig("notifications.types", typesJson);
  invalidateConfigCache("notifications.types");
  revalidatePath("/admin/settings");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.notifications.types.update",
  });
}

export async function updateNotificationDefaults(defaultsJson: string) {
  const admin = await requireAdmin();
  JSON.parse(defaultsJson); // validate JSON
  await setConfig("notifications.defaults", defaultsJson);
  invalidateConfigCache("notifications.defaults");
  revalidatePath("/admin/settings");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.notifications.defaults.update",
  });
}

export async function updateGroupSettings(label: string, managerRoleSlugsJson: string) {
  const admin = await requireAdmin();
  await setConfig("groups.label", label);
  await setConfig("groups.managerRoles", managerRoleSlugsJson);
  invalidateConfigCache("groups.label");
  invalidateConfigCache("groups.managerRoles");
  revalidatePath("/admin/settings");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.groups.update",
    details: { label },
  });
}

export async function updateGroupMemberFields(fieldsJson: string, confirmLabel: string) {
  const admin = await requireAdmin();
  JSON.parse(fieldsJson); // validate
  await setConfig("groups.memberFields", fieldsJson);
  await setConfig("groups.confirmLabel", confirmLabel);
  invalidateConfigCache("groups.memberFields");
  invalidateConfigCache("groups.confirmLabel");
  revalidatePath("/admin/settings");

  await logAudit({
    userId: admin.id,
    userName: admin.name ?? "Admin",
    action: "settings.groups.memberFields.update",
  });
}
