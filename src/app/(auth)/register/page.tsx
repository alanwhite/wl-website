import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getRegistrationFields, getRegistrationTerms, getRegistrationGuidance, getSiteInfo, getConfig } from "@/lib/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DynamicFormFields } from "@/components/shared/dynamic-form";
import { submitRegistration } from "@/lib/actions/auth";
import Markdown from "react-markdown";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Already approved
  if (session.user.status === "APPROVED") redirect("/dashboard");

  // Check if registration already submitted
  const existing = await prisma.registration.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) redirect("/register/pending");

  const [fields, terms, guidance, siteInfo, logoUrl, hideAuthHeader] = await Promise.all([
    getRegistrationFields(),
    getRegistrationTerms(),
    getRegistrationGuidance(),
    getSiteInfo(),
    getConfig("site.logoUrl"),
    getConfig("site.hideAuthHeader"),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      {hideAuthHeader !== "true" && (
        <header className="border-b">
          <div className="container mx-auto flex h-16 items-center px-4">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold hover:opacity-80">
              {logoUrl && <Image src={logoUrl} alt={siteInfo.name} width={32} height={32} className="h-8 w-auto" />}
              {siteInfo.name}
            </Link>
          </div>
        </header>
      )}
      <div className="flex flex-1 items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Complete Your Registration</CardTitle>
          <CardDescription>
            Welcome to {siteInfo.name}! Please fill out the form below to complete your registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submitRegistration} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are registering as <span className="font-medium text-foreground">{session.user.email}</span>
            </p>
            {guidance && (
              <div className="rounded-md border bg-muted/50 px-4 py-3 text-sm prose prose-sm dark:prose-invert max-w-none">
                <Markdown>{guidance}</Markdown>
              </div>
            )}
            <DynamicFormFields fields={fields} />
            {terms.enabled && (
              <>
                {terms.content && (
                  <div className="max-h-48 overflow-y-auto rounded border p-3 text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
                    <Markdown>{terms.content}</Markdown>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="termsAccepted"
                    name="termsAccepted"
                    required
                    className="mt-1 h-4 w-4 rounded border"
                  />
                  <label htmlFor="termsAccepted" className="text-sm">
                    {terms.label || "I agree to the terms and conditions"}
                    {terms.links.length > 0 && (
                      <>
                        {" — "}
                        {terms.links.map((link, i) => (
                          <span key={i}>
                            {i > 0 && ", "}
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
                              {link.text}
                            </a>
                          </span>
                        ))}
                      </>
                    )}
                    <span className="text-destructive"> *</span>
                  </label>
                </div>
              </>
            )}
            <Button type="submit" className="w-full">
              Submit Registration
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Wrong account?{" "}
              <a href="/api/auth/signout" className="underline hover:text-foreground">
                Sign out
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
