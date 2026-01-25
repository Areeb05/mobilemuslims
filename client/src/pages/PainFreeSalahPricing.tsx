import { useState } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Shield, Star, Zap, Clock, Users } from 'lucide-react'

interface LocationState {
  positions?: string[]
  bodyParts?: string[]
}

const POSITION_LABELS: Record<string, string> = {
  standing: 'Standing (Qiyam)',
  bowing: 'Bowing (Ruku)',
  prostration: 'Prostration (Sujood)',
  sitting: 'Sitting (Juloos)',
}

const BODY_PART_LABELS: Record<string, string> = {
  toes: 'toes',
  feet: 'feet',
  shins: 'shins',
  knees: 'knees',
  hips: 'hips',
  lowerBack: 'lower back',
  midBack: 'mid back',
  upperBack: 'upper back',
  shoulders: 'shoulders',
  elbows: 'elbows',
  hands: 'hands',
  fingers: 'fingers',
  neck: 'neck',
  jaw: 'jaw',
}

const API_URL = import.meta.env.VITE_API_URL || ''

export default function PainFreeSalahPricing() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as LocationState | null
  const [loading, setLoading] = useState<'monthly' | 'lifetime' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // If no survey data, redirect back to survey
  if (!state?.positions || !state?.bodyParts) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <p className="text-gray-400 mb-4">Please complete the survey first.</p>
        <Link
          to="/painfreesalah"
          className="text-emerald-500 hover:underline"
        >
          Start Survey
        </Link>
      </div>
    )
  }

  const { positions, bodyParts } = state

  // Generate personalized headline
  const generateHeadline = () => {
    const positionNames = positions.slice(0, 2).map(p => POSITION_LABELS[p] || p)
    const bodyPartNames = bodyParts.slice(0, 3).map(p => BODY_PART_LABELS[p] || p)
    
    if (bodyPartNames.length > 0 && positionNames.length > 0) {
      return `Relief for your ${bodyPartNames.join(' and ')} pain during ${positionNames[0]}`
    }
    return 'Your personalized path to pain-free prayer'
  }

  const handleCheckout = async (plan: 'monthly' | 'lifetime') => {
    setLoading(plan)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/painfreesalah/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          surveyData: { positions, bodyParts },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="p-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Back</span>
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-12">
        {/* Personalized Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-[#D4D0C8] via-white to-[#E8E4E1] bg-clip-text text-transparent">
            {generateHeadline()}
          </h1>
          <p className="text-gray-400">
            Join thousands of Muslims who've reclaimed their prayer
          </p>
        </div>

        {/* Pain Summary */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8">
          <p className="text-sm text-gray-400 mb-2">Your pain points:</p>
          <div className="flex flex-wrap gap-2">
            {bodyParts.map(part => (
              <span
                key={part}
                className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm"
              >
                {BODY_PART_LABELS[part] || part}
              </span>
            ))}
          </div>
        </div>

        {/* Social Proof */}
        <div className="flex items-center justify-center gap-6 mb-8 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>2,500+ users</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>4.9/5 rating</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="space-y-4 mb-8">
          {/* Lifetime - Best Value */}
          <div className="relative bg-gradient-to-br from-emerald-600/20 to-emerald-600/5 border-2 border-emerald-500 rounded-2xl p-6">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                BEST VALUE
              </span>
            </div>
            
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Lifetime Access</h3>
                <p className="text-gray-400 text-sm">One-time payment, forever yours</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">$100</p>
                <p className="text-xs text-gray-400 line-through">$200</p>
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>All exercises & video tutorials</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Lifetime updates & new content</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Personalized program for your pain points</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Priority support</span>
              </li>
            </ul>

            <button
              onClick={() => handleCheckout('lifetime')}
              disabled={loading !== null}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading === 'lifetime' ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Get Lifetime Access
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              Save $100+ compared to monthly (30 months)
            </p>
          </div>

          {/* Monthly */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Monthly Plan</h3>
                <p className="text-gray-400 text-sm">Cancel anytime</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">$3.33</p>
                <p className="text-xs text-gray-400">/month</p>
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>All exercises & video tutorials</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>Monthly updates</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span>Personalized program</span>
              </li>
            </ul>

            <button
              onClick={() => handleCheckout('monthly')}
              disabled={loading !== null}
              className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'monthly' ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                'Start Monthly Plan'
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              Less than a cup of coffee
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Shield className="h-4 w-4" />
            <span>30-day money-back guarantee</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Clock className="h-4 w-4" />
            <span>Instant access</span>
          </div>
        </div>

        {/* Testimonials */}
        <div className="space-y-4 mb-8">
          <h3 className="text-center text-sm text-gray-400 uppercase tracking-wider">
            What others are saying
          </h3>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            <p className="text-sm text-gray-300 italic mb-2">
              "After years of knee pain during sujood, I can finally prostrate comfortably. 
              This program changed my relationship with Salah."
            </p>
            <p className="text-xs text-gray-500">— Ahmed K.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              ))}
            </div>
            <p className="text-sm text-gray-300 italic mb-2">
              "My back pain is almost completely gone. The exercises are easy to follow 
              and only take 10 minutes a day."
            </p>
            <p className="text-xs text-gray-500">— Fatima S.</p>
          </div>
        </div>

        {/* FAQ */}
        <div className="text-center text-sm text-gray-400">
          <p>Questions? Contact us at <a href="mailto:support@mobilemuslims.com" className="text-emerald-500 hover:underline">support@mobilemuslims.com</a></p>
        </div>
      </div>
    </div>
  )
}
