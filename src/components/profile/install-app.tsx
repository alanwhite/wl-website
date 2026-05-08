"use client";

import { useEffect, useState } from "react";
import { Smartphone, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true,
    );
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const canInstall = !isStandalone && !installed && (installEvent !== null || isIOS);
  if (!canInstall) return null;

  async function install() {
    if (isIOS) {
      setShowIOSGuide((s) => !s);
      return;
    }
    if (!installEvent) return;
    setBusy(true);
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        toast.success("Installed — open the app from your home screen");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="h-5 w-5" />
          Install as an app
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Add the site to your home screen and it opens like a normal app — quicker to get to, no browser bar in the way, and on iPhone it&apos;s the only way to receive notifications.
        </p>
        <Button size="sm" onClick={install} disabled={busy}>
          {isIOS ? (showIOSGuide ? "Hide instructions" : "How to add") : "Add to home screen"}
        </Button>
        {showIOSGuide && (
          <div className="mt-2 rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">On iPhone or iPad:</p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                Tap the <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share button at the bottom of Safari
              </li>
              <li>
                Scroll down and choose <strong>Add to Home Screen</strong>
              </li>
              <li>
                Tap <strong>Add</strong> in the top right
              </li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
