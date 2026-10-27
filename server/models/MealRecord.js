import mongoose from 'mongoose';

const mealRecordSchema = new mongoose.Schema({
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: true,
    index: true,
  },
  billingPeriodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingPeriod',
    required: true,
    index: true,
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  ownMealCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  guestMealCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalMealCount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { timestamps: true });

mealRecordSchema.index({ billingPeriodId: 1, residentId: 1, date: 1 }, { unique: true });

export default mongoose.model('MealRecord', mealRecordSchema);
