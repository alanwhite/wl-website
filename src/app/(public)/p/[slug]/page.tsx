import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSiteInfo, getConfig } from "@/lib/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/layout/providers";
import { getNavLinks } from "@/lib/navigation";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { collapseBlankLinesBetweenTags } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.page.findUnique({
    where: { slug, published: true },
    select: { title: true },
  });
  if (!page) return { title: "Not Found" };
  return { title: page.title };
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await prisma.page.findUnique({
    where: { slug, published: true },
  });

  if (!page) notFound();

  const [siteInfo, logoUrl, navLinks] = await Promise.all([
    getSiteInfo(),
    getConfig("site.logoUrl"),
    getNavLinks(),
  ]);

  const contentHasHtml = page.content.trimStart().startsWith("<");
  const renderContent = contentHasHtml ? collapseBlankLinesBetweenTags(page.content) : page.content;

  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        {!page.hideHeader && (
          <Header siteName={siteInfo.name} logoUrl={logoUrl} navLinks={navLinks.filter((l) => l.minTierLevel === null && !l.requiredRoleSlug)} />
        )}
        <main className={contentHasHtml ? "flex-1" : "container mx-auto max-w-3xl flex-1 px-4 py-12"}>
          {!contentHasHtml && (
            <h1 className="mb-6 text-3xl font-bold">{page.title}</h1>
          )}
          <div className={contentHasHtml ? "max-w-none" : "prose dark:prose-invert max-w-none"}>
            <Markdown rehypePlugins={[rehypeRaw]}>{renderContent}</Markdown>
          </div>
        </main>
        {!page.hideFooter && <Footer siteName={siteInfo.name} />}
      </div>
    </Providers>
  );
}
