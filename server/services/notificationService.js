import Notification from '../models/Notification.js';

export const createNotification = async ({ recipientId, type, title, content }) => {
  try {
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
