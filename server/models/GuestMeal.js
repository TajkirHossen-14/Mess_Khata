import mongoose from 'mongoose';
const guestMealSchema = new mongoose.Schema({ responsibleResidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true }, mealTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealType', required: true }, date: { type: Date, required: true }, count: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: 'Guest count must be an integer' } } }, { timestamps: true });
guestMealSchema.index({ responsibleResidentId: 1, mealTypeId: 1, date: 1 }, { unique: true });
export default mongoose.model('GuestMeal', guestMealSchema);
