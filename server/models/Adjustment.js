import mongoose from 'mongoose';

const adjustmentSchema = new mongoose.Schema({
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
  billingPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingPeriod', required: true },
  amount: { type: Number, required: true, validate: { validator: (v) => Number.isSafeInteger(v) && v !== 0, message: 'Amount must be a whole number of Taka and not zero' } },
  reason: { type: String, required: true, trim: true, minlength: 3, maxlength: 300 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voidedAt: { type: Date, default: null },
  voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  voidReason: { type: String, default: '' },
}, { timestamps: true });

adjustmentSchema.index({ billingPeriodId: 1, residentId: 1 });

export default mongoose.model('Adjustment', adjustmentSchema);
