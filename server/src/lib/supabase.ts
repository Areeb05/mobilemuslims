import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

// Admin client with service role key (server-side only)
// This bypasses RLS and should only be used on the server
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
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

export interface Document {
  id: string
  title: string
  content: string
  embedding: number[] | null
  category: string | null
  video_id: string | null
  created_at: string
}

// Helper function to create a user and subscription
export const createUserWithSubscription = async (
  email: string,
  planType: 'monthly' | 'lifetime',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<{ userId: string; error: Error | null }> => {
  try {
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers.users.find(u => u.email === email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
      console.log(`User already exists: ${email}`)
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      })

      if (createError || !newUser.user) {
        throw createError || new Error('Failed to create user')
      }

      userId = newUser.user.id
      console.log(`Created new user: ${email}`)
    }

    // Upsert subscription (update if exists, insert if not)
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_type: planType,
        status: 'active',
        stripe_customer_id: stripeCustomerId || null,
        stripe_subscription_id: stripeSubscriptionId || null,
        expires_at: planType === 'lifetime' ? null : getExpiryDate(planType),
      }, {
        onConflict: 'user_id',
      })

    if (subError) {
      throw subError
    }

    console.log(`Subscription created/updated for user: ${email}`)

    return { userId, error: null }
  } catch (error) {
    console.error('Error creating user with subscription:', error)
    return { userId: '', error: error as Error }
  }
}

// Helper to calculate subscription expiry
const getExpiryDate = (planType: 'monthly' | 'lifetime'): string | null => {
  if (planType === 'lifetime') return null
  
  const now = new Date()
  now.setMonth(now.getMonth() + 1)
  return now.toISOString()
}

// Send magic link to user
export const sendMagicLink = async (email: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/painfreesalah/dashboard`,
      },
    })

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error('Error sending magic link:', error)
    return { error: error as Error }
  }
}

// Get user's subscription status
export const getUserSubscription = async (userId: string): Promise<Subscription | null> => {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data as Subscription
}
