import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/dashboard/", "/profile/", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
