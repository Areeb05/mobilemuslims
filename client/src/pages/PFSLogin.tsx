import { useState } from 'react'
import { Link, useLocation, Navigate } from 'react-router-dom'
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function PFSLogin() {
  const { isAuthenticated, hasActiveSubscription, signInWithMagicLink } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If already authenticated with subscription, redirect to dashboard
  if (isAuthenticated && hasActiveSubscription) {
    const from = (location.state as { from?: string })?.from || '/painfreesalah/dashboard'
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await signInWithMagicLink(email)

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Link
          to="/painfreesalah"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Back</span>
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {sent ? (
            // Success state
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold mb-4">Check your email</h1>
              <p className="text-gray-400 mb-6">
                We've sent a magic link to <span className="text-white font-medium">{email}</span>. 
                Click the link in the email to sign in.
              </p>
              <p className="text-sm text-gray-500">
                Didn't receive it? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-emerald-500 hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            // Login form
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-[#D4D0C8] via-white to-[#E8E4E1] bg-clip-text text-transparent">
                  Pain Free Salah
                </h1>
                <p className="text-gray-400">
                  Sign in to access your program
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Magic Link'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-500 text-sm">
                  Don't have access yet?{' '}
                  <Link
                    to="/painfreesalah"
                    className="text-emerald-500 hover:underline"
                  >
                    Start the survey
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
