import { getSiteInfo, getConfig, getThemeConfig } from "@/lib/config";
import { NextResponse } from "next/server";

export async function GET() {
  const [siteInfo, faviconUrl, theme] = await Promise.all([
    getSiteInfo(),
    getConfig("site.faviconUrl"),
    getThemeConfig(),
  ]);

  const icons = [];
  if (faviconUrl) {
    icons.push(
      { src: faviconUrl, sizes: "any", type: "image/png" },
    );
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
