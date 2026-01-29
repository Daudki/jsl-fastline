import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/Common/LoadingSpinner'

const Login = () => {
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!phone.trim()) {
      toast.error('Phone number is required')
      return
    }
    if (isRegister && !username.trim()) {
      toast.error('Username is required')
      return
    }
    setLoading(true)
    try {
      if (isRegister) {
        const result = await register(phone.trim(), username.trim())
        if (result.success) {
          toast.success(result.message || 'Account created!')
          navigate('/')
        } else {
          toast.error(result.message || 'Registration failed')
        }
      } else {
        const result = await login(phone.trim())
        if (result.success) {
          toast.success(result.message || 'Logged in!')
          navigate('/')
        } else {
          toast.error(result.message || 'Login failed')
        }
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-gradient">
      <div className="w-full max-w-md">
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">JSL FastLine</h1>
            <p className="text-gray-400 text-sm">Offline-first learning platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your name"
                  className="input-field"
                  autoComplete="username"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+255 700 000 000"
                className="input-field"
                autoComplete="tel"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <LoadingSpinner size="sm" color="white" /> : null}
              {isRegister ? 'Create account' : 'Continue'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-fastline-blue hover:underline"
            >
              {isRegister ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </div>
        <p className="mt-4 text-center text-gray-500 text-xs">
          <Link to="/" className="hover:text-gray-400">Back to home</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
