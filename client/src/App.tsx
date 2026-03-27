import { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Home from './pages/Home'
import UnderstandSalah from './pages/UnderstandSalah'
import UnderstandSalahOffline from './pages/UnderstandSalahOffline'
import QuranVerseFinder from './pages/QuranVerseFinder'
import Donate from './pages/Donate'
import PainFreeSalah from './pages/PainFreeSalah'
import PainFreeSalahPricing from './pages/PainFreeSalahPricing'
import PFSLogin from './pages/PFSLogin'
import PFSDashboard from './pages/PFSDashboard'
import PFSTrainer from './pages/PFSTrainer'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancelled from './pages/PaymentCancelled'
import DonationBanner from './components/DonationBanner'
import ProtectedRoute from './components/ProtectedRoute'

function AppContent() {
  const [showDonationBanner, setShowDonationBanner] = useState(true)
  const location = useLocation()

  // Only show donation banner on the Understand Salah page
  const showBannerOnPaths = ['/understandsalah', '/understandsalahoffline']
  const shouldShowBanner = showBannerOnPaths.includes(location.pathname)

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/understandsalah" element={<UnderstandSalah />} />
        <Route path="/understandsalahoffline" element={<UnderstandSalahOffline />} />
        <Route path="/quran-finder" element={<QuranVerseFinder />} />
        <Route path="/painfreesalah" element={<PainFreeSalah />} />
        <Route path="/painfreesalah/pricing" element={<PainFreeSalahPricing />} />
        <Route path="/painfreesalah/login" element={<PFSLogin />} />
        <Route 
          path="/painfreesalah/dashboard" 
          element={
            <ProtectedRoute>
              <PFSDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/painfreesalah/trainer" 
          element={
            <ProtectedRoute>
              <PFSTrainer />
            </ProtectedRoute>
          } 
        />
        <Route path="/donate" element={<Donate />} />
        <Route path="/success" element={<PaymentSuccess />} />
        <Route path="/cancel" element={<PaymentCancelled />} />
      </Routes>

      {shouldShowBanner && (
        <DonationBanner
          open={showDonationBanner}
          onOpenChange={setShowDonationBanner}
        />
      )}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
