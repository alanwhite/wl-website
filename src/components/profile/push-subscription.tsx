"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { subscribePush, unsubscribePush } from "@/lib/actions/push";
import { toast } from "sonner";

type Browser = "safari" | "chrome" | "edge" | "firefox" | "other";

function detectBrowser(): Browser {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Chrome\//.test(ua) && /Google Inc/.test(navigator.vendor || "")) return "chrome";
  if (/Safari\//.test(ua) && /Apple Computer/.test(navigator.vendor || "")) return "safari";
  return "other";
}

const STEPS: Record<Browser, { heading: string; steps: string[] }> = {
  safari: {
    heading: "On Safari (Mac):",
    steps: [
      "Click Safari in the menu bar at the top of your screen, then choose Settings.",
      "Go to the Websites tab, then pick Notifications in the left sidebar.",
      "Find this site in the list and change it from Deny to Allow, then close Settings.",
      "Come back here and refresh the page.",
    ],
  },
  chrome: {
    heading: "On Chrome:",
    steps: [
      "Click the small icon (a tune slider or padlock) just to the left of the address bar.",
      "Find Notifications in the dropdown and change it from Block to Allow.",
      "Refresh the page.",
    ],
  },
  edge: {
    heading: "On Edge:",
    steps: [
      "Click the padlock icon to the left of the address bar.",
      "Choose Permissions for this site, then change Notifications from Block to Allow.",
      "Refresh the page.",
    ],
  },
  firefox: {
    heading: "On Firefox:",
    steps: [
      "Click the padlock icon to the left of the address bar.",
      "Click the > arrow next to the site name, then More Information.",
      "Open the Permissions tab, find Send Notifications, and uncheck Use Default — then choose Allow.",
      "Close that window and refresh the page.",
    ],
  },
  other: {
    heading: "In your browser settings:",
    steps: [
      "Find this site in your browser's notification permissions list.",
      "Change the setting from Block to Allow.",
      "Refresh the page.",
    ],
  },
};

function DeniedHelp() {
  // Detect on mount only — useState defaults to "other" so server render is stable.
  const [browser, setBrowser] = useState<Browser>("other");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBrowser(detectBrowser());
  }, []);

  const guide = STEPS[browser];

  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">
        Notifications are currently blocked for this site in your browser. Browsers don&apos;t let websites turn this back on themselves — but it only takes a few seconds to flip in your settings.
      </p>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        {open ? "Hide instructions" : "Show me how"}
      </Button>
      {open && (
        <div className="rounded-md border bg-muted/50 p-3 text-sm">
          <p className="mb-2 font-medium">{guide.heading}</p>
          <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
            {guide.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

interface PushSubscriptionManagerProps {
  vapidPublicKey: string;
  hasSubscription: boolean;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushSubscriptionManager({
  vapidPublicKey,
  hasSubscription: initialHasSubscription,
}: PushSubscriptionManagerProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(initialHasSubscription);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(isSupported);
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, []);

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Push notifications require this site to be added to your home screen. In your browser, tap the share button and choose &ldquo;Add to Home Screen&rdquo;, then open the site from there.
      </p>
    );
  }

  async function handleSubscribe() {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.error("Notification permission was denied");
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });

      const json = subscription.toJSON();
      await subscribePush({
        endpoint: json.endpoint!,
        keys: {
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
      });

      setSubscribed(true);
      toast.success("Push notifications enabled");
    } catch (err) {
      console.error("Push subscription failed:", err);
      toast.error("Failed to enable push notifications");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsubscribe() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
      toast.error("Failed to disable push notifications");
    } finally {
      setLoading(false);
    }
  }

  if (permission === "denied") {
    return <DeniedHelp />;
  }

  if (subscribed) {
    return (
      <Button variant="outline" size="sm" onClick={handleUnsubscribe} disabled={loading}>
        {loading ? "Disabling..." : "Disable push notifications"}
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={handleSubscribe} disabled={loading}>
      {loading ? "Enabling..." : "Enable push notifications"}
    </Button>
  );
}
