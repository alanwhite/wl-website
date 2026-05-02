import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSiteInfo, getConfig } from "@/lib/config";
import { Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.status === "APPROVED") redirect("/dashboard");
  if (session.user.status === "REJECTED") redirect("/register/rejected");

  const [siteInfo, hideAuthHeader] = await Promise.all([getSiteInfo(), getConfig("site.hideAuthHeader")]);

  return (
    <div className="flex min-h-screen flex-col">
      {hideAuthHeader !== "true" && (
        <header className="border-b">
          <div className="container mx-auto flex h-16 items-center px-4">
            <Link href="/" className="text-xl font-bold hover:opacity-80">
              {siteInfo.name}
            </Link>
          </div>
        </header>
      )}
      <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Clock className="h-8 w-8" />
          </div>
          <CardTitle>Thank you for registering!</CardTitle>
          <CardDescription>
            We&apos;ve received your registration and it&apos;s now being reviewed. We&apos;ll be in touch by email once it&apos;s been approved — this usually doesn&apos;t take long. We look forward to welcoming you!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Keep an eye on your email — we&apos;ll send a confirmation to the address linked to your Google or Apple account. If you don&apos;t see it within a day or so, please check your junk or spam folder.
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button variant="outline" type="submit">
              Back to home
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
