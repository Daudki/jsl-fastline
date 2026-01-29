import React from 'react'
import { useNetwork } from '../../contexts/NetworkContext'
import { useSync } from '../../contexts/SyncContext'

const Layout = ({ children }) => {
  const { isOnline, networkQuality } = useNetwork()
  const { pendingCount } = useSync()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Network Status Banner */}
      {!isOnline && (
        <div className="bg-offline-red/20 text-offline-red px-4 py-2 text-center text-sm">
          ⚠️ You are offline. Some features may be limited.
        </div>
      )}

      {isOnline && networkQuality === 'poor' && (
        <div className="bg-energy-orange/20 text-energy-orange px-4 py-2 text-center text-sm">
          📶 Poor connection detected. Using data saver mode.
        </div>
      )}

      {/* Sync Status Banner */}
      {pendingCount > 0 && isOnline && (
        <div className="bg-fastline-blue/20 text-fastline-blue px-4 py-2 text-center text-sm">
          ⚡ {pendingCount} items waiting to sync
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

export default Layout
