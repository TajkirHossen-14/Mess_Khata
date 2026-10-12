import mongoose from 'mongoose';

const mealTypeSchema = new mongoose.Schema(
  {
    messId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess', required: true },
    name: { type: String, required: true, trim: true },
    time: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
        message: (props) => `"${props.value}" is not a valid time (HH:mm)`,
      },
    },
    deadlineHoursBefore: {
      type: Number,
      default: 4,
      min: 0,
      max: 48,
      validate: {
        validator: Number.isInteger,
        message: 'deadlineHoursBefore must be an integer',
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Case-insensitive unique compound index on { messId, name }
mealTypeSchema.index(
  { messId: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

export default mongoose.model('MealType', mealTypeSchema);

