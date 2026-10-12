import mongoose from 'mongoose';

const mealDeclarationSchema = new mongoose.Schema({
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: true,
    index: true,
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true,
    index: true,
  },
  mealTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MealType',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  count: {
    type: Number,
    required: true,
    default: 1,
    min: 0,
    max: 10,
  },
}, { timestamps: true });

// Ensure unique declaration per resident, meal type, and calendar date
mealDeclarationSchema.index(
  { residentId: 1, mealTypeId: 1, date: 1 },
  { unique: true }
);

export default mongoose.model('MealDeclaration', mealDeclarationSchema);
