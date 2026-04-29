"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateNotificationPreferences } from "@/lib/actions/profile";
import { toast } from "sonner";
import type { NotificationType, NotificationDefaults } from "@/lib/config";

const CHANNEL_LABELS: Record<string, string> = {
  push: "Push",
  email: "Email",
  newsletter: "Newsletter",
};

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
    // Set defaults for all type/channel combinations
    for (const t of types) {
      for (const ch of t.channels) {
        map[`${ch}:${t.slug}`] = defaults[ch as keyof NotificationDefaults] ?? true;
      }
    }
    // Override with saved preferences
    for (const s of saved) {
      map[`${s.channel}:${s.type}`] = s.enabled;
    }
    return map;
  });
  const [saving, setSaving] = useState(false);

  // Get all unique channels across all types
  const allChannels = Array.from(
    new Set(types.flatMap((t) => t.channels)),
  );

  function toggle(channel: string, type: string) {
    const key = `${channel}:${type}`;
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const preferences = Object.entries(prefs).map(([key, enabled]) => {
        const [channel, type] = key.split(":");
        return { channel, type, enabled };
      });
      await updateNotificationPreferences(preferences);
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose how you want to be notified about new items.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4 text-left font-medium" />
                {allChannels.map((ch) => (
                  <th key={ch} className="px-3 py-2 text-center font-medium">
                    {CHANNEL_LABELS[ch] ?? ch}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.slug} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.description}
                    </div>
                  </td>
                  {allChannels.map((ch) => (
                    <td key={ch} className="px-3 py-3 text-center">
                      {t.channels.includes(ch as "push" | "email" | "newsletter") ? (
                        <input
                          type="checkbox"
                          checked={prefs[`${ch}:${t.slug}`] ?? false}
                          onChange={() => toggle(ch, t.slug)}
                          className="h-4 w-4 rounded border"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
