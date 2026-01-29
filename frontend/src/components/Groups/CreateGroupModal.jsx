import React, { useState } from 'react'

const CreateGroupModal = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('study')
  const [privacy, setPrivacy] = useState('public')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), type, privacy })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Create group</h2>
          <p className="text-sm text-gray-400 mt-1">Start a study group or community</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Group name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[80px] resize-y"
              placeholder="What is this group about?"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input-field"
            >
              <option value="study">Study</option>
              <option value="class">Class</option>
              <option value="school">School</option>
              <option value="community">Community</option>
              <option value="project">Project</option>
              <option value="topic">Topic</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Privacy</label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="input-field"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 btn-primary">
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateGroupModal
