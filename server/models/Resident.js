import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess', required: true },
  joiningDate: { type: Date, required: true },
  leavingDate: { type: Date, default: null },
  replacedResidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', default: null },
});

residentSchema.index({ userId: 1, messId: 1 }, { unique: true });

export default mongoose.model('Resident', residentSchema);
