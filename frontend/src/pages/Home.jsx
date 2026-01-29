import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import { db } from '../offline/db'
import toast from 'react-hot-toast'

// Components
import PostCard from '../components/Posts/PostCard'
import CreatePost from '../components/Posts/CreatePost'
import NetworkStatus from '../components/Network/NetworkStatus'
import SyncIndicator from '../components/Sync/SyncIndicator'
import LoadingSpinner from '../components/Common/LoadingSpinner'

const Home = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [offlinePosts, setOfflinePosts] = useState(0)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const navigate = useNavigate()

  const loadPosts = async (reset = false) => {
    if (reset) {
      setPage(0)
      setPosts([])
    }
    
    setLoading(true)
    try {
      const data = await api.getPosts(20, page * 20)
      if (reset) {
        setPosts(data.posts || [])
      } else {
        setPosts(prev => [...prev, ...(data.posts || [])])
      }
      setHasMore(data.hasMore !== false)
    } catch (error) {
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const checkOfflinePosts = async () => {
    const pending = await db.syncQueue
      .where('entityType')
      .equals('posts')
      .count()
    setOfflinePosts(pending)
  }

  useEffect(() => {
    loadPosts(true)
    checkOfflinePosts()
    
    const interval = setInterval(checkOfflinePosts, 30000) // Check every 30 seconds
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev])
    checkOfflinePosts()
    toast.success(isOnline ? 'Post created!' : 'Post saved offline. Will sync when online.')
  }

  const handleLike = async (postId) => {
    try {
      await api.likePost(postId)
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              likes: post.likes?.includes(postId) 
                ? post.likes.filter(id => id !== postId)
                : [...(post.likes || []), postId]
            }
          : post
      ))
    } catch (error) {
      toast.error('Failed to like post')
    }
  }

  const handleSync = async () => {
    const toastId = toast.loading('Syncing...')
    try {
      const result = await api.syncPending()
      toast.success(`Synced ${result.synced} items`, { id: toastId })
      await loadPosts(true)
      await checkOfflinePosts()
    } catch (error) {
      toast.error('Sync failed', { id: toastId })
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Community Feed</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isOnline ? 'Connected' : 'Offline Mode'} • Local-first content
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <NetworkStatus />
          {offlinePosts > 0 && (
            <button
              onClick={handleSync}
              className="flex items-center space-x-2 px-4 py-2 bg-energy-orange text-white rounded-lg hover:bg-energy-orange/90 transition-colors"
            >
              <span>Sync ({offlinePosts})</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Create Post */}
      <div className="mb-6">
        <CreatePost onPostCreated={handlePostCreated} />
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">No posts yet</h3>
            <p className="text-gray-500">
              {isOnline 
                ? 'Be the first to share something!'
                : 'You\'re offline. Create posts that will sync when you reconnect.'
              }
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id || post.localId}
              post={post}
              onLike={() => handleLike(post.id || post.localId)}
              onComment={() => navigate(`/post/${post.id}`)}
              onSave={() => toast.success('Saved to offline storage')}
            />
          ))
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        )}

        {hasMore && !loading && (
          <button
            onClick={() => {
              setPage(p => p + 1)
              loadPosts()
            }}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300"
          >
            Load more posts
          </button>
        )}
      </div>

      {/* Sync Indicator */}
      <SyncIndicator />
    </div>
  )
}

export default Home
