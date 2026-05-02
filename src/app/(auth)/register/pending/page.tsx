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
  const hasEmail = !!process.env.RESEND_API_KEY;

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
            {hasEmail
              ? "We've received your registration and it's now being reviewed. We'll be in touch by email once it's been approved — this usually doesn't take long. We look forward to welcoming you!"
              : "We've received your registration and it's now being reviewed. This usually doesn't take long — please check back soon!"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {hasEmail
              ? "Keep an eye on your email — we'll send a confirmation to the address linked to your Google or Apple account. If you don't see it within a day or so, please check your junk or spam folder."
              : "Once your registration has been approved, just sign in again and you'll have full access."}
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
