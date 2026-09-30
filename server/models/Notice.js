import mongoose from 'mongoose'

const noticeSchema = new mongoose.Schema({
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manager',
    required: true
  }
}, {
  timestamps: true
})

export default mongoose.model('Notice', noticeSchema)