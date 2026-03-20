import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  const pages = await prisma.page.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const pageRoutes: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${baseUrl}/p/${page.slug}`,
    lastModified: page.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...pageRoutes];
}
