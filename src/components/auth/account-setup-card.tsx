"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Fingerprint, Smartphone, Bell, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { dismissOnboardingStep } from "@/lib/actions/passkeys";
import { subscribePush } from "@/lib/actions/push";
import { toast } from "sonner";

interface Props {
  hasPasskey: boolean;
  hasPushSubscription: boolean;
  pushAvailable: boolean;
  vapidPublicKey: string | null;
  passkeysEnabled: boolean;
  dismissed: { passkey: boolean; pwa: boolean; notifications: boolean };
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function AccountSetupCard({
  hasPasskey,
  hasPushSubscription,
  pushAvailable,
  vapidPublicKey,
  passkeysEnabled,
  dismissed,
}: Props) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [pushSubscribed, setPushSubscribed] = useState(hasPushSubscription);
  const [pushSupported, setPushSupported] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [localDismissed, setLocalDismissed] = useState(dismissed);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || (window.navigator as { standalone?: boolean }).standalone === true);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setPushSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
    if ("Notification" in window) setNotifPermission(Notification.permission);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const showPasskey = passkeysEnabled && !hasPasskey && !localDismissed.passkey;
  const showPwa = !isStandalone && !installed && !localDismissed.pwa && (installEvent !== null || isIOS);
  // iOS only delivers web push when the site is installed as a PWA — push is gated on standalone there.
  const showNotifications =
    pushAvailable &&
    pushSupported &&
    !pushSubscribed &&
    notifPermission !== "denied" &&
    !localDismissed.notifications &&
    (!isIOS || isStandalone);

  if (!showPasskey && !showPwa && !showNotifications) return null;

  async function dismiss(step: "passkey" | "pwa" | "notifications") {
    setLocalDismissed((d) => ({ ...d, [step]: true }));
    await dismissOnboardingStep(step).catch(() => {});
  }

  async function installPwa() {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!installEvent) return;
    setBusy("pwa");
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        toast.success("Installed — open the app from your home screen");
      }
    } finally {
      setBusy(null);
    }
  }

  async function enableNotifications() {
    if (!vapidPublicKey) return;
    setBusy("notifications");
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm !== "granted") {
        toast.error("We won't send you notifications without your permission");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });
      const json = sub.toJSON();
      await subscribePush({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      setPushSubscribed(true);
      toast.success("Notifications turned on");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't turn on notifications");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Finish setting up your account</CardTitle>
        <CardDescription>
          A couple of small things to make this easier next time. All optional — skip any you don&apos;t fancy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {showPasskey && (
          <SetupRow
            icon={<Fingerprint className="h-6 w-6 text-primary" />}
            title="Make next time even easier"
            description="Add a passkey to sign in with your fingerprint, face, or device PIN — no passwords, no remembering which account."
            actionLabel="Set up passkey"
            actionHref="/profile#passkeys"
            onDismiss={() => dismiss("passkey")}
          />
        )}
        {showPwa && (
          <SetupRow
            icon={<Smartphone className="h-6 w-6 text-primary" />}
            title="Save to your home screen"
            description="Add the site to your home screen and it opens like an app — quicker to get to and easier on the eyes."
            actionLabel={isIOS ? "How to add" : "Add to home screen"}
            actionDisabled={busy === "pwa"}
            onAction={installPwa}
            onDismiss={() => dismiss("pwa")}
            extra={
              showIOSGuide ? (
                <div className="mt-2 rounded-md border border-primary/20 bg-background/60 p-3 text-xs text-muted-foreground">
                  <p className="mb-2 font-medium text-foreground">On iPhone or iPad:</p>
                  <ol className="ml-4 list-decimal space-y-1">
                    <li>Tap the <Share className="inline h-3.5 w-3.5 align-text-bottom" /> Share button at the bottom of Safari</li>
                    <li>Scroll down and choose <strong>Add to Home Screen</strong></li>
                    <li>Tap <strong>Add</strong> in the top right</li>
                  </ol>
                </div>
              ) : null
            }
          />
        )}
        {showNotifications && (
          <SetupRow
            icon={<Bell className="h-6 w-6 text-primary" />}
            title="Get a gentle nudge for new things"
            description="We'll let you know about events, news, or replies — only what's actually relevant. You can fine-tune which from your profile."
            actionLabel="Turn on notifications"
            actionDisabled={busy === "notifications"}
            onAction={enableNotifications}
            onDismiss={() => dismiss("notifications")}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface RowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  onDismiss: () => void;
  extra?: React.ReactNode;
}

function SetupRow({ icon, title, description, actionLabel, actionHref, actionDisabled, onAction, onDismiss, extra }: RowProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/60 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex shrink-0 items-center justify-center sm:size-10 sm:rounded-full sm:bg-primary/10">
          {icon}
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Not now
          </Button>
          {actionHref ? (
            <Button size="sm" asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button size="sm" onClick={onAction} disabled={actionDisabled}>
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
      {extra}
    </div>
  );
}
