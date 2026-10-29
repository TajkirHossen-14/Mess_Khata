import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  billingPeriodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingPeriod',
    required: true,
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: (value) => Number.isSafeInteger(value) && value > 0,
      message: 'Amount must be a positive whole number of Taka',
    },
  },
  method: {
    type: String,
    enum: ['cash', 'bKash', 'Nagad'],
    required: true,
  },
  transactionReference: {
    type: String,
    trim: true,
    validate: {
      validator: (value) => value === undefined || (value.length > 0 && value.length <= 200),
      message: 'Transaction reference must contain 1 to 200 characters',
    },
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending',
    required: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manager',
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Payment', paymentSchema);
