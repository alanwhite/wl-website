"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { setProfileSetupDismissed } from "@/lib/actions/profile";

export type SetupStep = "passkey" | "notifications";

interface PendingItem {
  step: SetupStep;
  label: string;
  anchor: string;
}

interface Props {
  initialPending: PendingItem[];
}

export function SetupSummary({ initialPending }: Props) {
  const [items, setItems] = useState(initialPending);
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  function dismiss(step: SetupStep) {
    setItems((current) => current.filter((i) => i.step !== step));
    startTransition(async () => {
      await setProfileSetupDismissed(step, true).catch(() => {});
    });
  }

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="flex items-start gap-3 py-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="flex-1 space-y-2 text-sm">
          <p className="font-medium">
            {items.length === 1 ? "One thing left to set up" : `${items.length} things left to set up`}
          </p>
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.step} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <a href={`#${item.anchor}`} className="font-medium text-primary underline">
                  {item.label}
                </a>
                <button
                  type="button"
                  onClick={() => dismiss(item.step)}
                  disabled={pending}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Not for me right now
                </button>
              </li>
            ))}
          </ul>
          <p className="pt-1 text-xs text-muted-foreground">
            You can always set these up later from the cards below — they&apos;re here whenever you want them.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
