import mongoose from 'mongoose'

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['grocery', 'utility', 'fixed', 'asset', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: (value) => Number.isSafeInteger(value) && value > 0,
      message: 'Amount must be a whole number of Taka greater than 0'
    }
  },
  date: {
    type: Date,
    required: true
  },
  billingPeriodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingPeriod',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
})

export default mongoose.model('Expense', expenseSchema)
