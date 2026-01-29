import React from 'react'

const AISuggestions = ({ suggestions = [], onClick }) => {
  if (!suggestions.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((text, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onClick && onClick(text)}
          className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
        >
          {text}
        </button>
      ))}
    </div>
  )
}

export default AISuggestions
