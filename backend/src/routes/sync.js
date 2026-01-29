import express from 'express'
import Post from '../models/Post.js'
import Group from '../models/Group.js'
import User from '../models/User.js'

const router = express.Router()

// Sync posts from offline to online
router.post('/posts', async (req, res) => {
  try {
    const { posts } = req.body
    const userId = req.user._id

    if (!Array.isArray(posts)) {
      return res.status(400).json({ error: 'Posts array is required' })
    }

    const results = {
      created: [],
      updated: [],
      conflicts: [],
      errors: []
    }

    for (const postData of posts) {
      try {
        const { localId, syncStatus, ...postFields } = postData

        // Check if post exists by localId
        let post = await Post.findOne({ localId })

        if (post) {
          // Update existing post
          // Check version conflict
          if (post.version > postData.version) {
            results.conflicts.push({
              localId,
              message: 'Version conflict - server has newer version',
              serverVersion: post.version,
              clientVersion: postData.version
            })
            continue
          }

          Object.assign(post, postFields)
          post.syncStatus = 'synced'
          post.version += 1
          await post.save()

          results.updated.push({
            localId,
            serverId: post._id,
            version: post.version
          })
        } else {
          // Create new post
          post = new Post({
            ...postFields,
            localId,
            userId,
            syncStatus: 'synced',
            version: 1
          })

          await post.save()

          // Update user's post count
          await User.findByIdAndUpdate(userId, {
            $inc: { postCount: 1 }
          })

          results.created.push({
            localId,
            serverId: post._id,
            version: post.version
          })
        }
      } catch (error) {
        results.errors.push({
          localId: postData.localId,
          error: error.message
        })
      }
    }

    res.json({
      message: 'Sync completed',
      results,
      summary: {
        total: posts.length,
        successful: results.created.length + results.updated.length,
        conflicts: results.conflicts.length,
        errors: results.errors.length
      }
    })
  } catch (error) {
    console.error('Sync posts error:', error)
    res.status(500).json({ error: 'Sync failed' })
  }
})

// Sync groups from offline to online
router.post('/groups', async (req, res) => {
  try {
    const { groups } = req.body
    const userId = req.user._id

    if (!Array.isArray(groups)) {
      return res.status(400).json({ error: 'Groups array is required' })
    }

    const results = {
      created: [],
      updated: [],
      conflicts: [],
      errors: []
    }

    for (const groupData of groups) {
      try {
        const { localId, syncStatus, ...groupFields } = groupData

        // Check if group exists by localId
        let group = await Group.findOne({ localId })

        if (group) {
          // Update existing group
          Object.assign(group, groupFields)
          group.syncStatus = 'synced'
          await group.save()

          results.updated.push({
            localId,
            serverId: group._id
          })
        } else {
          // Create new group
          group = new Group({
            ...groupFields,
            localId,
            creatorId: userId,
            syncStatus: 'synced',
            members: [userId],
            admins: [userId],
            memberCount: 1
          })

          await group.save()

          // Update user's group count
          await User.findByIdAndUpdate(userId, {
            $inc: { groupCount: 1 }
          })

          results.created.push({
            localId,
            serverId: group._id
          })
        }
      } catch (error) {
        results.errors.push({
          localId: groupData.localId,
          error: error.message
        })
      }
    }

    res.json({
      message: 'Sync completed',
      results,
      summary: {
        total: groups.length,
        successful: results.created.length + results.updated.length,
        conflicts: results.conflicts.length,
        errors: results.errors.length
      }
    })
  } catch (error) {
    console.error('Sync groups error:', error)
    res.status(500).json({ error: 'Sync failed' })
  }
})

// Sync users from offline to online
router.post('/users', async (req, res) => {
  try {
    const { users } = req.body

    if (!Array.isArray(users)) {
      return res.status(400).json({ error: 'Users array is required' })
    }

    const results = {
      created: [],
      updated: [],
      conflicts: [],
      errors: []
    }

    for (const userData of users) {
      try {
        const { localId, phone, ...userFields } = userData

        // Check if user exists by phone or localId
        let user = await User.findOne({
          $or: [
            { phone },
            { localId }
          ]
        })

        if (user) {
          // Update existing user (merge data)
          Object.assign(user, userFields)
          user.syncStatus = 'synced'
          await user.save()

          results.updated.push({
            localId,
            serverId: user._id,
            phone: user.phone
          })
        } else {
          // Create new user
          user = new User({
            ...userFields,
            localId,
            phone,
            syncStatus: 'synced'
          })

          await user.save()

          results.created.push({
            localId,
            serverId: user._id,
            phone: user.phone
          })
        }
      } catch (error) {
        results.errors.push({
          localId: userData.localId,
          error: error.message
        })
      }
    }

    res.json({
      message: 'Sync completed',
      results,
      summary: {
        total: users.length,
        successful: results.created.length + results.updated.length,
        conflicts: results.conflicts.length,
        errors: results.errors.length
      }
    })
  } catch (error) {
    console.error('Sync users error:', error)
    res.status(500).json({ error: 'Sync failed' })
  }
})

// Get changes since last sync
router.get('/changes', async (req, res) => {
  try {
    const { 
      lastSync, 
      entityTypes = 'posts,groups,users',
      limit = 100 
    } = req.query

    const changes = {}
    const syncTimestamp = lastSync ? new Date(lastSync) : new Date(0)

    // Parse entity types
    const types = entityTypes.split(',')

    // Get posts changes
    if (types.includes('posts')) {
      const postChanges = await Post.find({
        updatedAt: { $gt: syncTimestamp },
        syncStatus: 'synced',
        isHidden: false
      })
      .limit(parseInt(limit))
      .select('-likes -saves -comments') // Exclude large arrays
      .lean()

      changes.posts = postChanges
    }

    // Get groups changes
    if (types.includes('groups')) {
      const groupChanges = await Group.find({
        updatedAt: { $gt: syncTimestamp },
        syncStatus: 'synced',
        isActive: true
      })
      .limit(parseInt(limit))
      .select('-members -admins -moderators') // Exclude large arrays
      .lean()

      changes.groups = groupChanges
    }

    // Get users changes
    if (types.includes('users')) {
      const userChanges = await User.find({
        updatedAt: { $gt: syncTimestamp },
        syncStatus: 'synced',
        isActive: true
      })
      .limit(parseInt(limit))
      .select('-deviceTokens') // Exclude sensitive data
      .lean()

      changes.users = userChanges
    }

    res.json({
      changes,
      serverTime: new Date().toISOString(),
      syncTimestamp: syncTimestamp.toISOString()
    })
  } catch (error) {
    console.error('Get changes error:', error)
    res.status(500).json({ error: 'Failed to get changes' })
  }
})

// Resolve conflicts
router.post('/resolve-conflict', async (req, res) => {
  try {
    const { entityType, localId, serverId, resolution, data } = req.body

    if (!entityType || !resolution) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    let result

    switch (entityType) {
      case 'post':
        const post = await Post.findById(serverId)
        if (!post) {
          return res.status(404).json({ error: 'Post not found' })
        }

        if (resolution === 'client') {
          // Use client data
          Object.assign(post, data)
          post.syncStatus = 'synced'
          post.version += 1
        } else if (resolution === 'server') {
          // Keep server data, just update sync status
          post.syncStatus = 'synced'
        } else if (resolution === 'merge') {
          // Merge client and server data (simplified)
          // In real app, implement proper merge logic
          Object.assign(post, {
            ...data,
            version: post.version + 1
          })
          post.syncStatus = 'synced'
        }

        await post.save()
        result = post
        break

      case 'group':
        const group = await Group.findById(serverId)
        if (!group) {
          return res.status(404).json({ error: 'Group not found' })
        }

        if (resolution === 'client') {
          Object.assign(group, data)
        }
        group.syncStatus = 'synced'
        await group.save()
        result = group
        break

      default:
        return res.status(400).json({ error: 'Invalid entity type' })
    }

    res.json({
      message: 'Conflict resolved',
      entityType,
      resolution,
      result: result.toJSON()
    })
  } catch (error) {
    console.error('Resolve conflict error:', error)
    res.status(500).json({ error: 'Failed to resolve conflict' })
  }
})

// Get sync status
router.get('/status', async (req, res) => {
  try {
    const userId = req.user._id

    // Count pending sync items for user
    const pendingPosts = await Post.countDocuments({
      userId,
      syncStatus: 'pending'
    })

    const pendingGroups = await Group.countDocuments({
      creatorId: userId,
      syncStatus: 'pending'
    })

    // Get last sync time
    const user = await User.findById(userId)
    const lastSync = user.lastSync

    res.json({
      status: 'online',
      pending: {
        posts: pendingPosts,
        groups: pendingGroups,
        total: pendingPosts + pendingGroups
      },
      lastSync,
      serverTime: new Date().toISOString(),
      storage: {
        // In real app, calculate actual storage usage
        estimated: 'Calculating...'
      }
    })
  } catch (error) {
    console.error('Get sync status error:', error)
    res.status(500).json({ error: 'Failed to get sync status' })
  }
})

// Bulk sync (for initial sync after long offline)
router.post('/bulk', async (req, res) => {
  try {
    const { posts, groups, users } = req.body
    const userId = req.user._id

    // Process each entity type
    const results = {}

    if (posts && Array.isArray(posts)) {
      const postResults = await processBulkEntities(
        posts, 
        Post, 
        'post', 
        userId
      )
      results.posts = postResults
    }

    if (groups && Array.isArray(groups)) {
      const groupResults = await processBulkEntities(
        groups, 
        Group, 
        'group', 
        userId
      )
      results.groups = groupResults
    }

    if (users && Array.isArray(users)) {
      const userResults = await processBulkEntities(
        users, 
        User, 
        'user', 
        null // Users don't have userId field
      )
      results.users = userResults
    }

    // Update user's last sync time
    await User.findByIdAndUpdate(userId, {
      lastSync: new Date()
    })

    res.json({
      message: 'Bulk sync completed',
      results,
      serverTime: new Date().toISOString()
    })
  } catch (error) {
    console.error('Bulk sync error:', error)
    res.status(500).json({ error: 'Bulk sync failed' })
  }
})

// Helper function for bulk processing
async function processBulkEntities(entities, Model, type, userId) {
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  }

  const batchSize = 50
  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize)
    const operations = []

    for (const entity of batch) {
      try {
        const { localId, ...entityData } = entity

        // Find by localId
        const existing = await Model.findOne({ localId })

        if (existing) {
          // Update
          operations.push({
            updateOne: {
              filter: { _id: existing._id },
              update: {
                $set: {
                  ...entityData,
                  syncStatus: 'synced',
                  updatedAt: new Date()
                }
              }
            }
          })
          results.updated++
        } else {
          // Create
          const newEntity = {
            ...entityData,
            localId,
            syncStatus: 'synced'
          }

          // Add userId for posts and groups
          if (type !== 'user' && userId) {
            if (type === 'post') {
              newEntity.userId = userId
            } else if (type === 'group') {
              newEntity.creatorId = userId
              if (!newEntity.members || newEntity.members.length === 0) {
                newEntity.members = [userId]
                newEntity.admins = [userId]
                newEntity.memberCount = 1
              }
            }
          }

          operations.push({
            insertOne: {
              document: newEntity
            }
          })
          results.created++
        }
      } catch (error) {
        console.error(`Error processing ${type}:`, error)
        results.errors++
      }
    }

    // Execute batch
    if (operations.length > 0) {
      try {
        await Model.bulkWrite(operations)
      } catch (error) {
        console.error(`Bulk write error for ${type}:`, error)
        results.errors += operations.length
      }
    }
  }

  return results
}

export default router
