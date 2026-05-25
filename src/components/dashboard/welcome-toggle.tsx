"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { setDashboardWelcomeDismissed } from "@/lib/actions/profile";

/**
 * "Got it, thanks" button shown at the bottom of the dashboard welcome.
 * Tapping it hides the welcome content on subsequent sign-ins.
 */
export function DismissWelcomeButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => setDashboardWelcomeDismissed(true))}
    >
      <Check className="mr-2 h-4 w-4" />
      Got it, thanks
    </Button>
  );
}

/**
 * Small "Show welcome again" link shown above the activity surface for members
 * who've previously dismissed the welcome and want it back.
 */
export function ShowWelcomeAgainLink() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setDashboardWelcomeDismissed(false))}
      className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
    >
      Show welcome again
    </button>
  );
}
