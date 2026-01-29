import React, { useState } from 'react'

const SettingsModal = ({ onClose, user, onUserUpdate }) => {
  const [displayName, setDisplayName] = useState(user?.displayName ?? user?.username ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = {
        ...user,
        displayName: displayName.trim() || user?.username,
        bio: bio.trim()
      }
      onUserUpdate(updated)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <p className="text-sm text-gray-400 mt-1">Update your profile</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input-field min-h-[80px] resize-y"
              placeholder="A short bio..."
              rows={3}
            />
          </div>
        </div>
        <div className="p-6 flex gap-3 justify-end border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary px-4 py-2">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
