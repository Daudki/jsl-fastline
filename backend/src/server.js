import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { initRedis, redisClient } from './redis.js'

// Load environment variables
dotenv.config()

// Import routes
import authRoutes from './routes/auth.js'
import postRoutes from './routes/posts.js'
import groupRoutes from './routes/groups.js'
import syncRoutes from './routes/sync.js'

// Import middleware
import { authMiddleware } from './middleware/auth.js'

// Import models
import './models/User.js'
import './models/Post.js'
import './models/Group.js'

// Initialize Express app
const app = express()
const httpServer = createServer(app)

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true
  },
  transports: ['websocket', 'polling']
})

// Connect to MongoDB (deprecated options removed in Mongoose 7)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  })

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}))
app.use(compression())
app.use(morgan('combined'))
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  const redisStatus = redisClient ? (redisClient.status === 'ready' ? 'connected' : 'disconnected') : 'not initialized'
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redisStatus
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/posts', authMiddleware, postRoutes)
app.use('/api/groups', authMiddleware, groupRoutes)
app.use('/api/sync', authMiddleware, syncRoutes)

// AI Routes
app.use('/api/ai', authMiddleware, async (req, res) => {
  try {
    const { query, mode = 'hybrid' } = req.body
    
    // Basic AI response (can be enhanced with real AI services)
    const response = {
      answer: `I received your query: "${query}". In ${mode} mode, I can help with various learning topics.`,
      mode,
      timestamp: new Date().toISOString(),
      sources: []
    }
    
    res.json(response)
  } catch (error) {
    res.status(500).json({ error: 'AI service error' })
  }
})

// File upload endpoint
import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|txt|mp3|mp4/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only images, PDFs, text files, audio and video are allowed'))
    }
  }
})

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  
  res.json({
    message: 'File uploaded successfully',
    file: {
      id: req.file.filename,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      path: `/uploads/${req.file.filename}`,
      uploadedAt: new Date().toISOString()
    }
  })
})

// Serve uploaded files
app.use('/uploads', express.static(uploadDir))

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id)
  
  // Join room for user's updates
  socket.on('join-user', (userId) => {
    socket.join(`user:${userId}`)
  })
  
  // Join group chat
  socket.on('join-group', (groupId) => {
    socket.join(`group:${groupId}`)
  })
  
  // Handle group messages (broadcast only; persistent Message model can be added later)
  socket.on('group-message', async (data) => {
    const { groupId, message, userId } = data
    io.to(`group:${groupId}`).emit('new-message', {
      ...message,
      userId,
      timestamp: new Date().toISOString()
    })
  })
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    const { groupId, userId, isTyping } = data
    socket.to(`group:${groupId}`).emit('user-typing', {
      userId,
      isTyping
    })
  })
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'File upload error', details: err.message })
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Start server (init Redis first so auth/routes have client)
const PORT = process.env.PORT || 5000
const HOST = process.env.HOST || '0.0.0.0'

const start = async () => {
  await initRedis()
  httpServer.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`)
    console.log(`Environment: ${process.env.NODE_ENV}`)
  })
}
start().catch((err) => {
  console.error('Startup error:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...')
  httpServer.close(() => {
    console.log('HTTP server closed')
    mongoose.connection.close(false).then(() => {
      console.log('MongoDB connection closed')
      if (redisClient && typeof redisClient.quit === 'function') {
        return redisClient.quit().then(() => console.log('Redis connection closed'))
      }
    }).then(() => process.exit(0)).catch(() => process.exit(0))
  })
})

export { app, io }
