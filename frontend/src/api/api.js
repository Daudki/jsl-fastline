import axios from 'axios'
import { db } from '../offline/db'
import toast from 'react-hot-toast'

// Create axios instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds timeout for poor connections
  headers: {
    'Content-Type': 'application/json',
  }
})

// Request interceptor for adding auth token
API.interceptors.request.use(
  async (config) => {
    // Get auth token from localStorage
    const token = localStorage.getItem('jsl_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add offline indicator
    config.headers['X-Offline-Mode'] = !navigator.onLine
    
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for handling offline mode and errors
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!navigator.onLine) {
      // Queue request for later sync
      if (error.config) {
        await db.addToSyncQueue('retry', {
          url: error.config.url,
          method: error.config.method,
          data: error.config.data,
          headers: error.config.headers
        }, 'api_request')
      }
      
      throw new Error('You are offline. Request queued for sync.')
    }
    
    // Handle specific error codes
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear local data
          localStorage.removeItem('jsl_token')
          localStorage.removeItem('jsl_user')
          window.location.href = '/'
          break
        case 429:
          toast.error('Too many requests. Please wait a moment.')
          break
        case 500:
          toast.error('Server error. Please try again later.')
          break
        default:
          if (error.response.data?.message) {
            toast.error(error.response.data.message)
          }
      }
    }
    
    return Promise.reject(error)
  }
)

// API Methods
export const api = {
  // Auth
  async register(phone, username) {
    try {
      const response = await API.post('/auth/register', { phone, username })
      
      // Store token locally
      if (response.data.token) {
        localStorage.setItem('jsl_token', response.data.token)
        localStorage.setItem('jsl_user', JSON.stringify(response.data.user))
      }
      
      // Create local user record
      await db.createUser({
        ...response.data.user,
        synced: true
      })
      
      return response.data
    } catch (error) {
      // If offline, create local user
      if (!navigator.onLine || error.message.includes('offline')) {
        const localUser = await db.createUser({
          phone,
          username,
          synced: false
        })
        
        return {
          user: localUser,
          token: null,
          message: 'Created offline profile. Will sync when online.'
        }
      }
      throw error
    }
  },
  
  async login(phone) {
    try {
      const response = await API.post('/auth/login', { phone })
      
      if (response.data.token) {
        localStorage.setItem('jsl_token', response.data.token)
        localStorage.setItem('jsl_user', JSON.stringify(response.data.user))
      }
      
      return response.data
    } catch (error) {
      // Try local login if offline
      if (!navigator.onLine || error.message.includes('offline')) {
        const user = await db.getUserByPhone(phone)
        if (user) {
          return {
            user,
            token: null,
            message: 'Offline login successful'
          }
        }
        throw new Error('User not found locally')
      }
      throw error
    }
  },
  
  // Posts
  async createPost(postData) {
    try {
      const user = JSON.parse(localStorage.getItem('jsl_user') || '{}')
      const localId = await db.createPost({
        ...postData,
        userId: postData.userId || user?.id
      })

      if (navigator.onLine) {
        const response = await API.post('/posts', postData)
        const post = response.data?.post || response.data
        if (post?._id) {
          await db.posts.update(localId, {
            serverId: post._id,
            syncStatus: 'synced'
          })
        }
        return post || response.data
      }

      const localPost = await db.posts.get(localId)
      return { ...localPost, id: localId }
    } catch (error) {
      console.error('Error creating post:', error)
      throw error
    }
  },
  
  async getPosts(limit = 20, offset = 0) {
    try {
      if (navigator.onLine) {
        const page = limit > 0 ? Math.floor(offset / limit) + 1 : 1
        const response = await API.get('/posts', {
          params: { limit, page }
        })
        
        // Cache posts locally
        if (response.data.posts) {
          for (const post of response.data.posts) {
            await db.posts.put({
              ...post,
              syncStatus: 'synced'
            })
          }
        }
        
        return response.data
      } else {
        // Get local posts
        const localPosts = await db.getLocalPosts(limit)
        return { posts: localPosts, hasMore: false }
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      
      // Fallback to local posts
      if (!navigator.onLine || error.message.includes('offline')) {
        const localPosts = await db.getLocalPosts(limit)
        return { posts: localPosts, hasMore: false }
      }
      
      throw error
    }
  },
  
  async likePost(postId) {
    try {
      const user = JSON.parse(localStorage.getItem('jsl_user'))
      
      // Update locally first
      await db.likePost(postId, user?.id)
      
      // Sync to server if online
      if (navigator.onLine) {
        await API.post(`/posts/${postId}/like`)
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error liking post:', error)
      throw error
    }
  },
  
  // Groups
  async createGroup(groupData) {
    try {
      const localId = await db.createGroup(groupData)
      if (navigator.onLine) {
        const response = await API.post('/groups', groupData)
        const group = response.data?.group || response.data
        if (group?._id) {
          await db.groups.update(localId, { serverId: group._id, syncStatus: 'synced' })
        }
        return group || response.data
      }
      const localGroup = await db.groups.get(localId)
      return { ...localGroup, id: localId }
    } catch (error) {
      console.error('Error creating group:', error)
      throw error
    }
  },
  
  async getGroups() {
    try {
      if (navigator.onLine) {
        const response = await API.get('/groups')
        if (response.data.groups) {
          for (const group of response.data.groups) {
            await db.groups.put({
              ...group,
              id: group._id ?? group.id,
              syncStatus: 'synced'
            })
          }
        }
        return response.data
      } else {
        const localGroups = await db.groups.toArray()
        return { groups: localGroups }
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      if (!navigator.onLine || error.message.includes('offline')) {
        const localGroups = await db.groups.toArray()
        return { groups: localGroups }
      }
      throw error
    }
  },

  async joinGroup(groupId) {
    try {
      if (navigator.onLine) {
        await API.post(`/groups/${groupId}/join`)
      }
      const user = JSON.parse(localStorage.getItem('jsl_user') || '{}')
      await db.joinGroup(groupId, user?.id)
      return { success: true }
    } catch (error) {
      console.error('Error joining group:', error)
      throw error
    }
  },
  
  // AI Assistant
  async askAI(query, options = {}) {
    try {
      // Check cache first
      const cached = await db.getCachedAIResponse(query)
      if (cached) {
        return cached.response
      }
      
      if (navigator.onLine) {
        const response = await API.post('/ai', {
          query,
          mode: options.mode || 'hybrid'
        })
        
        // Cache response
        await db.cacheAIResponse(query, response.data, 'online')
        
        return response.data
      } else {
        // Use offline AI model
        const offlineResponse = await this.askOfflineAI(query)
        
        // Cache offline response
        await db.cacheAIResponse(query, offlineResponse, 'offline')
        
        return offlineResponse
      }
    } catch (error) {
      console.error('Error asking AI:', error)
      
      // Fallback to offline AI
      if (!navigator.onLine || error.message.includes('offline')) {
        return await this.askOfflineAI(query)
      }
      
      throw error
    }
  },
  
  async askOfflineAI(query) {
    // Simple offline AI responses
    const responses = {
      greeting: "Hello! I'm your offline AI assistant. I can help with basic questions while you're offline.",
      help: "I can help you with: summarizing notes, answering study questions, and explaining concepts.",
      summary: "I'll summarize that for you when you're back online.",
      translate: "Translation requires internet connection. Please connect to translate.",
      default: "I'm currently offline. For advanced features like translations and detailed explanations, please connect to the internet. I can still help with basic questions about your saved content."
    }
    
    const queryLower = query.toLowerCase()
    
    if (queryLower.includes('hello') || queryLower.includes('hi')) {
      return responses.greeting
    } else if (queryLower.includes('help')) {
      return responses.help
    } else if (queryLower.includes('summary') || queryLower.includes('summarize')) {
      return responses.summary
    } else if (queryLower.includes('translate')) {
      return responses.translate
    }
    
    return responses.default
  },
  
  // Sync
  async syncPending() {
    if (!navigator.onLine) {
      return { synced: 0, message: 'Cannot sync while offline' }
    }
    
    const pending = await db.getPendingSyncs()
    let syncedCount = 0
    
    for (const item of pending) {
      try {
        switch (item.entityType) {
          case 'posts':
            await API.post('/sync/posts', item.data)
            break
          case 'groups':
            await API.post('/sync/groups', item.data)
            break
          case 'messages':
            await API.post('/sync/messages', item.data)
            break
          case 'api_request':
            await API({
              url: item.data.url,
              method: item.data.method,
              data: item.data.data,
              headers: item.data.headers
            })
            break
        }
        
        await db.removeFromSyncQueue(item.id)
        syncedCount++
      } catch (error) {
        console.error('Failed to sync item:', item.id, error)
        // Update retry count
        await db.syncQueue.update(item.id, { 
          retries: item.retries + 1 
        })
      }
    }
    
    return { synced: syncedCount, total: pending.length }
  },
  
  // File upload
  async uploadFile(file) {
    try {
      // Save locally first
      const localFile = await db.saveFile(file)
      
      if (navigator.onLine) {
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await API.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        // Update local record
        await db.files.update(localFile.id, {
          uploaded: true,
          serverId: response.data.id
        })
        
        return response.data
      }
      
      return localFile
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }
}

export default API
