import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import UnderstandSalah from './pages/UnderstandSalah'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/understandsalah" replace />} />
        <Route path="/understandsalah" element={<UnderstandSalah />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
