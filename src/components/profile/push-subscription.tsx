"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { subscribePush, unsubscribePush } from "@/lib/actions/push";
import { toast } from "sonner";

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
    return (
      <p className="text-sm text-muted-foreground">
        Push notifications are blocked. To enable them, update your browser notification settings for this site.
      </p>
    );
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
