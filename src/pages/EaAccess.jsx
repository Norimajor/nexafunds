import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { getDownloadFilename } from '../utils/eaDownload'

const API_BASE = 'https://nexafunds-app.onrender.com'
const PEPPERSTONE_IB_URL = 'https://trk.pepperstonepartners.com/aff_c?offer_id=367&aff_id=51096&source=52793&referral_source=52793&referral_provider=tune_link'
const HEADWAY_IB_URL = 'https://headway.partners/user/signup?hwp=9ce669'
const HEADWAY_PARTNER_ID = '4809668'

const formatDate = (value) => {
  if (!value) return 'Not reviewed yet'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function EaAccess({ embedded = false }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [licenses, setLicenses] = useState([])
  const [products, setProducts] = useState([])
  const [productLicenses, setProductLicenses] = useState([])
  const [licenseConfigured, setLicenseConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [brokerName, setBrokerName] = useState('')
  const [liveBroker, setLiveBroker] = useState('Pepperstone')
  const [accountLogin, setAccountLogin] = useState('')
  const [accountType, setAccountType] = useState('demo')
  const [ibConfirmation, setIbConfirmation] = useState(false)

  const loadLicenses = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/licenses/mine`, {
      credentials: 'include',
    })
    const data = await response.json()
    if (response.status === 401) {
      navigate('/login', { replace: true })
      return false
    }
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Unable to load your EA access.')
    }
    setLicenses(data.licenses || [])
    setProducts(data.products || [])
    setProductLicenses(data.product_licenses || [])
    setLicenseConfigured(Boolean(data.license_configured))
    return true
  }, [navigate])

  useEffect(() => {
    if (loading) return undefined

    const refresh = () => {
      loadLicenses().catch((loadError) => {
        setError(loadError.message || 'Unable to refresh your EA access.')
      })
    }
    const interval = window.setInterval(refresh, 15000)
    return () => window.clearInterval(interval)
  }, [loadLicenses, loading])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: 'include',
        })
        const data = await response.json()
        if (response.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Unable to verify your sign-in.')
        }
        if (cancelled) return
        setUser(data.user)
        const loaded = await loadLicenses()
        if (!loaded || cancelled) return
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Unable to load EA access.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [loadLicenses, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSubmitting(true)

    try {
      const response = await fetch(`${API_BASE}/api/licenses`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_name: accountType === 'real' ? liveBroker : brokerName.trim(),
          account_login: accountLogin.trim(),
          account_type: accountType,
          ib_confirmation: ibConfirmation,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to submit your MT5 account.')
      }

      setLicenseConfigured(Boolean(data.license_configured))
      setNotice(data.license_configured
        ? 'Your MT5 account is submitted for verification. We will issue your account-bound key after approval.'
        : 'Your MT5 account is submitted and will be queued for review. Key issuance is temporarily unavailable while NexaFunds configures licensing.')
      setAccountLogin('')
      setIbConfirmation(false)
      await loadLicenses()
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit your MT5 account.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = async (licenseKey) => {
    try {
      await navigator.clipboard.writeText(licenseKey)
      setNotice('License key copied.')
    } catch (copyError) {
      console.error('Unable to copy EA license key:', copyError)
      setError('Could not copy the key. Select and copy it manually.')
    }
  }

  const handleDownload = async (licenseId, productId) => {
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/ea/download/${licenseId}/${productId}`, {
        credentials: 'include',
      })
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
    <div className={embedded ? 'nf-workspace-section' : 'nf-workspace-page'}>
      {!embedded && (
        <header className="nf-workspace-header">
          <button className="nf-brand nf-brand-button" onClick={() => navigate('/')} aria-label="NexaFunds home">
            <span className="nf-logo">N</span>
            <span><strong>NexaFunds</strong><small>EA access portal</small></span>
          </button>
          <div className="nf-workspace-user">
            {user && <span>{user.first_name} {user.last_name}</span>}
            <button className="nf-quiet-button" onClick={handleLogout}>Sign out</button>
          </div>
        </header>
      )}

      <div className={embedded ? 'nf-workspace-main nf-workspace-embedded' : 'nf-workspace-main'}>
        <aside className="nf-ib-referral" aria-labelledby="nf-ib-referral-heading">
          <div className="nf-ib-referral-intro">
            <span className="nf-ib-referral-label">NEXAFUNDS INTRODUCING BROKER</span>
            <h2 id="nf-ib-referral-heading">Choose a partner when opening a live account.</h2>
            <p>
              New to one of these brokers? Use its NexaFunds partner link so your account can be associated with our Introducing Broker (IB). Already have a Headway account? Ask Headway to change your partner ID to <strong>{HEADWAY_PARTNER_ID}</strong>. Once your account is ready, choose the same broker below and submit your MT5 account number; we’ll verify the exact server during review.
            </p>
          </div>
          <div className="nf-ib-referral-options">
            <article className="nf-ib-referral-option nf-ib-referral-pepperstone">
              <div className="nf-ib-qr">
                <QRCodeSVG value={PEPPERSTONE_IB_URL} size={104} level="H" includeMargin title="Scan to open a Pepperstone account through the NexaFunds partner link" />
                <span>Scan Pepperstone link</span>
              </div>
              <div>
                <strong>Pepperstone</strong>
                <a href={PEPPERSTONE_IB_URL} target="_blank" rel="noopener noreferrer">Open a new account ↗</a>
              </div>
            </article>
            <article className="nf-ib-referral-option nf-ib-referral-headway">
              <div className="nf-ib-qr">
                <QRCodeSVG value={HEADWAY_IB_URL} size={104} level="H" includeMargin title="Scan to open a Headway account through the NexaFunds partner link" />
                <span>Scan Headway link</span>
              </div>
              <div>
                <strong>Headway</strong>
                <a href={HEADWAY_IB_URL} target="_blank" rel="noopener noreferrer">Open a new account ↗</a>
                <span>Existing accounts: request partner ID {HEADWAY_PARTNER_ID}</span>
              </div>
            </article>
          </div>
        </aside>

        <div className="nf-workspace-heading">
          <span className="nf-eyebrow">{embedded ? 'MT5 LICENSE CENTER' : 'YOUR MT5 ACCESS'}</span>
          <h1>{embedded ? 'EA account access' : 'Connect your trading account.'}</h1>
          <p>
            {embedded
              ? 'Register your MT5 account, follow its verification, and get your account-bound EA key.'
              : 'Register a demo or live MT5 account. Live accounts must be opened through one of our IB partner links. Each request is reviewed before an account-bound key is issued.'}
          </p>
        </div>

        {error && <p className="nf-form-error nf-page-message" role="alert">{error}</p>}
        {notice && <p className="nf-form-success nf-page-message" role="status">{notice}</p>}
        {!loading && !licenseConfigured && (
          <p className="nf-form-error nf-page-message" role="status">
            License signing is not configured on the NexaFunds API yet. You can submit an account request, but NexaFunds must configure its signing secret before an administrator can issue keys.
          </p>
        )}

        <div className="nf-license-layout">
          <section className="nf-panel nf-request-panel">
            <div className="nf-panel-heading">
              <span className="nf-step-number">01</span>
              <div><h2>Register an MT5 account</h2><p>Select your account type first. We’ll confirm its exact MT5 server during review.</p></div>
            </div>
            <form className="nf-license-form" onSubmit={handleSubmit}>
              <fieldset className="nf-account-type">
                <legend>Account type</legend>
                <label className={`nf-choice nf-choice-demo${accountType === 'demo' ? ' nf-choice-demo-active' : ''}`}>
                  <input type="radio" name="account-type" value="demo" checked={accountType === 'demo'} onChange={() => setAccountType('demo')} />
                  <span><strong>Demo</strong><small>Enter your broker name</small></span>
                </label>
                <label className={`nf-choice nf-choice-live${accountType === 'real' ? ' nf-choice-live-active' : ''}`}>
                  <input type="radio" name="account-type" value="real" checked={accountType === 'real'} onChange={() => setAccountType('real')} />
                  <span><strong>Live</strong><small>Pepperstone or Headway · NexaFunds IB</small></span>
                </label>
              </fieldset>
              <label className="nf-form-field">
                <span>Broker</span>
                {accountType === 'real' ? (
                  <select className="nf-broker-select" value={liveBroker} onChange={(event) => setLiveBroker(event.target.value)} aria-label="Broker" required>
                    <option value="Pepperstone">Pepperstone · NexaFunds IB</option>
                    <option value="Headway">Headway · NexaFunds IB</option>
                  </select>
                ) : (
                  <input
                    value={brokerName}
                    onChange={(event) => setBrokerName(event.target.value)}
                    placeholder="Enter your demo account broker"
                    maxLength={80}
                    required
                  />
                )}
              </label>
              <label className="nf-form-field">
                <span>MT5 account number</span>
                <input value={accountLogin} onChange={(event) => setAccountLogin(event.target.value)} placeholder="Account login" inputMode="numeric" pattern="[0-9]{3,20}" maxLength={20} required />
              </label>
              <label className="nf-ib-confirmation">
                <input type="checkbox" checked={ibConfirmation} onChange={(event) => setIbConfirmation(event.target.checked)} required />
                <span>I confirm this account was opened under the NexaFunds introducing broker and the details above are accurate.</span>
              </label>
              <button className="nf-primary nf-submit-button" type="submit" disabled={submitting || loading}>
                {submitting ? 'Submitting account…' : 'Submit account for access'}
                {!submitting && <span>↗</span>}
              </button>
            </form>
          </section>

          <section className="nf-panel nf-account-panel">
            <div className="nf-panel-heading">
              <span className="nf-step-number">02</span>
              <div><h2>Your account licenses</h2><p>Each approved license works only with its registered account.</p></div>
            </div>
            {loading ? <p className="nf-empty-state">Loading your account status…</p> : licenses.length === 0 ? (
              <div className="nf-empty-state"><span className="nf-empty-icon">↳</span><strong>No accounts registered yet</strong><p>Submit your MT5 details to request EA access.</p></div>
            ) : (
              <div className="nf-license-list">
                {licenses.map((license) => (
                  <article className="nf-license-card" key={license.id}>
                    <div className="nf-license-card-heading">
                      <div><strong>{license.broker_name}</strong><span>{license.account_login} · {license.account_type === 'demo' ? 'Demo' : 'Live'} account</span></div>
                      <span className={`nf-status nf-status-${license.status}`}>{license.status === 'active' ? 'Approved' : license.status === 'pending' ? 'In review' : 'Not approved'}</span>
                    </div>
                    {license.broker_server && <p className="nf-license-server">{license.broker_server}</p>}
                    {license.status === 'pending' && <p className="nf-review-note">Your IB account is waiting for review. Submitted {formatDate(license.created_at)}.</p>}
                    {license.status === 'rejected' && <p className="nf-review-note">This account was not approved. Please contact NexaFunds support if you think this is a mistake.</p>}
                    {license.status === 'active' && (
                      <div className="nf-issued-key">
                        {products.length === 0 ? (
                          <p className="nf-download-note">EA downloads and product keys will appear here when products are published.</p>
                        ) : products.map((product) => {
                          const key = productLicenses.find((entry) =>
                            String(entry.license_id) === String(license.id) &&
                            entry.product_id === product.product_id
                          )
                          return (
                            <div className="nf-product-license" key={product.product_id}>
                              <span>{product.name}</span>
                              {key ? (
                                <>
                                  <code>{key.license_key}</code>
                                  <button className="nf-secondary nf-copy-button" type="button" onClick={() => handleCopy(key.license_key)}>Copy key</button>
                                  {product.download_available ? (
                                    <button className="nf-primary nf-download-button" type="button" onClick={() => handleDownload(license.id, product.product_id)}>Download EA</button>
                                  ) : (
                                    <p className="nf-download-note">The EA file is not currently available.</p>
                                  )}
                                </>
                              ) : (
                                <p className="nf-download-note">A product key is not available for this account.</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
            <div className="nf-verification-note"><span>i</span><p>EA keys are checked against the account number, broker server and demo/live mode reported by MT5.</p></div>
          </section>
        </div>
      </div>
      {!embedded && <footer className="nf-footer nf-workspace-footer">NexaFunds · Secure, account-bound EA access</footer>}
    </div>
  )
}
