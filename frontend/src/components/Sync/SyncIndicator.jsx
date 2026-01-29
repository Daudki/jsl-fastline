import React from 'react'
import { useSync } from '../../contexts/SyncContext'

const SyncIndicator = () => {
  const { pendingCount, isSyncing, syncNow } = useSync()

  if (pendingCount === 0 && !isSyncing) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      {isSyncing ? (
        <span className="animate-pulse">Syncing...</span>
      ) : (
        <button
          type="button"
          onClick={syncNow}
          className="text-fastline-blue hover:underline focus:outline-none"
        >
          {pendingCount} pending
        </button>
      )}
    </div>
  )
}

export default SyncIndicator
