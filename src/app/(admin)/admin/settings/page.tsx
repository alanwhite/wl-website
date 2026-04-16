import { getConfig, getConfigJson } from "@/lib/config";
import { SettingsForm } from "@/components/admin/settings-form";
import type { ThemeConfig, RegistrationField, RegistrationTermsConfig, TierRulesConfig, AddressData } from "@/lib/config";
import { getHeroImages } from "@/lib/config";
import type { NavLink } from "@/lib/actions/settings";
import { getNavLinks } from "@/lib/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [
    siteName,
    siteDescription,
    heroTitle,
    heroSubtitle,
    theme,
    fields,
    logoUrl,
    faviconUrl,
    navLinks,
    analyticsScript,
    registrationTerms,
    registrationGuidance,
    tierRules,
    addressData,
    heroImages,
    tiers,
    roles,
  ] = await Promise.all([
    getConfig("site.name"),
    getConfig("site.description"),
    getConfig("site.heroTitle"),
    getConfig("site.heroSubtitle"),
    getConfigJson<ThemeConfig>("site.theme"),
    getConfigJson<RegistrationField[]>("registration.fields"),
    getConfig("site.logoUrl"),
    getConfig("site.faviconUrl"),
    getNavLinks(),
    getConfig("site.analyticsScript"),
    getConfigJson<RegistrationTermsConfig>("registration.terms"),
    getConfig("registration.guidance"),
    getConfigJson<TierRulesConfig>("registration.tierRules"),
    getConfigJson<AddressData>("registration.addressData"),
    getHeroImages(),
    prisma.membershipTier.findMany({ where: { isSystem: false }, orderBy: { level: "asc" }, select: { id: true, name: true, level: true } }),
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Site Settings</h1>
      <SettingsForm
        settings={{
          siteName: siteName ?? "Community Site",
          siteDescription: siteDescription ?? "",
          heroTitle: heroTitle ?? "Welcome",
          heroSubtitle: heroSubtitle ?? "",
          theme: theme ?? { primary: "oklch(0.205 0 0)", primaryForeground: "oklch(0.985 0 0)", radius: "0.625rem" },
          registrationFields: fields ?? [],
          logoUrl,
          faviconUrl,
          navLinks,
          analyticsScript: analyticsScript ?? "",
          registrationTerms: registrationTerms ?? { enabled: false, label: "", content: "", links: [] },
          registrationGuidance: registrationGuidance ?? "",
          tierRules: tierRules ?? null,
          addressDataSummary: addressData
            ? {
                postcodes: Object.keys(addressData).length,
                addresses: Object.values(addressData).reduce(
                  (sum, entry) => sum + (entry.addresses?.length ?? 0),
                  0,
                ),
              }
            : null,
          heroImages,
          pollManagerRoles: (await getConfigJson<string[]>("polls.managerRoles")) ?? [],
        }}
        tiers={tiers}
        roles={roles}
      />
    </div>
  );
}
