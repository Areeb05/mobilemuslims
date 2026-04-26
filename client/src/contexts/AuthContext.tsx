import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Subscription, isSubscriptionActive } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  subscription: Subscription | null
  loading: boolean
  isAuthenticated: boolean
  hasActiveSubscription: boolean
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshSubscription: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user's subscription from Supabase
  const fetchSubscription = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching subscription:', error)
        setSubscription(null)
        return
      }

      setSubscription(data as Subscription)
    } catch (err) {
      console.error('Error fetching subscription:', err)
      setSubscription(null)
    }
  }

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        fetchSubscription(session.user.id)
      }
      
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchSubscription(session.user.id)
        } else {
          setSubscription(null)
        }

        setLoading(false)
      }
    )

    return () => {
      authSubscription.unsubscribe()
    }
  }, [])

  // Sign in with magic link
  const signInWithMagicLink = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const origin = (
        (typeof window !== 'undefined' && window.__PUBLIC_APP_ORIGIN__) ||
        window.location.origin
      ).replace(/\/$/, '')
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/painfreesalah/dashboard`,
        },
      })

      if (error) {
        return { error }
      }

      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setSubscription(null)
  }

  // Refresh subscription data
  const refreshSubscription = async () => {
    if (user) {
      await fetchSubscription(user.id)
    }
  }

  const value: AuthContextType = {
    user,
    session,
    subscription,
    loading,
    isAuthenticated: !!user,
    hasActiveSubscription: isSubscriptionActive(subscription),
    signInWithMagicLink,
    signOut,
    refreshSubscription,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
