import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/api'
import { db } from '../offline/db'

const SyncContext = createContext()

export const useSync = () => useContext(SyncContext)

export const SyncProvider = ({ children }) => {
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [syncError, setSyncError] = useState(null)
  const [syncProgress, setSyncProgress] = useState({
    total: 0,
    completed: 0,
    percentage: 0
  })

  useEffect(() => {
    checkPendingSyncs()
    
    // Check every 30 seconds
    const interval = setInterval(checkPendingSyncs, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const checkPendingSyncs = async () => {
    try {
      const count = await db.syncQueue.count()
      setPendingCount(count)
    } catch (error) {
      console.error('Error checking pending syncs:', error)
    }
  }

  const syncNow = async () => {
    if (isSyncing) return
    
    setIsSyncing(true)
    setSyncError(null)
    
    try {
      // Get all pending syncs
      const pending = await db.getPendingSyncs()
      setSyncProgress({
        total: pending.length,
        completed: 0,
        percentage: 0
      })

      let syncedCount = 0
      let errorCount = 0

      // Process in batches
      const batchSize = 10
      for (let i = 0; i < pending.length; i += batchSize) {
        const batch = pending.slice(i, i + batchSize)
        
        for (const item of batch) {
          try {
            switch (item.entityType) {
              case 'posts':
                await api.createPost(item.data)
                break
              case 'groups':
                await api.createGroup(item.data)
                break
              case 'messages':
                // Handle message sync
                break
              case 'api_request':
                // Retry failed API requests
                break
            }
            
            await db.removeFromSyncQueue(item.id)
            syncedCount++
          } catch (error) {
            console.error('Sync item error:', error)
            errorCount++
            
            // Update retry count
            await db.syncQueue.update(item.id, {
              retries: (item.retries || 0) + 1
            })
          }
          
          setSyncProgress(prev => ({
            ...prev,
            completed: syncedCount + errorCount,
            percentage: Math.round(((syncedCount + errorCount) / pending.length) * 100)
          }))
        }
      }

      setLastSync(new Date())
      
      if (errorCount > 0) {
        setSyncError(`${errorCount} items failed to sync`)
      }
      
      // Refresh pending count
      await checkPendingSyncs()
      
      return {
        success: true,
        synced: syncedCount,
        errors: errorCount
      }
    } catch (error) {
      console.error('Sync error:', error)
      setSyncError(error.message)
      return {
        success: false,
        error: error.message
      }
    } finally {
      setIsSyncing(false)
      setSyncProgress({
        total: 0,
        completed: 0,
        percentage: 0
      })
    }
  }

  const autoSync = async () => {
    // Only auto-sync if online and has pending items
    if (navigator.onLine && pendingCount > 0) {
      return syncNow()
    }
  }

  const clearSyncQueue = async () => {
    try {
      await db.syncQueue.clear()
      setPendingCount(0)
      return { success: true }
    } catch (error) {
      console.error('Clear sync queue error:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    pendingCount,
    isSyncing,
    lastSync,
    syncError,
    syncProgress,
    syncNow,
    autoSync,
    clearSyncQueue,
    checkPendingSyncs
  }

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  )
}
