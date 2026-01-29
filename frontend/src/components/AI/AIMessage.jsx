import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'

const AIMessage = ({ message, isOnline }) => {
  const isAI = message.sender === 'ai'
  const isOnlineModel = message.model === 'online'

  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-[80%] rounded-2xl p-4 ${
        isAI 
          ? isOnlineModel
            ? 'bg-ai-gradient text-white'
            : 'bg-gray-800 text-gray-300'
          : 'bg-fastline-blue text-white'
      }`}>
        
        {/* Message Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {isAI ? (
              <>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-xs">🤖</span>
                </div>
                <span className="text-sm font-medium">
                  AI Assistant
                  {isOnlineModel && isOnline && (
                    <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      Online
                    </span>
                  )}
                </span>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-xs">👤</span>
                </div>
                <span className="text-sm font-medium">You</span>
              </>
            )}
          </div>
          
          <span className="text-xs opacity-75">
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
        </div>

        {/* Message Content */}
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              code: ({ children }) => (
                <code className="bg-black/30 px-1 py-0.5 rounded text-sm">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto my-2">
                  {children}
                </pre>
              ),
              a: ({ href, children }) => (
                <a 
                  href={href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:underline"
                >
                  {children}
                </a>
              )
            }}
          >
            {message.text}
          </ReactMarkdown>
        </div>

        {/* AI Actions */}
        {isAI && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center space-x-2">
              <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">
                Copy
              </button>
              <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">
                Save
              </button>
              {isOnline && (
                <button className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors">
                  Improve
                </button>
              )}
            </div>
            
            {!isOnlineModel && (
              <span className="text-xs opacity-75">
                Offline response
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AIMessage
