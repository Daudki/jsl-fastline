import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  // Basic Info
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 30
  },
  
  // Profile
  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  bio: {
    type: String,
    maxlength: 500
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Location (for local-first feed)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  city: String,
  country: String,
  
  // Account Status
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  
  // Stats
  postCount: {
    type: Number,
    default: 0
  },
  groupCount: {
    type: Number,
    default: 0
  },
  helpedCount: {
    type: Number,
    default: 0
  },
  
  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['dark', 'light', 'auto'],
      default: 'dark'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      posts: { type: Boolean, default: true },
      groups: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      ai: { type: Boolean, default: true }
    },
    dataSaver: {
      type: Boolean,
      default: true
    }
  },
  
  // Offline Sync
  localId: {
    type: String,
    index: true
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'conflict'],
    default: 'synced'
  },
  lastSync: {
    type: Date,
    default: Date.now
  },
  
  // Security
  authToken: String,
  refreshToken: String,
  deviceTokens: [String],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.authToken
      delete ret.refreshToken
      delete ret.deviceTokens
      return ret
    }
  }
})

// Indexes
userSchema.index({ location: '2dsphere' })
userSchema.index({ phone: 1, isActive: 1 })
userSchema.index({ 'preferences.language': 1 })

// Virtuals
userSchema.virtual('fullProfile').get(function() {
  return {
    id: this._id,
    phone: this.phone,
    username: this.username,
    displayName: this.displayName,
    bio: this.bio,
    avatar: this.avatar,
    stats: {
      postCount: this.postCount,
      groupCount: this.groupCount,
      helpedCount: this.helpedCount
    }
  }
})

// Methods
userSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken')
  return jwt.sign(
    { userId: this._id, phone: this.phone },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

userSchema.methods.updateLastSeen = async function() {
  this.lastSeen = new Date()
  await this.save()
}

userSchema.methods.incrementPostCount = async function() {
  this.postCount += 1
  await this.save()
}

userSchema.methods.incrementHelpedCount = async function() {
  this.helpedCount += 1
  await this.save()
}

// Static methods
userSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone, isActive: true })
}

userSchema.statics.findNearby = function(coordinates, maxDistance = 5000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true
  })
}

// Pre-save middleware
userSchema.pre('save', async function(next) {
  if (this.isModified('phone')) {
    // Normalize phone number
    this.phone = this.phone.replace(/\D/g, '')
  }
  
  if (this.isModified('username')) {
    // Generate display name if not set
    if (!this.displayName) {
      this.displayName = this.username
    }
  }
  
  this.updatedAt = new Date()
  next()
})

const User = mongoose.model('User', userSchema)

export default User
