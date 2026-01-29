import React from 'react'
import { formatDistanceToNow } from 'date-fns'

const GroupCard = ({ group, onJoin, onClick }) => {
  const getGroupIcon = (type) => {
    switch (type) {
      case 'study': return '📚'
      case 'class': return '🏫'
      case 'school': return '🎓'
      case 'community': return '👥'
      default: return '👤'
    }
  }

  const getGroupColor = (type) => {
    switch (type) {
      case 'study': return 'bg-ai-purple'
      case 'class': return 'bg-energy-orange'
      case 'school': return 'bg-electric-teal'
      case 'community': return 'bg-online-green'
      default: return 'bg-fastline-blue'
    }
  }

  return (
    <div 
      className="card hover:border-fastline-blue transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Group Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-xl ${getGroupColor(group.type)} flex items-center justify-center text-white text-2xl`}>
            {getGroupIcon(group.type)}
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-fastline-blue transition-colors">
              {group.name}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-400 mt-1">
              <span>{group.memberCount || 0} members</span>
              <span>•</span>
              <span>{group.type.charAt(0).toUpperCase() + group.type.slice(1)}</span>
            </div>
          </div>
        </div>
        
        {group.privacy === 'private' && (
          <span className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded-full">
            Private
          </span>
        )}
      </div>

      {/* Group Description */}
      <p className="text-gray-300 text-sm mb-4 line-clamp-2">
        {group.description || 'No description provided'}
      </p>

      {/* Group Stats */}
      <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <span>📝</span>
            <span>{group.postCount || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>📁</span>
            <span>{group.resources?.length || 0}</span>
          </div>
        </div>
        
        {group.lastActivity && (
          <span className="text-xs">
            Active {formatDistanceToNow(new Date(group.lastActivity), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Group Actions */}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {/* Member avatars (up to 3) */}
          {[1, 2, 3].map((_, index) => (
            <div 
              key={index}
              className="w-8 h-8 rounded-full bg-gray-700 border-2 border-graphite"
            />
          ))}
          {group.memberCount > 3 && (
            <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-graphite flex items-center justify-center text-xs text-gray-400">
              +{group.memberCount - 3}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            if (onJoin) onJoin()
          }}
          className="px-4 py-2 bg-fastline-blue text-white rounded-lg hover:bg-fastline-blue/90 transition-colors text-sm font-medium"
        >
          Join Group
        </button>
      </div>
    </div>
  )
}

export default GroupCard
