"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  updateSiteSettings,
  updateTheme,
  updateRegistrationFields,
  updateRegistrationTerms,
  updatePollManagerRoles,
  updateLogo,
  updateFavicon,
  updateAnalyticsScript,
  updateRegistrationGuidance,
  updateTierRules,
  updateAddressData,
  updateMemberManagerRoles,
  updateDocumentManagerRoles,
  updateFormCreatorRoles,
  updateAnnouncementManagerRoles,
  updateCalendarManagerRoles,
  updateFinancialRoles,
  addHeroImage,
  removeHeroImage,
  updateNotificationTypes,
  updateNotificationDefaults,
  updateGroupSettings,
  updateGroupMemberFields,
  type NavLink,
} from "@/lib/actions/settings";
import { toast } from "sonner";
import type { ThemeConfig, RegistrationField, RegistrationTermsConfig, TierRulesConfig, NotificationType, NotificationDefaults } from "@/lib/config";
import { NavigationEditor } from "@/components/admin/navigation-editor";

interface SettingsFormProps {
  settings: {
    siteName: string;
    siteDescription: string;
    heroTitle: string;
    heroSubtitle: string;
    theme: ThemeConfig;
    registrationFields: RegistrationField[];
    logoUrl: string | null;
    faviconUrl: string | null;
    navLinks: NavLink[];
    analyticsScript: string;
    registrationTerms: RegistrationTermsConfig;
    registrationGuidance: string;
    tierRules: TierRulesConfig | null;
    pollManagerRoles: string[];
    addressDataSummary: { postcodes: number; addresses: number } | null;
    heroImages: string[];
    memberManagerRoles: string[];
    calendarManagerRoles: string[];
    financialManagerRoles: string[];
    financialViewerRoles: string[];
    financialYearStartMonth: number;
    announcementManagerRoles: string[];
    formCreatorRoles: string[];
    documentManagerRoles: string[];
    notificationTypes: NotificationType[];
    notificationDefaults: NotificationDefaults;
    groupLabel: string;
    groupManagerRoles: string[];
    groupMemberFields: import("@/lib/config").RegistrationField[];
    groupConfirmLabel: string;
  };
  tiers: { id: string; name: string; level: number }[];
  roles: { id: string; name: string; slug: string }[];
}

export function SettingsForm({ settings, tiers, roles }: SettingsFormProps) {
  const [siteName, setSiteName] = useState(settings.siteName);
  const [siteDescription, setSiteDescription] = useState(settings.siteDescription);
  const [heroTitle, setHeroTitle] = useState(settings.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle);
  const [primary, setPrimary] = useState(settings.theme.primary);
  const [primaryForeground, setPrimaryForeground] = useState(settings.theme.primaryForeground);
  const [radius, setRadius] = useState(settings.theme.radius);
  const [themeBackground, setThemeBackground] = useState(settings.theme.background ?? "");
  const [themeForeground, setThemeForeground] = useState(settings.theme.foreground ?? "");
  const [themeCard, setThemeCard] = useState(settings.theme.card ?? "");
  const [themeCardForeground, setThemeCardForeground] = useState(settings.theme.cardForeground ?? "");
  const [themeMuted, setThemeMuted] = useState(settings.theme.muted ?? "");
  const [themeMutedForeground, setThemeMutedForeground] = useState(settings.theme.mutedForeground ?? "");
  const [fieldsJson, setFieldsJson] = useState(JSON.stringify(settings.registrationFields, null, 2));
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(settings.faviconUrl);
  const [analyticsScript, setAnalyticsScript] = useState(settings.analyticsScript);
  const [pollManagerRoleSlugs, setPollManagerRoleSlugs] = useState<string[]>(settings.pollManagerRoles);
  const [memberManagerRoleSlugs, setMemberManagerRoleSlugs] = useState<string[]>(settings.memberManagerRoles);
  const [documentManagerRoleSlugs, setDocumentManagerRoleSlugs] = useState<string[]>(settings.documentManagerRoles);
  const [formCreatorRoleSlugs, setFormCreatorRoleSlugs] = useState<string[]>(settings.formCreatorRoles);
  const [announcementManagerRoleSlugs, setAnnouncementManagerRoleSlugs] = useState<string[]>(settings.announcementManagerRoles);
  const [calendarManagerRoleSlugs, setCalendarManagerRoleSlugs] = useState<string[]>(settings.calendarManagerRoles);
  const [financialManagerRoleSlugs, setFinancialManagerRoleSlugs] = useState<string[]>(settings.financialManagerRoles);
  const [financialViewerRoleSlugs, setFinancialViewerRoleSlugs] = useState<string[]>(settings.financialViewerRoles);
  const [financialYearStart, setFinancialYearStart] = useState(String(settings.financialYearStartMonth));
  const [groupLabelVal, setGroupLabelVal] = useState(settings.groupLabel);
  const [groupManagerRoleSlugs, setGroupManagerRoleSlugs] = useState<string[]>(settings.groupManagerRoles);
  const [groupMemberFieldsJson, setGroupMemberFieldsJson] = useState(JSON.stringify(settings.groupMemberFields, null, 2));
  const [groupConfirmLabelVal, setGroupConfirmLabelVal] = useState(settings.groupConfirmLabel);
  const [notifTypesJson, setNotifTypesJson] = useState(JSON.stringify(settings.notificationTypes, null, 2));
  const [notifDefaultPush, setNotifDefaultPush] = useState(settings.notificationDefaults.push);
  const [termsEnabled, setTermsEnabled] = useState(settings.registrationTerms.enabled);
  const [termsLabel, setTermsLabel] = useState(settings.registrationTerms.label);
  const [termsContent, setTermsContent] = useState(settings.registrationTerms.content);
  const [termsLinks, setTermsLinks] = useState(settings.registrationTerms.links);
  const [guidanceText, setGuidanceText] = useState(settings.registrationGuidance);
  const [tierRulesJson, setTierRulesJson] = useState(
    settings.tierRules ? JSON.stringify(settings.tierRules, null, 2) : "",
  );
  const [addressSummary, setAddressSummary] = useState(settings.addressDataSummary);
  const [heroImages, setHeroImages] = useState<string[]>(settings.heroImages);
  const [loading, setLoading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const addressFileRef = useRef<HTMLInputElement>(null);
  const heroImageRef = useRef<HTMLInputElement>(null);

  async function handleSaveSite() {
    setLoading(true);
    try {
      await updateSiteSettings({
        "site.name": siteName,
        "site.description": siteDescription,
        "site.heroTitle": heroTitle,
        "site.heroSubtitle": heroSubtitle,
      });
      toast.success("Site settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTheme() {
    setLoading(true);
    try {
      await updateTheme({
        primary, primaryForeground, radius,
        ...(themeBackground ? { background: themeBackground } : {}),
        ...(themeForeground ? { foreground: themeForeground } : {}),
        ...(themeCard ? { card: themeCard } : {}),
        ...(themeCardForeground ? { cardForeground: themeCardForeground } : {}),
        ...(themeMuted ? { muted: themeMuted } : {}),
        ...(themeMutedForeground ? { mutedForeground: themeMutedForeground } : {}),
      });
      toast.success("Theme saved. Refresh to see changes.");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveFields() {
    setLoading(true);
    try {
      JSON.parse(fieldsJson); // validate
      await updateRegistrationFields(fieldsJson);
      toast.success("Registration fields saved");
    } catch {
      toast.error("Invalid JSON");
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePollRoles() {
    setLoading(true);
    try {
      await updatePollManagerRoles(JSON.stringify(pollManagerRoleSlugs));
      toast.success("Poll manager roles saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDocumentManagerRoles() {
    setLoading(true);
    try {
      await updateDocumentManagerRoles(JSON.stringify(documentManagerRoleSlugs));
      toast.success("Document manager roles saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveFormCreatorRoles() {
    setLoading(true);
    try {
      await updateFormCreatorRoles(JSON.stringify(formCreatorRoleSlugs));
      toast.success("Form creator roles saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAnnouncementRoles() {
    setLoading(true);
    try {
      await updateAnnouncementManagerRoles(JSON.stringify(announcementManagerRoleSlugs));
      toast.success("Announcement roles saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCalendarRoles() {
    setLoading(true);
    try {
      await updateCalendarManagerRoles(JSON.stringify(calendarManagerRoleSlugs));
      toast.success("Calendar roles saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveFinancialRoles() {
    setLoading(true);
    try {
      await updateFinancialRoles({
        managerRoles: JSON.stringify(financialManagerRoleSlugs),
        viewerRoles: JSON.stringify(financialViewerRoleSlugs),
        yearStartMonth: financialYearStart,
      });
      toast.success("Financial settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMemberManagerRoles() {
    setLoading(true);
    try {
      await updateMemberManagerRoles(JSON.stringify(memberManagerRoleSlugs));
      toast.success("Member manager roles saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTerms() {
    setLoading(true);
    try {
      const config = JSON.stringify({
        enabled: termsEnabled,
        label: termsLabel,
        content: termsContent,
        links: termsLinks,
      });
      await updateRegistrationTerms(config);
      toast.success("Terms settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("logo", file);
      const url = await updateLogo(formData);
      setLogoPreview(url);
      toast.success("Logo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setLoading(false);
    }
  }

  async function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("favicon", file);
      const url = await updateFavicon(formData);
      setFaviconPreview(url);
      toast.success("Favicon updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGuidance() {
    setLoading(true);
    try {
      await updateRegistrationGuidance(guidanceText);
      toast.success("Registration guidance saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTierRules() {
    setLoading(true);
    try {
      if (tierRulesJson.trim()) {
        JSON.parse(tierRulesJson); // validate
        await updateTierRules(tierRulesJson);
      } else {
        await updateTierRules("null");
      }
      toast.success("Tier rules saved");
    } catch {
      toast.error("Invalid JSON");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddressFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      JSON.parse(text); // validate
      const result = await updateAddressData(text);
      setAddressSummary(result);
      toast.success(`Loaded ${result.postcodes} postcodes with ${result.addresses} addresses`);
    } catch {
      toast.error("Invalid JSON file");
    } finally {
      setLoading(false);
      // Reset input so the same file can be re-uploaded
      if (addressFileRef.current) addressFileRef.current.value = "";
    }
  }

  async function handleHeroImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("image", file);
      const result = await addHeroImage(formData);
      setHeroImages(result.images);
      toast.success("Hero image added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload");
    } finally {
      setLoading(false);
      if (heroImageRef.current) heroImageRef.current.value = "";
    }
  }

  async function handleRemoveHeroImage(url: string) {
    setLoading(true);
    try {
      const updated = await removeHeroImage(url);
      setHeroImages(updated);
      toast.success("Hero image removed");
    } catch {
      toast.error("Failed to remove");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAnalytics() {
    setLoading(true);
    try {
      await updateAnalyticsScript(analyticsScript);
      toast.success("Analytics script saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tabs defaultValue="site" orientation="vertical" className="flex flex-col gap-6 md:flex-row md:items-start">
      <TabsList className="flex h-auto w-full flex-row gap-1 overflow-x-auto bg-transparent p-0 md:w-56 md:shrink-0 md:flex-col md:overflow-x-visible">
        <TabsTrigger value="site" className="justify-start">Site Info</TabsTrigger>
        <TabsTrigger value="branding" className="justify-start">Branding</TabsTrigger>
        <TabsTrigger value="hero" className="justify-start">Hero Images</TabsTrigger>
        <TabsTrigger value="theme" className="justify-start">Theme</TabsTrigger>
        <TabsTrigger value="navigation" className="justify-start">Navigation</TabsTrigger>
        <TabsTrigger value="fields" className="justify-start">Registration Fields</TabsTrigger>
        <TabsTrigger value="guidance" className="justify-start">Reg. Guidance</TabsTrigger>
        <TabsTrigger value="tierRules" className="justify-start">Tier Rules</TabsTrigger>
        <TabsTrigger value="addressData" className="justify-start">Address Data</TabsTrigger>
        <TabsTrigger value="terms" className="justify-start">Terms &amp; Conditions</TabsTrigger>
        <TabsTrigger value="memberMgmt" className="justify-start">Member Mgmt</TabsTrigger>
        <TabsTrigger value="documents" className="justify-start">Documents</TabsTrigger>
        <TabsTrigger value="forms" className="justify-start">Forms</TabsTrigger>
        <TabsTrigger value="announcements" className="justify-start">Announcements</TabsTrigger>
        <TabsTrigger value="calendar" className="justify-start">Calendar</TabsTrigger>
        <TabsTrigger value="financials" className="justify-start">Financials</TabsTrigger>
        <TabsTrigger value="polls" className="justify-start">Polls</TabsTrigger>
        <TabsTrigger value="groups" className="justify-start">Groups</TabsTrigger>
        <TabsTrigger value="notifications" className="justify-start">Notifications</TabsTrigger>
        <TabsTrigger value="integrations" className="justify-start">Integrations</TabsTrigger>
      </TabsList>
      <div className="flex-1 min-w-0">

      <TabsContent value="site">
        <Card>
          <CardHeader>
            <CardTitle>Site Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hero Title</Label>
              <Input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hero Subtitle</Label>
              <Input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} />
            </div>
            <Button onClick={handleSaveSite} disabled={loading}>Save Site Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="branding">
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    width={64}
                    height={64}
                    className="h-16 w-auto rounded border object-contain"
                  />
                )}
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: Square image, at least 128x128px. Max 5MB.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Favicon</Label>
              <div className="flex items-center gap-4">
                {faviconPreview && (
                  <Image
                    src={faviconPreview}
                    alt="Favicon preview"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded border object-contain"
                  />
                )}
                <div>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFaviconUpload}
                  />
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => faviconInputRef.current?.click()}
                  >
                    {faviconPreview ? "Change Favicon" : "Upload Favicon"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: Square image, 32x32px or 64x64px. ICO, PNG, or SVG.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="hero">
        <Card>
          <CardHeader>
            <CardTitle>Hero Slideshow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload images for the landing page hero slideshow. Images crossfade automatically. Use high-resolution landscape images for best results.
            </p>
            {heroImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {heroImages.map((url) => (
                  <div key={url} className="group relative overflow-hidden rounded-md border">
                    <Image
                      src={url}
                      alt="Hero image"
                      width={400}
                      height={225}
                      className="aspect-video w-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                      disabled={loading}
                      onClick={() => handleRemoveHeroImage(url)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
                No hero images uploaded. The landing page will show a plain background.
              </div>
            )}
            <div>
              <input
                ref={heroImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleHeroImageUpload}
              />
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => heroImageRef.current?.click()}
              >
                Add Image
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="theme">
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Color (oklch)</Label>
              <Input value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="oklch(0.205 0 0)" />
            </div>
            <div className="space-y-2">
              <Label>Primary Foreground (oklch)</Label>
              <Input value={primaryForeground} onChange={(e) => setPrimaryForeground(e.target.value)} placeholder="oklch(0.985 0 0)" />
            </div>
            <div className="space-y-2">
              <Label>Border Radius</Label>
              <Input value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="0.625rem" />
            </div>
            <div className="mt-6 border-t pt-4">
              <h3 className="mb-3 text-sm font-medium">Extended Colours (optional — leave blank for defaults)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Background</Label>
                  <Input value={themeBackground} onChange={(e) => setThemeBackground(e.target.value)} placeholder="oklch(1 0 0)" />
                </div>
                <div className="space-y-2">
                  <Label>Foreground</Label>
                  <Input value={themeForeground} onChange={(e) => setThemeForeground(e.target.value)} placeholder="oklch(0.145 0 0)" />
                </div>
                <div className="space-y-2">
                  <Label>Card Background</Label>
                  <Input value={themeCard} onChange={(e) => setThemeCard(e.target.value)} placeholder="oklch(1 0 0)" />
                </div>
                <div className="space-y-2">
                  <Label>Card Foreground</Label>
                  <Input value={themeCardForeground} onChange={(e) => setThemeCardForeground(e.target.value)} placeholder="oklch(0.145 0 0)" />
                </div>
                <div className="space-y-2">
                  <Label>Muted Background</Label>
                  <Input value={themeMuted} onChange={(e) => setThemeMuted(e.target.value)} placeholder="oklch(0.97 0 0)" />
                </div>
                <div className="space-y-2">
                  <Label>Muted Foreground</Label>
                  <Input value={themeMutedForeground} onChange={(e) => setThemeMutedForeground(e.target.value)} placeholder="oklch(0.556 0 0)" />
                </div>
              </div>
            </div>
            <Button onClick={handleSaveTheme} disabled={loading}>Save Theme</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="navigation">
        <Card>
          <CardHeader>
            <CardTitle>Navigation Links</CardTitle>
          </CardHeader>
          <CardContent>
            <NavigationEditor initialLinks={settings.navLinks} tiers={tiers} roles={roles} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="fields">
        <Card>
          <CardHeader>
            <CardTitle>Registration Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define custom registration fields as a JSON array. Each field needs: name, label, type (text/textarea/select/checkbox/file/address), required (boolean). Optional: placeholder, options (for select), helpText, showWhen (conditional visibility).
            </p>
            <Textarea
              value={fieldsJson}
              onChange={(e) => setFieldsJson(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
            <Button onClick={handleSaveFields} disabled={loading}>Save Fields</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="guidance">
        <Card>
          <CardHeader>
            <CardTitle>Registration Guidance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Optional guidance text shown above the registration form. Use this to explain membership types, eligibility criteria, or what information is needed.
            </p>
            <Textarea
              value={guidanceText}
              onChange={(e) => setGuidanceText(e.target.value)}
              rows={6}
              placeholder="e.g. To join as a Full Member, please provide your name, postcode and address..."
            />
            <Button onClick={handleSaveGuidance} disabled={loading}>Save Guidance</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tierRules">
        <Card>
          <CardHeader>
            <CardTitle>Tier Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure automatic tier suggestions based on registration data. When a user submits their registration, the system evaluates these rules and pre-selects the suggested tier for admin review. Leave empty to disable.
            </p>
            <p className="text-xs text-muted-foreground">
              Format: JSON with &quot;rules&quot; array (each with field, operator, value, tierSlug), &quot;defaultTierSlug&quot;, and optional &quot;eligiblePostcodes&quot; array for live postcode checking. Operators: starts-with, equals, in, matches.
            </p>
            <Textarea
              value={tierRulesJson}
              onChange={(e) => setTierRulesJson(e.target.value)}
              rows={16}
              className="font-mono text-sm"
              placeholder={`{\n  "rules": [\n    {\n      "field": "address.postcode",\n      "operator": "in",\n      "value": ["G69 8FD", "G69 8FE"],\n      "tierSlug": "full-member"\n    }\n  ],\n  "defaultTierSlug": "associate-member",\n  "eligiblePostcodes": ["G69 8FD", "G69 8FE"]\n}`}
            />
            <Button onClick={handleSaveTierRules} disabled={loading}>Save Tier Rules</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="addressData">
        <Card>
          <CardHeader>
            <CardTitle>Address Lookup Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a JSON file of addresses keyed by postcode. When a user enters a matching postcode during registration, they get an address dropdown instead of typing manually.
            </p>
            {addressSummary ? (
              <div className="rounded-md border bg-muted/50 px-4 py-3 text-sm">
                Currently loaded: <strong>{addressSummary.postcodes}</strong> postcodes with <strong>{addressSummary.addresses}</strong> addresses.
              </div>
            ) : (
              <div className="rounded-md border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                No address data loaded.
              </div>
            )}
            <div>
              <input
                ref={addressFileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleAddressFileUpload}
              />
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => addressFileRef.current?.click()}
              >
                {addressSummary ? "Replace Address Data" : "Upload Address Data"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Format: JSON object keyed by postcode, each with street, town, and addresses array.
              Generate using <code>load-addresses.sh</code> or upload directly here.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="terms">
        <Card>
          <CardHeader>
            <CardTitle>Terms &amp; Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              When enabled, users must accept terms before completing registration.
              You can provide inline text, links to pages, or both.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="termsEnabled"
                checked={termsEnabled}
                onChange={(e) => setTermsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="termsEnabled">Require terms acceptance on registration</Label>
            </div>
            {termsEnabled && (
              <>
                <div className="space-y-2">
                  <Label>Checkbox Label</Label>
                  <Input
                    value={termsLabel}
                    onChange={(e) => setTermsLabel(e.target.value)}
                    placeholder="I agree to the terms and conditions"
                  />
                  <p className="text-xs text-muted-foreground">
                    The text shown next to the checkbox. Links (if any) are appended automatically.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Terms Content (optional)</Label>
                  <Textarea
                    value={termsContent}
                    onChange={(e) => setTermsContent(e.target.value)}
                    rows={8}
                    placeholder="Paste the full text of your terms, constitution, or rules here. Shown in a scrollable box above the checkbox."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Links (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Add links to pages like Terms, Privacy Policy, or Constitution. These are appended to the checkbox label.
                  </p>
                  {termsLinks.map((link, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={link.text}
                        onChange={(e) => {
                          const updated = [...termsLinks];
                          updated[i] = { ...updated[i], text: e.target.value };
                          setTermsLinks(updated);
                        }}
                        placeholder="Link text"
                        className="flex-1"
                      />
                      <Input
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...termsLinks];
                          updated[i] = { ...updated[i], url: e.target.value };
                          setTermsLinks(updated);
                        }}
                        placeholder="/p/terms or https://..."
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTermsLinks(termsLinks.filter((_, j) => j !== i))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTermsLinks([...termsLinks, { text: "", url: "" }])}
                  >
                    Add Link
                  </Button>
                </div>
              </>
            )}
            <Button onClick={handleSaveTerms} disabled={loading}>Save Terms Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="documents">
        <Card>
          <CardHeader>
            <CardTitle>Document Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which roles can create and manage document categories and folders.
            </p>
            <div className="space-y-2">
              <Label>Document Manager Roles</Label>
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles defined yet.</p>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`doc-role-${role.slug}`}
                        checked={documentManagerRoleSlugs.includes(role.slug)}
                        onChange={(e) => {
                          if (e.target.checked) setDocumentManagerRoleSlugs([...documentManagerRoleSlugs, role.slug]);
                          else setDocumentManagerRoleSlugs(documentManagerRoleSlugs.filter((s) => s !== role.slug));
                        }}
                        className="h-4 w-4 rounded border"
                      />
                      <Label htmlFor={`doc-role-${role.slug}`}>{role.name}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSaveDocumentManagerRoles} disabled={loading}>Save Document Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="forms">
        <Card>
          <CardHeader>
            <CardTitle>Forms Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which roles can create and manage public forms.
            </p>
            <div className="space-y-2">
              <Label>Form Creator Roles</Label>
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles defined yet.</p>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`form-role-${role.slug}`}
                        checked={formCreatorRoleSlugs.includes(role.slug)}
                        onChange={(e) => {
                          if (e.target.checked) setFormCreatorRoleSlugs([...formCreatorRoleSlugs, role.slug]);
                          else setFormCreatorRoleSlugs(formCreatorRoleSlugs.filter((s) => s !== role.slug));
                        }}
                        className="h-4 w-4 rounded border"
                      />
                      <Label htmlFor={`form-role-${role.slug}`}>{role.name}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSaveFormCreatorRoles} disabled={loading}>Save Forms Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="announcements">
        <Card>
          <CardHeader>
            <CardTitle>Announcement Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which roles can create and manage announcements.
            </p>
            <div className="space-y-2">
              <Label>Announcement Manager Roles</Label>
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles defined yet.</p>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`ann-role-${role.slug}`}
                        checked={announcementManagerRoleSlugs.includes(role.slug)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAnnouncementManagerRoleSlugs([...announcementManagerRoleSlugs, role.slug]);
                          } else {
                            setAnnouncementManagerRoleSlugs(announcementManagerRoleSlugs.filter((s) => s !== role.slug));
                          }
                        }}
                        className="h-4 w-4 rounded border"
                      />
                      <Label htmlFor={`ann-role-${role.slug}`}>{role.name}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSaveAnnouncementRoles} disabled={loading}>Save Announcement Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="calendar">
        <Card>
          <CardHeader>
            <CardTitle>Calendar Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which roles can create and manage calendar events. All approved members can view events.
            </p>
            <div className="space-y-2">
              <Label>Calendar Manager Roles</Label>
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles defined yet.</p>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`cal-role-${role.slug}`}
                        checked={calendarManagerRoleSlugs.includes(role.slug)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCalendarManagerRoleSlugs([...calendarManagerRoleSlugs, role.slug]);
                          } else {
                            setCalendarManagerRoleSlugs(calendarManagerRoleSlugs.filter((s) => s !== role.slug));
                          }
                        }}
                        className="h-4 w-4 rounded border"
                      />
                      <Label htmlFor={`cal-role-${role.slug}`}>{role.name}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSaveCalendarRoles} disabled={loading}>Save Calendar Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="financials">
        <Card>
          <CardHeader>
            <CardTitle>Financial Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select which roles can add and edit transactions (typically Treasurer).
              </p>
              <div className="space-y-2">
                <Label>Financial Manager Roles</Label>
                {roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No roles defined yet.</p>
                ) : (
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`fin-mgr-${role.slug}`}
                          checked={financialManagerRoleSlugs.includes(role.slug)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFinancialManagerRoleSlugs([...financialManagerRoleSlugs, role.slug]);
                            } else {
                              setFinancialManagerRoleSlugs(financialManagerRoleSlugs.filter((s) => s !== role.slug));
                            }
                          }}
                          className="h-4 w-4 rounded border"
                        />
                        <Label htmlFor={`fin-mgr-${role.slug}`}>{role.name}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select which roles can view financials (leave empty for all members to view).
              </p>
              <div className="space-y-2">
                <Label>Financial Viewer Roles (optional)</Label>
                {roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No roles defined yet.</p>
                ) : (
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`fin-view-${role.slug}`}
                          checked={financialViewerRoleSlugs.includes(role.slug)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFinancialViewerRoleSlugs([...financialViewerRoleSlugs, role.slug]);
                            } else {
                              setFinancialViewerRoleSlugs(financialViewerRoleSlugs.filter((s) => s !== role.slug));
                            }
                          }}
                          className="h-4 w-4 rounded border"
                        />
                        <Label htmlFor={`fin-view-${role.slug}`}>{role.name}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Which month does the financial year start? Annual reports will use this.
              </p>
              <div className="space-y-2">
                <Label>Financial Year Starts</Label>
                <Select value={financialYearStart} onValueChange={setFinancialYearStart}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSaveFinancialRoles} disabled={loading}>Save Financial Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="memberMgmt">
        <Card>
          <CardHeader>
            <CardTitle>Member Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which roles can manage members — approve registrations, change tiers, suspend or delete users. Admins can always manage members regardless of this setting.
            </p>
            <div className="space-y-2">
              <Label>Member Manager Roles</Label>
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No roles defined yet. Create roles in the Roles section first.
                </p>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`member-mgmt-role-${role.slug}`}
                        checked={memberManagerRoleSlugs.includes(role.slug)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMemberManagerRoleSlugs([...memberManagerRoleSlugs, role.slug]);
                          } else {
                            setMemberManagerRoleSlugs(memberManagerRoleSlugs.filter((s) => s !== role.slug));
                          }
                        }}
                        className="h-4 w-4 rounded border"
                      />
                      <Label htmlFor={`member-mgmt-role-${role.slug}`}>{role.name}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSaveMemberManagerRoles} disabled={loading}>Save Member Management Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="polls">
        <Card>
          <CardHeader>
            <CardTitle>Poll Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which roles can create and close polls. Admins can always manage polls regardless of this setting.
            </p>
            <div className="space-y-2">
              <Label>Poll Manager Roles</Label>
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No roles defined yet. Create roles in the Roles section first.
                </p>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`poll-role-${role.slug}`}
                        checked={pollManagerRoleSlugs.includes(role.slug)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPollManagerRoleSlugs([...pollManagerRoleSlugs, role.slug]);
                          } else {
                            setPollManagerRoleSlugs(pollManagerRoleSlugs.filter((s) => s !== role.slug));
                          }
                        }}
                        className="h-4 w-4 rounded border"
                      />
                      <Label htmlFor={`poll-role-${role.slug}`}>{role.name}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSavePollRoles} disabled={loading}>Save Poll Settings</Button>
          </CardContent>
        </Card>
      </TabsContent>


      <TabsContent value="groups">
        <Card>
          <CardHeader>
            <CardTitle>Groups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Group Label</Label>
              <Input
                value={groupLabelVal}
                onChange={(e) => setGroupLabelVal(e.target.value)}
                placeholder="Group"
              />
              <p className="text-xs text-muted-foreground">
                What groups are called on this site (e.g. &quot;Household&quot;, &quot;Family&quot;, &quot;Team&quot;).
              </p>
            </div>
            <div className="space-y-2">
              <Label>Group Manager Roles</Label>
              <div className="space-y-1">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={groupManagerRoleSlugs.includes(role.slug)}
                      onChange={(e) => {
                        if (e.target.checked) setGroupManagerRoleSlugs([...groupManagerRoleSlugs, role.slug]);
                        else setGroupManagerRoleSlugs(groupManagerRoleSlugs.filter((s) => s !== role.slug));
                      }}
                      className="h-4 w-4 rounded border"
                    />
                    {role.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Roles that can create and manage all groups and assign users to them.
              </p>
            </div>
            <Button
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await updateGroupSettings(groupLabelVal || "Group", JSON.stringify(groupManagerRoleSlugs));
                  toast.success("Group settings saved");
                } catch {
                  toast.error("Failed to save");
                }
                setLoading(false);
              }}
            >
              Save Group Settings
            </Button>
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Member Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure fields collected per group member (e.g. meal choices, dietary requirements). Uses the same format as registration fields.
            </p>
            <Textarea
              value={groupMemberFieldsJson}
              onChange={(e) => setGroupMemberFieldsJson(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <div className="space-y-2">
              <Label>Confirm Button Label</Label>
              <Input
                value={groupConfirmLabelVal}
                onChange={(e) => setGroupConfirmLabelVal(e.target.value)}
                placeholder="Confirm"
              />
              <p className="text-xs text-muted-foreground">
                Text shown on the confirmation button (e.g. &quot;Confirm Attendance&quot;).
              </p>
            </div>
            <Button
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  JSON.parse(groupMemberFieldsJson);
                  await updateGroupMemberFields(groupMemberFieldsJson, groupConfirmLabelVal || "Confirm");
                  toast.success("Member fields saved");
                } catch {
                  toast.error("Invalid JSON");
                }
                setLoading(false);
              }}
            >
              Save Member Fields
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define what members can be notified about. Each type has a slug, label, description, and which channels it supports.
            </p>
            <Textarea
              value={notifTypesJson}
              onChange={(e) => setNotifTypesJson(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <Button
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  JSON.parse(notifTypesJson);
                  await updateNotificationTypes(notifTypesJson);
                  toast.success("Notification types saved");
                } catch {
                  toast.error("Invalid JSON");
                }
                setLoading(false);
              }}
            >
              Save Notification Types
            </Button>
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Default Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Default opt-in state for new members. Members can override these in their profile.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notifDefaultPush"
                  checked={notifDefaultPush}
                  onChange={(e) => setNotifDefaultPush(e.target.checked)}
                  className="h-4 w-4 rounded border"
                />
                <Label htmlFor="notifDefaultPush">Push notifications enabled by default</Label>
              </div>
            </div>
            <Button
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await updateNotificationDefaults(
                    JSON.stringify({ push: notifDefaultPush, email: false }),
                  );
                  toast.success("Defaults saved");
                } catch {
                  toast.error("Failed to save");
                }
                setLoading(false);
              }}
            >
              Save Defaults
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="integrations">
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste your analytics tracking script below (e.g., Google Analytics, Plausible, Fathom).
              The script will be injected into every page.
            </p>
            <Textarea
              value={analyticsScript}
              onChange={(e) => setAnalyticsScript(e.target.value)}
              rows={8}
              className="font-mono text-sm"
              placeholder={`// Example: Plausible Analytics\nvar script = document.createElement('script');\nscript.defer = true;\nscript.src = 'https://plausible.io/js/script.js';\nscript.dataset.domain = 'yourdomain.com';\ndocument.head.appendChild(script);`}
            />
            <Button onClick={handleSaveAnalytics} disabled={loading}>Save Analytics</Button>
          </CardContent>
        </Card>
      </TabsContent>
      </div>
    </Tabs>
  );
}
