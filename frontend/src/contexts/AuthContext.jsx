import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/api'
import { db } from '../offline/db'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Check localStorage first
      const storedUser = localStorage.getItem('jsl_user')
      const token = localStorage.getItem('jsl_token')

      if (storedUser && token) {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setIsAuthenticated(true)
      } else {
        // Check offline database
        const users = await db.users.toArray()
        if (users.length > 0) {
          setUser(users[0])
          setIsAuthenticated(true)
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (phone) => {
    try {
      const result = await api.login(phone)
      
      if (result.user) {
        setUser(result.user)
        setIsAuthenticated(true)
        
        if (result.token) {
          localStorage.setItem('jsl_token', result.token)
          localStorage.setItem('jsl_user', JSON.stringify(result.user))
        }
        
        return { success: true, message: result.message }
      }
      
      return { success: false, message: 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: error.message }
    }
  }

  const register = async (phone, username) => {
    try {
      const result = await api.register(phone, username)
      
      setUser(result.user)
      setIsAuthenticated(true)
      
      if (result.token) {
        localStorage.setItem('jsl_token', result.token)
        localStorage.setItem('jsl_user', JSON.stringify(result.user))
      }
      
      return { success: true, message: result.message }
    } catch (error) {
      console.error('Register error:', error)
      return { success: false, message: error.message }
    }
  }

  const logout = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('jsl_token')
      localStorage.removeItem('jsl_user')
      
      // Clear user state
      setUser(null)
      setIsAuthenticated(false)
      
      return { success: true }
    } catch (error) {
      console.error('Logout error:', error)
      return { success: false, message: error.message }
    }
  }

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }))
    
    // Update localStorage
    const storedUser = localStorage.getItem('jsl_user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      localStorage.setItem('jsl_user', JSON.stringify({ ...userData, ...updates }))
    }
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
