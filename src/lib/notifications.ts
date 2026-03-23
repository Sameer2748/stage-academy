import prisma from "./prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

// ─── Push Notification ───────────────────────────────────────────────────────

/**
 * Send a push notification to a browser subscription using the Web Push API.
 * Uses the standard Web Push protocol via fetch.
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  try {
    // For web push, we need the web-push library or a similar implementation.
    // Here we use a fetch-based approach to the push service endpoint.
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        TTL: "86400", // 24 hours
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[notifications] Push failed for ${subscription.endpoint}: ${response.status}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[notifications] Push error:", error);
    return false;
  }
}

// ─── Database Notification ───────────────────────────────────────────────────

/**
 * Create an in-app notification record in the database.
 */
export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: string
): Promise<{ id: string }> {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      type,
      isRead: false,
      sentAt: new Date(),
    },
  });

  return { id: notification.id };
}

// ─── Mark Notifications Read ─────────────────────────────────────────────────

/**
 * Mark all unread notifications as read for a user.
 */
export async function markAllNotificationsRead(
  userId: string
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return result.count;
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  notificationId: string
): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

// ─── Get Unread Count ────────────────────────────────────────────────────────

/**
 * Get the count of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

// ─── Scheduled Notification Helpers ──────────────────────────────────────────

/**
 * Create a scheduled notification for a future time.
 */
export async function scheduleNotification(
  userId: string,
  title: string,
  body: string,
  type: string,
  scheduledAt: Date
): Promise<{ id: string }> {
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      type,
      isRead: false,
      scheduledAt,
      sentAt: null,
    },
  });

  return { id: notification.id };
}

/**
 * Get all notifications due to be sent (scheduledAt <= now and sentAt is null).
 */
export async function getDueNotifications() {
  return prisma.notification.findMany({
    where: {
      scheduledAt: { lte: new Date() },
      sentAt: null,
    },
    include: { user: true },
  });
}
