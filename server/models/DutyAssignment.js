import mongoose from 'mongoose'

const dutyAssignmentSchema = new mongoose.Schema({
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: true
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true
  },
  type: {
    type: String,
    enum: ['bazar', 'cleaning', 'washroom'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['assigned', 'completed', 'cancelled'],
    default: 'assigned'
  }
}, {
  timestamps: true
})

export default mongoose.model('DutyAssignment', dutyAssignmentSchema)