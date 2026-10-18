import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["grocery", "utility", "fixed", "asset", "other"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      validate: {
        validator: (value) =>
          Number.isSafeInteger(value) && value > 0,
        message:
          "Amount must be a whole number of Taka greater than 0",
      },
    },

    date: {
      type: Date,
      required: true,
    },

    billingPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillingPeriod",
      required: true,
    },

    recurringCostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringCost",
    },

    description: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.index(
  { billingPeriodId: 1, recurringCostId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      recurringCostId: { $exists: true },
    },
  }
);

export default mongoose.model("Expense", expenseSchema);