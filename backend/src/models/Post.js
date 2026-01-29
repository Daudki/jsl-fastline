import mongoose from 'mongoose'

const postSchema = new mongoose.Schema({
  // Content
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: false,
    default: '',
    trim: true,
    maxlength: 5000
  },
  
  // Media
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'document'],
      required: true
    },
    url: String,
    thumbnail: String,
    size: Number,
    duration: Number, // for audio/video
    caption: String
  }],
  
  // Metadata
  type: {
    type: String,
    enum: ['post', 'question', 'note', 'announcement', 'resource'],
    default: 'post'
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  category: {
    type: String,
    enum: ['general', 'academic', 'social', 'technical', 'language', 'other'],
    default: 'general'
  },
  language: {
    type: String,
    default: 'en'
  },
  
  // Engagement
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  commentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  shares: {
    type: Number,
    default: 0,
    min: 0
  },
  saves: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  saveCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Visibility
  visibility: {
    type: String,
    enum: ['public', 'group', 'private', 'followers'],
    default: 'public'
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
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
  
  // AI Analysis
  aiSummary: String,
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  educationalValue: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
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
  version: {
    type: Number,
    default: 1
  },
  
  // Moderation
  isFlagged: {
    type: Boolean,
    default: false
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes
postSchema.index({ location: '2dsphere' })
postSchema.index({ userId: 1, createdAt: -1 })
postSchema.index({ groupId: 1, isPinned: -1, createdAt: -1 })
postSchema.index({ tags: 1, createdAt: -1 })
postSchema.index({ syncStatus: 1, updatedAt: 1 })
postSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Virtuals
postSchema.virtual('hasMedia').get(function() {
  return this.media && this.media.length > 0
})

postSchema.virtual('firstMedia').get(function() {
  return this.media && this.media.length > 0 ? this.media[0] : null
})

postSchema.virtual('engagementScore').get(function() {
  return (this.likeCount * 1) + (this.commentCount * 2) + (this.shares * 3) + (this.saveCount * 2)
})

// Methods
postSchema.methods.addLike = async function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId)
    this.likeCount = this.likes.length
    await this.save()
  }
  return this
}

postSchema.methods.removeLike = async function(userId) {
  const index = this.likes.indexOf(userId)
  if (index > -1) {
    this.likes.splice(index, 1)
    this.likeCount = this.likes.length
    await this.save()
  }
  return this
}

postSchema.methods.addSave = async function(userId) {
  if (!this.saves.includes(userId)) {
    this.saves.push(userId)
    this.saveCount = this.saves.length
    await this.save()
  }
  return this
}

postSchema.methods.removeSave = async function(userId) {
  const index = this.saves.indexOf(userId)
  if (index > -1) {
    this.saves.splice(index, 1)
    this.saveCount = this.saves.length
    await this.save()
  }
  return this
}

postSchema.methods.generateAIResponse = async function() {
  // This would call an AI service to generate summary
  // For now, return a placeholder
  return `This post discusses: ${this.content.substring(0, 100)}...`
}

// Static methods
postSchema.statics.findTrending = function(days = 7, limit = 20) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: cutoffDate },
        isHidden: false,
        syncStatus: 'synced'
      }
    },
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: ['$likeCount', 1] },
            { $multiply: ['$commentCount', 2] },
            { $multiply: ['$shares', 3] },
            { $multiply: ['$saveCount', 2] },
            {
              $cond: [
                { $eq: ['$type', 'question'] },
                5,
                0
              ]
            }
          ]
        }
      }
    },
    { $sort: { score: -1, createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'author'
      }
    },
    { $unwind: '$author' },
    {
      $project: {
        _id: 1,
        content: 1,
        media: 1,
        type: 1,
        likeCount: 1,
        commentCount: 1,
        saveCount: 1,
        createdAt: 1,
        author: {
          _id: 1,
          username: 1,
          displayName: 1,
          avatar: 1
        },
        score: 1
      }
    }
  ])
}

postSchema.statics.findByLocation = function(coordinates, maxDistance = 10000, limit = 50) {
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
    isHidden: false,
    syncStatus: 'synced'
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('userId', 'username displayName avatar')
}

// Pre-save middleware
postSchema.pre('save', function(next) {
  if (this.isModified('content') && this.content.length > 0) {
    // Auto-extract tags from content
    const words = this.content.toLowerCase().match(/\b\w+\b/g) || []
    const commonTags = words.filter(word => 
      word.length > 3 && 
      !['this', 'that', 'with', 'have', 'from', 'your', 'will'].includes(word)
    )
    
    // Get most frequent words as tags (max 5)
    const tagCounts = {}
    commonTags.forEach(word => {
      tagCounts[word] = (tagCounts[word] || 0) + 1
    })
    
    this.tags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag)
  }
  
  this.updatedAt = new Date()
  next()
})

const Post = mongoose.model('Post', postSchema)

export default Post
