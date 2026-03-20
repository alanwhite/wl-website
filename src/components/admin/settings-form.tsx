"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  updateSiteSettings,
  updateTheme,
  updateRegistrationFields,
  updateLogo,
  updateFavicon,
  updateAnalyticsScript,
  type NavLink,
} from "@/lib/actions/settings";
import { toast } from "sonner";
import type { ThemeConfig, RegistrationField } from "@/lib/config";
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
  const [fieldsJson, setFieldsJson] = useState(JSON.stringify(settings.registrationFields, null, 2));
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(settings.faviconUrl);
  const [analyticsScript, setAnalyticsScript] = useState(settings.analyticsScript);
  const [loading, setLoading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

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
      await updateTheme({ primary, primaryForeground, radius });
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
    <Tabs defaultValue="site">
      <TabsList className="flex-wrap">
        <TabsTrigger value="site">Site Info</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="theme">Theme</TabsTrigger>
        <TabsTrigger value="navigation">Navigation</TabsTrigger>
        <TabsTrigger value="fields">Registration Fields</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>

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
              Define custom registration fields as a JSON array. Each field needs: name, label, type (text/textarea/select/checkbox/file), required (boolean). Optional: placeholder, options (for select), helpText.
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
    </Tabs>
  );
}
