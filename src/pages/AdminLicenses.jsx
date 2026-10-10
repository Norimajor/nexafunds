import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'https://nexafunds-app.onrender.com'

export default function AdminLicenses() {
  const navigate = useNavigate()
  const [adminKey, setAdminKey] = useState('')
  const [licenses, setLicenses] = useState([])
  const [eaFileName, setEaFileName] = useState('')
  const [eaAvailable, setEaAvailable] = useState(false)
  const [signingConfigured, setSigningConfigured] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)

  const loadLicenses = async (key = adminKey) => {
    setError('')
    setLoading(true)
    try {
      const headers = { 'x-admin-key': key }
      const [licenseResponse, eaResponse] = await Promise.all([
        fetch(`${API_BASE}/api/admin/licenses`, { headers }),
        fetch(`${API_BASE}/api/admin/ea`, { headers }),
      ])
      const [licenseData, eaData] = await Promise.all([
        licenseResponse.json(),
        eaResponse.json(),
      ])
      if (!licenseResponse.ok || !licenseData.success) {
        throw new Error(licenseData.error || 'Unable to load account requests.')
      }
      if (!eaResponse.ok || !eaData.success) {
        throw new Error(eaData.error || 'Unable to check the EA upload status.')
      }
      setLicenses(licenseData.licenses || [])
      setEaAvailable(Boolean(eaData.download_available))
      setSigningConfigured(Boolean(eaData.license_configured))
      setEaFileName(eaData.file_name || '')
      setAuthenticated(true)
    } catch (loadError) {
      setAuthenticated(false)
      setError(loadError.message || 'Unable to load account requests.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    if (!uploadFile) {
      setError('Choose a compiled .ex5 file first.')
      return
    }

    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('ea_file', uploadFile)
      const response = await fetch(`${API_BASE}/api/admin/ea/upload`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to upload the EA.')
      }

      setEaAvailable(true)
      setEaFileName(data.file_name || uploadFile.name)
      setUploadFile(null)
      form.reset()
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to upload the EA.')
    } finally {
      setUploading(false)
    }
  }

  const handleDecision = async (licenseId, decision) => {
    setError('')
    setBusyId(licenseId)
    try {
      const response = await fetch(`${API_BASE}/api/admin/licenses/${licenseId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ decision }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to update the account request.')
      }
      await loadLicenses()
    } catch (decisionError) {
      setError(decisionError.message || 'Unable to update the account request.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="nf-workspace-page">
      <header className="nf-workspace-header">
        <button className="nf-brand nf-brand-button" onClick={() => navigate('/')}>
          <span className="nf-logo">N</span>
          <span><strong>NexaFunds</strong><small>Account verification</small></span>
        </button>
        <button className="nf-quiet-button" onClick={() => navigate('/')}>Back to home</button>
      </header>
      <main className="nf-workspace-main nf-admin-main">
        <div className="nf-workspace-heading">
          <span className="nf-eyebrow">IB VERIFICATION</span>
          <h1>Review MT5 accounts.</h1>
          <p>Upload the compiled EA and verify MT5 account requests. Approved account owners receive a signed key and access to the download page.</p>
        </div>
        {error && <p className="nf-form-error nf-page-message" role="alert">{error}</p>}
        {!authenticated ? (
          <form className="nf-panel nf-admin-login" onSubmit={(event) => { event.preventDefault(); loadLicenses() }}>
            <label className="nf-form-field">
              <span>Admin API key</span>
              <input type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} autoComplete="off" required />
            </label>
            <p className="nf-download-note">The key is sent only to the NexaFunds API and is not saved in this browser.</p>
            <button className="nf-primary nf-submit-button" type="submit" disabled={loading}>{loading ? 'Checking access…' : 'Open verification queue'}</button>
          </form>
        ) : (
          <>
          <section className="nf-panel nf-admin-queue">
            <div className="nf-panel-heading">
              <span className="nf-step-number">01</span>
              <div>
                <h2>Master EA file</h2>
                <p>{eaAvailable ? `Available to approved accounts: ${eaFileName}` : 'No EA file uploaded yet.'}</p>
              </div>
            </div>
            <form className="nf-license-form" onSubmit={handleUpload}>
              <label className="nf-form-field">
                <span>Compiled MetaTrader EA (.ex5, up to 100 MB)</span>
                <input
                  type="file"
                  accept=".ex5,application/octet-stream"
                  onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                  required
                />
              </label>
              <button className="nf-primary nf-submit-button" type="submit" disabled={uploading}>
                {uploading ? 'Uploading EA…' : eaAvailable ? 'Replace EA file' : 'Upload EA file'}
              </button>
            </form>
            {!signingConfigured && (
              <p className="nf-form-error nf-page-message mt-5" role="alert">
                License issuance is disabled until LICENSE_SIGNING_SECRET is configured in the API hosting environment and the server is restarted.
              </p>
            )}
          </section>

          <section className="nf-panel nf-admin-queue">
            <div className="nf-panel-heading">
              <span className="nf-step-number">02</span>
              <div><h2>MT5 account requests</h2><p>Verify that each submitted account is registered under the NexaFunds IB.</p></div>
              <button className="nf-quiet-button" onClick={() => { setAuthenticated(false); setAdminKey(''); setLicenses([]) }}>Lock queue</button>
            </div>
            {licenses.length === 0 ? <p className="nf-empty-state">No account requests yet.</p> : (
              <div className="nf-license-list">
                {licenses.map((license) => (
                  <article className="nf-license-card" key={license.id}>
                    <div className="nf-license-card-heading">
                      <div><strong>{license.first_name} {license.last_name}</strong><span>{license.email}</span></div>
                      <span className={`nf-status nf-status-${license.status}`}>{license.status === 'active' ? 'Approved' : license.status === 'pending' ? 'Needs review' : 'Not approved'}</span>
                    </div>
                    <p className="nf-admin-account">{license.broker_name} · {license.account_login} · {license.account_type === 'demo' ? 'Demo' : 'Live'}</p>
                    <p className="nf-license-server">MT5 server: {license.broker_server}</p>
                    <p className="nf-review-note">Submitted {license.created_at}</p>
                    {license.status === 'pending' && (
                      <div className="nf-admin-actions">
                        <button className="nf-primary" type="button" disabled={busyId === license.id || !signingConfigured} onClick={() => handleDecision(license.id, 'approve')}>{busyId === license.id ? 'Updating…' : 'Verify & approve'}</button>
                        <button className="nf-secondary" type="button" disabled={busyId === license.id} onClick={() => handleDecision(license.id, 'reject')}>Reject request</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
          </>
        )}
      </main>
    </div>
  )
}
