import React from 'react'

const HighlightCard = ({ highlight, onSave }) => {
  const title = highlight.title ?? highlight.content?.slice(0, 60) ?? 'Highlight'
  const description = highlight.description ?? highlight.content?.slice(0, 120) ?? ''
  const metric = highlight.metric ?? ''
  const icon = highlight.icon ?? '⭐'

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xl" role="img" aria-hidden>{icon}</span>
          {onSave && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSave() }}
              className="text-gray-400 hover:text-fastline-blue text-sm"
            >
              Save
            </button>
          )}
        </div>
        <h3 className="font-semibold text-white mt-2 line-clamp-2">{title}</h3>
        {description && (
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{description}</p>
        )}
        {metric && (
          <p className="text-xs text-gray-500 mt-2">{metric}</p>
        )}
        {highlight.author && (
          <p className="text-xs text-gray-500 mt-1">— {highlight.author}</p>
        )}
      </div>
    </div>
  )
}

export default HighlightCard
