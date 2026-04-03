import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { getThemeConfig, getSiteInfo, getConfig } from "@/lib/config";
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
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  return {
    metadataBase: new URL(baseUrl),
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
    ...(faviconUrl ? {
      icons: {
        icon: faviconUrl,
        apple: faviconUrl,
      },
    } : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getThemeConfig();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={
          {
            "--primary": theme.primary,
            "--primary-foreground": theme.primaryForeground,
            "--radius": theme.radius,
          } as React.CSSProperties
        }
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
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
