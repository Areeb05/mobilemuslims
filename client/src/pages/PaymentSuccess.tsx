import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Heart, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [showConfetti, setShowConfetti] = useState(true)
  
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Hide confetti effect after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleReturnHome = () => {
    navigate('/understandsalah')
  }

  return (
    <div className="min-h-screen bg-black text-white grid place-items-center p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* Subtle animated background */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-500/30 rounded-full animate-ping" />
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-green-400/30 rounded-full animate-ping delay-100" />
          <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-green-300/30 rounded-full animate-ping delay-200" />
        </div>
      )}

      <div className="w-full max-w-lg text-center space-y-8">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
            <CheckCircle className="relative h-20 w-20 md:h-24 md:w-24 text-green-500" strokeWidth={1.5} />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Thank You!
          </h1>
          <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
            Your generous donation has been received successfully
          </p>
        </div>

        {/* Appreciation Message */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <Heart className="h-5 w-5" />
            <span className="font-medium">Your support matters</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Your contribution helps make Islamic prayer tools accessible to Muslims around the world. 
            Together, we&apos;re making prayer education more inclusive.
          </p>
        </div>

        {/* Confirmation Details */}
        {sessionId && (
          <div className="text-xs text-gray-500">
            <p>Confirmation ID: {sessionId.slice(0, 20)}...</p>
            <p className="mt-1">A receipt has been sent to your email</p>
          </div>
        )}

        {/* Return Button */}
        <div className="pt-4">
          <Button
            onClick={handleReturnHome}
            size="lg"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Understand Salah
          </Button>
        </div>
      </div>
    </div>
  )
}
