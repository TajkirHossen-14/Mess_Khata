import mongoose from 'mongoose'

const residentSharedAssetSchema = new mongoose.Schema({
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resident',
    required: true
  },
  sharedAssetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedAsset',
    required: true
  }
}, {
  timestamps: true
})

residentSharedAssetSchema.index({ residentId: 1, sharedAssetId: 1 }, { unique: true })

export default mongoose.model('ResidentSharedAsset', residentSharedAssetSchema)