import { useState } from 'react'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'

export enum DonationFrequency {
  ONE_TIME = 'one-time',
  MONTHLY = 'monthly',
  ANNUAL = 'annual'
}

const AMOUNT_PRESETS = [5, 10, 20, 50]
const FREQUENCY_LABELS = {
  [DonationFrequency.ONE_TIME]: 'One-time',
  [DonationFrequency.MONTHLY]: 'Monthly',
  [DonationFrequency.ANNUAL]: 'Annual'
}

interface DonationFormProps {
  onCancel?: () => void
  showCancelButton?: boolean
  cancelLabel?: string
}

export default function DonationForm({ 
  onCancel, 
  showCancelButton = true,
  cancelLabel = 'Maybe Later'
}: DonationFormProps) {
  const [frequency, setFrequency] = useState<DonationFrequency>(DonationFrequency.ONE_TIME)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(5)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setSelectedAmount(null)
  }

  const getFinalAmount = (): number | null => {
    if (selectedAmount) return selectedAmount
    if (customAmount) {
      const parsed = parseFloat(customAmount)
      return isNaN(parsed) || parsed <= 0 ? null : parsed
    }
    return null
  }

  const handleDonate = async () => {
    const amount = getFinalAmount()
    if (!amount) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/donations/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          frequency,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('Donation error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const finalAmount = getFinalAmount()

  return (
    <div className="space-y-3">
      {/* Frequency Selection */}
      <div className="flex justify-center gap-1.5">
        {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
          <Button
            key={key}
            variant={frequency === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFrequency(key as DonationFrequency)}
            className="flex-1 h-8 text-xs"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Amount Selection - Compact Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {AMOUNT_PRESETS.map((amount) => (
          <Button
            key={amount}
            variant={selectedAmount === amount ? "default" : "outline"}
            size="sm"
            onClick={() => handleAmountSelect(amount)}
            className="h-9 text-sm"
          >
            ${amount}
          </Button>
        ))}
      </div>

      {/* Custom Amount - Inline */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Other:</span>
        <div className="flex items-center gap-1 flex-1">
          <span className="text-xs text-muted-foreground">$</span>
          <input
            type="number"
            min="1"
            placeholder="Amount"
            value={customAmount}
            onChange={(e) => handleCustomAmountChange(e.target.value)}
            onFocus={() => setSelectedAmount(null)}
            className="flex-1 px-2 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        {showCancelButton && onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            size="sm"
            className="flex-1 h-9"
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          onClick={handleDonate}
          disabled={!finalAmount || isProcessing}
          size="sm"
          className={showCancelButton ? "flex-1 h-9" : "w-full h-9"}
        >
          {isProcessing ? 'Processing...' : 'Donate'}
          {finalAmount && !isProcessing && (
            <span className="ml-1">${finalAmount}</span>
          )}
        </Button>
      </div>
    </div>
  )
}
