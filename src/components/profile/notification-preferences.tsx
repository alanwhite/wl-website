"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateNotificationPreferences } from "@/lib/actions/profile";
import { toast } from "sonner";
import type { NotificationType, NotificationDefaults } from "@/lib/config";

interface NotificationPreferencesProps {
  types: NotificationType[];
  defaults: NotificationDefaults;
  saved: { channel: string; type: string; enabled: boolean }[];
}

export function NotificationPreferences({
  types,
  defaults,
  saved,
}: NotificationPreferencesProps) {
  const [prefs, setPrefs] = useState(() => {
    const map: Record<string, boolean> = {};
    for (const t of types) {
      for (const ch of t.channels) {
        map[`${ch}:${t.slug}`] = defaults[ch as keyof NotificationDefaults] ?? true;
      }
    }
    for (const s of saved) {
      map[`${s.channel}:${s.type}`] = s.enabled;
    }
    return map;
  });

  async function toggle(channel: string, type: string) {
    const key = `${channel}:${type}`;
    const newValue = !prefs[key];
    setPrefs((prev) => ({ ...prev, [key]: newValue }));
    try {
      await updateNotificationPreferences([{ channel, type, enabled: newValue }]);
    } catch {
      setPrefs((prev) => ({ ...prev, [key]: !newValue }));
      toast.error("Failed to update preference");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Choose what you want to be notified about.
        </p>
        <div className="space-y-3">
          {types.map((t) => (
            <div key={t.slug} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.description}</div>
              </div>
              <Switch
                checked={prefs[`push:${t.slug}`] ?? false}
                onCheckedChange={() => toggle("push", t.slug)}
                size="sm"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
