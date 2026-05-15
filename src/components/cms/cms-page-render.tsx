import type { Page } from "@prisma/client";
import { getSiteInfo, getConfig } from "@/lib/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/components/layout/providers";
import { getNavLinks } from "@/lib/navigation";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { collapseBlankLinesBetweenTags } from "@/lib/utils";

/**
 * Renders a CMS Page with site chrome.
 * Used by both /p/[slug] and the vanity-path catch-all (/[vanity]).
 */
export async function CmsPageRender({ page }: { page: Page }) {
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
          <Header
            siteName={siteInfo.name}
            logoUrl={logoUrl}
            navLinks={navLinks.filter((l) => l.minTierLevel === null && !l.requiredRoleSlug)}
          />
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
