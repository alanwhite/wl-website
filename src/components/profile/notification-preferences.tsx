"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateNotificationPreferences, updateNewsletterOptIn } from "@/lib/actions/profile";
import { toast } from "sonner";
import type { NotificationType, NotificationDefaults } from "@/lib/config";

const CHANNEL_LABELS: Record<string, string> = {
  push: "Push",
  email: "Email",
};

interface NotificationPreferencesProps {
  types: NotificationType[];
  defaults: NotificationDefaults;
  saved: { channel: string; type: string; enabled: boolean }[];
  newsletterOptIn: boolean;
}

export function NotificationPreferences({
  types,
  defaults,
  saved,
  newsletterOptIn: initialNewsletter,
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
  const [newsletter, setNewsletter] = useState(initialNewsletter);

  const allChannels = Array.from(
    new Set(types.flatMap((t) => t.channels)),
  );

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

  async function toggleNewsletter() {
    const newValue = !newsletter;
    setNewsletter(newValue);
    try {
      await updateNewsletterOptIn(newValue);
    } catch {
      setNewsletter(!newValue);
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
                      {t.channels.includes(ch as "push" | "email") ? (
                        <Switch
                          checked={prefs[`${ch}:${t.slug}`] ?? false}
                          onCheckedChange={() => toggle(ch, t.slug)}
                          size="sm"
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
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <div>
            <div className="text-sm font-medium">Newsletter</div>
            <div className="text-xs text-muted-foreground">Periodic email updates and newsletters</div>
          </div>
          <Switch
            checked={newsletter}
            onCheckedChange={toggleNewsletter}
            size="sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
