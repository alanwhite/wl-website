import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { getThemeConfig, getSiteInfo, getConfig, getAnimateCards } from "@/lib/config";
import { AnalyticsScript } from "@/components/layout/analytics-script";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const siteInfo = await getSiteInfo();
  const faviconUrl = await getConfig("site.faviconUrl");
  const logoUrl = await getConfig("site.logoUrl");
  const appleTouchIconUrl = await getConfig("site.appleTouchIconUrl");
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  return {
    metadataBase: new URL(baseUrl),
    viewport: { width: "device-width", initialScale: 1, viewportFit: "cover" as any },
    title: {
      default: siteInfo.name,
      template: `%s | ${siteInfo.name}`,
    },
    description: siteInfo.description,
    openGraph: {
      type: "website",
      siteName: siteInfo.name,
      title: siteInfo.name,
      description: siteInfo.description,
    },
    twitter: {
      card: "summary",
      title: siteInfo.name,
      description: siteInfo.description,
    },
    ...((faviconUrl || logoUrl || appleTouchIconUrl) ? {
      icons: {
        // Browser tab favicon prefers the small favicon when set, with logo as fallback
        icon: faviconUrl ?? logoUrl ?? undefined,
        // iOS Add-to-Home-Screen reads apple-touch-icon. Priority:
        //   1. site.appleTouchIconUrl — explicit override for tenants who've uploaded
        //      a deliberately apple-sized PNG (typically 180x180)
        //   2. site.logoUrl — most tenants' brand logo at PWA-friendly size
        //   3. site.faviconUrl — last-resort fallback
        apple: appleTouchIconUrl ?? logoUrl ?? faviconUrl ?? undefined,
      },
    } : {}),
    manifest: "/api/manifest",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, animateCards] = await Promise.all([getThemeConfig(), getAnimateCards()]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased${animateCards ? " animate-cards" : ""}`}
        style={
          {
            "--primary": theme.primary,
            "--primary-foreground": theme.primaryForeground,
            "--radius": theme.radius,
            ...(theme.background ? { "--background": theme.background } : {}),
            ...(theme.foreground ? { "--foreground": theme.foreground } : {}),
            ...(theme.card ? { "--card": theme.card } : {}),
            ...(theme.cardForeground ? { "--card-foreground": theme.cardForeground } : {}),
            ...(theme.muted ? { "--muted": theme.muted } : {}),
            ...(theme.mutedForeground ? { "--muted-foreground": theme.mutedForeground } : {}),
          } as React.CSSProperties
        }
      >
        <ThemeProvider
          attribute="class"
          defaultTheme={process.env.FORCE_LIGHT_MODE === "true" ? "light" : "system"}
          enableSystem={process.env.FORCE_LIGHT_MODE !== "true"}
          forcedTheme={process.env.FORCE_LIGHT_MODE === "true" ? "light" : undefined}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
        <AnalyticsScript />
      </body>
    </html>
  );
}
