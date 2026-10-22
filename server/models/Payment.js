import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
  billingPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingPeriod', required: true },
  amount: { type: Number, required: true, validate: { validator: (v) => Number.isSafeInteger(v) && v >= 1, message: 'Amount must be a whole number of Taka greater than or equal to 1' } },
  method: { type: String, enum: ['cash', 'bkash', 'nagad'], required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
  confirmedByManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', default: null },
  confirmedAt: { type: Date, default: null },
}, { timestamps: true });

paymentSchema.index({ residentId: 1, billingPeriodId: 1, status: 1 });

export default mongoose.model('Payment', paymentSchema);
