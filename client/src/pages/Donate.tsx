import { Link } from 'react-router-dom'
import { ArrowLeft, Heart, Bitcoin, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import DonationForm from '../components/DonationForm'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Separator } from '../components/ui/separator'

// Placeholder crypto addresses - update these with real addresses
const CRYPTO_ADDRESSES = {
  bitcoin: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  ethereum: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
}

const CopyableAddress = ({ label, address, icon }: { label: string; address: string; icon: React.ReactNode }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-gray-400 truncate font-mono">{address}</p>
        </div>
      </div>
      <button
        onClick={handleCopy}
        className="p-2 hover:bg-white/10 rounded-md transition-colors flex-shrink-0"
        aria-label={`Copy ${label} address`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400" />
        )}
      </button>
    </div>
  )
}

// Ethereum icon (not in lucide-react)
const EthereumIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
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
            icon={<Bitcoin className="h-5 w-5" />}
          />
          <CopyableAddress
            label="Ethereum"
            address={CRYPTO_ADDRESSES.ethereum}
            icon={<EthereumIcon className="h-5 w-5" />}
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
