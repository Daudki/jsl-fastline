import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import rateLimit from 'express-rate-limit'
import { redisClient } from '../redis.js'

export const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Find user
    const user = await User.findById(decoded.userId)
      .select('-authToken -refreshToken -deviceTokens')

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' })
    }

    // Check offline mode header
    const isOfflineMode = req.headers['x-offline-mode'] === 'true'
    
    // Add user and context to request
    req.user = user
    req.isOfflineMode = isOfflineMode

    // Update last seen (if online)
    if (!isOfflineMode) {
      await user.updateLastSeen()
    }

    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    
    console.error('Auth middleware error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

// Optional auth middleware (for public endpoints)
export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      const user = await User.findById(decoded.userId)
        .select('-authToken -refreshToken -deviceTokens')

      if (user && user.isActive) {
        req.user = user
        req.isOfflineMode = req.headers['x-offline-mode'] === 'true'
        
        if (!req.isOfflineMode) {
          await user.updateLastSeen()
        }
      }
    }
    next()
  } catch (error) {
    // Token errors are ignored for optional auth
    next()
  }
}

// Admin middleware
export const adminMiddleware = async (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// Rate limiting middleware (uses Redis when available)
const redisStore = {
  incr: async (key, cb) => {
    try {
      if (!redisClient) return cb(null, 1)
      const count = await redisClient.incr(key)
      if (count === 1 && redisClient.expire) {
        await redisClient.expire(key, 60)
      }
      cb(null, count)
    } catch (error) {
      cb(error)
    }
  },
  decrement: async (key) => {
    if (redisClient?.decr) await redisClient.decr(key)
  },
  resetKey: async (key) => {
    if (redisClient?.del) await redisClient.del(key)
  }
}

export const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    store: redisStore,
    keyGenerator: (req) => {
      return req.user ? `rate_limit:${req.user._id}` : `rate_limit:ip:${req.ip}`
    },
    message: 'Too many requests, please try again later.',
    skip: (req) => req.isOfflineMode // Skip rate limiting for offline mode
  })
}

// Group admin middleware
export const groupAdminMiddleware = async (req, res, next) => {
  try {
    const { groupId } = req.params
    const userId = req.user._id

    // Check if group exists
    const Group = (await import('../models/Group.js')).default
    const group = await Group.findById(groupId)

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Check if user is admin of the group
    if (!group.admins.includes(userId)) {
      return res.status(403).json({ error: 'Group admin access required' })
    }

    req.group = group
    next()
  } catch (error) {
    console.error('Group admin middleware error:', error)
    res.status(500).json({ error: 'Authorization check failed' })
  }
}

// Group member middleware
export const groupMemberMiddleware = async (req, res, next) => {
  try {
    const { groupId } = req.params
    const userId = req.user._id

    const Group = (await import('../models/Group.js')).default
    const group = await Group.findById(groupId)

    if (!group || !group.isActive) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Check if user is a member
    if (!group.members.includes(userId)) {
      return res.status(403).json({ error: 'Group membership required' })
    }

    req.group = group
    next()
  } catch (error) {
    console.error('Group member middleware error:', error)
    res.status(500).json({ error: 'Authorization check failed' })
  }
}

// Validation middleware
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
      return res.status(400).json({ error: 'Validation failed', errors })
    }

    req.body = value
    next()
  }
}

// File validation middleware
export const validateFile = (allowedTypes, maxSize) => {
  return (req, res, next) => {
    if (!req.file) {
      return next()
    }

    // Check file type
    if (allowedTypes && !allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type', 
        allowed: allowedTypes 
      })
    }

    // Check file size
    if (maxSize && req.file.size > maxSize) {
      return res.status(400).json({ 
        error: 'File too large', 
        maxSize: `${maxSize / 1024 / 1024}MB` 
      })
    }

    next()
  }
}

// Offline mode middleware
export const offlineModeMiddleware = (req, res, next) => {
  req.isOfflineMode = req.headers['x-offline-mode'] === 'true'
  
  if (req.isOfflineMode) {
    // Skip certain checks for offline mode
    console.log('Request in offline mode')
  }
  
  next()
}

// CORS middleware for African regions
export const corsMiddleware = (req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://jslfastline.com',
    'https://*.jslfastline.com',
    'capacitor://localhost',
    'ionic://localhost'
  ]

  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Offline-Mode')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }

  next()
}

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err)

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0]
    return res.status(409).json({ 
      error: 'Duplicate entry', 
      field, 
      message: `${field} already exists` 
    })
  }

  // MongoDB validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }))
    return res.status(400).json({ error: 'Validation failed', errors })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' })
  }

  // Default error
  const statusCode = err.statusCode || 500
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message

  res.status(statusCode).json({ 
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

// Compression middleware for Africa (low bandwidth)
export const compressionMiddleware = (req, res, next) => {
  // Skip compression for certain file types
  const noCompress = /\.(jpg|jpeg|png|gif|mp4|avi|mkv|zip|gz)$/i
  if (noCompress.test(req.path)) {
    return next()
  }

  // Use compression for text-based responses
  res.setHeader('Content-Encoding', 'gzip')
  next()
}

// Cache middleware
export const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next()
    }

    // Skip cache for authenticated requests
    if (req.user) {
      return next()
    }

    res.set('Cache-Control', `public, max-age=${duration}`)
    next()
  }
}
