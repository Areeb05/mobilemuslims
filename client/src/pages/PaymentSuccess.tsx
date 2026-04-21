import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Heart, ArrowLeft, LogIn } from 'lucide-react'
import { Button } from '../components/ui/button'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [showConfetti, setShowConfetti] = useState(true)

  const sessionId = searchParams.get('session_id')
  const isPainFreeSalah = searchParams.get('product') === 'painfreesalah'

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const shell = (children: ReactNode) => (
    <div className="min-h-screen bg-black text-white grid place-items-center p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-500/30 rounded-full animate-ping" />
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-green-400/30 rounded-full animate-ping delay-100" />
          <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-green-300/30 rounded-full animate-ping delay-200" />
        </div>
      )}
      <div className="w-full max-w-lg text-center space-y-8">{children}</div>
    </div>
  )

  if (isPainFreeSalah) {
    return shell(
      <>
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <CheckCircle className="relative h-20 w-20 md:h-24 md:w-24 text-emerald-500" strokeWidth={1.5} />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-[#D4D0C8] via-white to-[#E8E4E1] bg-clip-text text-transparent">
            You&apos;re in
          </h1>
          <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
            Your Pain Free Salah purchase is confirmed. Your account is ready—sign in with the{' '}
            <span className="text-white font-medium">same email you used at checkout</span> to access
            the program.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3 text-left">
          <p className="text-sm text-gray-400 leading-relaxed">
            We&apos;ll send a magic link to your inbox. After you open it, you&apos;ll land on your
            dashboard with videos and the AI trainer.
          </p>
        </div>

        {sessionId && (
          <div className="text-xs text-gray-500">
            <p>Order reference: {sessionId.slice(0, 20)}...</p>
            <p className="mt-1">Stripe has emailed your receipt</p>
          </div>
        )}

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button
            onClick={() => navigate('/painfreesalah/login')}
            size="lg"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <LogIn className="h-4 w-4" />
            Sign in to Pain Free Salah
          </Button>
          <Link
            to="/painfreesalah"
            className="text-sm text-gray-400 hover:text-white transition-colors underline underline-offset-4"
          >
            Back to program overview
          </Link>
        </div>
      </>,
    )
  }

  return shell(
    <>
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
          <CheckCircle className="relative h-20 w-20 md:h-24 md:w-24 text-green-500" strokeWidth={1.5} />
        </div>
      </div>

      <div className="space-y-4">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
          Thank You!
        </h1>
        <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
          Your generous donation has been received successfully
        </p>
      </div>

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

      {sessionId && (
        <div className="text-xs text-gray-500">
          <p>Confirmation ID: {sessionId.slice(0, 20)}...</p>
          <p className="mt-1">A receipt has been sent to your email</p>
        </div>
      )}

      <div className="pt-4">
        <Button onClick={() => navigate('/understandsalah')} size="lg" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Return to Understand Salah
        </Button>
      </div>
    </>,
  )
}
