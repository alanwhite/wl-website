import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";

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

export default async function MemberPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const { slug } = await params;
  const page = await prisma.page.findUnique({
    where: { slug, published: true },
  });

  if (!page) notFound();

  const contentHasHtml = page.content.trimStart().startsWith("<");

  return (
    <div className="mx-auto max-w-3xl">
      {!contentHasHtml && (
        <h1 className="mb-6 text-3xl font-bold">{page.title}</h1>
      )}
      <div className={contentHasHtml ? "max-w-none" : "prose prose-lg dark:prose-invert max-w-none prose-img:rounded-lg prose-img:shadow-md"}>
        <Markdown rehypePlugins={[rehypeRaw]}>{page.content}</Markdown>
      </div>
    </div>
  );
}
