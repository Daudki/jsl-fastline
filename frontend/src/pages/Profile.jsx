import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import { db } from '../offline/db'
import toast from 'react-hot-toast'

// Components
import ProfileStats from '../components/Profile/ProfileStats'
import SavedItems from '../components/Profile/SavedItems'
import SettingsModal from '../components/Profile/SettingsModal'
import LoadingSpinner from '../components/Common/LoadingSpinner'

const Profile = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('posts')
  const [savedItems, setSavedItems] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const [storageInfo, setStorageInfo] = useState(null)
  const [syncStatus, setSyncStatus] = useState({
    pending: 0,
    lastSync: null,
    isSyncing: false
  })
  const navigate = useNavigate()

  const tabs = [
    { id: 'posts', name: 'My Posts', icon: '📝' },
    { id: 'saved', name: 'Saved', icon: '💾' },
    { id: 'groups', name: 'My Groups', icon: '👥' },
    { id: 'ai', name: 'AI History', icon: '🤖' },
    { id: 'files', name: 'Files', icon: '📁' },
  ]

  const loadUserData = async () => {
    setLoading(true)
    try {
      // Try to get user from localStorage
      const storedUser = localStorage.getItem('jsl_user')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      } else {
        // If no user in localStorage, check local DB
        const users = await db.users.toArray()
        if (users.length > 0) {
          setUser(users[0])
        } else {
          navigate('/login')
        }
      }

      // Load saved items
      const saved = await db.posts
        .where('saved')
        .equals(true)
        .toArray()
      setSavedItems(saved)

      // Check sync status
      const pending = await db.syncQueue.count()
      setSyncStatus(prev => ({
        ...prev,
        pending
      }))

      // Calculate storage usage
      await calculateStorageUsage()
    } catch (error) {
      console.error('Failed to load user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStorageUsage = async () => {
    try {
      const [users, posts, groups, messages, files] = await Promise.all([
        db.users.count(),
        db.posts.count(),
        db.groups.count(),
        db.messages.count(),
        db.files.count()
      ])

      // Estimate storage (rough calculation)
      const estimatedSize = 
        users * 1024 + // ~1KB per user
        posts * 5120 + // ~5KB per post
        groups * 3072 + // ~3KB per group
        messages * 1024 + // ~1KB per message
        files * 10240 // ~10KB per file (average)

      setStorageInfo({
        users,
        posts,
        groups,
        messages,
        files,
        estimatedSize: (estimatedSize / 1024 / 1024).toFixed(2) + ' MB'
      })
    } catch (error) {
      console.error('Failed to calculate storage:', error)
    }
  }

  useEffect(() => {
    loadUserData()

    // Set up periodic sync status check
    const interval = setInterval(async () => {
      const pending = await db.syncQueue.count()
      setSyncStatus(prev => ({ ...prev, pending }))
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    try {
      // Clear local data
      localStorage.removeItem('jsl_token')
      localStorage.removeItem('jsl_user')
      
      // In a real app, you might want to keep offline data
      // await db.delete() // Optional: clear entire database
      
      navigate('/login')
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleSyncNow = async () => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true }))
    try {
      const result = await api.syncPending()
      setSyncStatus({
        pending: 0,
        lastSync: new Date(),
        isSyncing: false
      })
      toast.success(`Synced ${result.synced} items`)
      await loadUserData() // Refresh data
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }))
      toast.error('Sync failed')
    }
  }

  const handleExportData = async () => {
    try {
      // Export all local data
      const exportData = {
        users: await db.users.toArray(),
        posts: await db.posts.toArray(),
        groups: await db.groups.toArray(),
        messages: await db.messages.toArray(),
        files: await db.files.toArray(),
        exportedAt: new Date().toISOString()
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `jsl-fastline-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('Data exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  const handleClearCache = async () => {
    if (window.confirm('Are you sure? This will clear all cached AI responses and temporary files.')) {
      try {
        await db.aiCache.clear()
        await db.files.where('uploaded').equals(true).delete()
        toast.success('Cache cleared successfully')
        await calculateStorageUsage()
      } catch (error) {
        toast.error('Failed to clear cache')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-6">
        <div className="flex items-start space-x-4">
          <div className="w-20 h-20 rounded-full bg-primary-gradient flex items-center justify-center text-white text-2xl font-bold">
            {user.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user.username || 'User'}</h1>
            <p className="text-gray-400">{user.phone || 'No phone number'}</p>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`badge-online ${!navigator.onLine ? 'offline' : ''}`}>
                {navigator.onLine ? 'Online' : 'Offline'}
              </span>
              <span className="text-xs text-gray-500">
                User ID: {user.id?.toString().substring(0, 8) || user.localId?.substring(0, 8)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSyncNow}
            disabled={syncStatus.isSyncing || syncStatus.pending === 0}
            className="px-4 py-2 bg-fastline-blue text-white rounded-lg hover:bg-fastline-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncStatus.isSyncing ? (
              <span className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Syncing...</span>
              </span>
            ) : (
              `Sync (${syncStatus.pending})`
            )}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-gray-800 text-gray-100 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
          >
            Settings
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-800 text-gray-100 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <ProfileStats user={user} storageInfo={storageInfo} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-t-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-800 text-white border-b-2 border-fastline-blue'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mb-8">
        {activeTab === 'saved' ? (
          <SavedItems items={savedItems} />
        ) : activeTab === 'posts' ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">Your Posts</h3>
            <p className="text-gray-500">Posts you've created will appear here</p>
          </div>
        ) : activeTab === 'ai' ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">AI Conversations</h3>
            <p className="text-gray-500">Your AI chat history will appear here</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              {activeTab === 'groups' ? 'Your Groups' : 'Your Files'}
            </h3>
            <p className="text-gray-500">
              {activeTab === 'groups' 
                ? 'Groups you\'ve joined or created will appear here'
                : 'Files you\'ve uploaded will appear here'
              }
            </p>
          </div>
        )}
      </div>

      {/* Storage & Sync Info */}
      <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-6">
        <h3 className="font-semibold text-white mb-4">Storage & Sync Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Local Storage</h4>
            {storageInfo ? (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Posts:</span>
                  <span className="text-gray-400">{storageInfo.posts}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Groups:</span>
                  <span className="text-gray-400">{storageInfo.groups}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Files:</span>
                  <span className="text-gray-400">{storageInfo.files}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Estimated Size:</span>
                  <span className="text-gray-400">{storageInfo.estimatedSize}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Loading storage info...</div>
            )}
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Sync Status</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Pending Syncs:</span>
                <span className={`text-sm font-medium ${
                  syncStatus.pending > 0 ? 'text-energy-orange' : 'text-online-green'
                }`}>
                  {syncStatus.pending}
                </span>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={handleExportData}
                  className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                >
                  Export All Data
                </button>
                <button
                  onClick={handleClearCache}
                  className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                >
                  Clear AI Cache
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          user={user}
          onUserUpdate={(updatedUser) => {
            setUser(updatedUser)
            localStorage.setItem('jsl_user', JSON.stringify(updatedUser))
          }}
        />
      )}
    </div>
  )
}

export default Profile
