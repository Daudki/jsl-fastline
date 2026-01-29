import React from 'react'
import { useNavigate } from 'react-router-dom'

const SavedItems = ({ items = [] }) => {
  const navigate = useNavigate()

  if (!items.length) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
          <span className="text-3xl">💾</span>
        </div>
        <h3 className="text-lg font-medium text-gray-300 mb-2">No saved items</h3>
        <p className="text-gray-500 text-sm">Save posts and highlights from the feed to find them here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id ?? item.localId}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:bg-gray-800 transition-colors cursor-pointer"
          onClick={() => item.id && navigate(`/`)}
        >
          <p className="text-gray-200 line-clamp-2">
            {item.content || item.title || item.description || 'Saved item'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
          </p>
        </div>
      ))}
    </div>
  )
}

export default SavedItems
