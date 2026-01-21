import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import UnderstandSalah from './pages/UnderstandSalah'
import DonationBanner from './components/DonationBanner'

function App() {
  const [showDonationBanner, setShowDonationBanner] = useState(true)

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/understandsalah" replace />} />
          <Route path="/understandsalah" element={<UnderstandSalah />} />
        </Routes>
      </BrowserRouter>

      <DonationBanner
        open={showDonationBanner}
        onOpenChange={setShowDonationBanner}
      />
    </>
  )
}

export default App
