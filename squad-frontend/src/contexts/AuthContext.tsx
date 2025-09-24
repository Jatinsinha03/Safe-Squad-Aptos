'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { prisma } from '../../lib/prisma'

interface AuthContextType {
  user: any | null
  session: any | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (walletAddress: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(status === 'loading')
  }, [status])

  const signInWithGoogle = async () => {
    await signIn('google', { callbackUrl: '/' })
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' })
  }

  const updateProfile = async (walletAddress: string) => {
    if (!session?.user) return { error: 'No user logged in' }

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          email: session.user.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error }
      }

      return { error: null }
    } catch (error) {
      return { error: 'Network error' }
    }
  }

  const value = {
    user: session?.user || null,
    session,
    loading,
    signInWithGoogle,
    signOut: handleSignOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
