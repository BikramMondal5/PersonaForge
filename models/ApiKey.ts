import mongoose from 'mongoose'

const apiKeySchema = new mongoose.Schema({
  keyHash: {
    type: String,
    required: true,
    unique: true
  },
  keyPrefix: {
    type: String,
    required: true,
    index: true
  },
  keySuffix: {
    type: String,
    default: null
  },
  apiKey: {
    type: String,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    default: 'API Key'
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

// Index for faster lookups
apiKeySchema.index({ userId: 1, isActive: 1 })
apiKeySchema.index({ keyPrefix: 1, isActive: 1 })

export default mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema)
