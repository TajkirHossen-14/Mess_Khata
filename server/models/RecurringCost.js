import mongoose from 'mongoose';

export const RECURRING_CATEGORIES = ['fixed', 'utility'];

const recurringCostSchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mess',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    category: {
      type: String,
      enum: RECURRING_CATEGORIES,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be a whole number.',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

recurringCostSchema.index({ messId: 1, isActive: 1 });

export default mongoose.model('RecurringCost', recurringCostSchema);
