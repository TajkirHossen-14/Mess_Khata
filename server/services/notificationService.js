import Notification from '../models/Notification.js';

/**
 * Create an in-app notification.
 *
 * When `dedupeKey` is provided the notification is unique per
 * (recipient, dedupeKey) — duplicates are silently ignored (atomic via the
 * unique partial index) and the 20-hour "same type" rule is NOT applied,
 * so two different reminders of the same type on the same day still arrive.
 *
 * Without `dedupeKey` the Sprint 2 behaviour is kept: one notification of
 * the same type per recipient within 20 hours.
 */
export const createNotification = async ({ recipientId, type, title, content, dedupeKey }) => {
  try {
    if (dedupeKey) {
      try {
        const notification = await Notification.create({
          recipientId,
          type,
          title,
          content,
          isRead: false,
          dedupeKey,
        });
        return notification;
      } catch (error) {
        if (error.code === 11000) {
          // Already delivered in an earlier (or overlapping) run.
          return null;
        }
        throw error;
      }
    }

    const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);

    const existing = await Notification.findOne({
      recipientId,
      type,
      createdAt: { $gte: twentyHoursAgo }
    });

    if (existing) {
      console.log(`Notification of type ${type} for ${recipientId} already sent recently. Skipping.`);
      return null;
    }

    const notification = await Notification.create({
      recipientId,
      type,
      title,
      content,
      isRead: false
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};
