import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getRegistrationFields, getSiteInfo } from "@/lib/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DynamicFormFields } from "@/components/shared/dynamic-form";
import { submitRegistration } from "@/lib/actions/auth";

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

  const fields = await getRegistrationFields();
  const siteInfo = await getSiteInfo();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/" className="text-xl font-bold hover:opacity-80">
            {siteInfo.name}
          </Link>
        </div>
      </header>
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
            <DynamicFormFields fields={fields} />
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="termsAccepted"
                name="termsAccepted"
                required
                className="mt-1 h-4 w-4 rounded border"
              />
              <label htmlFor="termsAccepted" className="text-sm">
                I agree to the{" "}
                <a href="/p/terms" target="_blank" className="underline hover:opacity-80">
                  Terms &amp; Conditions
                </a>{" "}
                and{" "}
                <a href="/p/privacy" target="_blank" className="underline hover:opacity-80">
                  Privacy Policy
                </a>
                <span className="text-destructive"> *</span>
              </label>
            </div>
            <Button type="submit" className="w-full">
              Submit Registration
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
