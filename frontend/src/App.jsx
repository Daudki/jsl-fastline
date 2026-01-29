import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NetworkProvider } from './contexts/NetworkContext'
import { SyncProvider } from './contexts/SyncContext'
import Layout from './components/Layout/Layout'
import Navigation from './components/Navigation/Navigation'
import Home from './pages/Home'
import Groups from './pages/Groups'
import Highlights from './pages/Highlights'
import AI from './pages/AI'
import Profile from './pages/Profile'
import Login from './pages/Login'
import GroupDetail from './pages/GroupDetail'
import './App.css'

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Navigation />
      <div className="flex-1 md:ml-16 pb-16 md:pb-0">
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:id" element={<GroupDetail />} />
            <Route path="/highlights" element={<Highlights />} />
            <Route path="/ai" element={<AI />} />
            <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NetworkProvider>
          <SyncProvider>
            <AppRoutes />
            <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
          </SyncProvider>
        </NetworkProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
