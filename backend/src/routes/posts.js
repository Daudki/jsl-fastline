import express from 'express'
import Post from '../models/Post.js'
import User from '../models/User.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = express.Router()

// Create post
router.post('/', rateLimit(10, 60), async (req, res) => {
  try {
    const { content, media, type, visibility, groupId, location, tags } = req.body
    const userId = req.user._id

    if (!content && (!media || media.length === 0)) {
      return res.status(400).json({ error: 'Content or media is required' })
    }

    // Create post
    const post = new Post({
      userId,
      content,
      media: media || [],
      type: type || 'post',
      visibility: visibility || 'public',
      groupId: groupId || null,
      location: location || {
        type: 'Point',
        coordinates: [0, 0]
      },
      tags: tags || [],
      syncStatus: 'synced'
    })

    await post.save()

    // Update user's post count
    await User.findByIdAndUpdate(userId, {
      $inc: { postCount: 1 },
      lastSeen: new Date()
    })

    // Populate author info
    const populatedPost = await Post.findById(post._id)
      .populate('userId', 'username displayName avatar')

    res.status(201).json({
      message: 'Post created successfully',
      post: populatedPost.toJSON()
    })
  } catch (error) {
    console.error('Create post error:', error)
    res.status(500).json({ error: 'Failed to create post' })
  }
})

// Get posts (with pagination and filters)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      userId,
      groupId,
      location,
      radius = 10000, // 10km default
      sort = 'newest'
    } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Build query
    const query = {
      isHidden: false,
      syncStatus: 'synced'
    }

    if (type) query.type = type
    if (category) query.category = category
    if (userId) query.userId = userId
    if (groupId) query.groupId = groupId

    // Location-based query
    if (location) {
      const [lng, lat] = location.split(',').map(Number)
      if (!isNaN(lng) && !isNaN(lat)) {
        query.location = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [lng, lat]
            },
            $maxDistance: parseInt(radius)
          }
        }
      }
    }

    // Build sort
    let sortOption = { createdAt: -1 }
    if (sort === 'popular') {
      sortOption = { likeCount: -1, createdAt: -1 }
    } else if (sort === 'trending') {
      // Complex trending algorithm
      sortOption = { engagementScore: -1, createdAt: -1 }
    }

    // Get posts
    const posts = await Post.find(query)
      .populate('userId', 'username displayName avatar')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))

    // Get total count
    const total = await Post.countDocuments(query)

    res.json({
      posts: posts.map(post => post.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Get posts error:', error)
    res.status(500).json({ error: 'Failed to get posts' })
  }
})

// Get single post
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params

    const post = await Post.findById(postId)
      .populate('userId', 'username displayName avatar')
      .populate({
        path: 'comments',
        populate: {
          path: 'userId',
          select: 'username displayName avatar'
        },
        options: { sort: { createdAt: -1 }, limit: 50 }
      })

    if (!post || post.isHidden) {
      return res.status(404).json({ error: 'Post not found' })
    }

    res.json({ post: post.toJSON() })
  } catch (error) {
    console.error('Get post error:', error)
    res.status(500).json({ error: 'Failed to get post' })
  }
})

// Update post
router.put('/:postId', async (req, res) => {
  try {
    const { postId } = req.params
    const updates = req.body
    const userId = req.user._id

    const post = await Post.findById(postId)

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Check ownership
    if (post.userId.toString() !== userId.toString() && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    // Update post
    Object.assign(post, updates)
    post.updatedAt = new Date()
    post.version += 1

    await post.save()

    res.json({
      message: 'Post updated successfully',
      post: post.toJSON()
    })
  } catch (error) {
    console.error('Update post error:', error)
    res.status(500).json({ error: 'Failed to update post' })
  }
})

// Delete post
router.delete('/:postId', async (req, res) => {
  try {
    const { postId } = req.params
    const userId = req.user._id

    const post = await Post.findById(postId)

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Check ownership
    if (post.userId.toString() !== userId.toString() && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    // Soft delete
    post.isHidden = true
    post.syncStatus = 'deleted'
    await post.save()

    // Update user's post count
    await User.findByIdAndUpdate(userId, {
      $inc: { postCount: -1 }
    })

    res.json({ message: 'Post deleted successfully' })
  } catch (error) {
    console.error('Delete post error:', error)
    res.status(500).json({ error: 'Failed to delete post' })
  }
})

// Like post
router.post('/:postId/like', rateLimit(30, 60), async (req, res) => {
  try {
    const { postId } = req.params
    const userId = req.user._id

    const post = await Post.findById(postId)

    if (!post || post.isHidden) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Toggle like
    const alreadyLiked = post.likes.includes(userId)
    
    if (alreadyLiked) {
      await post.removeLike(userId)
    } else {
      await post.addLike(userId)
    }

    res.json({
      message: alreadyLiked ? 'Post unliked' : 'Post liked',
      likes: post.likes.length,
      liked: !alreadyLiked
    })
  } catch (error) {
    console.error('Like post error:', error)
    res.status(500).json({ error: 'Failed to like post' })
  }
})

// Save post
router.post('/:postId/save', rateLimit(30, 60), async (req, res) => {
  try {
    const { postId } = req.params
    const userId = req.user._id

    const post = await Post.findById(postId)

    if (!post || post.isHidden) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Toggle save
    const alreadySaved = post.saves.includes(userId)
    
    if (alreadySaved) {
      await post.removeSave(userId)
    } else {
      await post.addSave(userId)
    }

    res.json({
      message: alreadySaved ? 'Post unsaved' : 'Post saved',
      saves: post.saves.length,
      saved: !alreadySaved
    })
  } catch (error) {
    console.error('Save post error:', error)
    res.status(500).json({ error: 'Failed to save post' })
  }
})

// Get trending posts
router.get('/trending/feed', async (req, res) => {
  try {
    const posts = await Post.findTrending(7, 20)
    res.json({ posts })
  } catch (error) {
    console.error('Trending posts error:', error)
    res.status(500).json({ error: 'Failed to get trending posts' })
  }
})

// Get posts by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 20 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const posts = await Post.find({
      userId,
      isHidden: false,
      syncStatus: 'synced'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('userId', 'username displayName avatar')

    const total = await Post.countDocuments({ userId, isHidden: false })

    res.json({
      posts: posts.map(post => post.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('User posts error:', error)
    res.status(500).json({ error: 'Failed to get user posts' })
  }
})

// Generate AI summary for post
router.post('/:postId/summary', async (req, res) => {
  try {
    const { postId } = req.params
    const post = await Post.findById(postId)

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Generate AI summary (in real app, call AI service)
    const summary = await post.generateAIResponse()
    
    // Update post with summary
    post.aiSummary = summary
    await post.save()

    res.json({
      message: 'Summary generated',
      summary
    })
  } catch (error) {
    console.error('AI summary error:', error)
    res.status(500).json({ error: 'Failed to generate summary' })
  }
})

export default router
