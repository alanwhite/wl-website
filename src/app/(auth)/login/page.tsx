import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSiteInfo, getConfig } from "@/lib/config";
import { Github } from "lucide-react";
import { PasskeyLoginButton } from "@/components/auth/passkey-login-button";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    if (session.user.status === "APPROVED") {
      redirect("/dashboard");
    } else if (session.user.status === "PENDING_REVIEW") {
      redirect(session.user.tierLevel === 0 ? "/register" : "/register/pending");
    } else if (session.user.status === "REJECTED") {
      redirect("/register/rejected");
    }
  }

  const [siteInfo, logoUrl, hideAuthHeader] = await Promise.all([getSiteInfo(), getConfig("site.logoUrl"), getConfig("site.hideAuthHeader")]);
  const credentialsEnabled = process.env.AUTH_CREDENTIALS_TEST === "true";
  const passkeysEnabled = !credentialsEnabled;

  const providers = [];
  if (process.env.AUTH_GITHUB_ID) providers.push({ id: "github", name: "GitHub", icon: Github });
  if (process.env.AUTH_GOOGLE_ID) providers.push({ id: "google", name: "Google", icon: null });
  if (process.env.AUTH_FACEBOOK_ID) providers.push({ id: "facebook", name: "Facebook", icon: null });
  if (process.env.AUTH_APPLE_ID) providers.push({ id: "apple", name: "Apple", icon: null });

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
      <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{siteInfo.name}</CardTitle>
          <CardDescription>Sign in or register</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error === "suspended" && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Your account has been suspended. Please contact an administrator.
            </div>
          )}
          {params.error === "CredentialsSignin" && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Invalid email or password.
            </div>
          )}
          {credentialsEnabled && (
            <form
              action={async (formData: FormData) => {
                "use server";
                await signIn("credentials", {
                  email: formData.get("email") as string,
                  password: formData.get("password") as string,
                  redirectTo: params.callbackUrl ?? "/dashboard",
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="admin@test.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Sign in
              </Button>
            </form>
          )}
          {credentialsEnabled && providers.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
          )}
          {/* Provider buttons first — primary action for new and returning users */}
          {providers.map((provider) => (
            <form
              key={provider.id}
              action={async () => {
                "use server";
                await signIn(provider.id, { redirectTo: params.callbackUrl ?? "/dashboard" });
              }}
            >
              <Button type="submit" variant="outline" className="w-full" size="lg">
                {provider.icon && <provider.icon className="mr-2 h-5 w-5" />}
                Continue with {provider.name}
              </Button>
            </form>
          ))}
          {providers.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              New here? Just click one of the buttons above to register.
            </p>
          )}
          {/* Passkey section — secondary, for returning members only */}
          {passkeysEnabled && (
            <>
              <div className="relative pt-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Returning member?</span>
                </div>
              </div>
              <PasskeyLoginButton />
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
