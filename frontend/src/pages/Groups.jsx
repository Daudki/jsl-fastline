import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import toast from 'react-hot-toast'

// Components
import GroupCard from '../components/Groups/GroupCard'
import CreateGroupModal from '../components/Groups/CreateGroupModal'
import LoadingSpinner from '../components/Common/LoadingSpinner'

const Groups = () => {
  const [groups, setGroups] = useState([])
  const [filteredGroups, setFilteredGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const navigate = useNavigate()

  const groupTypes = [
    { id: 'all', name: 'All Groups', color: 'bg-fastline-blue' },
    { id: 'study', name: 'Study Groups', color: 'bg-ai-purple' },
    { id: 'class', name: 'Class Groups', color: 'bg-energy-orange' },
    { id: 'school', name: 'School Groups', color: 'bg-electric-teal' },
    { id: 'community', name: 'Community', color: 'bg-online-green' },
  ]

  const loadGroups = async () => {
    setLoading(true)
    try {
      const data = await api.getGroups()
      setGroups(data.groups || [])
      setFilteredGroups(data.groups || [])
    } catch (error) {
      toast.error('Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    let filtered = groups
    
    if (searchQuery) {
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    if (selectedType !== 'all') {
      filtered = filtered.filter(group => group.type === selectedType)
    }
    
    setFilteredGroups(filtered)
  }, [searchQuery, selectedType, groups])

  const handleCreateGroup = async (groupData) => {
    try {
      const newGroup = await api.createGroup(groupData)
      setGroups(prev => [newGroup, ...prev])
      setShowCreateModal(false)
      toast.success('Group created successfully!')
    } catch (error) {
      toast.error('Failed to create group')
    }
  }

  const handleJoinGroup = async (groupId) => {
    try {
      await api.joinGroup(groupId)
      toast.success('Joined group!')
      // Update local state
      setGroups(prev => prev.map(group => 
        group.id === groupId 
          ? { ...group, memberCount: (group.memberCount || 0) + 1 }
          : group
      ))
    } catch (error) {
      toast.error('Failed to join group')
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Groups & Communities</h1>
          <p className="text-gray-400 text-sm mt-1">
            Join study groups, classes, and communities
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Group</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12"
          />
          <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-2">
          {groupTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === type.id
                  ? `${type.color.split(' ')[0]} text-white`
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No groups found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || selectedType !== 'all'
              ? 'Try changing your search or filter'
              : 'Be the first to create a group!'
            }
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Create First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => {
            const groupId = group._id ?? group.id ?? group.localId
            return (
              <GroupCard
                key={groupId}
                group={group}
                onJoin={() => handleJoinGroup(groupId)}
                onClick={() => navigate(`/groups/${groupId}`)}
              />
            )
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateGroup}
        />
      )}
    </div>
  )
}

export default Groups
