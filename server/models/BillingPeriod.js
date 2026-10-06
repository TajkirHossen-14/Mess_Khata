import mongoose from 'mongoose';

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

export default mongoose.model('BillingPeriod', billingPeriodSchema);
