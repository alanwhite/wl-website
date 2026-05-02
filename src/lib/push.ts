import webpush from "web-push";
import { prisma } from "./prisma";
import { getNotificationTypes, getNotificationDefaults, getSiteInfo, getConfig } from "./config";
import type { NotificationDefaults } from "./config";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export function isPushEnabled(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
}

export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY ?? null;
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  icon?: string;
}

/**
 * Send push notifications for a new item (poll, announcement, event).
 * Respects user preferences and role/tier targeting.
 */
export async function sendPushNotifications({
  type,
  title,
  body,
  url,
  tag,
  targetRoleSlugs,
  targetMinTierLevel,
  excludeUserId,
}: {
  type: string; // "polls", "announcements", "events"
  title: string;
  body: string;
  url: string;
  tag?: string;
  targetRoleSlugs?: string[];
  targetMinTierLevel?: number | null;
  excludeUserId?: string; // don't notify the creator
}) {
  if (!isPushEnabled()) return;

  const [siteInfo, logoUrl, notifTypes, notifDefaults] = await Promise.all([
    getSiteInfo(),
    getConfig("site.logoUrl"),
    getNotificationTypes(),
    getNotificationDefaults(),
  ]);

  // Check this notification type exists and supports push
  const notifType = notifTypes.find((t) => t.slug === type);
  if (!notifType || !notifType.channels.includes("push")) return;

  // Find all users with push subscriptions
  const users = await prisma.user.findMany({
    where: {
      status: "APPROVED",
      pushSubscriptions: { some: {} },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: {
      id: true,
      tierLevel: true,
      userRoles: { select: { role: { select: { slug: true } } } },
      notificationPreferences: {
        where: { channel: "push", type },
        select: { enabled: true },
      },
      pushSubscriptions: {
        select: { id: true, endpoint: true, p256dh: true, auth: true },
      },
    },
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const iconUrl = logoUrl ? `${baseUrl}${logoUrl}` : undefined;

  const payload: PushPayload = {
    title: siteInfo.name,
    body,
    url,
    tag: tag ?? type,
    icon: iconUrl,
  };

  const expiredSubscriptionIds: string[] = [];

  for (const user of users) {
    // Check user preference — default to the site default if no preference saved
    const pref = user.notificationPreferences[0];
    const enabled = pref ? pref.enabled : (notifDefaults.push ?? true);
    if (!enabled) continue;

    // Check role/tier targeting
    const userRoleSlugs = user.userRoles.map((ur) => ur.role.slug);
    if (targetMinTierLevel != null && user.tierLevel < targetMinTierLevel) continue;
    if (targetRoleSlugs && targetRoleSlugs.length > 0) {
      if (!targetRoleSlugs.some((slug) => userRoleSlugs.includes(slug))) continue;
    }

    // Send to all of this user's subscriptions (multiple devices)
    for (const sub of user.pushSubscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Subscription expired or invalid — mark for cleanup
          expiredSubscriptionIds.push(sub.id);
        } else {
          console.error(`[Push] Failed to send to ${sub.endpoint}:`, err);
        }
      }
    }
  }

  // Clean up expired subscriptions
  if (expiredSubscriptionIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expiredSubscriptionIds } },
    });
  }
}

/**
 * Send push notifications to users with a specific manager role.
 * Used for operational notifications (new registrations, form submissions, etc.)
 * that go to managers rather than all members.
 */
export async function sendPushToManagers({
  managerConfigKey,
  title,
  body,
  url,
  tag,
}: {
  managerConfigKey: string; // e.g. "members.managerRoles"
  title: string;
  body: string;
  url: string;
  tag?: string;
}) {
  if (!isPushEnabled()) return;

  const [siteInfo, logoUrl, managerRoleSlugs] = await Promise.all([
    getSiteInfo(),
    getConfig("site.logoUrl"),
    getConfig(managerConfigKey).then((v) => {
      try { return v ? JSON.parse(v) as string[] : []; } catch { return []; }
    }),
  ]);

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const iconUrl = logoUrl ? `${baseUrl}${logoUrl}` : undefined;

  // Find admins + users with the manager role who have push subscriptions
  const users = await prisma.user.findMany({
    where: {
      status: "APPROVED",
      pushSubscriptions: { some: {} },
      OR: [
        { tierLevel: { gte: 999 } },
        ...(managerRoleSlugs.length > 0
          ? [{ userRoles: { some: { role: { slug: { in: managerRoleSlugs } } } } }]
          : []),
      ],
    },
    select: {
      pushSubscriptions: {
        select: { id: true, endpoint: true, p256dh: true, auth: true },
      },
    },
  });

  const payload = JSON.stringify({
    title: siteInfo.name,
    body,
    url,
    tag: tag ?? "manager",
    icon: iconUrl,
  });

  const expiredIds: string[] = [];

  for (const user of users) {
    for (const sub of user.pushSubscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          expiredIds.push(sub.id);
        } else {
          console.error(`[Push] Failed to send to manager:`, err);
        }
      }
    }
  }

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } });
  }
}
