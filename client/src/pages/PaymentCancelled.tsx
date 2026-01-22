import { useNavigate } from 'react-router-dom'
import { XCircle, ArrowLeft, Heart } from 'lucide-react'
import { Button } from '../components/ui/button'

export default function PaymentCancelled() {
  const navigate = useNavigate()

  const handleReturnHome = () => {
    navigate('/understandsalah')
  }

  const handleTryAgain = () => {
    // Navigate home and the donation banner will show
    navigate('/understandsalah')
  }

  return (
    <div className="min-h-screen bg-black text-white grid place-items-center p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-lg text-center space-y-8">
        {/* Cancelled Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gray-500/20 rounded-full blur-xl" />
            <XCircle className="relative h-20 w-20 md:h-24 md:w-24 text-gray-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Cancelled Message */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Payment Cancelled
          </h1>
          <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
            No worries — your payment was not processed
          </p>
        </div>

        {/* Reassurance Message */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-center gap-2 text-gray-300">
            <Heart className="h-5 w-5" />
            <span className="font-medium">Every bit helps</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            If you&apos;d like to support accessible prayer education in the future, 
            you can always donate from the main page. We appreciate your consideration!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
          <Button
            variant="outline"
            onClick={handleReturnHome}
            size="lg"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Return Home
          </Button>
          <Button
            onClick={handleTryAgain}
            size="lg"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  )
}
