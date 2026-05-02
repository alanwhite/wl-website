"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ServiceWorkerRegister() {
  const router = useRouter();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[SW] Registration failed:", err);
      });
    }

    // When the PWA becomes visible, clear badge and refresh data
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        if ("clearAppBadge" in navigator) {
          (navigator as any).clearAppBadge().catch(() => {});
        }
        router.refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router]);

  return null;
}
