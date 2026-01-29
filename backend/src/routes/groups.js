import express from 'express'
import Group from '../models/Group.js'
import Post from '../models/Post.js'
import User from '../models/User.js'

const router = express.Router()

// Create group
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      category,
      privacy,
      joinMethod,
      location,
      rules
    } = req.body

    const userId = req.user._id

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' })
    }

    // Check if group name exists
    const existingGroup = await Group.findOne({ name })
    if (existingGroup) {
      return res.status(409).json({ error: 'Group name already exists' })
    }

    // Create group
    const group = new Group({
      name,
      description,
      type: type || 'study',
      category: category || 'other',
      creatorId: userId,
      privacy: privacy || 'public',
      joinMethod: joinMethod || 'open',
      location: location || {
        type: 'Point',
        coordinates: [0, 0]
      },
      rules: rules || [],
      members: [userId],
      admins: [userId],
      memberCount: 1
    })

    await group.save()

    // Update user's group count
    await User.findByIdAndUpdate(userId, {
      $inc: { groupCount: 1 }
    })

    res.status(201).json({
      message: 'Group created successfully',
      group: group.toJSON()
    })
  } catch (error) {
    console.error('Create group error:', error)
    res.status(500).json({ error: 'Failed to create group' })
  }
})

// Get all groups
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      location,
      radius = 10000,
      sort = 'popular'
    } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)

    // Build query
    const query = {
      isActive: true,
      privacy: 'public'
    }

    if (type) query.type = type
    if (category) query.category = category

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
    let sortOption = { memberCount: -1 }
    if (sort === 'newest') {
      sortOption = { createdAt: -1 }
    } else if (sort === 'active') {
      sortOption = { lastActivity: -1 }
    }

    // Get groups
    const groups = await Group.find(query)
      .populate('creatorId', 'username displayName avatar')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))

    // Get total count
    const total = await Group.countDocuments(query)

    res.json({
      groups: groups.map(group => group.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Get groups error:', error)
    res.status(500).json({ error: 'Failed to get groups' })
  }
})

// Get single group
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params

    const group = await Group.findById(groupId)
      .populate('creatorId', 'username displayName avatar')
      .populate('admins', 'username displayName avatar')
      .populate('moderators', 'username displayName avatar')

    if (!group || !group.isActive) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Get group members (limited to 50)
    const members = await User.find({ _id: { $in: group.members } })
      .select('username displayName avatar lastSeen')
      .limit(50)

    // Get recent posts
    const posts = await Post.find({
      groupId,
      isHidden: false,
      syncStatus: 'synced'
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('userId', 'username displayName avatar')

    res.json({
      group: group.toJSON(),
      members,
      posts: posts.map(post => post.toJSON()),
      canJoin: group.privacy === 'public' || 
               (group.privacy === 'restricted' && group.joinMethod === 'open')
    })
  } catch (error) {
    console.error('Get group error:', error)
    res.status(500).json({ error: 'Failed to get group' })
  }
})

// Join group
router.post('/:groupId/join', async (req, res) => {
  try {
    const { groupId } = req.params
    const userId = req.user._id

    const group = await Group.findById(groupId)

    if (!group || !group.isActive) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Check if already a member
    if (group.members.includes(userId)) {
      return res.status(409).json({ error: 'Already a member' })
    }

    // Check group privacy
    if (group.privacy === 'private') {
      return res.status(403).json({ error: 'Group is private' })
    }

    if (group.privacy === 'restricted' && group.joinMethod === 'approval') {
      // Add to pending approvals (in real app, create approval request)
      return res.status(202).json({ 
        message: 'Join request sent for approval',
        requiresApproval: true
      })
    }

    // Join group
    await group.addMember(userId)
    
    // Update user's group count
    await User.findByIdAndUpdate(userId, {
      $inc: { groupCount: 1 }
    })

    res.json({
      message: 'Joined group successfully',
      group: group.toJSON()
    })
  } catch (error) {
    console.error('Join group error:', error)
    res.status(500).json({ error: 'Failed to join group' })
  }
})

// Leave group
router.post('/:groupId/leave', async (req, res) => {
  try {
    const { groupId } = req.params
    const userId = req.user._id

    const group = await Group.findById(groupId)

    if (!group || !group.isActive) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Check if member
    if (!group.members.includes(userId)) {
      return res.status(404).json({ error: 'Not a member of this group' })
    }

    // Can't leave if you're the only admin
    if (group.admins.length === 1 && group.admins.includes(userId)) {
      return res.status(400).json({ 
        error: 'Cannot leave as the only admin. Transfer admin role first or delete group.' 
      })
    }

    // Leave group
    await group.removeMember(userId)
    
    // Update user's group count
    await User.findByIdAndUpdate(userId, {
      $inc: { groupCount: -1 }
    })

    res.json({
      message: 'Left group successfully',
      group: group.toJSON()
    })
  } catch (error) {
    console.error('Leave group error:', error)
    res.status(500).json({ error: 'Failed to leave group' })
  }
})

// Update group
router.put('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params
    const updates = req.body
    const userId = req.user._id

    const group = await Group.findById(groupId)

    if (!group || !group.isActive) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Check admin rights
    if (!group.admins.includes(userId) && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Update group
    Object.assign(group, updates)
    group.updatedAt = new Date()

    await group.save()

    res.json({
      message: 'Group updated successfully',
      group: group.toJSON()
    })
  } catch (error) {
    console.error('Update group error:', error)
    res.status(500).json({ error: 'Failed to update group' })
  }
})

// Delete group
router.delete('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params
    const userId = req.user._id

    const group = await Group.findById(groupId)

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Check creator rights
    if (group.creatorId.toString() !== userId.toString() && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    // Soft delete
    group.isActive = false
    group.syncStatus = 'deleted'
    await group.save()

    // Update member counts for all members
    await User.updateMany(
      { _id: { $in: group.members } },
      { $inc: { groupCount: -1 } }
    )

    res.json({ message: 'Group deleted successfully' })
  } catch (error) {
    console.error('Delete group error:', error)
    res.status(500).json({ error: 'Failed to delete group' })
  }
})

// Get group members
router.get('/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params
    const { page = 1, limit = 50 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const group = await Group.findById(groupId)

    if (!group || !group.isActive) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const members = await User.find({ _id: { $in: group.members } })
      .select('username displayName avatar lastSeen')
      .skip(skip)
      .limit(parseInt(limit))

    const total = group.members.length

    res.json({
      members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    console.error('Get members error:', error)
    res.status(500).json({ error: 'Failed to get members' })
  }
})

// Add resource to group
router.post('/:groupId/resources', async (req, res) => {
  try {
    const { groupId } = req.params
    const userId = req.user._id
    const resourceData = req.body

    const group = await Group.findById(groupId)

    if (!group || !group.isActive) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Check if member
    if (!group.members.includes(userId)) {
      return res.status(403).json({ error: 'Must be a member to add resources' })
    }

    // Add resource
    await group.addResource({
      ...resourceData,
      uploadedBy: userId
    })

    res.json({
      message: 'Resource added successfully',
      group: group.toJSON()
    })
  } catch (error) {
    console.error('Add resource error:', error)
    res.status(500).json({ error: 'Failed to add resource' })
  }
})

// Generate invite code
router.post('/:groupId/invite', async (req, res) => {
  try {
    const { groupId } = req.params
    const userId = req.user._id

    const group = await Group.findById(groupId)

    if (!group || !group.isActive) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Check admin rights
    if (!group.admins.includes(userId) && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Generate new invite code
    group.inviteCode = Group.generateInviteCode()
    await group.save()

    res.json({
      message: 'Invite code generated',
      inviteCode: group.inviteCode,
      link: `/groups/${groupId}/join?code=${group.inviteCode}`
    })
  } catch (error) {
    console.error('Generate invite error:', error)
    res.status(500).json({ error: 'Failed to generate invite' })
  }
})

// Join with invite code
router.post('/:groupId/join-with-code', async (req, res) => {
  try {
    const { groupId } = req.params
    const { code } = req.body
    const userId = req.user._id

    const group = await Group.findById(groupId)

    if (!group || !group.isActive) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Check invite code
    if (group.inviteCode !== code) {
      return res.status(401).json({ error: 'Invalid invite code' })
    }

    // Join group
    await group.addMember(userId)
    
    // Update user's group count
    await User.findByIdAndUpdate(userId, {
      $inc: { groupCount: 1 }
    })

    res.json({
      message: 'Joined group successfully with invite code',
      group: group.toJSON()
    })
  } catch (error) {
    console.error('Join with code error:', error)
    res.status(500).json({ error: 'Failed to join group' })
  }
})

export default router
