"use client";

import { useState } from "react";
import Link from "next/link";
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
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex-1">
          <p className="text-sm font-medium">Set up a passkey for easier sign-in</p>
          <p className="text-xs text-muted-foreground">
            Use your fingerprint, face, or security key to sign in — no need to remember which login provider you used.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Maybe later
          </Button>
          <Button size="sm" asChild>
            <Link href="/profile#passkeys">Set up</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
