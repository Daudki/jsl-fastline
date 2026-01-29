import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/Common/LoadingSpinner'

const GroupDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (navigator.onLine) {
          const res = await api.getGroups()
          const found = (res.groups || []).find(g => (g._id ?? g.id) === id)
          if (!cancelled) setGroup(found ?? null)
        } else {
          const { db } = await import('../offline/db.js')
          const all = await db.groups.toArray()
          const found = all.find(g => (g.id ?? g.localId) === id)
          if (!cancelled) setGroup(found ?? null)
        }
      } catch (e) {
        if (!cancelled) toast.error('Failed to load group')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const handleJoin = async () => {
    try {
      await api.joinGroup(id)
      toast.success('Joined!')
      setGroup(prev => prev ? { ...prev, memberCount: (prev.memberCount || 0) + 1 } : null)
    } catch (e) {
      toast.error('Could not join group')
    }
  }

  if (loading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>
  if (!group) return <div className="p-6 text-center text-gray-400">Group not found. <button type="button" onClick={() => navigate('/groups')} className="text-fastline-blue">Back to groups</button></div>

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <button type="button" onClick={() => navigate('/groups')} className="text-gray-400 hover:text-white text-sm mb-6">← Back to groups</button>
      <div className="card">
        <h1 className="text-2xl font-bold text-white">{group.name}</h1>
        <p className="text-gray-400 mt-2">{group.description || 'No description'}</p>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
          <span>{group.memberCount ?? 0} members</span>
          <span>{group.type}</span>
          <span>{group.privacy}</span>
        </div>
        <button type="button" onClick={handleJoin} className="mt-6 btn-primary">Join group</button>
      </div>
    </div>
  )
}

export default GroupDetail
