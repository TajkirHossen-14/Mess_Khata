import mongoose from 'mongoose';

const residentAllocationSchema = new mongoose.Schema(
  {
    residentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Allocated amount must be a whole number of Taka.',
      },
    },
    seatCount: {
      type: Number,
      min: 1,
      validate: {
        validator: (value) => value === undefined || Number.isInteger(value),
        message: 'Seat count must be a whole number.',
      },
    },
    percentageBasisPoints: {
      type: Number,
      min: 0,
      validate: {
        validator: (value) => value === undefined || Number.isInteger(value),
        message: 'Percentage basis points must be a whole number.',
      },
    },
  },
  { _id: false }
);

const fixedCostSplitSchema = new mongoose.Schema(
  {
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
      unique: true,
      index: true,
    },
    totalFixedCost: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Total fixed cost must be a whole number of Taka.',
      },
    },
    residentAllocations: {
      type: [residentAllocationSchema],
      required: true,
      default: [],
    },
    policy: {
      type: Object,
      required: true,
      default: {
        mode: 'equal',
        seatCounts: {},
        customPercentages: {},
      },
    },
    billingPeriod: {
      type: Object,
      required: true,
      default: {},
    },
    residentSnapshot: {
      type: [Object],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('FixedCostSplit', fixedCostSplitSchema);
