import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDownloadFilename } from '../utils/eaDownload'

const API_BASE = 'https://nexafunds-app.onrender.com'

export default function EaDownloads() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedLicenseId = searchParams.get('licenseId')
  const [user, setUser] = useState(null)
  const [licenses, setLicenses] = useState([])
  const [products, setProducts] = useState([])
  const [licenseConfigured, setLicenseConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const [downloading, setDownloading] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const authResponse = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
        const authData = await authResponse.json()
        if (authResponse.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        if (!authResponse.ok || !authData.success) {
          throw new Error(authData.error || 'Unable to verify your sign-in.')
        }

        const response = await fetch(`${API_BASE}/api/licenses/mine`, { credentials: 'include' })
        const data = await response.json()
        if (response.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Unable to load your EA downloads.')
        }
        if (cancelled) return
        setUser(authData.user)
        const productLicenses = data.product_licenses || []
        setLicenses((data.licenses || []).map((license) => ({
          ...license,
          product_licenses: productLicenses.filter(
            (entry) => String(entry.license_id) === String(license.id)
          ),
        })))
        setProducts(data.products || [])
        setLicenseConfigured(Boolean(data.license_configured))
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to load your EA downloads.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [navigate])

  const activeLicenses = useMemo(() => {
    const active = licenses.filter((license) => license.status === 'active')
    return requestedLicenseId
      ? active.filter((license) => String(license.id) === requestedLicenseId)
      : active
  }, [licenses, requestedLicenseId])

  const handleCopy = async (licenseKey) => {
    try {
      await navigator.clipboard.writeText(licenseKey)
      setCopiedKey(licenseKey)
      window.setTimeout(() => setCopiedKey((current) => current === licenseKey ? '' : current), 1800)
    } catch (copyError) {
      console.error('Unable to copy EA license key:', copyError)
      setError('Could not copy the key. Select and copy it manually.')
    }
  }

  const handleDownload = async (license, product) => {
    const requestId = `${license.id}:${product.product_id}`
    setError('')
    setDownloading(requestId)
    try {
      const response = await fetch(
        `${API_BASE}/api/ea/download/${license.id}/${product.product_id}`,
        { credentials: 'include' }
      )
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'The EA download is unavailable.')
      }
      const downloadUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = getDownloadFilename(response.headers.get('Content-Disposition'))
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    } catch (downloadError) {
      setError(downloadError.message || 'The EA download is unavailable.')
    } finally {
      setDownloading('')
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to sign out.')
      }
      navigate('/', { replace: true })
    } catch (logoutError) {
      setError(logoutError.message || 'Unable to sign out.')
    }
  }

  return (
    <div className="nf-workspace-page">
      <header className="nf-workspace-header">
        <button className="nf-brand nf-brand-button" onClick={() => navigate('/dashboard')}>
          <span className="nf-logo">N</span>
          <span><strong>NexaFunds</strong><small>EA download center</small></span>
        </button>
        <div className="nf-workspace-user">
          {user && <span>{user.first_name} {user.last_name}</span>}
          <button className="nf-quiet-button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>
      <main className="nf-workspace-main nf-downloads-main">
        <div className="nf-workspace-heading">
          <span className="nf-eyebrow">YOUR APPROVED EA PRODUCTS</span>
          <h1>Keys and downloads.</h1>
          <p>Each product has its own account-bound key. Use only the matching key and EA build with the MT5 account shown on its card.</p>
        </div>
        <div className="nf-downloads-nav">
          <button className="nf-secondary" type="button" onClick={() => navigate('/ea-access')}>
            ← Back to account registration
          </button>
          <button className="nf-quiet-button" type="button" onClick={() => navigate('/dashboard')}>
            Main dashboard
          </button>
        </div>
        {error && <p className="nf-form-error nf-page-message" role="alert">{error}</p>}
        {!licenseConfigured && !loading && (
          <p className="nf-form-error nf-page-message" role="alert">
            License signing is not configured on the NexaFunds API. Please contact support.
          </p>
        )}
        {loading ? <p className="nf-empty-state">Loading your approved EA products…</p> : activeLicenses.length === 0 ? (
          <div className="nf-empty-state">
            <span className="nf-empty-icon">↳</span>
            <strong>{requestedLicenseId ? 'This account has no active EA access' : 'No approved accounts yet'}</strong>
            <p>Once an MT5 account is approved, its keys and available EA downloads will appear here.</p>
          </div>
        ) : (
          <div className="nf-download-account-list">
            {activeLicenses.map((license) => {
              const entitlements = (license.product_licenses || []).filter((entry) =>
                products.some((product) => product.product_id === entry.product_id)
              )
              return (
                <section className="nf-panel nf-download-account" key={license.id}>
                  <div className="nf-download-account-heading">
                    <div>
                      <span className="nf-eyebrow">VERIFIED MT5 ACCOUNT</span>
                      <h2>{license.broker_name} · {license.account_login}</h2>
                      <p>{license.broker_server} · {license.account_type === 'demo' ? 'Demo' : 'Live'} account</p>
                    </div>
                    <span className="nf-status nf-status-active">Approved</span>
                  </div>
                  {entitlements.length === 0 ? (
                    <p className="nf-download-note">
                      {products.length === 0
                        ? 'No EA products are published yet. Please check back later.'
                        : 'No product keys are available for this account yet.'}
                    </p>
                  ) : (
                    <div className="nf-download-product-grid">
                      {entitlements.map((entitlement) => {
                        const product = products.find((entry) => entry.product_id === entitlement.product_id)
                        if (!product) return null
                        const requestId = `${license.id}:${product.product_id}`
                        return (
                          <article className="nf-download-product" key={product.product_id}>
                            <div className="nf-download-product-heading">
                              <div>
                                <span className="nf-eyebrow">EA PRODUCT</span>
                                <h3>{product.name}</h3>
                              </div>
                              <span className={`nf-status ${product.download_available ? 'nf-status-active' : 'nf-status-pending'}`}>
                                {product.download_available ? 'Ready' : 'File unavailable'}
                              </span>
                            </div>
                            <p className="nf-download-file">{product.file_name || 'Compiled EA file is not currently available'}</p>
                            <span className="nf-download-key-label">ACCOUNT-BOUND PRODUCT KEY</span>
                            <code className="nf-download-key">{entitlement.license_key}</code>
                            <div className="nf-download-actions">
                              <button className="nf-secondary" type="button" onClick={() => handleCopy(entitlement.license_key)}>
                                {copiedKey === entitlement.license_key ? 'Copied' : 'Copy key'}
                              </button>
                              <button
                                className="nf-primary"
                                type="button"
                                onClick={() => handleDownload(license, product)}
                                disabled={!product.download_available || downloading === requestId}
                              >
                                {downloading === requestId ? 'Preparing…' : 'Download EA'}
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
