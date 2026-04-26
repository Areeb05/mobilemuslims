import { Router } from 'express'
import Stripe from 'stripe'
import { getPublicAppOrigin } from '../lib/public-url.js'

const router = Router()

// Initialize Stripe with secret key (only if available)
let stripe: Stripe | null = null
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not found - payment features disabled')
}

// Note: Using inline price_data instead of predefined products for simplicity
// Product IDs can be added later if needed for more complex Stripe integration

interface CreateCheckoutSessionRequest {
  amount: number
  frequency: 'one-time' | 'monthly' | 'annual'
  email?: string
}

router.post('/create-checkout-session', async (req, res) => {
  if (!stripe) {
    res.status(500).json({ error: 'Payment system not configured' })
    return
  }

  try {
    const { amount, frequency, email }: CreateCheckoutSessionRequest = req.body

    if (!amount || amount < 1) {
      res.status(400).json({ error: 'Invalid donation amount' })
      return
    }

    if (!['one-time', 'monthly', 'annual'].includes(frequency)) {
      res.status(400).json({ error: 'Invalid donation frequency' })
      return
    }

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100)

    let sessionConfig: Stripe.Checkout.SessionCreateParams

    if (frequency === 'one-time') {
      // One-time payment
      sessionConfig = {
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'One-time Donation',
              description: 'Support for accessible prayer education',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        }],
        success_url: `${getPublicAppOrigin()}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getPublicAppOrigin()}/cancel`,
        customer_email: email,
        metadata: {
          donation_type: 'one-time',
          amount: amount.toString(),
        },
      }
    } else {
      // Subscription (monthly or annual)
      const interval = frequency === 'monthly' ? 'month' : 'year'

      sessionConfig = {
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Donation`,
              description: `Monthly support for accessible prayer education`,
            },
            unit_amount: amountInCents,
            recurring: {
              interval: interval as 'month' | 'year',
            },
          },
          quantity: 1,
        }],
        success_url: `${getPublicAppOrigin()}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getPublicAppOrigin()}/cancel`,
        customer_email: email,
        metadata: {
          donation_type: 'subscription',
          frequency,
          amount: amount.toString(),
        },
        subscription_data: {
          metadata: {
            donation_frequency: frequency,
            donation_amount: amount.toString(),
          },
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    res.json({
      url: session.url,
      sessionId: session.id
    })

  } catch (error) {
    console.error('Error creating checkout session:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    })
  }
})

// Webhook endpoint for Stripe events (payment confirmations, etc.)
router.post('/webhook', async (req, res): Promise<void> => {
  if (!stripe) {
    res.status(500).json({ error: 'Payment system not configured' })
    return
  }

  const sig = req.headers['stripe-signature'] as string
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!endpointSecret) {
    res.status(500).json({ error: 'Webhook secret not configured' })
    return
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown webhook error'
    console.log(`Webhook signature verification failed.`, errorMessage)
    res.status(400).send(`Webhook Error: ${errorMessage}`)
    return
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session
      console.log('Payment successful:', session.id)

      // Here you could:
      // - Send confirmation emails
      // - Update donor database
      // - Trigger thank you messages
      // - Log analytics

      break

    case 'invoice.payment_succeeded':
      console.log('Subscription payment succeeded')
      // Handle successful subscription payments
      break

    case 'invoice.payment_failed':
      console.log('Subscription payment failed')
      // Handle failed subscription payments
      break

    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.json({ received: true })
})

export default router
