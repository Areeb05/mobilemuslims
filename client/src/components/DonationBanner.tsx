import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Alert, AlertDescription } from './ui/alert'

enum DonationFrequency {
  ONE_TIME = 'one-time',
  MONTHLY = 'monthly',
  ANNUAL = 'annual'
}

const AMOUNT_PRESETS = [2.75, 5, 10, 20, 30, 50, 100]
const FREQUENCY_LABELS = {
  [DonationFrequency.ONE_TIME]: 'One-time',
  [DonationFrequency.MONTHLY]: 'Monthly',
  [DonationFrequency.ANNUAL]: 'Annual'
}

interface DonationBannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function DonationBanner({ open, onOpenChange }: DonationBannerProps) {
  const [frequency, setFrequency] = useState<DonationFrequency>(DonationFrequency.ONE_TIME)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(5)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset selection when frequency changes (keep $5 as default)
  useEffect(() => {
    setSelectedAmount(5)
    setCustomAmount('')
  }, [frequency])

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/50 backdrop-blur-sm">
        <DialogHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg font-semibold">
              Support Accessible Prayer Education
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Help make Islamic prayer tools available to everyone worldwide
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Frequency Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-center">
              How often would you like to donate?
            </h3>
            <div className="flex justify-center gap-2">
              {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                <Button
                  key={key}
                  variant={frequency === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFrequency(key as DonationFrequency)}
                  className="flex-1"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Amount Selection */}
          <div className="space-y-4">
            <div className="text-center">
              <Badge variant="secondary" className="text-xs">
                Donation amount (USD)
              </Badge>
            </div>

            {/* Preset Amounts */}
            <div className="grid grid-cols-3 gap-2">
              {AMOUNT_PRESETS.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAmountSelect(amount)}
                  className="h-10"
                >
                  ${amount}
                </Button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="space-y-2">
              <Button
                variant={selectedAmount === null && customAmount ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAmount(null)}
                className="w-full"
              >
                Other
              </Button>

              {(selectedAmount === null || customAmount) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleDonate}
              disabled={!finalAmount || isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : `${frequency === DonationFrequency.ONE_TIME ? 'Donate' : 'Support'} Now`}
              {finalAmount && !isProcessing && (
                <span className="ml-1">
                  ${finalAmount}
                  {frequency !== DonationFrequency.ONE_TIME && '/mo'}
                </span>
              )}
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Your donation helps maintain and improve prayer accessibility features
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
