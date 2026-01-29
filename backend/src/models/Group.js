import mongoose from 'mongoose'

const groupSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Type & Category
  type: {
    type: String,
    enum: ['study', 'class', 'school', 'community', 'project', 'topic'],
    default: 'study',
    index: true
  },
  category: {
    type: String,
    enum: ['math', 'science', 'language', 'history', 'technology', 'arts', 'business', 'other'],
    default: 'other'
  },
  subject: String, // Specific subject for study groups
  
  // Membership
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  memberCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Privacy & Access
  privacy: {
    type: String,
    enum: ['public', 'private', 'restricted'],
    default: 'public'
  },
  joinMethod: {
    type: String,
    enum: ['open', 'approval', 'invite'],
    default: 'open'
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Location
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  city: String,
  country: String,
  institution: String, // School/University name
  
  // Content
  rules: [{
    title: String,
    description: String
  }],
  pinnedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  announcements: [{
    title: String,
    content: String,
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Resources
  resources: [{
    name: String,
    type: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    size: Number,
    downloads: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Stats
  postCount: {
    type: Number,
    default: 0
  },
  activeMembers: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Settings
  settings: {
    allowPosts: {
      type: Boolean,
      default: true
    },
    allowFiles: {
      type: Boolean,
      default: true
    },
    allowVoice: {
      type: Boolean,
      default: true
    },
    maxFileSize: {
      type: Number,
      default: 10 * 1024 * 1024 // 10MB
    },
    autoArchive: {
      type: Boolean,
      default: false
    }
  },
  
  // Offline Sync
  localId: {
    type: String,
    index: true
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'conflict', 'deleted'],
    default: 'synced'
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
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
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes
groupSchema.index({ location: '2dsphere' })
groupSchema.index({ name: 'text', description: 'text' })
groupSchema.index({ type: 1, memberCount: -1 })
groupSchema.index({ privacy: 1, isActive: 1 })
groupSchema.index({ syncStatus: 1, updatedAt: 1 })
groupSchema.index({ 'members.userId': 1 })

// Virtuals
groupSchema.virtual('isPublic').get(function() {
  return this.privacy === 'public'
})

groupSchema.virtual('requiresApproval').get(function() {
  return this.joinMethod === 'approval'
})

groupSchema.virtual('recentActivity').get(function() {
  return this.lastActivity > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
})

// Methods
groupSchema.methods.addMember = async function(userId, role = 'member') {
  if (!this.members.includes(userId)) {
    this.members.push(userId)
    this.memberCount = this.members.length
    
    if (role === 'admin' && !this.admins.includes(userId)) {
      this.admins.push(userId)
    } else if (role === 'moderator' && !this.moderators.includes(userId)) {
      this.moderators.push(userId)
    }
    
    await this.save()
  }
  return this
}

groupSchema.methods.removeMember = async function(userId) {
  const memberIndex = this.members.indexOf(userId)
  const adminIndex = this.admins.indexOf(userId)
  const moderatorIndex = this.moderators.indexOf(userId)
  
  if (memberIndex > -1) {
    this.members.splice(memberIndex, 1)
    this.memberCount = this.members.length
  }
  
  if (adminIndex > -1) {
    this.admins.splice(adminIndex, 1)
  }
  
  if (moderatorIndex > -1) {
    this.moderators.splice(moderatorIndex, 1)
  }
  
  await this.save()
  return this
}

groupSchema.methods.updateRole = async function(userId, newRole) {
  const adminIndex = this.admins.indexOf(userId)
  const moderatorIndex = this.moderators.indexOf(userId)
  
  // Remove from existing roles
  if (adminIndex > -1) {
    this.admins.splice(adminIndex, 1)
  }
  if (moderatorIndex > -1) {
    this.moderators.splice(moderatorIndex, 1)
  }
  
  // Add to new role
  if (newRole === 'admin') {
    this.admins.push(userId)
  } else if (newRole === 'moderator') {
    this.moderators.push(userId)
  }
  
  await this.save()
  return this
}

groupSchema.methods.addResource = async function(resourceData) {
  this.resources.push(resourceData)
  await this.save()
  return this
}

groupSchema.methods.incrementPostCount = async function() {
  this.postCount += 1
  this.lastActivity = new Date()
  await this.save()
}

// Static methods
groupSchema.statics.findNearby = function(coordinates, maxDistance = 5000, limit = 20) {
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
    isActive: true,
    privacy: 'public'
  })
  .sort({ memberCount: -1 })
  .limit(limit)
  .populate('creatorId', 'username displayName avatar')
}

groupSchema.statics.findByType = function(type, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  
  return this.find({
    type,
    isActive: true,
    privacy: 'public'
  })
  .sort({ memberCount: -1, createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('creatorId', 'username displayName avatar')
}

groupSchema.statics.generateInviteCode = function() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

// Pre-save middleware
groupSchema.pre('save', function(next) {
  if (this.isNew && !this.inviteCode && this.privacy !== 'public') {
    this.inviteCode = this.constructor.generateInviteCode()
  }
  
  // Ensure creator is always an admin
  if (this.isNew && this.creatorId && !this.admins.includes(this.creatorId)) {
    this.admins.push(this.creatorId)
  }
  
  // Update member count
  if (Array.isArray(this.members)) {
    this.memberCount = this.members.length
  }
  
  this.updatedAt = new Date()
  next()
})

const Group = mongoose.model('Group', groupSchema)

export default Group
