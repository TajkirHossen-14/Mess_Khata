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
    trim: true,
    validate: {
      validator: (value) => typeof value === 'string' && value.trim().length > 0,
      message: 'Asset name is required'
    }
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: [Number.MIN_VALUE, 'Purchase price must be a positive finite number'],
    validate: Number.isFinite
  },
  purchaseDate: {
    type: Date,
    required: true,
    validate: {
      validator: (value) => value instanceof Date && Number.isFinite(value.getTime()),
      message: 'Purchase date must be a valid date'
    }
  },
  usefulLife: {
    type: Number,
    required: true,
    min: [Number.MIN_VALUE, 'Useful life must be a positive finite number'],
    validate: Number.isFinite
  }
}, {
  timestamps: true
})

export default mongoose.model('SharedAsset', sharedAssetSchema)
