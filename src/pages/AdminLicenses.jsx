import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'https://nexafunds-app.onrender.com'
const ADMIN_KEY_STORAGE = 'nexafunds.admin-api-key'
const EA_PRODUCTS = [
  { product_id: 'nexa-ai-pro', name: 'NexaFunds AI Pro', source: 'EA.txt' },
  { product_id: 'nexa-ml', name: 'Nexa ML EA', source: 'EA.TXT2' },
]

const readSavedAdminKey = () => window.localStorage.getItem(ADMIN_KEY_STORAGE) || ''

export default function AdminLicenses() {
  const navigate = useNavigate()
  const [adminKey, setAdminKey] = useState(readSavedAdminKey)
  const [rememberAdminKey, setRememberAdminKey] = useState(true)
  const [hasSavedAdminKey, setHasSavedAdminKey] = useState(() => Boolean(readSavedAdminKey()))
  const [licenses, setLicenses] = useState([])
  const [products, setProducts] = useState([])
  const [signingConfigured, setSigningConfigured] = useState(false)
  const [uploadFiles, setUploadFiles] = useState({})
  const [uploadingProduct, setUploadingProduct] = useState(null)
  const [deletingProduct, setDeletingProduct] = useState(null)
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
      setProducts(eaData.products || [])
      setSigningConfigured(Boolean(eaData.license_configured))
      setAuthenticated(true)
      try {
        if (rememberAdminKey) {
          window.localStorage.setItem(ADMIN_KEY_STORAGE, key)
          setHasSavedAdminKey(true)
        } else {
          window.localStorage.removeItem(ADMIN_KEY_STORAGE)
          setHasSavedAdminKey(false)
        }
      } catch {
        setError('Access is open, but this browser could not save the admin key.')
      }
    } catch (loadError) {
      setAuthenticated(false)
      setError(loadError.message || 'Unable to load account requests.')
    } finally {
      setLoading(false)
    }
  }

  const forgetAdminKey = () => {
    try {
      window.localStorage.removeItem(ADMIN_KEY_STORAGE)
      setAdminKey('')
      setRememberAdminKey(false)
      setHasSavedAdminKey(false)
      setError('')
    } catch {
      setError('This browser could not remove the saved admin key.')
    }
  }

  const handleUpload = async (event, product) => {
    event.preventDefault()
    const form = event.currentTarget
    const uploadFile = uploadFiles[product.product_id]
    if (!uploadFile) {
      setError('Choose a compiled .ex5 file first.')
      return
    }

    setError('')
    setUploadingProduct(product.product_id)
    try {
      const formData = new FormData()
      formData.append('ea_file', uploadFile)
      formData.append('product_id', product.product_id)
      const response = await fetch(`${API_BASE}/api/admin/products/upload`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to upload the EA.')
      }

      setProducts((current) => current.map((entry) => (
        entry.product_id === data.product.product_id ? data.product : entry
      )))
      setUploadFiles((current) => ({ ...current, [product.product_id]: null }))
      form.reset()
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to upload the EA.')
    } finally {
      setUploadingProduct(null)
    }
  }

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete ${product.name} and permanently revoke all keys for this EA?`)) return
    setError('')
    setDeletingProduct(product.product_id)
    try {
      const response = await fetch(`${API_BASE}/api/admin/products/${product.product_id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to delete the EA product.')
      }
      setProducts((current) => current.map((entry) => (
        entry.product_id === product.product_id
          ? { ...entry, file_name: null, created_at: null, download_available: false }
          : entry
      )))
      setError(data.warning || '')
      setLicenses((current) => current.map((license) => ({
        ...license,
        product_licenses: (license.product_licenses || []).filter(
          (key) => key.product_id !== product.product_id
        ),
      })))
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete the EA product.')
    } finally {
      setDeletingProduct(null)
    }
  }

  const handleDecision = async (licenseId, decision) => {
    setError('')
    setBusyId(licenseId)
    try {
      const response = await fetch(`${API_BASE}/api/admin/licenses/${licenseId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          decision,
          broker_server: licenses.find((license) => license.id === licenseId)?.broker_server?.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to update the account request.')
      }
      await loadLicenses(adminKey)
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
          <p>Upload each EA as a separate product and verify MT5 account requests. Approved accounts receive a different product key for every EA.</p>
        </div>
        {error && <p className="nf-form-error nf-page-message" role="alert">{error}</p>}
        {!authenticated ? (
          <form className="nf-panel nf-admin-login" onSubmit={(event) => { event.preventDefault(); loadLicenses(adminKey) }}>
            <label className="nf-form-field">
              <span>Admin API key</span>
              <input type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} autoComplete="off" required />
            </label>
            <label className="nf-admin-remember">
              <input
                type="checkbox"
                checked={rememberAdminKey}
                onChange={(event) => {
                  const shouldRemember = event.target.checked
                  setRememberAdminKey(shouldRemember)
                  if (!shouldRemember) {
                    try {
                      window.localStorage.removeItem(ADMIN_KEY_STORAGE)
                      setHasSavedAdminKey(false)
                    } catch {
                      setError('This browser could not remove the saved admin key.')
                    }
                  }
                }}
              />
              Remember this key on this device
            </label>
            <p className="nf-download-note">The key is sent only to the NexaFunds API. Remembering it stores it in this browser until you forget it.</p>
            {hasSavedAdminKey && (
              <button className="nf-quiet-button" type="button" onClick={forgetAdminKey}>Forget saved key</button>
            )}
            <button className="nf-primary nf-submit-button" type="submit" disabled={loading}>{loading ? 'Checking access…' : 'Open verification queue'}</button>
          </form>
        ) : (
          <>
          <section className="nf-panel nf-admin-queue">
            <div className="nf-panel-heading">
              <span className="nf-step-number">01</span>
              <div>
                <h2>EA products</h2>
                <p>Upload each compiled EA separately. Accounts automatically receive a distinct key for each EA.</p>
              </div>
            </div>
            <div className="nf-ea-product-grid">
              {EA_PRODUCTS.map((product) => {
                const uploadedProduct = products.find((entry) => entry.product_id === product.product_id)
                const uploading = uploadingProduct === product.product_id
                const deleting = deletingProduct === product.product_id
                return (
                  <section className="nf-panel nf-ea-product-slot" key={product.product_id}>
                    <div className="nf-license-card-heading">
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.product_id} · build from {product.source}</span>
                      </div>
                      <span className={`nf-status ${uploadedProduct?.download_available ? 'nf-status-active' : 'nf-status-pending'}`}>
                        {uploadedProduct?.download_available ? 'Available' : uploadedProduct?.file_name ? 'File missing' : 'Not uploaded'}
                      </span>
                    </div>
                    {uploadedProduct?.file_name && <p className="nf-license-server">Uploaded file: {uploadedProduct.file_name}</p>}
                    <form className="nf-license-form" onSubmit={(event) => handleUpload(event, product)}>
                      <label className="nf-form-field">
                        <span>Compiled EA (.ex5, up to 100 MB)</span>
                        <input
                          type="file"
                          accept=".ex5,application/octet-stream"
                          onChange={(event) => setUploadFiles((current) => ({
                            ...current,
                            [product.product_id]: event.target.files?.[0] || null,
                          }))}
                          required
                        />
                      </label>
                      <button className="nf-primary nf-submit-button" type="submit" disabled={uploading || deleting}>
                        {uploading ? 'Uploading…' : uploadedProduct?.download_available ? 'Replace this EA' : 'Upload this EA'}
                      </button>
                      {uploadedProduct?.file_name && (
                        <button
                          className="nf-secondary nf-ea-delete-button"
                          type="button"
                          onClick={() => handleDeleteProduct(product)}
                          disabled={uploading || deleting}
                        >
                          {deleting ? 'Deleting…' : 'Delete EA and revoke its keys'}
                        </button>
                      )}
                    </form>
                  </section>
                )
              })}
            </div>
            {!signingConfigured && (
              <p className="nf-form-error nf-page-message mt-5" role="alert">
                License issuance is disabled until the API has a LICENSE_SIGNING_SECRET of at least 32 bytes and is restarted.
              </p>
            )}
          </section>

          <section className="nf-panel nf-admin-queue">
            <div className="nf-panel-heading">
              <span className="nf-step-number">02</span>
              <div><h2>MT5 account requests</h2><p>Verify that each submitted account is registered under the NexaFunds IB.</p></div>
              <button className="nf-quiet-button" onClick={() => { setAuthenticated(false); if (!rememberAdminKey) setAdminKey(''); setLicenses([]) }}>Lock queue</button>
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
                    {license.status === 'pending' ? (
                      <label className="nf-form-field nf-admin-server-field">
                        <span>Exact MT5 server (required to approve)</span>
                        <input
                          value={license.broker_server || ''}
                          onChange={(event) => setLicenses((current) => current.map((entry) => (
                            entry.id === license.id ? { ...entry, broker_server: event.target.value } : entry
                          )))}
                          placeholder="e.g. Pepperstone-EdgeXX"
                          maxLength={120}
                          required
                        />
                      </label>
                    ) : (
                      <p className="nf-license-server">MT5 server: {license.broker_server}</p>
                    )}
                    <p className="nf-review-note">Submitted {license.created_at}</p>
                    {license.status === 'active' && (
                      <div className="nf-license-list mt-4">
                        {(license.product_licenses || []).map((productLicense) => {
                          const product = products.find((entry) => entry.product_id === productLicense.product_id)
                          return (
                            <div className="nf-issued-key" key={productLicense.product_id}>
                              <span>{product?.name || productLicense.product_id} key</span>
                              <code>{productLicense.license_key}</code>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {license.status === 'pending' && (
                      <div className="nf-admin-actions">
                        <button className="nf-primary" type="button" disabled={busyId === license.id || !signingConfigured || !license.broker_server?.trim()} onClick={() => handleDecision(license.id, 'approve')}>{busyId === license.id ? 'Updating…' : 'Verify & approve'}</button>
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
