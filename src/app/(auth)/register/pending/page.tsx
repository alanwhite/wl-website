import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSiteInfo } from "@/lib/config";
import { Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.status === "APPROVED") redirect("/dashboard");
  if (session.user.status === "REJECTED") redirect("/register/rejected");

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
      <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Clock className="h-8 w-8" />
          </div>
          <CardTitle>Registration Pending</CardTitle>
          <CardDescription>
            Your registration is being reviewed by an administrator. You&apos;ll receive an email once a decision has been made.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button variant="outline" type="submit">
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
