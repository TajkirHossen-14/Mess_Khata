import mongoose from 'mongoose';

const adjustmentSchema = new mongoose.Schema({ adjustmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Adjustment' }, amount: Number, reason: String }, { _id: false });
const schema = new mongoose.Schema({
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
  billingPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingPeriod', required: true },
  status: { type: String, enum: ['issued', 'voided'], default: 'issued' },
  mealRate: { type: Number, default: null }, ownMealCount: Number, guestMealCount: Number, billableMeals: Number,
  mealCost: { type: Number, required: true }, fixedCostShare: { type: Number, required: true }, fixedCostPolicy: String,
  adjustments: { type: [adjustmentSchema], default: [] }, adjustmentsNet: { type: Number, required: true }, totalDue: { type: Number, required: true },
  dueDate: { type: Date, required: true }, generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voidedAt: Date, voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, voidReason: String
}, { timestamps: true });
schema.index({ residentId: 1, billingPeriodId: 1 }, { unique: true, partialFilterExpression: { status: 'issued' } });
export default mongoose.model('Bill', schema);
