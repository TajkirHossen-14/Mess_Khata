import mongoose from 'mongoose'

const managerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: true
  }
}, {
  timestamps: true
})

managerSchema.index({ userId: 1, messId: 1 }, { unique: true })

export default mongoose.model('Manager', managerSchema)