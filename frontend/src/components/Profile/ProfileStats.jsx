import React from 'react'

const ProfileStats = ({ user, storageInfo }) => {
  const stats = [
    { label: 'Posts', value: user?.postCount ?? 0, icon: '📝' },
    { label: 'Groups', value: user?.groupCount ?? 0, icon: '👥' },
    { label: 'Helped', value: user?.helpedCount ?? 0, icon: '🤝' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-2xl">
            {stat.icon}
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </div>
        </div>
      ))}
      {storageInfo && (
        <div className="sm:col-span-3 bg-gray-800/50 rounded-xl border border-gray-700 p-4">
          <div className="text-sm font-medium text-gray-400 mb-2">Local storage</div>
          <div className="text-gray-300">
            {storageInfo.estimatedSize} • {storageInfo.posts} posts, {storageInfo.groups} groups
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileStats
