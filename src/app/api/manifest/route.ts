import { getSiteInfo, getConfig, getThemeConfig } from "@/lib/config";
import { NextResponse } from "next/server";

export async function GET() {
  const [siteInfo, faviconUrl, logoUrl, theme] = await Promise.all([
    getSiteInfo(),
    getConfig("site.faviconUrl"),
    getConfig("site.logoUrl"),
    getThemeConfig(),
  ]);

  // Icon sources, in order of preference for PWA install (home screen):
  // 1. site.logoUrl — the brand logo at sizes that fit home-screen tiles (192/512)
  // 2. site.faviconUrl — small fallback used by general "any" size hint
  const icons: { src: string; sizes: string; type: string; purpose?: string }[] = [];
  if (logoUrl) {
    icons.push({ src: logoUrl, sizes: "192x192", type: "image/png", purpose: "any" });
    icons.push({ src: logoUrl, sizes: "512x512", type: "image/png", purpose: "any" });
  }
  if (faviconUrl) {
    icons.push({ src: faviconUrl, sizes: "any", type: "image/png" });
  }

  const manifest = {
    name: siteInfo.name,
    short_name: siteInfo.name,
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: theme.primary,
    icons,
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
