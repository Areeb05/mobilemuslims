import { Router } from 'express'
import Stripe from 'stripe'

const router = Router()

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Construct frontend URL from environment variables
const getFrontendUrl = (): string => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  }
  return 'http://localhost:3000'
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

router.post('/create-checkout', async (req, res): Promise<void> => {
  try {
    const { plan, surveyData, email }: CreateCheckoutRequest = req.body

    if (!plan || !['monthly', 'lifetime'].includes(plan)) {
      res.status(400).json({ error: 'Invalid plan type' })
      return
    }

    const frontendUrl = getFrontendUrl()
    
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

export default router
