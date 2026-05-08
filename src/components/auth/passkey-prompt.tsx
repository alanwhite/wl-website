"use client";

import { useState } from "react";
import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dismissPasskeyPrompt } from "@/lib/actions/passkeys";

export function PasskeyPrompt() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleDismiss() {
    setDismissed(true);
    await dismissPasskeyPrompt().catch(() => {});
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center justify-center sm:size-12 sm:rounded-full sm:bg-primary/10">
          <Fingerprint className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">Make next time even easier</p>
          <p className="text-xs text-muted-foreground">
            Add a passkey now and you&apos;ll be able to sign in with just your fingerprint, face, or device PIN — no passwords, and no need to remember which account you used. You can set this up later from your profile too.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:flex-col-reverse md:flex-row">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Not now
          </Button>
          <Button size="sm" asChild>
            <Link href="/profile#passkeys">Set up passkey</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
