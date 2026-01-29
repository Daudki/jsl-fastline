import React from 'react'
import { NavLink } from 'react-router-dom'
import { useNetwork } from '../../contexts/NetworkContext'
import { useAuth } from '../../contexts/AuthContext'

const Navigation = () => {
  const { isOnline } = useNetwork()
  const { isAuthenticated } = useAuth()

  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/groups', icon: '👥', label: 'Groups' },
    { path: '/highlights', icon: '⭐', label: 'Highlights' },
    { path: '/ai', icon: '🤖', label: 'AI' },
    ...(isAuthenticated ? [{ path: '/profile', icon: '👤', label: 'Profile' }] : [{ path: '/login', icon: '🔐', label: 'Login' }])
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:left-0 md:top-0 md:bottom-0 md:w-16 bg-gray-900 border-t md:border-t-0 md:border-r border-gray-800 z-50">
      <div className="flex md:flex-col items-center justify-around h-16 md:h-full">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex flex-col md:flex-row items-center justify-center w-full h-full md:h-16 transition-colors ${
                isActive 
                  ? 'text-fastline-blue bg-gray-800' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`
            }
          >
            <span className="text-2xl md:text-xl mb-1 md:mb-0">{item.icon}</span>
            <span className="text-xs md:hidden">{item.label}</span>
          </NavLink>
        ))}
        
        {/* Network Status Indicator */}
        <div className="hidden md:flex items-center justify-center mt-auto mb-4">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-online-green' : 'bg-offline-red'}`} />
        </div>
      </div>
    </nav>
  )
}

export default Navigation
