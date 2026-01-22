import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import UnderstandSalah from './pages/UnderstandSalah'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancelled from './pages/PaymentCancelled'
import DonationBanner from './components/DonationBanner'

function AppContent() {
  const [showDonationBanner, setShowDonationBanner] = useState(true)
  const location = useLocation()

  // Don't show donation banner on success/cancel pages
  const hideBannerOnPaths = ['/success', '/cancel']
  const shouldShowBanner = !hideBannerOnPaths.includes(location.pathname)

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/understandsalah" replace />} />
        <Route path="/understandsalah" element={<UnderstandSalah />} />
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
      <AppContent />
    </BrowserRouter>
  )
}

export default App
