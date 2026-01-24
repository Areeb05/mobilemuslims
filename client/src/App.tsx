import { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import UnderstandSalah from './pages/UnderstandSalah'
import Donate from './pages/Donate'
import PainFreeSalah from './pages/PainFreeSalah'
import PainFreeSalahPricing from './pages/PainFreeSalahPricing'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancelled from './pages/PaymentCancelled'
import DonationBanner from './components/DonationBanner'

function AppContent() {
  const [showDonationBanner, setShowDonationBanner] = useState(true)
  const location = useLocation()

  // Only show donation banner on the Understand Salah page
  const showBannerOnPaths = ['/understandsalah']
  const shouldShowBanner = showBannerOnPaths.includes(location.pathname)

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/understandsalah" element={<UnderstandSalah />} />
        <Route path="/painfreesalah" element={<PainFreeSalah />} />
        <Route path="/painfreesalah/pricing" element={<PainFreeSalahPricing />} />
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
      <AppContent />
    </BrowserRouter>
  )
}

export default App
