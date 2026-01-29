import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api/api'
import { db } from '../offline/db'
import toast from 'react-hot-toast'

// Components
import AIMessage from '../components/AI/AIMessage'
import AISuggestions from '../components/AI/AISuggestions'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import NetworkStatus from '../components/Network/NetworkStatus'

const AI = () => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [aiMode, setAiMode] = useState('hybrid') // hybrid, offline, online
  const messagesEndRef = useRef(null)

  const suggestions = [
    "Summarize my physics notes",
    "Explain quantum computing basics",
    "Create a study schedule for finals",
    "Translate this to Swahili: 'Hello, how are you?'",
    "Generate quiz questions on calculus",
    "Help me understand photosynthesis"
  ]

  const loadChatHistory = async () => {
    try {
      // Load recent AI conversations from local DB
      const cachedChats = await db.aiCache
        .orderBy('createdAt')
        .reverse()
        .limit(10)
        .toArray()
      
      const chatMessages = cachedChats.map(item => ({
        id: item.id,
        text: item.response,
        sender: 'ai',
        timestamp: item.createdAt,
        model: item.model
      }))
      
      if (chatMessages.length === 0) {
        // Initial welcome message
        setMessages([{
          id: 'welcome',
          text: isOnline 
            ? "Hello! I'm your AI learning assistant. I can help with summarizing notes, explaining concepts, creating quizzes, and more. I work both online and offline!"
            : "Hello! I'm in offline mode. I can help with basic questions using cached knowledge. For advanced features like translations and detailed explanations, please connect to the internet.",
          sender: 'ai',
          timestamp: new Date(),
          model: isOnline ? 'online' : 'offline'
        }])
      } else {
        setMessages(chatMessages.slice(0, 5))
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  useEffect(() => {
    loadChatHistory()
    
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Back online! AI assistant upgraded.', {
        icon: '📡',
      })
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      toast('Working in offline mode. Some features limited.', {
        icon: '📴',
      })
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text = input) => {
    if (!text.trim()) return
    
    const userMessage = {
      id: Date.now(),
      text: text,
      sender: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    
    try {
      const response = await api.askAI(text, { mode: aiMode })
      
      const aiMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'ai',
        timestamp: new Date(),
        model: isOnline ? 'online' : 'offline'
      }
      
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      toast.error('Failed to get AI response')
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion)
    // Auto-send after a delay
    setTimeout(() => handleSend(suggestion), 100)
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    // Check file type
    const allowedTypes = ['text/plain', 'application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.pdf')) {
      toast.error('Please upload text files, PDFs, or images')
      return
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File too large. Maximum size is 10MB')
      return
    }
    
    setLoading(true)
    
    try {
      // In a real app, you would process the file here
      // For now, simulate processing
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const message = {
        id: Date.now(),
        text: `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)}KB). I can now help you with this content.`,
        sender: 'ai',
        timestamp: new Date(),
        model: isOnline ? 'online' : 'offline'
      }
      
      setMessages(prev => [...prev, message])
      toast.success('File uploaded successfully!')
    } catch (error) {
      toast.error('Failed to process file')
    } finally {
      setLoading(false)
    }
  }

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser')
      return
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    
    recognition.start()
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      handleSend(transcript)
    }
    
    recognition.onerror = (event) => {
      toast.error('Voice recognition error')
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Learning Assistant</h1>
          <p className="text-gray-400 text-sm mt-1">
            Get help with studies, translations, and explanations
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <NetworkStatus />
          <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setAiMode('offline')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                aiMode === 'offline'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Offline
            </button>
            <button
              onClick={() => setAiMode('hybrid')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                aiMode === 'hybrid'
                  ? 'bg-ai-purple text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Hybrid
            </button>
            <button
              onClick={() => setAiMode('online')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                aiMode === 'online'
                  ? 'bg-fastline-blue text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Online
            </button>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        {/* Messages */}
        <div className="h-[500px] overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <AIMessage
              key={message.id}
              message={message}
              isOnline={isOnline}
            />
          ))}
          
          {loading && (
            <div className="flex items-center space-x-2 text-gray-400">
              <LoadingSpinner size="sm" />
              <span className="text-sm">
                {isOnline ? 'Thinking...' : 'Processing offline...'}
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        <div className="border-t border-gray-800 p-4">
          <AISuggestions
            suggestions={suggestions}
            onClick={handleSuggestionClick}
          />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything about your studies..."
                className="input-field pr-24"
                disabled={loading}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                <button
                  onClick={handleVoiceInput}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Voice input"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <label className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer" title="Upload file">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".txt,.pdf,.jpg,.jpeg,.png"
                  />
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </label>
              </div>
            </div>
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-ai-gradient text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          
          {/* Capabilities Info */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="text-center p-2 bg-gray-800/50 rounded">
              <div className="text-xs text-gray-400">Summarization</div>
              <div className={`text-xs font-medium ${isOnline ? 'text-online-green' : 'text-gray-500'}`}>
                {isOnline ? 'Advanced' : 'Basic'}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-800/50 rounded">
              <div className="text-xs text-gray-400">Translation</div>
              <div className={`text-xs font-medium ${isOnline ? 'text-online-green' : 'text-gray-500'}`}>
                {isOnline ? 'EN↔SW' : 'Offline'}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-800/50 rounded">
              <div className="text-xs text-gray-400">Quizzes</div>
              <div className={`text-xs font-medium ${isOnline ? 'text-online-green' : 'text-gray-500'}`}>
                {isOnline ? 'Yes' : 'Limited'}
              </div>
            </div>
            <div className="text-center p-2 bg-gray-800/50 rounded">
              <div className="text-xs text-gray-400">File Support</div>
              <div className={`text-xs font-medium ${isOnline ? 'text-online-green' : 'text-gray-500'}`}>
                {isOnline ? 'Full' : 'Basic'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => handleSend('Create a study schedule for me')}
          className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-fastline-blue transition-colors text-left"
        >
          <div className="text-fastline-blue font-semibold mb-1">Study Planner</div>
          <div className="text-sm text-gray-400">Get personalized study schedule</div>
        </button>
        <button
          onClick={() => handleSend('Generate quiz on current topics')}
          className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-ai-purple transition-colors text-left"
        >
          <div className="text-ai-purple font-semibold mb-1">Quiz Generator</div>
          <div className="text-sm text-gray-400">Practice with AI-generated quizzes</div>
        </button>
        <button
          onClick={() => handleSend('Explain a difficult concept')}
          className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-electric-teal transition-colors text-left"
        >
          <div className="text-electric-teal font-semibold mb-1">Concept Explainer</div>
          <div className="text-sm text-gray-400">Get simplified explanations</div>
        </button>
      </div>
    </div>
  )
}

export default AI
