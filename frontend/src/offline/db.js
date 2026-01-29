import Dexie from 'dexie'

class JSLFastLineDB extends Dexie {
  constructor() {
    super('JSLFastLineDB')
    
    this.version(1).stores({
      users: '++id, phone, username, localId, synced',
      posts: '++id, userId, content, media, likes, comments, createdAt, updatedAt, localId, syncStatus',
      groups: '++id, name, description, type, memberCount, localId, syncStatus',
      messages: '++id, groupId, userId, content, type, createdAt, localId, syncStatus',
      syncQueue: '++id, action, data, entityType, retries, createdAt',
      aiCache: '++id, query, response, model, createdAt',
      files: '++id, name, type, size, data, uploaded, localPath'
    })
    this.version(2).stores({
      posts: '++id, userId, content, media, likes, comments, createdAt, updatedAt, localId, syncStatus, saved'
    })
    
    // Define models
    this.users = this.table('users')
    this.posts = this.table('posts')
    this.groups = this.table('groups')
    this.messages = this.table('messages')
    this.syncQueue = this.table('syncQueue')
    this.aiCache = this.table('aiCache')
    this.files = this.table('files')
  }

  // User operations
  async createUser(userData) {
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return await this.users.add({
      ...userData,
      localId,
      synced: false,
      createdAt: new Date()
    })
  }

  async getUserByPhone(phone) {
    return await this.users.where('phone').equals(phone).first()
  }

  // Post operations
  async createPost(postData) {
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return await this.posts.add({
      ...postData,
      localId,
      syncStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: [],
      comments: []
    })
  }

  async getLocalPosts(limit = 50) {
    return await this.posts
      .orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray()
  }

  async likePost(postId, userId) {
    const post = await this.posts.get(postId)
    if (post) {
      const likes = new Set(post.likes || [])
      if (likes.has(userId)) {
        likes.delete(userId)
      } else {
        likes.add(userId)
      }
      await this.posts.update(postId, {
        likes: Array.from(likes),
        updatedAt: new Date(),
        syncStatus: 'pending'
      })
      await this.addToSyncQueue('update', { ...post, likes: Array.from(likes) }, 'posts')
    }
  }

  // Sync operations
  async addToSyncQueue(action, data, entityType) {
    return await this.syncQueue.add({
      action,
      data,
      entityType,
      retries: 0,
      createdAt: new Date()
    })
  }

  async getPendingSyncs(limit = 20) {
    return await this.syncQueue
      .orderBy('createdAt')
      .limit(limit)
      .toArray()
  }

  async removeFromSyncQueue(id) {
    return await this.syncQueue.delete(id)
  }

  // AI Cache operations
  async cacheAIResponse(query, response, model = 'offline') {
    return await this.aiCache.add({
      query,
      response,
      model,
      createdAt: new Date()
    })
  }

  async getCachedAIResponse(query, maxAgeHours = 24) {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
    return await this.aiCache
      .where('query')
      .equals(query)
      .and(item => item.createdAt > cutoff)
      .first()
  }

  // File operations
  async saveFile(file) {
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        const localId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result,
          uploaded: false,
          localPath: localId,
          createdAt: new Date()
        }
        const id = await this.files.add(fileData)
        resolve({ id, ...fileData })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Group operations
  async createGroup(groupData) {
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return await this.groups.add({
      ...groupData,
      localId,
      syncStatus: 'pending',
      memberCount: 1,
      createdAt: new Date()
    })
  }

  async joinGroup(groupId, userId) {
    const group = await this.groups.get(groupId)
    if (group) {
      await this.groups.update(groupId, {
        memberCount: (group.memberCount || 0) + 1,
        syncStatus: 'pending'
      })
      await this.addToSyncQueue('update', group, 'groups')
    }
  }

  // Message operations
  async sendMessage(messageData) {
    const localId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return await this.messages.add({
      ...messageData,
      localId,
      syncStatus: 'pending',
      createdAt: new Date()
    })
  }

  async getGroupMessages(groupId, limit = 100) {
    return await this.messages
      .where('groupId')
      .equals(groupId)
      .sortBy('createdAt')
  }
}

// Create singleton instance
const db = new JSLFastLineDB()

// Initialize database
export const initOfflineDB = async () => {
  try {
    await db.open()
    console.log('Offline database initialized successfully')
    return db
  } catch (error) {
    console.error('Failed to initialize offline database:', error)
    throw error
  }
}

// Export database instance and utilities
export { db }
export default db
