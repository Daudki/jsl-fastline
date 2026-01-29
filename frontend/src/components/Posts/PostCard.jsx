import React, { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

const PostCard = ({ post, onLike, onComment, onSave }) => {
  const [isLiked, setIsLiked] = useState(post.likes?.includes(post.userId) || false)
  const [isSaved, setIsSaved] = useState(post.saves?.includes(post.userId) || false)
  const [showComments, setShowComments] = useState(false)

  const handleLike = () => {
    setIsLiked(!isLiked)
    if (onLike) onLike()
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
    if (onSave) onSave()
  }

  return (
    <div className="card animate-slide-up">
      {/* Post Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary-gradient flex items-center justify-center text-white font-semibold">
            {post.author?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="font-semibold text-white">
              {post.author?.displayName || post.author?.username || 'Anonymous'}
            </div>
            <div className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              {post.location && ' · Nearby'}
            </div>
          </div>
        </div>
        {post.type === 'question' && (
          <span className="px-2 py-1 bg-ai-purple/20 text-ai-purple text-xs rounded-full">
            Question
          </span>
        )}
      </div>

      {/* Post Content */}
      <div className="mb-4">
        <p className="text-gray-100 whitespace-pre-wrap">{post.content}</p>
        
        {/* Media */}
        {post.media && post.media.length > 0 && (
          <div className="mt-3">
            {post.media[0].type === 'image' && (
              <img 
                src={post.media[0].url} 
                alt="Post media" 
                className="w-full rounded-lg max-h-96 object-cover"
              />
            )}
            {post.media[0].type === 'video' && (
              <video 
                src={post.media[0].url} 
                controls 
                className="w-full rounded-lg max-h-96"
              />
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index} 
                className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Post Stats */}
      <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
        <div className="flex items-center space-x-4">
          <span>{post.likeCount || 0} likes</span>
          <span>{post.commentCount || 0} comments</span>
          <span>{post.saveCount || 0} saves</span>
        </div>
        {post.educationalValue > 0 && (
          <div className="flex items-center space-x-1">
            <span className="text-energy-orange">⭐</span>
            <span>Value: {post.educationalValue}/10</span>
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between border-t border-gray-800 pt-4">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
            isLiked 
              ? 'bg-fastline-blue/20 text-fastline-blue' 
              : 'hover:bg-gray-800 text-gray-400'
          }`}
        >
          <svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>Like</span>
        </button>

        <button
          onClick={() => {
            setShowComments(!showComments)
            if (onComment) onComment()
          }}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Comment</span>
        </button>

        <button
          onClick={handleSave}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
            isSaved 
              ? 'bg-energy-orange/20 text-energy-orange' 
              : 'hover:bg-gray-800 text-gray-400'
          }`}
        >
          <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span>Save</span>
        </button>

        <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex space-x-3">
            <input
              type="text"
              placeholder="Add a comment..."
              className="flex-1 input-field py-2"
            />
            <button className="px-4 py-2 bg-fastline-blue text-white rounded-lg hover:bg-fastline-blue/90">
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PostCard
