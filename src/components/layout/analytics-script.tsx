import Script from "next/script";
import { getConfig } from "@/lib/config";

export async function AnalyticsScript() {
  const script = await getConfig("site.analyticsScript");
  if (!script) return null;

  return (
    <Script
      id="analytics"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
