import React, { useState } from 'react'
import { api } from '../../api/api'
import toast from 'react-hot-toast'

const CreatePost = ({ onPostCreated }) => {
  const [content, setContent] = useState('')
  const [media, setMedia] = useState([])
  const [type, setType] = useState('post')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() && media.length === 0) {
      toast.error('Please add content or media')
      return
    }

    setIsSubmitting(true)

    try {
      const postData = {
        content: content.trim(),
        media,
        type,
        tags: extractTags(content)
      }

      const newPost = await api.createPost(postData)
      
      setContent('')
      setMedia([])
      setType('post')
      
      if (onPostCreated) {
        onPostCreated(newPost)
      }
      
      toast.success('Post created successfully!')
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const extractTags = (text) => {
    const hashtags = text.match(/#(\w+)/g) || []
    return hashtags.map(tag => tag.substring(1).toLowerCase()).slice(0, 5)
  }

  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files)
    
    // Limit to 4 files
    if (media.length + files.length > 4) {
      toast.error('Maximum 4 files allowed')
      return
    }

    for (const file of files) {
      try {
        // In a real app, upload to server
        // For now, create object URL for preview
        const url = URL.createObjectURL(file)
        
        const mediaItem = {
          type: file.type.startsWith('image/') ? 'image' : 
                file.type.startsWith('video/') ? 'video' : 
                file.type.startsWith('audio/') ? 'audio' : 'document',
          url,
          file, // Store file object for later upload
          name: file.name,
          size: file.size
        }

        setMedia(prev => [...prev, mediaItem])
      } catch (error) {
        console.error('Error processing file:', error)
        toast.error(`Failed to add ${file.name}`)
      }
    }
  }

  const removeMedia = (index) => {
    setMedia(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="card mb-6">
      <form onSubmit={handleSubmit}>
        {/* Post Type Selector */}
        <div className="flex space-x-2 mb-4">
          <button
            type="button"
            onClick={() => setType('post')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              type === 'post' 
                ? 'bg-fastline-blue text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Post
          </button>
          <button
            type="button"
            onClick={() => setType('question')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              type === 'question' 
                ? 'bg-ai-purple text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Question
          </button>
          <button
            type="button"
            onClick={() => setType('note')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              type === 'note' 
                ? 'bg-electric-teal text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Note
          </button>
        </div>

        {/* Content Input */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            type === 'question' ? 'Ask a question to the community...' :
            type === 'note' ? 'Share study notes or resources...' :
            'Share your thoughts with the community...'
          }
          className="input-field min-h-[120px] resize-none"
          maxLength={5000}
        />

        {/* Character Counter */}
        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
          <span>{content.length}/5000 characters</span>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-fastline-blue hover:underline"
          >
            {showAdvanced ? 'Hide' : 'Advanced'} options
          </button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Category
                </label>
                <select className="input-field py-2">
                  <option value="general">General</option>
                  <option value="academic">Academic</option>
                  <option value="technical">Technical</option>
                  <option value="language">Language</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Visibility
                </label>
                <select className="input-field py-2">
                  <option value="public">Public</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Media Preview */}
        {media.length > 0 && (
          <div className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {media.map((item, index) => (
                <div key={index} className="relative group">
                  {item.type === 'image' && (
                    <img 
                      src={item.url} 
                      alt={item.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                  {item.type === 'video' && (
                    <div className="w-full h-32 bg-gray-800 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400">🎥 {item.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer p-2 text-gray-400 hover:text-white transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                onChange={handleMediaUpload}
                className="hidden"
              />
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </label>

            <button type="button" className="p-2 text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <button type="button" className="p-2 text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && media.length === 0)}
            className="btn-primary flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <span>Post</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreatePost
