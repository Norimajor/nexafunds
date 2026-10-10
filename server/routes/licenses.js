import { Router } from 'express'
import { createHmac, timingSafeEqual } from 'node:crypto'

const normalizeAccountType = (value) => String(value || '').trim().toLowerCase()

const signLicense = (license, secret) => {
  const payload = [
    license.id,
    license.user_id,
    license.account_login,
    license.broker_server.toLowerCase(),
    license.account_type,
    license.created_at,
  ].join(':')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `NX1.${Number(license.id).toString(36)}.${signature}`
}

const isValidSignature = (license, token, secret) => {
  const parts = String(token || '').trim().split('.')
  if (parts.length !== 3 || parts[0] !== 'NX1' || !/^[0-9a-z]+$/.test(parts[1])) {
    return false
  }

  const id = Number.parseInt(parts[1], 36)
  if (!Number.isSafeInteger(id) || id !== Number(license.id)) return false

  const expected = signLicense(license, secret).split('.')[2]
  const suppliedBuffer = Buffer.from(parts[2])
  const expectedBuffer = Buffer.from(expected)
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  )
}

const hasDownload = (fs, path) => {
  const file = process.env.EA_DOWNLOAD_PATH
  return Boolean(
    file &&
      path.extname(file).toLowerCase() === '.ex5' &&
      fs.existsSync(path.resolve(file))
  )
}

export const createLicenseRouter = ({
  db,
  requireAuth,
  requireAdmin,
  run,
  get,
  all,
  asyncRoute,
  fs,
  path,
}) => {
  const router = Router()

  const requireLicenseConfig = (req, res, next) => {
    if (!process.env.LICENSE_SIGNING_SECRET) {
      return res.status(503).json({
        success: false,
        error: 'EA licensing is not configured. Please contact support.',
      })
    }
    next()
  }

  router.get(
    '/licenses/mine',
    requireAuth,
    requireLicenseConfig,
    asyncRoute(async (req, res) => {
      const licenses = await all(
        db,
        `SELECT id, user_id, broker_name, broker_server, account_login, account_type,
                status, created_at, approved_at
         FROM ea_licenses WHERE user_id = ? ORDER BY id DESC`,
        [req.session.user.id]
      )

      res.json({
        success: true,
        download_available: hasDownload(fs, path),
        licenses: licenses.map((license) => ({
          ...license,
          license_key:
            license.status === 'active'
              ? signLicense(license, process.env.LICENSE_SIGNING_SECRET)
              : null,
        })),
      })
    })
  )

  router.post(
    '/licenses',
    requireAuth,
    requireLicenseConfig,
    asyncRoute(async (req, res) => {
      const body = req.body || {}
      const brokerName = String(body.broker_name || '').trim()
      const brokerServer = String(body.broker_server || '').trim()
      const accountLogin = String(body.account_login || '').trim()
      const accountType = normalizeAccountType(body.account_type)

      if (
        !brokerName ||
        brokerName.length > 80 ||
        !brokerServer ||
        brokerServer.length > 120 ||
        !/^\d{3,20}$/.test(accountLogin) ||
        !['demo', 'real'].includes(accountType) ||
        body.ib_confirmation !== true
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Enter a broker, the exact MT5 server and account number, choose demo or live, and confirm the IB account.',
        })
      }

      let result
      try {
        result = await run(
          db,
          `INSERT INTO ea_licenses
             (user_id, broker_name, broker_server, account_login, account_type, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            req.session.user.id,
            brokerName,
            brokerServer,
            accountLogin,
            accountType,
            accountType === 'demo' ? 'active' : 'pending',
          ]
        )
      } catch (error) {
        if (String(error.message).includes('UNIQUE')) {
          return res.status(409).json({
            success: false,
            error: 'That MT5 account is already registered.',
          })
        }
        throw error
      }

      const license = await get(db, 'SELECT * FROM ea_licenses WHERE id = ?', [
        result.lastID,
      ])
      res.status(201).json({
        success: true,
        license: {
          ...license,
          license_key:
            license.status === 'active'
              ? signLicense(license, process.env.LICENSE_SIGNING_SECRET)
              : null,
        },
      })
    })
  )

  router.post(
    '/licenses/validate',
    requireLicenseConfig,
    asyncRoute(async (req, res) => {
      const body = req.body || {}
      const accountLogin = String(body.account_login || '').trim()
      const brokerServer = String(body.broker_server || '').trim()
      const accountType = normalizeAccountType(body.account_type)

      if (
        !/^\d{3,20}$/.test(accountLogin) ||
        !brokerServer ||
        brokerServer.length > 120 ||
        !['demo', 'real'].includes(accountType) ||
        typeof body.license_key !== 'string'
      ) {
        return res.status(400).json({ success: false, valid: false })
      }

      const parts = body.license_key.trim().split('.')
      const id = parts.length === 3 && /^[0-9a-z]+$/.test(parts[1])
        ? Number.parseInt(parts[1], 36)
        : NaN
      if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(401).json({ success: false, valid: false })
      }

      const license = await get(db, 'SELECT * FROM ea_licenses WHERE id = ?', [id])
      const valid =
        license?.status === 'active' &&
        license.account_login === accountLogin &&
        license.broker_server.toLowerCase() === brokerServer.toLowerCase() &&
        license.account_type === accountType &&
        isValidSignature(
          license,
          body.license_key,
          process.env.LICENSE_SIGNING_SECRET
        )

      if (!valid) {
        return res.status(401).json({ success: false, valid: false })
      }

      res.json({ success: true, valid: true })
    })
  )

  router.get(
    '/ea/download/:licenseId',
    requireAuth,
    requireLicenseConfig,
    asyncRoute(async (req, res) => {
      const license = await get(
        db,
        `SELECT id, status FROM ea_licenses WHERE id = ? AND user_id = ?`,
        [req.params.licenseId, req.session.user.id]
      )

      if (!license || license.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'An active EA license is required to download the EA.',
        })
      }

      const file = process.env.EA_DOWNLOAD_PATH
      if (!file || path.extname(file).toLowerCase() !== '.ex5') {
        return res.status(503).json({
          success: false,
          error: 'The compiled EA download is not available yet.',
        })
      }

      const resolvedFile = path.resolve(file)
      if (!fs.existsSync(resolvedFile)) {
        return res.status(503).json({
          success: false,
          error: 'The compiled EA download is not available yet.',
        })
      }

      res.download(resolvedFile, 'NexaFunds-EA.ex5', (error) => {
        if (error) {
          console.error('EA download failed:', error)
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'EA download failed.' })
          }
        }
      })
    })
  )

  router.get(
    '/admin/licenses',
    requireAdmin,
    requireLicenseConfig,
    asyncRoute(async (_req, res) => {
      const licenses = await all(
        db,
        `SELECT l.id, l.broker_name, l.broker_server, l.account_login,
                l.account_type, l.status, l.created_at, l.approved_at,
                u.first_name, u.last_name, u.email
         FROM ea_licenses l JOIN users u ON u.id = l.user_id
         ORDER BY CASE l.status WHEN 'pending' THEN 0 ELSE 1 END, l.id DESC`
      )
      res.json({ success: true, licenses })
    })
  )

  router.post(
    '/admin/licenses/:licenseId/decision',
    requireAdmin,
    requireLicenseConfig,
    asyncRoute(async (req, res) => {
      const decision = String(req.body?.decision || '').trim().toLowerCase()
      if (!['approve', 'reject'].includes(decision)) {
        return res.status(400).json({
          success: false,
          error: 'Decision must be approve or reject.',
        })
      }

      const status = decision === 'approve' ? 'active' : 'rejected'
      const result = await run(
        db,
        `UPDATE ea_licenses
         SET status = ?, approved_at = CASE WHEN ? = 'active' THEN CURRENT_TIMESTAMP ELSE NULL END
         WHERE id = ? AND status = 'pending'`,
        [status, status, req.params.licenseId]
      )

      if (!result.changes) {
        const license = await get(
          db,
          'SELECT status FROM ea_licenses WHERE id = ?',
          [req.params.licenseId]
        )
        return res.status(license ? 409 : 404).json({
          success: false,
          error: license
            ? 'This account request has already been reviewed.'
            : 'Account request not found.',
        })
      }

      res.json({ success: true, status })
    })
  )

  return router
}
