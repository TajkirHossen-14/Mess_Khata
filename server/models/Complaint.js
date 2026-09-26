import mongoose from 'mongoose'

const complaintSchema = new mongoose.Schema({
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['open', 'in_review', 'resolved'],
    default: 'open'
  }
}, {
  timestamps: true
})

export default mongoose.model('Complaint', complaintSchema)