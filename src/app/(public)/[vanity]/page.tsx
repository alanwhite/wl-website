import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CmsPageRender } from "@/components/cms/cms-page-render";

export const dynamic = "force-dynamic";

// Top-level vanity URLs for CMS pages, e.g. /gala maps to a Page with
// vanityPath="gala". Next.js routes specific paths (/about, /contact, /p, etc.)
// before reaching this catch-all, so this fires only when no other route matches.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vanity: string }>;
}): Promise<Metadata> {
  const { vanity } = await params;
  const page = await prisma.page.findUnique({
    where: { vanityPath: vanity, published: true },
    select: { title: true },
  });
  if (!page) return { title: "Not Found" };
  return { title: page.title };
}

export default async function VanityPage({
  params,
}: {
  params: Promise<{ vanity: string }>;
}) {
  const { vanity } = await params;
  const page = await prisma.page.findUnique({
    where: { vanityPath: vanity, published: true },
  });

  if (!page) notFound();

  return <CmsPageRender page={page} />;
}
