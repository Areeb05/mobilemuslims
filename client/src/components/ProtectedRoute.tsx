import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireSubscription?: boolean
}

const ProtectedRoute = ({ children, requireSubscription = true }: ProtectedRouteProps) => {
  const { isAuthenticated, hasActiveSubscription, loading } = useAuth()
  const location = useLocation()

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/painfreesalah/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    )
  }

  // Redirect to pricing if subscription required but not active
  if (requireSubscription && !hasActiveSubscription) {
    return (
      <Navigate 
        to="/painfreesalah/pricing" 
        state={{ 
          from: location.pathname,
          message: 'Please purchase a subscription to access this content.' 
        }} 
        replace 
      />
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
