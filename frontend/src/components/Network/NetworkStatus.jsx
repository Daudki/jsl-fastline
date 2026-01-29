import React from 'react'
import { useNetwork } from '../../contexts/NetworkContext'

const NetworkStatus = () => {
  const { isOnline, networkQuality } = useNetwork()

  if (isOnline && networkQuality !== 'poor' && networkQuality !== 'very-poor') {
    return null
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
      title={isOnline ? `Connection: ${networkQuality}` : 'You are offline'}
    >
      {!isOnline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400">Offline</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-amber-400">Poor connection</span>
        </>
      )}
    </div>
  )
}

export default NetworkStatus
