import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import {
  createLicenseKey,
  isSigningSecretConfigured,
  verifyLicenseKey,
} from '../license-encoding.js'

const normalizeAccountType = (value) => String(value || '').trim().toLowerCase()

const isValidProductId = (productId) => /^[a-z0-9][a-z0-9-]{1,47}$/.test(productId)
const EA_PRODUCTS = [
  { product_id: 'nexa-ai-pro', name: 'NexaFunds AI Pro' },
  { product_id: 'nexa-ml', name: 'Nexa ML EA' },
]

const getEaProduct = (productId) =>
  EA_PRODUCTS.find((product) => product.product_id === productId)

const ensureProductLicenseKeys = async (db, licenseId, { all, get, run }) => {
  const license = await get(
    db,
    'SELECT account_login, account_type, broker_server FROM ea_licenses WHERE id = ?',
    [licenseId]
  )
  if (!license) throw new Error(`Cannot issue keys for missing license ${licenseId}.`)

  const products = await all(db, 'SELECT product_id FROM ea_products')
  for (const product of products) {
    const existing = await get(
      db,
      'SELECT license_key FROM ea_product_licenses WHERE license_id = ? AND product_id = ?',
      [licenseId, product.product_id]
    )
    const expected = {
      accountLogin: license.account_login,
      accountType: license.account_type,
      brokerServer: license.broker_server,
      productId: product.product_id,
    }
    if (
      existing?.license_key &&
      verifyLicenseKey(existing.license_key, expected)
    ) {
      continue
    }

    await run(
      db,
      `INSERT INTO ea_product_licenses (license_id, product_id, license_key)
       VALUES (?, ?, ?) ON CONFLICT (license_id, product_id) DO UPDATE
       SET license_key = excluded.license_key`,
      [
        licenseId,
        product.product_id,
        createLicenseKey(license, product.product_id),
      ]
    )
  }
}

const isAvailableProduct = (fs, path, root, product) => {
  if (!root || path.extname(root).toLowerCase() !== '.ex5') return false
  const resolvedRoot = path.dirname(path.resolve(root))
  const resolvedFile = path.resolve(resolvedRoot, product.storage_name)
  return path.dirname(resolvedFile) === resolvedRoot && fs.existsSync(resolvedFile)
}

export const createLicenseRouter = ({
  db,
  requireAuth,
  requireAdmin,
  run,
  get,
  all,
  transaction,
  asyncRoute,
  fs,
  path,
}) => {
  const router = Router()
  const uploadRoot = () => {
    const configuredPath = process.env.EA_DOWNLOAD_PATH
    return configuredPath && path.extname(configuredPath).toLowerCase() === '.ex5'
      ? path.dirname(path.resolve(configuredPath))
      : null
  }
  const eaUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => {
        const directory = uploadRoot()
        if (!directory) {
          callback(new Error('Set EA_DOWNLOAD_PATH to a writable .ex5 path on the API server.'))
          return
        }

        try {
          fs.mkdirSync(directory, { recursive: true })
          callback(null, directory)
        } catch (error) {
          callback(error)
        }
      },
      filename: (_req, _file, callback) => callback(null, `.ea-${randomUUID()}.upload`),
    }),
    limits: { fileSize: 100 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (path.extname(file.originalname).toLowerCase() !== '.ex5') {
        callback(new Error('Upload a compiled MetaTrader .ex5 EA file.'))
        return
      }
      callback(null, true)
    },
  }).single('ea_file')

  const receiveEaUpload = (req, res, next) => {
    eaUpload(req, res, (error) => {
      if (!error) {
        next()
        return
      }

      if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {})
      res.status(error instanceof multer.MulterError ? 400 : 503).json({
        success: false,
        error: error.message || 'Unable to receive the EA file.',
      })
    })
  }

  const requireLicenseConfig = (req, res, next) => {
    if (!isSigningSecretConfigured()) {
      return res.status(503).json({
        success: false,
        error:
          'EA licensing is unavailable because the API server needs a LICENSE_SIGNING_SECRET of at least 32 bytes. Please contact NexaFunds support.',
      })
    }
    next()
  }

  router.get(
    '/licenses/mine',
    requireAuth,
    asyncRoute(async (req, res) => {
      const licenses = await all(
        db,
        `SELECT id, user_id, broker_name,
                CASE WHEN broker_server LIKE 'pending-%' THEN '' ELSE broker_server END AS broker_server,
                account_login, account_type,
                status, created_at, approved_at
         FROM ea_licenses WHERE user_id = ? ORDER BY id DESC`,
        [req.session.user.id]
      )
      const activeLicenses = licenses.filter((license) => license.status === 'active')
      if (isSigningSecretConfigured()) {
        await Promise.all(
          activeLicenses.map((license) =>
            ensureProductLicenseKeys(db, license.id, { all, get, run })
          )
        )
      }
      const products = await all(
        db,
        `SELECT p.product_id, p.name, p.file_name,
                k.license_id, k.license_key
         FROM ea_products p
         LEFT JOIN ea_product_licenses k ON k.product_id = p.product_id
           AND k.license_id IN (
             SELECT id FROM ea_licenses WHERE user_id = ? AND status = 'active'
           )
         ORDER BY p.created_at, p.name, k.license_id`,
        [req.session.user.id]
      )
      const availableProducts = await all(db, 'SELECT product_id, name, file_name, storage_name FROM ea_products ORDER BY created_at, name')

      res.json({
        success: true,
        license_configured: isSigningSecretConfigured(),
        download_available: availableProducts.some((product) =>
          isAvailableProduct(fs, path, process.env.EA_DOWNLOAD_PATH, product)
        ),
        licenses,
        products: availableProducts.map((product) => ({
          product_id: product.product_id,
          name: product.name,
          file_name: product.file_name,
          download_available: isAvailableProduct(
            fs,
            path,
            process.env.EA_DOWNLOAD_PATH,
            product
          ),
        })),
        product_licenses: isSigningSecretConfigured()
          ? products.filter((product) => product.license_id !== null)
          : [],
      })
    })
  )

  router.post(
    '/licenses',
    requireAuth,
    asyncRoute(async (req, res) => {
      const body = req.body || {}
      const brokerName = String(body.broker_name || '').trim()
      const brokerServer = String(body.broker_server || '').trim()
      const accountLogin =
        typeof body.account_login === 'string' ? body.account_login.trim() : ''
      const accountType = normalizeAccountType(body.account_type)

      if (
        !brokerName ||
        brokerName.length > 80 ||
        brokerServer.length > 120 ||
        !/^\d{3,20}$/.test(accountLogin) ||
        !['demo', 'real'].includes(accountType) ||
        body.ib_confirmation !== true
      ) {
        return res.status(400).json({
          success: false,
          error:
            'Choose a broker, enter the MT5 account number, choose demo or live, and confirm the IB account.',
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
            brokerServer || `pending-${randomUUID()}`,
            accountLogin,
            accountType,
            'pending',
          ]
        )
      } catch (error) {
        if (error.code === '23505' || String(error.message).includes('UNIQUE')) {
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
        license_configured: isSigningSecretConfigured(),
        license: {
          ...license,
          broker_server: license.broker_server.startsWith('pending-')
            ? ''
            : license.broker_server,
          license_key: license.status === 'active' ? license.license_key : null,
        },
      })
    })
  )

  router.post(
    '/licenses/validate',
    requireLicenseConfig,
    asyncRoute(async (req, res) => {
      const body = req.body || {}
      const accountLogin =
        typeof body.account_login === 'string' ? body.account_login.trim() : ''
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

      const licenseKey = body.license_key.trim()
      const productId = String(body.product_id || '').trim().toLowerCase()
      if (!isValidProductId(productId)) {
        return res.status(401).json({ success: false, valid: false })
      }
      const signedClaims = verifyLicenseKey(licenseKey, {
        accountLogin,
        accountType,
        brokerServer,
        productId,
      })
      if (!signedClaims) {
        return res.status(401).json({ success: false, valid: false })
      }
      const license = await get(
        db,
        `SELECT l.*, k.product_id, k.license_key FROM ea_product_licenses k
         JOIN ea_licenses l ON l.id = k.license_id
         WHERE k.product_id = ? AND k.license_key = ?`,
        [productId, licenseKey]
      )

      const valid =
        license?.status === 'active' &&
        license.account_login === signedClaims.account_login &&
        license.broker_server.toLowerCase() === brokerServer.toLowerCase() &&
        license.account_type === accountType &&
        license.product_id === productId

      if (!valid) {
        return res.status(401).json({ success: false, valid: false })
      }

      res.json({ success: true, valid: true })
    })
  )

  router.get(
    '/ea/download/:licenseId/:productId',
    requireAuth,
    requireLicenseConfig,
    asyncRoute(async (req, res) => {
      const productId = String(req.params.productId || '').trim().toLowerCase()
      if (!isValidProductId(productId)) {
        return res.status(404).json({
          success: false,
          error: 'That EA download is unavailable.',
        })
      }
      const entitlement = await get(
        db,
        `SELECT p.storage_name, p.file_name
         FROM ea_product_licenses k
         JOIN ea_licenses l ON l.id = k.license_id
         JOIN ea_products p ON p.product_id = k.product_id
         WHERE l.id = ? AND l.user_id = ? AND l.status = 'active'
           AND k.product_id = ?`,
        [req.params.licenseId, req.session.user.id, productId]
      )

      if (!entitlement) {
        return res.status(403).json({
          success: false,
          error: 'An active account license for this EA is required to download it.',
        })
      }

      const root = uploadRoot()
      const resolvedRoot = root ? path.resolve(root) : null
      const resolvedFile = resolvedRoot
        ? path.resolve(resolvedRoot, entitlement.storage_name)
        : null
      if (
        !resolvedRoot ||
        path.dirname(resolvedFile) !== resolvedRoot ||
        !fs.existsSync(resolvedFile)
      ) {
        return res.status(503).json({
          success: false,
          error: 'The compiled EA file is not available yet.',
        })
      }

      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
      res.download(resolvedFile, entitlement.file_name, (error) => {
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
    asyncRoute(async (_req, res) => {
      const licenses = await all(
        db,
        `SELECT l.id, l.broker_name,
                CASE WHEN l.broker_server LIKE 'pending-%' THEN '' ELSE l.broker_server END AS broker_server,
                l.account_login,
                l.account_type, l.status, l.created_at, l.approved_at,
                u.first_name, u.last_name, u.email
         FROM ea_licenses l JOIN users u ON u.id = l.user_id
         ORDER BY CASE l.status WHEN 'pending' THEN 0 ELSE 1 END, l.id DESC`
      )
      if (isSigningSecretConfigured()) {
        await Promise.all(
          licenses
            .filter((license) => license.status === 'active')
            .map((license) =>
              ensureProductLicenseKeys(db, license.id, { all, get, run })
            )
        )
      }
      const products = await all(
        db,
        'SELECT product_id, name, file_name, created_at FROM ea_products ORDER BY created_at, name'
      )
      const keys = await all(
        db,
        `SELECT license_id, product_id, license_key
         FROM ea_product_licenses ORDER BY product_id`
      )
      res.json({
        success: true,
        licenses: licenses.map((license) => ({
          ...license,
          product_licenses: keys.filter((key) => String(key.license_id) === String(license.id)),
        })),
        products,
      })
    })
  )

  router.get(
    '/admin/creator-verification-requests',
    requireAdmin,
    asyncRoute(async (_req, res) => {
      const requests = await all(
        db,
        `SELECT r.id, r.user_id, r.request_message, r.status, r.created_at, r.reviewed_at,
                p.username, p.display_name, p.is_verified, u.email
         FROM creator_verification_requests r
         JOIN users u ON u.id = r.user_id
         LEFT JOIN creator_profiles p ON p.user_id = r.user_id
         ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.created_at DESC
         LIMIT 200`
      )
      res.json({
        success: true,
        requests: requests.map((request) => ({
          ...request,
          is_verified: Boolean(request.is_verified),
        })),
      })
    })
  )

  router.patch(
    '/admin/creator-verification-requests/:requestId',
    requireAdmin,
    asyncRoute(async (req, res) => {
      const decision = String(req.body?.decision || '').trim().toLowerCase()
      if (!['approve', 'reject'].includes(decision)) {
        return res.status(400).json({ success: false, error: 'Decision must be approve or reject.' })
      }
      const request = await get(
        db,
        `SELECT id, user_id, status FROM creator_verification_requests WHERE id = ?`,
        [req.params.requestId]
      )
      if (!request) {
        return res.status(404).json({ success: false, error: 'Verification request not found.' })
      }
      if (request.status !== 'pending') {
        return res.status(409).json({ success: false, error: 'This verification request has already been reviewed.' })
      }

      const status = decision === 'approve' ? 'approved' : 'rejected'
      const reviewedAt = new Date().toISOString()
      const reviewed = await transaction(db, async (execute) => {
        const updated = await execute(
          `UPDATE creator_verification_requests
           SET status = ?, reviewed_at = ?
           WHERE id = ? AND status = 'pending'`,
          [status, reviewedAt, request.id]
        )
        if (!updated.changes) return false
        if (status === 'approved') {
          await execute(
            `UPDATE creator_profiles
             SET is_verified = TRUE, verified_at = ?, verified_by = NULL
             WHERE user_id = ?`,
            [reviewedAt, request.user_id]
          )
        }
        return true
      })
      if (!reviewed) {
        return res.status(409).json({
          success: false,
          error: 'This verification request has already been reviewed.',
        })
      }
      res.json({ success: true, status })
    })
  )

  router.get(
    '/admin/ea',
    requireAdmin,
    asyncRoute(async (_req, res) => {
      const products = await all(
        db,
        'SELECT product_id, name, file_name, storage_name, created_at FROM ea_products ORDER BY created_at, name'
      )
      res.json({
        success: true,
        license_configured: isSigningSecretConfigured(),
        products: EA_PRODUCTS.map((slot) => {
          const product = products.find((entry) => entry.product_id === slot.product_id)
          return {
            ...slot,
            file_name: product?.file_name || null,
            created_at: product?.created_at || null,
            download_available: product
              ? isAvailableProduct(fs, path, process.env.EA_DOWNLOAD_PATH, product)
              : false,
          }
        }),
      })
    })
  )

  router.post(
    '/admin/products/upload',
    requireAdmin,
    receiveEaUpload,
    asyncRoute(async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Choose a compiled MetaTrader .ex5 EA file to upload.' })
      }

      const productId = String(req.body?.product_id || '').trim().toLowerCase()
      const product = getEaProduct(productId)
      const root = uploadRoot()
      const originalName = path
        .basename(String(req.file.originalname || '').replace(/[\\/]/g, '/'))
        .split('')
        .filter((character) => {
          const codePoint = character.codePointAt(0)
          return codePoint !== undefined && codePoint >= 32 && codePoint !== 127
        })
        .join('')
        .trim()
      if (!product || !originalName || !root) {
        await fs.promises.unlink(req.file.path).catch((error) => {
          if (error.code !== 'ENOENT') console.error('Unable to remove invalid EA product upload:', error)
        })
        return res.status(400).json({
          success: false,
          error: 'Choose one of the supported EA products and upload a compiled .ex5 file.',
        })
      }

      const storageName = `${productId}.ex5`
      const targetPath = path.resolve(root, storageName)
      const backupPath = `${targetPath}.${randomUUID()}.backup`
      let backupCreated = false
      let uploadInstalled = false
      try {
        try {
          await fs.promises.rename(targetPath, backupPath)
          backupCreated = true
        } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
        await fs.promises.rename(req.file.path, targetPath)
        uploadInstalled = true
        await run(
          db,
          `INSERT INTO ea_products (product_id, name, file_name, storage_name)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (product_id) DO UPDATE SET
             name = excluded.name,
             file_name = excluded.file_name,
             storage_name = excluded.storage_name`,
          [productId, product.name, originalName, storageName]
        )
        if (isSigningSecretConfigured()) {
          const activeLicenses = await all(db, "SELECT id FROM ea_licenses WHERE status = 'active'")
          await Promise.all(
            activeLicenses.map((license) =>
              ensureProductLicenseKeys(db, license.id, { all, get, run })
            )
          )
        }
      } catch (error) {
        if (uploadInstalled) {
          await fs.promises.unlink(targetPath).catch((cleanupError) => {
            if (cleanupError.code !== 'ENOENT') console.error('Unable to remove incomplete EA product upload:', cleanupError)
          })
        }
        if (backupCreated) {
          await fs.promises.rename(backupPath, targetPath).catch((restoreError) => {
            console.error('Unable to restore previous EA product upload:', restoreError)
          })
        }
        await fs.promises.unlink(req.file.path).catch((cleanupError) => {
          if (cleanupError.code !== 'ENOENT') console.error('Unable to remove temporary EA product upload:', cleanupError)
        })
        throw error
      }
      if (backupCreated) {
        await fs.promises.unlink(backupPath).catch((error) => {
          console.error('Unable to remove previous EA product backup:', error)
        })
      }

      res.json({
        success: true,
        product: {
          product_id: productId,
          name: product.name,
          file_name: originalName,
          download_available: true,
        },
      })
    })
  )

  router.delete(
    '/admin/products/:productId',
    requireAdmin,
    asyncRoute(async (req, res) => {
      const productId = String(req.params.productId || '').trim().toLowerCase()
      const productDefinition = getEaProduct(productId)
      if (!productDefinition) {
        return res.status(404).json({ success: false, error: 'EA product not found.' })
      }

      const product = await get(db, 'SELECT product_id FROM ea_products WHERE product_id = ?', [productId])
      if (!product) {
        return res.status(404).json({ success: false, error: 'EA product not found.' })
      }

      const root = uploadRoot()
      const resolvedRoot = root ? path.resolve(root) : null
      const resolvedFile = resolvedRoot ? path.resolve(resolvedRoot, `${productId}.ex5`) : null
      const backupFile = resolvedFile ? `${resolvedFile}.${randomUUID()}.delete` : null
      let backupCreated = false
      if (resolvedFile && path.dirname(resolvedFile) === resolvedRoot) {
        try {
          await fs.promises.rename(resolvedFile, backupFile)
          backupCreated = true
        } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }

      try {
        await transaction(db, async (execute) => {
          await execute('DELETE FROM ea_product_licenses WHERE product_id = ?', [productId])
          await execute('DELETE FROM ea_products WHERE product_id = ?', [productId])
        })
      } catch (error) {
        if (backupCreated) {
          await fs.promises.rename(backupFile, resolvedFile).catch((restoreError) => {
            console.error('Unable to restore EA product file after deletion failed:', restoreError)
          })
        }
        throw error
      }

      let warning
      if (backupCreated) {
        try {
          await fs.promises.unlink(backupFile)
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error('Unable to remove revoked EA product file:', error)
            warning = 'The product keys were revoked, but the old EA file could not be removed from storage.'
          }
        }
      }
      res.json({ success: true, product_id: productId, warning })
    })
  )

  router.post(
    '/admin/ea/upload',
    requireAdmin,
    (_req, res) => res.status(410).json({
      success: false,
      error: 'Use /api/admin/products/upload with one of the fixed NexaFunds EA product slots.',
    })
  )

  router.post(
    '/admin/licenses/:licenseId/decision',
    requireAdmin,
    requireLicenseConfig,
    asyncRoute(async (req, res) => {
      const decision = String(req.body?.decision || '').trim().toLowerCase()
      const brokerServer = String(req.body?.broker_server || '').trim()
      if (!['approve', 'reject'].includes(decision)) {
        return res.status(400).json({
          success: false,
          error: 'Decision must be approve or reject.',
        })
      }
      if (decision === 'approve' && (!brokerServer || brokerServer.length > 120)) {
        return res.status(400).json({
          success: false,
          error: 'Enter the exact MT5 server shown in the account owner’s terminal before approving.',
        })
      }

      const status = decision === 'approve' ? 'active' : 'rejected'
      const result = await run(
        db,
        `UPDATE ea_licenses
         SET status = ?,
             broker_server = CASE WHEN ? = 'active' THEN ? ELSE broker_server END,
             approved_at = CASE WHEN ? = 'active' THEN CURRENT_TIMESTAMP ELSE NULL END
         WHERE id = ? AND status = 'pending'`,
        [status, status, brokerServer, status, req.params.licenseId]
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

      if (status === 'active') {
        await ensureProductLicenseKeys(db, req.params.licenseId, { all, get, run })
      }
      res.json({ success: true, status })
    })
  )

  router.delete(
    '/admin/licenses/:licenseId',
    requireAdmin,
    asyncRoute(async (req, res) => {
      const license = await get(
        db,
        'SELECT id, status, account_login FROM ea_licenses WHERE id = ?',
        [req.params.licenseId]
      )
      if (!license) {
        return res.status(404).json({ success: false, error: 'Account request not found.' })
      }
      if (!['active', 'rejected'].includes(license.status)) {
        return res.status(409).json({
          success: false,
          error: 'Only reviewed account requests can be removed.',
        })
      }

      const removed = await transaction(db, async (execute) => {
        const deleted = await execute(
          'DELETE FROM ea_licenses WHERE id = ? AND status IN (?, ?)',
          [req.params.licenseId, 'active', 'rejected']
        )
        return Boolean(deleted.changes)
      })
      if (!removed) {
        return res.status(409).json({
          success: false,
          error: 'This account request changed while it was being removed. Refresh and try again.',
        })
      }

      res.json({
        success: true,
        account_login: license.account_login,
        keys_revoked: license.status === 'active',
      })
    })
  )

  return router
}
