import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { redisClient } from '../redis.js'

const router = express.Router()

// Phone-based registration
router.post('/register', async (req, res) => {
  try {
    const { phone, username, location } = req.body

    // Validate input
    if (!phone || !username) {
      return res.status(400).json({ error: 'Phone and username are required' })
    }

    // Check if user exists
    const existingUser = await User.findOne({ phone })
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number already registered' })
    }

    // Create new user
    const user = new User({
      phone,
      username,
      location: location || {
        type: 'Point',
        coordinates: [0, 0]
      }
    })

    await user.save()

    // Generate tokens
    const token = user.generateAuthToken()
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    if (redisClient) {
      await redisClient.set(`refresh_token:${user._id}`, refreshToken, {
        EX: 30 * 24 * 60 * 60 // 30 days
      })
    }

    res.status(201).json({
      message: 'Registration successful',
      user: user.toJSON(),
      token,
      refreshToken
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Phone-based login
router.post('/login', async (req, res) => {
  try {
    const { phone } = req.body

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' })
    }

    // Find user
    const user = await User.findOne({ phone, isActive: true })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update last seen
    await user.updateLastSeen()

    // Generate tokens
    const token = user.generateAuthToken()
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    if (redisClient) {
      await redisClient.set(`refresh_token:${user._id}`, refreshToken, {
        EX: 30 * 24 * 60 * 60
      })
    }

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token,
      refreshToken
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Offline identity creation
router.post('/offline-identity', async (req, res) => {
  try {
    const { phone, username, localId } = req.body

    if (!phone || !username || !localId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check for existing offline identity
    const existingUser = await User.findOne({ 
      $or: [
        { phone },
        { localId }
      ]
    })

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Identity already exists',
        localId: existingUser.localId
      })
    }

    // Create offline user (will sync later)
    const user = new User({
      phone,
      username,
      localId,
      syncStatus: 'pending',
      isVerified: false
    })

    await user.save()

    res.status(201).json({
      message: 'Offline identity created successfully',
      user: {
        id: user._id,
        localId: user.localId,
        phone: user.phone,
        username: user.username,
        syncStatus: user.syncStatus
      }
    })
  } catch (error) {
    console.error('Offline identity error:', error)
    res.status(500).json({ error: 'Failed to create offline identity' })
  }
})

// Token refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' })
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET)
    
    if (redisClient) {
      const storedToken = await redisClient.get(`refresh_token:${decoded.userId}`)
      if (!storedToken || storedToken !== refreshToken) {
        return res.status(401).json({ error: 'Invalid refresh token' })
      }
    }

    // Find user
    const user = await User.findById(decoded.userId)
    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Generate new access token
    const newToken = user.generateAuthToken()

    res.json({
      message: 'Token refreshed',
      token: newToken,
      user: user.toJSON()
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { userId } = req.body

    if (userId && redisClient) {
      await redisClient.del(`refresh_token:${userId}`)
    }

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Logout failed' })
  }
})

// Validate token
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Token required' })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Check user exists and is active
    const user = await User.findById(decoded.userId)
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    res.json({
      valid: true,
      user: user.toJSON(),
      expiresAt: decoded.exp * 1000 // Convert to milliseconds
    })
  } catch (error) {
    res.json({ valid: false, error: error.message })
  }
})

// SMS verification (for Africa)
router.post('/verify-sms', async (req, res) => {
  try {
    const { phone, code } = req.body

    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and code required' })
    }

    // In a real app, verify with SMS service
    // For now, accept any 6-digit code for demo
    if (code.length === 6 && /^\d+$/.test(code)) {
      const user = await User.findOneAndUpdate(
        { phone },
        { isVerified: true },
        { new: true }
      )

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.json({
        message: 'Phone verified successfully',
        user: user.toJSON()
      })
    } else {
      res.status(400).json({ error: 'Invalid verification code' })
    }
  } catch (error) {
    console.error('SMS verification error:', error)
    res.status(500).json({ error: 'Verification failed' })
  }
})

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const user = await User.findById(userId)
      .select('-authToken -refreshToken -deviceTokens')
      .populate('postCount')

    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      user: user.toJSON(),
      stats: {
        postCount: user.postCount || 0,
        groupCount: user.groupCount || 0,
        helpedCount: user.helpedCount || 0
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Failed to get profile' })
  }
})

// Update profile
router.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const updates = req.body

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-authToken -refreshToken -deviceTokens')

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

export default router
