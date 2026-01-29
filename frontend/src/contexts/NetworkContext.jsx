import React, { createContext, useContext, useState, useEffect } from 'react'

const NetworkContext = createContext()

export const useNetwork = () => useContext(NetworkContext)

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionType, setConnectionType] = useState('unknown')
  const [effectiveType, setEffectiveType] = useState('unknown')
  const [downlink, setDownlink] = useState(0)
  const [rtt, setRtt] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Network Information API
    const updateNetworkInfo = () => {
      if (navigator.connection) {
        setConnectionType(navigator.connection.type)
        setEffectiveType(navigator.connection.effectiveType)
        setDownlink(navigator.connection.downlink)
        setRtt(navigator.connection.rtt)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateNetworkInfo)
      updateNetworkInfo()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  const getNetworkQuality = () => {
    if (!isOnline) return 'offline'
    
    if (effectiveType === '4g') return 'excellent'
    if (effectiveType === '3g') return 'good'
    if (effectiveType === '2g') return 'poor'
    if (effectiveType === 'slow-2g') return 'very-poor'
    
    return 'unknown'
  }

  const shouldUseDataSaver = () => {
    const quality = getNetworkQuality()
    return quality === 'poor' || quality === 'very-poor' || connectionType === 'cellular'
  }

  const value = {
    isOnline,
    connectionType,
    effectiveType,
    downlink,
    rtt,
    networkQuality: getNetworkQuality(),
    shouldUseDataSaver: shouldUseDataSaver()
  }

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  )
}
