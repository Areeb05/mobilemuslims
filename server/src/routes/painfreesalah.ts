import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { createUserWithSubscription } from '../lib/supabase.js'
import { getPublicAppOrigin } from '../lib/public-url.js'

const router = Router()

// Initialize Stripe with secret key (only if available)
let stripe: Stripe | null = null
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not found - PainFreeSalah payments disabled')
}

// Pricing configuration
const PRICING = {
  monthly: {
    amount: 333, // $3.33 in cents
    name: 'Pain Free Salah - Monthly',
    description: 'Monthly subscription to Pain Free Salah program',
    interval: 'month' as const,
  },
  lifetime: {
    amount: 10000, // $100 in cents
    name: 'Pain Free Salah - Lifetime',
    description: 'Lifetime access to Pain Free Salah program',
  },
}

interface CreateCheckoutRequest {
  plan: 'monthly' | 'lifetime'
  surveyData?: {
    positions?: string[]
    bodyParts?: string[]
  }
  email?: string
}

router.post('/create-checkout', async (req, res) => {
  try {
    const { plan, surveyData, email }: CreateCheckoutRequest = req.body

    if (!plan || !['monthly', 'lifetime'].includes(plan)) {
      res.status(400).json({ error: 'Invalid plan type' })
      return
    }

    const frontendUrl = getPublicAppOrigin()
    
    // Store survey data in metadata for later use
    const metadata: Record<string, string> = {
      product: 'pain_free_salah',
      plan,
    }

    if (surveyData?.positions) {
      metadata.positions = surveyData.positions.join(',')
    }
    if (surveyData?.bodyParts) {
      metadata.bodyParts = surveyData.bodyParts.join(',')
    }

    let sessionConfig: Stripe.Checkout.SessionCreateParams

    if (plan === 'lifetime') {
      // One-time payment for lifetime access
      sessionConfig = {
        mode: 'payment',
        allow_promotion_codes: true,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: PRICING.lifetime.name,
              description: PRICING.lifetime.description,
            },
            unit_amount: PRICING.lifetime.amount,
          },
          quantity: 1,
        }],
        success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}&product=painfreesalah`,
        cancel_url: `${frontendUrl}/painfreesalah/pricing`,
        customer_email: email,
        metadata,
        payment_intent_data: {
          metadata,
        },
      }
    } else {
      // Monthly subscription
      sessionConfig = {
        mode: 'subscription',
        allow_promotion_codes: true,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: PRICING.monthly.name,
              description: PRICING.monthly.description,
            },
            unit_amount: PRICING.monthly.amount,
            recurring: {
              interval: PRICING.monthly.interval,
            },
          },
          quantity: 1,
        }],
        success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}&product=painfreesalah`,
        cancel_url: `${frontendUrl}/painfreesalah/pricing`,
        customer_email: email,
        metadata,
        subscription_data: {
          metadata,
        },
      }
    }

    if (!stripe) {
      return res.status(500).json({ error: 'Payment system not configured' })
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    res.json({
      url: session.url,
      sessionId: session.id,
    })

  } catch (error) {
    console.error('Error creating Pain Free Salah checkout session:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
    })
  }
})

// Webhook handler for Stripe events
// Note: This endpoint expects raw body for signature verification
// The raw body middleware is set up in index.ts
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_PFS_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured')
    res.status(500).json({ error: 'Webhook secret not configured' })
    return
  }

  if (!stripe) {
    console.error('Stripe not configured for webhook processing')
    res.status(500).json({ error: 'Payment system not configured' })
    return
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown webhook error'
    console.error('Webhook signature verification failed:', errorMessage)
    res.status(400).send(`Webhook Error: ${errorMessage}`)
    return
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      
      // Only process PFS purchases
      if (session.metadata?.product !== 'pain_free_salah') {
        console.log('Ignoring non-PFS checkout session')
        break
      }

      const customerEmail = session.customer_email || session.customer_details?.email
      const planType = session.metadata?.plan as 'monthly' | 'lifetime'
      const stripeCustomerId = session.customer as string
      const stripeSubscriptionId = session.subscription as string | undefined

      if (!customerEmail) {
        console.error('No customer email found in checkout session')
        break
      }

      if (!planType) {
        console.error('No plan type found in checkout session metadata')
        break
      }

      console.log(`Processing PFS purchase: ${customerEmail} - ${planType}`)

      // Create user and subscription in Supabase
      const { userId, error } = await createUserWithSubscription(
        customerEmail,
        planType,
        stripeCustomerId,
        stripeSubscriptionId
      )

      if (error) {
        console.error('Failed to create user/subscription:', error)
        // Don't fail the webhook - Stripe will retry
        // Log for manual intervention if needed
      } else {
        console.log(`Successfully created user ${userId} with ${planType} subscription`)
        
        // Note: Supabase will automatically send a confirmation email
        // with a magic link when the user tries to sign in
      }

      break
    }

    case 'customer.subscription.deleted': {
      // Handle subscription cancellation
      const subscription = event.data.object as Stripe.Subscription
      console.log('Subscription cancelled:', subscription.id)
      // TODO: Update subscription status in Supabase
      break
    }

    case 'invoice.payment_failed': {
      // Handle failed payment
      const invoice = event.data.object as Stripe.Invoice
      console.log('Payment failed for invoice:', invoice.id)
      // TODO: Update subscription status or notify user
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  res.json({ received: true })
})

// Send magic link to user (for login)
router.post('/send-magic-link', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body

    if (!email) {
      res.status(400).json({ error: 'Email is required' })
      return
    }

    // Import supabaseAdmin dynamically to avoid initialization issues
    const { supabaseAdmin } = await import('../lib/supabase.js')

    if (!supabaseAdmin) {
      throw new Error('Database not configured')
    }

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${getPublicAppOrigin()}/painfreesalah/dashboard`,
      },
    })

    if (error) {
      // Check if user doesn't exist
      if (error.message.includes('User not found')) {
        res.status(404).json({ error: 'No account found with this email. Please purchase a subscription first.' })
        return
      }
      throw error
    }

    res.json({ message: 'Magic link sent! Check your email.' })
  } catch (error) {
    console.error('Error sending magic link:', error)
    res.status(500).json({ error: 'Failed to send magic link' })
  }
})

export default router
