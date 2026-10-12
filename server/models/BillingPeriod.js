import mongoose from 'mongoose';
import { applyRecurringCostsToPeriod } from '../services/recurringCostService.js';

const billingPeriodSchema = new mongoose.Schema({
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
});

billingPeriodSchema.index({ messId: 1 });

billingPeriodSchema.pre('save', function () {
  this.$locals.wasNew = this.isNew;
});

billingPeriodSchema.post('save', async function () {
  if (!this.$locals.wasNew) {
    return;
  }

  try {
    await applyRecurringCostsToPeriod(this);
  } catch (error) {
    console.error(
      'Failed to apply recurring costs to billing period:',
      error?.message
    );
  }
});

export default mongoose.model('BillingPeriod', billingPeriodSchema);
