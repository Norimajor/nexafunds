import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PortalPageLayout } from '../components/PortalSidebar'

const API_BASE = 'https://nexafunds-app.onrender.com'

export default function EaDownload() {
  const { licenseId } = useParams()
  const navigate = useNavigate()
  const [license, setLicense] = useState(null)
  const [downloadAvailable, setDownloadAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/licenses/mine`, {
          credentials: 'include',
        })
        const data = await response.json()
        if (response.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Unable to verify this EA license.')
        }
        if (cancelled) return
        const ownedLicense = (data.licenses || []).find((item) => String(item.id) === licenseId)
        if (!ownedLicense || ownedLicense.status !== 'active' || !ownedLicense.license_key) {
          throw new Error('This account does not have an approved EA license.')
        }
        setLicense(ownedLicense)
        setDownloadAvailable(Boolean(data.download_available))
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to load the EA download page.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [licenseId, navigate])

  const handleDownload = async () => {
    setError('')
    setDownloading(true)
    try {
      const response = await fetch(`${API_BASE}/api/ea/download/${licenseId}`, {
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'The EA download is unavailable.')
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = 'NexaFunds-EA.ex5'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (downloadError) {
      setError(downloadError.message || 'The EA download is unavailable.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <PortalPageLayout activeLabel="EA access">
      <div className="min-h-screen p-4 text-[#f3f1e9] sm:p-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-[#eac16e]/20 bg-gradient-to-br from-[#14211d] to-[#0b100e] p-6 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:p-9">
          <span className="nf-eyebrow">APPROVED EA LICENSE</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Your EA is ready.</h1>
          <p className="mt-2 text-sm text-[#a8b0a9]">
            Your approved license is tied to this MT5 account. Enter the key in the NexaFunds EA settings in MetaTrader 5.
          </p>

          {error && <p className="nf-form-error nf-page-message mt-5" role="alert">{error}</p>}
          {loading ? (
            <p className="mt-8 text-sm text-[#a8b0a9]">Verifying your account-bound license…</p>
          ) : license ? (
            <div className="mt-7 rounded-2xl border border-[#eac16e]/15 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#a8b0a9]">MT5 account</p>
              <p className="mt-2 font-semibold">{license.broker_name} · {license.account_login}</p>
              <p className="mt-1 text-sm text-[#a8b0a9]">{license.broker_server} · {license.account_type === 'demo' ? 'Demo' : 'Live'}</p>
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#a8b0a9]">Account-bound license key</p>
                <code className="mt-2 block break-all text-sm text-[#eac16e]">{license.license_key}</code>
              </div>
              {downloadAvailable ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="nf-primary mt-5 w-full"
                >
                  {downloading ? 'Preparing download…' : 'Download NexaFunds EA'}
                </button>
              ) : (
                <p className="nf-download-note mt-5">Your license is approved. The administrator will publish the EA file here when it is uploaded.</p>
              )}
            </div>
          ) : null}
          <button type="button" onClick={() => navigate('/dashboard?section=ea-access')} className="nf-secondary mt-5">
            Back to EA access
          </button>
        </section>
      </div>
    </PortalPageLayout>
  )
}
