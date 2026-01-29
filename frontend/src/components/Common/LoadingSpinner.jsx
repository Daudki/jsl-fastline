import React from 'react'

const LoadingSpinner = ({ size = 'md', color = 'fastline-blue' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const colorClasses = {
    'fastline-blue': 'border-fastline-blue',
    'electric-teal': 'border-electric-teal',
    'ai-purple': 'border-ai-purple',
    'energy-orange': 'border-energy-orange',
    'white': 'border-white'
  }

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent rounded-full animate-spin`} />
    </div>
  )
}

export default LoadingSpinner
