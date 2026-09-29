import mongoose from 'mongoose'

const sharedAssetSchema = new mongoose.Schema({
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  purchasePrice: {
    type: Number,
    required: true
  },
  usefulLife: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
})

export default mongoose.model('SharedAsset', sharedAssetSchema)