import { Link } from 'react-router-dom'
import { ArrowLeft, Heart, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import DonationForm from '../components/DonationForm'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Separator } from '../components/ui/separator'

// Placeholder crypto addresses - update these with real addresses
const CRYPTO_ADDRESSES = {
  bitcoin: 'bc1qflke5gpyzn0qyvc8uzks6wkk8k7878fwnqr866',
  ethereum: '0xaCB0d42Aa2cf3b67B142d22E9Cb23FA380A851aE',
  solana: 'J9dLwde9zpNhJSFkLwi1i5cbhNGgg8dTEM5rQnCScgZ7',
}

const CopyableAddress = ({ label, address, icon }: { label: string; address: string; icon: React.ReactNode }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors cursor-pointer text-left"
      aria-label={`Copy ${label} address`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div>{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-gray-400 truncate font-mono">{address}</p>
        </div>
      </div>
      <div className="p-2 flex-shrink-0">
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </button>
  )
}

// Bitcoin icon with brand color
const BitcoinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#F7931A">
    <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.52 2.1c-.347-.087-.7-.17-1.05-.254l.53-2.12-1.32-.33-.54 2.15c-.286-.067-.567-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.238c.535.136.63.486.615.766l-1.477 5.92c-.075.18-.24.45-.614.35.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.15 1.32.33.545-2.19c2.24.427 3.93.254 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.52 2.75 2.084v.006z" />
  </svg>
)

// Ethereum icon with brand color
const EthereumIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#627EEA">
    <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
  </svg>
)

// Solana icon with brand gradient
const SolanaIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <defs>
      <linearGradient id="solanaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9945FF" />
        <stop offset="100%" stopColor="#14F195" />
      </linearGradient>
    </defs>
    <path fill="url(#solanaGradient)" d="M4.52 16.51a.76.76 0 01.54-.22h16.16a.38.38 0 01.27.65l-3.07 3.07a.76.76 0 01-.54.22H1.72a.38.38 0 01-.27-.65l3.07-3.07zm0-9.02a.78.78 0 01.54-.22h16.16a.38.38 0 01.27.65l-3.07 3.07a.76.76 0 01-.54.22H1.72a.38.38 0 01-.27-.65l3.07-3.07zm16.96 4.51a.76.76 0 00-.54-.22H4.78a.38.38 0 00-.27.65l3.07 3.07c.14.14.34.22.54.22h16.16a.38.38 0 00.27-.65l-3.07-3.07z" />
  </svg>
)

export default function Donate() {
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Support Mobile Muslims</h1>
          </div>
          <p className="text-gray-400">
            Help us keep our Islamic tools free and accessible for everyone
          </p>
        </div>

        {/* Stripe Donation Card */}
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Donate with Card</CardTitle>
          </CardHeader>
          <CardContent>
            <DonationForm showCancelButton={false} />
          </CardContent>
        </Card>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <Separator className="flex-1 bg-white/10" />
          <span className="text-gray-500 text-sm">or donate with crypto</span>
          <Separator className="flex-1 bg-white/10" />
        </div>

        {/* Crypto Addresses */}
        <div className="space-y-3 mb-8">
          <CopyableAddress
            label="Bitcoin"
            address={CRYPTO_ADDRESSES.bitcoin}
            icon={<BitcoinIcon className="h-5 w-5" />}
          />
          <CopyableAddress
            label="Ethereum"
            address={CRYPTO_ADDRESSES.ethereum}
            icon={<EthereumIcon className="h-5 w-5" />}
          />
          <CopyableAddress
            label="Solana"
            address={CRYPTO_ADDRESSES.solana}
            icon={<SolanaIcon className="h-5 w-5" />}
          />
        </div>

        {/* Footer Note */}
        <p className="text-center text-gray-500 text-xs">
          Your support helps maintain and improve prayer accessibility features for Muslims worldwide.
        </p>
      </div>
    </div>
  )
}
