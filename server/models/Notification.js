import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['meal_deadline', 'bill_due', 'payment_status', 'duty_reminder', 'complaint', 'general'],
      required: true,
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    // When set, only one notification per (recipient, dedupeKey) can ever exist.
    dedupeKey: { type: String, default: null },
  },
  { timestamps: true }
);

// Makes duplicate prevention atomic even if two job runs overlap.
notificationSchema.index(
  { recipientId: 1, dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeKey: { $type: 'string' } },
  }
);

export default mongoose.model('Notification', notificationSchema);
