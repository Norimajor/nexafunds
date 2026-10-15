import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import EaAccess from './pages/EaAccess'
import EaDownloads from './pages/EaDownloads'
import AdminLicenses from './pages/AdminLicenses'
import Dashboard from './pages/Dashboard'
import Portfolio from './pages/Portfolio'
import Transactions from './pages/Transactions'
import StrategyAI from './pages/StrategyAI'

const Streaming = lazy(() => import('./pages/Streaming'))

function LegacyEaDownloadRedirect() {
  const { licenseId } = useParams()
  return <Navigate to={`/ea-downloads?licenseId=${encodeURIComponent(licenseId)}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/ea-access" element={<EaAccess />} />
        <Route path="/ea-downloads" element={<EaDownloads />} />
        <Route path="/ea-download/:licenseId" element={<LegacyEaDownloadRedirect />} />
        <Route path="/admin/licenses" element={<AdminLicenses />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route
          path="/streaming"
          element={(
            <Suspense fallback={<div className="min-h-screen bg-[#090d0f]" />}>
              <Streaming />
            </Suspense>
          )}
        />
        <Route
          path="/streaming/:username"
          element={(
            <Suspense fallback={<div className="min-h-screen bg-[#090d0f]" />}>
              <Streaming />
            </Suspense>
          )}
        />
        <Route path="/strategy-ai" element={<StrategyAI />} />
      </Routes>
    </BrowserRouter>
  )
}