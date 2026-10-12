import mongoose from 'mongoose';

export const FIXED_COST_POLICY_MODES = ['equal', 'per_seat', 'custom'];

const validateSeatCounts = (value) => {
  if (value == null) {
    return true;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(([residentId, seatCount]) => {
    if (!mongoose.Types.ObjectId.isValid(String(residentId))) {
      return false;
    }

    const numeric = Number(seatCount);
    return Number.isFinite(numeric) && Number.isSafeInteger(numeric) && numeric >= 1;
  });
};

const validateCustomPercentages = (value) => {
  if (value == null) {
    return true;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(([residentId, percentage]) => {
    if (!mongoose.Types.ObjectId.isValid(String(residentId))) {
      return false;
    }

    if (percentage === null || percentage === undefined || percentage === '') {
      return false;
    }

    const text = String(percentage).trim();
    if (!/^(?:\d+|\d+\.\d{1,2})$/.test(text)) {
      return false;
    }

    const numeric = Number(text);
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= 100;
  });
};

const fixedCostPolicySchema = new mongoose.Schema(
  {
    messId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mess',
      required: true,
      unique: true,
      index: true,
    },
    mode: {
      type: String,
      enum: FIXED_COST_POLICY_MODES,
      required: true,
      default: 'equal',
    },
    seatCounts: {
      type: Object,
      default: {},
      validate: {
        validator: validateSeatCounts,
        message: 'Seat counts must be positive whole numbers keyed by valid resident IDs.',
      },
    },
    customPercentages: {
      type: Object,
      default: {},
      validate: {
        validator: validateCustomPercentages,
        message: 'Custom percentages must be valid percentages keyed by valid resident IDs.',
      },
    },
  },
  {
    timestamps: true,
  }
);

fixedCostPolicySchema.pre('validate', function (next) {
  if (this.mode === 'equal') {
    this.seatCounts = {};
    this.customPercentages = {};
  }

  if (this.mode === 'per_seat') {
    this.customPercentages = {};
  }

  if (this.mode === 'custom') {
    this.seatCounts = {};
  }

  next();
});

fixedCostPolicySchema.path('customPercentages').validate(function (value) {
  if (this.mode !== 'custom') {
    return true;
  }

  if (value == null || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length === 0) {
    return false;
  }

  const total = Object.values(value).reduce((sum, item) => {
    const text = String(item).trim();
    const numeric = Number(text);
    return sum + Math.round(numeric * 100);
  }, 0);

  return total === 10000;
}, 'Custom percentages must total exactly 100%.');

export default mongoose.model('FixedCostPolicy', fixedCostPolicySchema);
