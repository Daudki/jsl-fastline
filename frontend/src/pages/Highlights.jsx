import React, { useState, useEffect } from 'react'
import { api } from '../api/api'
import { db } from '../offline/db'
import toast from 'react-hot-toast'

// Components
import HighlightCard from '../components/Highlights/HighlightCard'
import LoadingSpinner from '../components/Common/LoadingSpinner'

const Highlights = () => {
  const [highlights, setHighlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([
    { id: 'trending', name: 'Trending', icon: '🔥', active: true },
    { id: 'helpful', name: 'Most Helpful', icon: '⭐', active: false },
    { id: 'notes', name: 'Top Notes', icon: '📚', active: false },
    { id: 'tips', name: 'Daily Tips', icon: '💡', active: false },
    { id: 'achievements', name: 'Achievements', icon: '🏆', active: false },
  ])
  const [activeCategory, setActiveCategory] = useState('trending')

  const loadHighlights = async () => {
    setLoading(true)
    try {
      // In a real app, this would be an API call
      // For now, we'll simulate with local data
      
      const posts = await db.getLocalPosts(50)
      
      // Simulate different highlight categories
      const simulatedHighlights = [
        // Trending posts (most likes in last 24h)
        ...posts.slice(0, 5).map(post => ({
          ...post,
          type: 'trending',
          metric: `${Math.floor(Math.random() * 50) + 10} likes today`,
          icon: '🔥'
        })),
        
        // Helpful posts (most saves)
        ...posts.slice(5, 10).map(post => ({
          ...post,
          type: 'helpful',
          metric: `${Math.floor(Math.random() * 20) + 5} saves`,
          icon: '⭐'
        })),
        
        // Top notes (study materials)
        ...Array(5).fill(null).map((_, i) => ({
          id: `note_${i}`,
          type: 'notes',
          title: `Study Notes: ${['Math', 'Science', 'History', 'English', 'Coding'][i]}`,
          description: 'Comprehensive notes shared by top students',
          author: `Student${i + 1}`,
          metric: `${Math.floor(Math.random() * 100) + 30} downloads`,
          icon: '📚'
        })),
        
        // Daily tips
        ...Array(5).fill(null).map((_, i) => ({
          id: `tip_${i}`,
          type: 'tips',
          title: ['Study Hack', 'Memory Trick', 'Focus Tip', 'Note Taking', 'Exam Prep'][i],
          description: [
            'Use the Pomodoro technique: 25 min study, 5 min break',
            'Create mind maps for complex topics',
            'Study in consistent locations to build habits',
            'Use color coding in your notes',
            'Practice with past papers regularly'
          ][i],
          author: 'AI Assistant',
          metric: 'Daily Tip',
          icon: '💡'
        })),
        
        // Community achievements
        ...Array(5).fill(null).map((_, i) => ({
          id: `achievement_${i}`,
          type: 'achievements',
          title: ['Top Contributor', 'Study Streak', 'Helper Award', 'Group Leader', 'Knowledge Share'][i],
          description: [
            'Shared 50+ helpful resources this month',
            '30-day consecutive study streak',
            'Helped 20+ students with questions',
            'Managed most active study group',
            'Shared notes with 100+ students'
          ][i],
          author: `@user${i + 1}`,
          metric: 'Community Award',
          icon: '🏆'
        }))
      ].filter(item => !activeCategory || item.type === activeCategory)
      
      setHighlights(simulatedHighlights)
    } catch (error) {
      toast.error('Failed to load highlights')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHighlights()
  }, [activeCategory])

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId)
    setCategories(prev => prev.map(cat => ({
      ...cat,
      active: cat.id === categoryId
    })))
  }

  const handleSaveHighlight = async (highlight) => {
    try {
      // Save to local database
      await db.posts.add({
        ...highlight,
        savedAt: new Date(),
        type: 'highlight'
      })
      toast.success('Saved to your highlights!')
    } catch (error) {
      toast.error('Failed to save highlight')
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Highlights & Discover</h1>
        <p className="text-gray-400">
          Trending content, helpful resources, and community achievements
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all ${
              category.active
                ? 'bg-primary-gradient text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="text-lg">{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Highlights Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : highlights.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No highlights yet</h3>
          <p className="text-gray-500">
            {activeCategory === 'all'
              ? 'Highlights will appear as community activity increases'
              : `No ${activeCategory} content available yet`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {highlights.map((highlight) => (
            <HighlightCard
              key={`${highlight.type}_${highlight.id}`}
              highlight={highlight}
              onSave={() => handleSaveHighlight(highlight)}
            />
          ))}
        </div>
      )}

      {/* Stats Bar */}
      <div className="mt-12 p-6 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-fastline-blue">250+</div>
            <div className="text-gray-400 text-sm">Active Groups</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-electric-teal">1.2K</div>
            <div className="text-gray-400 text-sm">Daily Posts</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-ai-purple">85%</div>
            <div className="text-gray-400 text-sm">Offline Usage</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-online-green">500+</div>
            <div className="text-gray-400 text-sm">AI Queries/Day</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Highlights
