import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Auth features will not work.')
}

// Browser client with anonymous key (client-side)
// This respects RLS policies
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)

// Types for database tables
export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_type: 'monthly' | 'lifetime'
  status: 'active' | 'cancelled' | 'expired'
  created_at: string
  expires_at: string | null
}

// Helper to check if subscription is active
export const isSubscriptionActive = (subscription: Subscription | null): boolean => {
  if (!subscription) return false
  if (subscription.status !== 'active') return false
  
  // Lifetime subscriptions never expire
  if (subscription.plan_type === 'lifetime') return true
  
  // Check if monthly subscription has expired
  if (subscription.expires_at) {
    return new Date(subscription.expires_at) > new Date()
  }
  
  return true
}
