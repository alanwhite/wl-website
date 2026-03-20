import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSiteInfo } from "@/lib/config";

export default async function NotFound() {
  const siteInfo = await getSiteInfo();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="mt-4 text-xl text-muted-foreground">Page not found</p>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist on {siteInfo.name}.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  );
}
