import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import fs, { createReadStream } from 'node:fs'
import os from 'node:os'
import { Router } from 'express'
import multer from 'multer'
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const GIFTS = Object.freeze({
  golden_candlestick: { gift_id: 'golden_candlestick', name: 'Golden Candlestick', icon: '🕯️', coins: 5 },
  bull_run: { gift_id: 'bull_run', name: 'Bull Run', icon: '🐂', coins: 10 },
  moonshot: { gift_id: 'moonshot', name: 'Moonshot', icon: '🚀', coins: 50 },
  diamond_hands: { gift_id: 'diamond_hands', name: 'Diamond Hands', icon: '💎', coins: 100 },
})

export const COIN_BUNDLES = Object.freeze({
  starter: { bundle_id: 'starter', coins: 10, amount_minor: 1000, currency: 'kes' },
  trader: { bundle_id: 'trader', coins: 50, amount_minor: 5000, currency: 'kes' },
  vault: { bundle_id: 'vault', coins: 100, amount_minor: 10000, currency: 'kes' },
  elite: { bundle_id: 'elite', coins: 500, amount_minor: 50000, currency: 'kes' },
})

const VIDEO_TYPES = new Map([
  ['video/mp4', '.mp4'],
  ['video/webm', '.webm'],
  ['video/quicktime', '.mov'],
])

const now = () => new Date().toISOString()
const isPostgresId = (value) => /^\d+$/.test(String(value))

const getStorageConfig = () => {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION } = process.env
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_ENDPOINT_URL_S3 || !AWS_REGION) {
    return null
  }

  const endpoint = new URL(AWS_ENDPOINT_URL_S3)
  if (endpoint.protocol !== 'https:' || endpoint.search || endpoint.hash) return null
  return {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    endpoint,
    region: AWS_REGION,
  }
}

const isLiveKitConfigured = () =>
  Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET)

export const getStreamingAllowedOrigins = ({
  streamingPublicUrl = process.env.STREAMING_PUBLIC_URL,
  corsOrigins = process.env.CORS_ORIGINS,
} = {}) => {
  const origins = (corsOrigins || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  if (streamingPublicUrl) {
    try {
      origins.push(new URL(streamingPublicUrl).origin)
    } catch {
      // Invalid public URLs are excluded; other configured origins remain available.
    }
  }

  return [...new Set(origins)]
}

const hmac = (key, value, encoding) =>
  createHmac('sha256', key).update(value).digest(encoding)

export const createLiveKitRoomToken = ({
  roomName,
  user,
  displayName,
  canPublish,
  apiKey,
  apiSecret,
  issuedAt = Math.floor(Date.now() / 1000),
}) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const claims = Buffer.from(JSON.stringify({
    iss: apiKey,
    sub: String(user.id),
    name: displayName,
    nbf: issuedAt - 5,
    iat: issuedAt,
    exp: issuedAt + 3600,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe: true,
      canPublishData: canPublish,
    },
  })).toString('base64url')
  const unsignedToken = `${header}.${claims}`
  return `${unsignedToken}.${hmac(apiSecret, unsignedToken, 'base64url')}`
}

const hasValidStripeSignature = (payload, signatureHeader, secret) => {
  const parts = String(signatureHeader || '').split(',').map((part) => part.split('=', 2))
  const timestamp = parts.find(([key]) => key === 't')?.[1]
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value)
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false

  const expected = Buffer.from(hmac(secret, `${timestamp}.${payload}`, 'hex'), 'hex')
  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false
    const received = Buffer.from(signature, 'hex')
    return received.length === expected.length && timingSafeEqual(received, expected)
  })
}

const makeProfile = async ({ db, get, run }, user) => {
  const existing = await get(db, 'SELECT * FROM creator_profiles WHERE user_id = ?', [user.id])
  if (existing) return existing

  const baseUsername = `${user.first_name || ''}-${user.last_name || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
  const username = `${baseUsername || 'trader'}_${user.id}`.slice(0, 40)
  const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || username
  await run(
    db,
    `INSERT INTO creator_profiles
       (user_id, username, display_name, bio, is_verified, created_at)
     VALUES (?, ?, ?, '', FALSE, ?)
     ON CONFLICT (user_id) DO NOTHING`,
    [user.id, username, displayName, now()]
  )
  return get(db, 'SELECT * FROM creator_profiles WHERE user_id = ?', [user.id])
}

const isStreamingAdmin = (user) =>
  Boolean(
    user?.email &&
      process.env.STREAM_ADMIN_EMAIL &&
      process.env.STREAM_ADMIN_USER_ID &&
      String(user.id) === process.env.STREAM_ADMIN_USER_ID.trim() &&
      user.email.trim().toLowerCase() === process.env.STREAM_ADMIN_EMAIL.trim().toLowerCase()
  )

const presentProfile = (profile, { isAdmin = false, followers = 0, following = 0, isFollowing = false } = {}) => ({
  user_id: profile.user_id,
  username: profile.username,
  display_name: profile.display_name,
  bio: profile.bio,
  avatar_url: null,
  is_verified: Boolean(profile.is_verified) || isAdmin,
  is_admin: isAdmin,
  followers: Number(followers),
  following: Number(following),
  is_following: Boolean(isFollowing),
})

const mediaUrl = async (storage, bucket, key) => {
  if (!storage || !key) return null
  return getSignedUrl(storage, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: 3600,
  })
}

const sendHttpError = (res, status, error) =>
  res.status(status).json({ success: false, error })

export const createStreamingRouter = ({
  db,
  requireAuth,
  asyncRoute,
  run,
  get,
  all,
  transaction,
}) => {
  const router = Router()
  const bucket = process.env.STREAM_MEDIA_BUCKET || 'stream-media'
  let storageClient
  let storageConfigChecked = false
  let storageConfig

  const getStorage = () => {
    if (!storageConfigChecked) {
      storageConfig = getStorageConfig()
      storageConfigChecked = true
    }
    return storageConfig
  }
  const getS3Client = () => {
    if (storageClient) return storageClient
    const config = getStorage()
    if (!config) return null
    storageClient = new S3Client({
      endpoint: config.endpoint.toString(),
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
    return storageClient
  }

  const getStripe = () => process.env.STRIPE_SECRET_KEY || null

  const isStripeConfigured = () => {
    if (!getStripe() || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STREAMING_PUBLIC_URL) {
      return false
    }
    try {
      const publicUrl = new URL(process.env.STREAMING_PUBLIC_URL)
      return process.env.NODE_ENV !== 'production' || publicUrl.protocol === 'https:'
    } catch {
      return false
    }
  }

  router.use((req, res, next) => {
    if (
      process.env.NODE_ENV !== 'production' ||
      req.path === '/stripe/webhook' ||
      !['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)
    ) {
      next()
      return
    }

    const appOrigins = getStreamingAllowedOrigins()
    if (appOrigins.length === 0) {
      sendHttpError(
        res,
        503,
        'Set STREAMING_PUBLIC_URL or CORS_ORIGINS before enabling streaming actions.'
      )
      return
    }
    if (!appOrigins.includes(req.get('origin'))) {
      sendHttpError(
        res,
        403,
        'Streaming actions must come from STREAMING_PUBLIC_URL or an origin listed in CORS_ORIGINS.'
      )
      return
    }
    next()
  })

  const deleteStoredVideo = async (storage, key) => {
    await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  }

  const uploadVideo = multer({
    storage: multer.diskStorage({
      destination: os.tmpdir(),
      filename: (_req, file, callback) => {
        const extension = VIDEO_TYPES.get(file.mimetype)
        callback(null, `${randomUUID()}${extension || ''}`)
      },
    }),
    limits: { fileSize: 100 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!VIDEO_TYPES.has(file.mimetype)) {
        callback(new Error('Upload an MP4, WebM, or QuickTime video.'))
        return
      }
      callback(null, true)
    },
  }).single('video')

  const receiveVideo = (req, res, next) => {
    uploadVideo(req, res, (error) => {
      if (!error) {
        next()
        return
      }
      sendHttpError(res, 400, error.message || 'Unable to receive the video.')
    })
  }

  const ensureOwnProfile = async (user) => {
    const profile = await makeProfile({ db, get, run }, user)
    if (!isStreamingAdmin(user)) return profile
    await run(
      db,
      `UPDATE creator_profiles
       SET is_verified = TRUE, verified_at = COALESCE(verified_at, ?),
           verified_by = ?
       WHERE user_id = ?`,
      [now(), user.id, user.id]
    )
    return get(db, 'SELECT * FROM creator_profiles WHERE user_id = ?', [user.id])
  }

  const ensureAdmin = (req, res) => {
    if (!process.env.STREAM_ADMIN_EMAIL) {
      sendHttpError(res, 503, 'Streaming admin is not configured on the server.')
      return false
    }
    if (!isStreamingAdmin(req.session.user)) {
      sendHttpError(res, 403, 'Streaming admin access is required.')
      return false
    }
    return true
  }

  const getLiveLikeCount = async (liveSessionId) => {
    const result = await get(
      db,
      'SELECT COALESCE(SUM(likes), 0) AS likes FROM creator_live_likes WHERE live_session_id = ?',
      [liveSessionId]
    )
    return Number(result?.likes || 0)
  }

  const issueRoomToken = async (roomName, user, displayName, canPublish) => {
    return createLiveKitRoomToken({
      roomName,
      user,
      displayName,
      canPublish,
      apiKey: process.env.LIVEKIT_API_KEY,
      apiSecret: process.env.LIVEKIT_API_SECRET,
    })
  }

  const getCommentList = async (query, values) => {
    const comments = await all(
      db,
      `SELECT c.id, c.body, c.created_at, p.username, p.display_name, p.is_verified
       FROM creator_comments c
       JOIN creator_profiles p ON p.user_id = c.author_id
       WHERE ${query}
       ORDER BY c.created_at DESC
       LIMIT 100`,
      values
    )
    return comments.reverse().map((comment) => ({
      ...comment,
      is_verified: Boolean(comment.is_verified),
    }))
  }

  router.get(
    '/profile/me',
    requireAuth,
    asyncRoute(async (req, res) => {
      const profile = await ensureOwnProfile(req.session.user)
      const [counts, wallet, earnings] = await Promise.all([
        get(
          db,
          `SELECT
             (SELECT COUNT(*) FROM creator_follows WHERE followed_id = ?) AS followers,
             (SELECT COUNT(*) FROM creator_follows WHERE follower_id = ?) AS following`,
          [req.session.user.id, req.session.user.id]
        ),
        get(db, 'SELECT balance_coins FROM creator_coin_wallets WHERE user_id = ?', [req.session.user.id]),
        get(db, 'SELECT COALESCE(SUM(amount_coins), 0) AS coins FROM creator_gift_earnings WHERE creator_id = ?', [req.session.user.id]),
      ])
      res.json({
        success: true,
        profile: presentProfile(profile, {
          isAdmin: isStreamingAdmin(req.session.user),
          followers: counts.followers,
          following: counts.following,
        }),
        wallet: {
          balance_coins: Number(wallet?.balance_coins || 0),
          gift_earnings_coins: Number(earnings?.coins || 0),
          cash_payouts_enabled: false,
        },
        gifts: Object.values(GIFTS),
        coin_bundles: Object.values(COIN_BUNDLES),
      })
    })
  )

  router.patch(
    '/profile/me',
    requireAuth,
    asyncRoute(async (req, res) => {
      const current = await ensureOwnProfile(req.session.user)
      const username = String(req.body?.username ?? current.username).trim().toLowerCase()
      const displayName = String(req.body?.display_name ?? current.display_name).trim()
      const bio = String(req.body?.bio ?? current.bio).trim()

      if (!/^[a-z0-9_]{3,40}$/.test(username) || !displayName || displayName.length > 60 || bio.length > 240) {
        return sendHttpError(res, 400, 'Use a 3–40 character username, a display name up to 60 characters, and a bio up to 240 characters.')
      }
      const usernameOwner = await get(
        db,
        'SELECT user_id FROM creator_profiles WHERE LOWER(username) = LOWER(?)',
        [username]
      )
      if (usernameOwner && String(usernameOwner.user_id) !== String(req.session.user.id)) {
        return sendHttpError(res, 409, 'That username is already taken.')
      }

      await run(
        db,
        `UPDATE creator_profiles
         SET username = ?, display_name = ?, bio = ?
         WHERE user_id = ?`,
        [username, displayName, bio, req.session.user.id]
      )
      const profile = await get(db, 'SELECT * FROM creator_profiles WHERE user_id = ?', [req.session.user.id])
      res.json({
        success: true,
        profile: presentProfile(profile, { isAdmin: isStreamingAdmin(req.session.user) }),
      })
    })
  )

  router.get(
    '/profiles/:username',
    requireAuth,
    asyncRoute(async (req, res) => {
      const profile = await get(
        db,
        `SELECT p.*, u.email FROM creator_profiles p
         JOIN users u ON u.id = p.user_id
         WHERE LOWER(p.username) = LOWER(?)`,
        [req.params.username]
      )
      if (!profile) return sendHttpError(res, 404, 'Creator profile not found.')
      const [counts, followed] = await Promise.all([
        get(
          db,
          `SELECT
             (SELECT COUNT(*) FROM creator_follows WHERE followed_id = ?) AS followers,
             (SELECT COUNT(*) FROM creator_follows WHERE follower_id = ?) AS following`,
          [profile.user_id, profile.user_id]
        ),
        get(
          db,
          'SELECT 1 FROM creator_follows WHERE follower_id = ? AND followed_id = ?',
          [req.session.user.id, profile.user_id]
        ),
      ])
      res.json({
        success: true,
        profile: presentProfile(profile, {
          isAdmin: isStreamingAdmin({ id: profile.user_id, email: profile.email }),
          followers: counts.followers,
          following: counts.following,
          isFollowing: Boolean(followed),
        }),
      })
    })
  )

  router.get(
    '/profiles/:username/connections/:connectionType',
    requireAuth,
    asyncRoute(async (req, res) => {
      const { username, connectionType } = req.params
      if (!['followers', 'following'].includes(connectionType)) {
        return sendHttpError(res, 400, 'Choose followers or following.')
      }
      const profile = await get(
        db,
        'SELECT user_id FROM creator_profiles WHERE LOWER(username) = LOWER(?)',
        [username]
      )
      if (!profile) return sendHttpError(res, 404, 'Creator profile not found.')
      const direction = connectionType === 'followers' ? 'f.followed_id' : 'f.follower_id'
      const related = connectionType === 'followers' ? 'f.follower_id' : 'f.followed_id'
      const connections = await all(
        db,
        `SELECT p.user_id, p.username, p.display_name, p.is_verified,
                (SELECT COUNT(*) FROM creator_follows mine
                 WHERE mine.follower_id = ? AND mine.followed_id = p.user_id) AS is_following
         FROM creator_follows f
         JOIN creator_profiles p ON p.user_id = ${related}
         WHERE ${direction} = ?
         ORDER BY f.created_at DESC
         LIMIT 100`,
        [req.session.user.id, profile.user_id]
      )
      res.json({
        success: true,
        connections: connections.map((connection) => ({
          ...connection,
          is_verified: Boolean(connection.is_verified),
          is_following: Boolean(connection.is_following),
        })),
      })
    })
  )

  router.get(
    '/creators',
    requireAuth,
    asyncRoute(async (req, res) => {
      const query = String(req.query.q || '').trim()
      if (query.length > 60) return sendHttpError(res, 400, 'Creator search must be 60 characters or fewer.')
      const pattern = `%${query.replace(/[\\%_]/g, (character) => `\\${character}`)}%`
      const creators = await all(
        db,
        `SELECT p.user_id, p.username, p.display_name, p.bio, p.is_verified,
                (SELECT COUNT(*) FROM creator_follows f WHERE f.followed_id = p.user_id) AS followers,
                (SELECT COUNT(*) FROM creator_follows f WHERE f.follower_id = p.user_id) AS following,
                (SELECT COUNT(*) FROM creator_follows f
                 WHERE f.follower_id = ? AND f.followed_id = p.user_id) AS is_following
         FROM creator_profiles p
         WHERE p.user_id <> ?
           AND (LOWER(p.username) LIKE LOWER(?) ESCAPE '\\'
             OR LOWER(p.display_name) LIKE LOWER(?) ESCAPE '\\')
         ORDER BY is_following DESC, followers DESC, p.created_at DESC
         LIMIT 20`,
        [req.session.user.id, req.session.user.id, pattern, pattern]
      )
      res.json({
        success: true,
        creators: creators.map((creator) => ({
          ...creator,
          followers: Number(creator.followers),
          following: Number(creator.following),
          is_following: Boolean(creator.is_following),
          is_verified: Boolean(creator.is_verified),
        })),
      })
    })
  )

  router.get(
    '/profiles/:username/posts',
    requireAuth,
    asyncRoute(async (req, res) => {
      const profile = await get(
        db,
        'SELECT user_id FROM creator_profiles WHERE LOWER(username) = LOWER(?)',
        [req.params.username]
      )
      if (!profile) return sendHttpError(res, 404, 'Creator profile not found.')
      const posts = await all(
        db,
        `SELECT p.id, p.author_id, p.caption, p.media_key, p.media_type, p.created_at,
                c.username, c.display_name, c.is_verified,
                (SELECT COUNT(*) FROM creator_post_likes l WHERE l.post_id = p.id) AS likes,
                (SELECT COUNT(*) FROM creator_post_likes l
                 WHERE l.post_id = p.id AND l.user_id = ?) AS liked,
                (SELECT COUNT(*) FROM creator_follows f
                 WHERE f.follower_id = ? AND f.followed_id = p.author_id) AS is_following
         FROM creator_posts p
         JOIN creator_profiles c ON c.user_id = p.author_id
         WHERE p.author_id = ?
         ORDER BY p.created_at DESC
         LIMIT 40`,
        [req.session.user.id, req.session.user.id, profile.user_id]
      )
      const storage = getS3Client()
      res.json({
        success: true,
        posts: await Promise.all(
          posts.map(async (post) => ({
            ...post,
            likes: Number(post.likes),
            liked: Boolean(post.liked),
            is_following: Boolean(post.is_following),
            is_verified: Boolean(post.is_verified),
            media_url: await mediaUrl(storage, bucket, post.media_key),
          }))
        ),
      })
    })
  )

  router.post(
    '/profiles/:username/follow',
    requireAuth,
    asyncRoute(async (req, res) => {
      const target = await get(
        db,
        'SELECT user_id FROM creator_profiles WHERE LOWER(username) = LOWER(?)',
        [req.params.username]
      )
      if (!target) return sendHttpError(res, 404, 'Creator profile not found.')
      if (String(target.user_id) === String(req.session.user.id)) {
        return sendHttpError(res, 400, 'You cannot follow your own profile.')
      }

      const existing = await get(
        db,
        'SELECT 1 FROM creator_follows WHERE follower_id = ? AND followed_id = ?',
        [req.session.user.id, target.user_id]
      )
      if (existing) {
        await run(
          db,
          'DELETE FROM creator_follows WHERE follower_id = ? AND followed_id = ?',
          [req.session.user.id, target.user_id]
        )
      } else {
        await run(
          db,
          'INSERT INTO creator_follows (follower_id, followed_id, created_at) VALUES (?, ?, ?)',
          [req.session.user.id, target.user_id, now()]
        )
      }
      res.json({ success: true, following: !existing })
    })
  )

  router.get(
    '/feed',
    requireAuth,
    asyncRoute(async (req, res) => {
      const posts = await all(
        db,
        `SELECT p.id, p.author_id, p.caption, p.media_key, p.media_type, p.created_at,
                c.username, c.display_name, c.is_verified,
                (SELECT COUNT(*) FROM creator_post_likes l WHERE l.post_id = p.id) AS likes,
                (SELECT COUNT(*) FROM creator_post_likes l
                 WHERE l.post_id = p.id AND l.user_id = ?) AS liked,
                (SELECT COUNT(*) FROM creator_follows f
                 WHERE f.follower_id = ? AND f.followed_id = p.author_id) AS is_following
         FROM creator_posts p
         JOIN creator_profiles c ON c.user_id = p.author_id
         ORDER BY p.created_at DESC
         LIMIT 40`,
        [req.session.user.id, req.session.user.id]
      )
      const live = await all(
        db,
        `SELECT s.id, s.host_user_id, s.title, s.started_at,
                p.username, p.display_name, p.is_verified,
                (SELECT COALESCE(SUM(l.likes), 0) FROM creator_live_likes l
                 WHERE l.live_session_id = s.id) AS likes
         FROM creator_live_sessions s
         JOIN creator_profiles p ON p.user_id = s.host_user_id
         WHERE s.status = 'live'
         ORDER BY s.started_at DESC
         LIMIT 40`
      )
      const storage = getS3Client()
      res.json({
        success: true,
        posts: await Promise.all(
          posts.map(async (post) => ({
            ...post,
            likes: Number(post.likes),
            liked: Boolean(post.liked),
            is_following: Boolean(post.is_following),
            is_verified: Boolean(post.is_verified),
            media_url: await mediaUrl(storage, bucket, post.media_key),
          }))
        ),
        live: live.map((stream) => ({
          ...stream,
          likes: Number(stream.likes || 0),
          is_verified: Boolean(stream.is_verified),
        })),
        media_configured: Boolean(storage),
        livekit_configured: isLiveKitConfigured(),
        stripe_configured: isStripeConfigured(),
      })
    })
  )

  router.post(
    '/posts',
    requireAuth,
    receiveVideo,
    asyncRoute(async (req, res) => {
      const file = req.file
      if (!file) return sendHttpError(res, 400, 'Choose a video to post.')
      const storage = getS3Client()
      if (!storage) {
        await fs.promises.unlink(file.path).catch((error) => {
          if (error.code !== 'ENOENT') console.error('Unable to remove unconfigured video upload:', error)
        })
        return sendHttpError(res, 503, 'Video storage is not configured on the server.')
      }

      const caption = String(req.body?.caption || '').trim()
      if (caption.length > 1000) {
        await fs.promises.unlink(file.path).catch((error) => {
          if (error.code !== 'ENOENT') console.error('Unable to remove invalid streaming video:', error)
        })
        return sendHttpError(res, 400, 'Video captions must be 1000 characters or fewer.')
      }

      const id = randomUUID()
      const extension = VIDEO_TYPES.get(file.mimetype)
      const mediaKey = `videos/${req.session.user.id}/${id}${extension}`
      try {
        await new Upload({
          client: storage,
          params: {
            Bucket: bucket,
            Key: mediaKey,
            Body: createReadStream(file.path),
            ContentType: file.mimetype,
            CacheControl: 'private, max-age=300',
          },
        }).done()
        await run(
          db,
          `INSERT INTO creator_posts
             (id, author_id, caption, media_key, media_type, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, req.session.user.id, caption, mediaKey, file.mimetype, now()]
        )
      } catch (error) {
        try {
          await deleteStoredVideo(storage, mediaKey)
        } catch (cleanupError) {
          console.error('Unable to clean up an unposted streaming video:', cleanupError)
        }
        throw error
      } finally {
        await fs.promises.unlink(file.path).catch((error) => {
          if (error.code !== 'ENOENT') console.error('Unable to remove temporary streaming video:', error)
        })
      }
      res.status(201).json({ success: true, post_id: id })
    })
  )

  router.post(
    '/posts/:postId/like',
    requireAuth,
    asyncRoute(async (req, res) => {
      const post = await get(db, 'SELECT id FROM creator_posts WHERE id = ?', [req.params.postId])
      if (!post) return sendHttpError(res, 404, 'Video not found.')
      const existing = await get(
        db,
        'SELECT 1 FROM creator_post_likes WHERE post_id = ? AND user_id = ?',
        [post.id, req.session.user.id]
      )
      if (existing) {
        await run(
          db,
          'DELETE FROM creator_post_likes WHERE post_id = ? AND user_id = ?',
          [post.id, req.session.user.id]
        )
      } else {
        await run(
          db,
          'INSERT INTO creator_post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)',
          [post.id, req.session.user.id, now()]
        )
      }
      res.json({ success: true, liked: !existing })
    })
  )

  router.get(
    '/posts/:postId/comments',
    requireAuth,
    asyncRoute(async (req, res) => {
      res.json({
        success: true,
        comments: await getCommentList('c.post_id = ?', [req.params.postId]),
      })
    })
  )

  router.post(
    '/posts/:postId/comments',
    requireAuth,
    asyncRoute(async (req, res) => {
      const body = String(req.body?.body || '').trim()
      if (!body || body.length > 500) {
        return sendHttpError(res, 400, 'Comments must contain 1–500 characters.')
      }
      const post = await get(db, 'SELECT id FROM creator_posts WHERE id = ?', [req.params.postId])
      if (!post) return sendHttpError(res, 404, 'Video not found.')
      const authorProfile = await ensureOwnProfile(req.session.user)
      const id = randomUUID()
      const createdAt = now()
      await run(
        db,
        `INSERT INTO creator_comments (id, post_id, live_session_id, author_id, body, created_at)
         VALUES (?, ?, NULL, ?, ?, ?)`,
        [id, post.id, req.session.user.id, body, createdAt]
      )
      res.status(201).json({
        success: true,
        comment: {
          id,
          body,
          created_at: createdAt,
          display_name: authorProfile.display_name,
          username: authorProfile.username,
        },
      })
    })
  )

  router.post(
    '/live',
    requireAuth,
    asyncRoute(async (req, res) => {
      if (!isLiveKitConfigured()) {
        return sendHttpError(res, 503, 'LiveKit is not configured on the server.')
      }
      const title = String(req.body?.title || '').trim()
      if (!title || title.length > 100) {
        return sendHttpError(res, 400, 'Enter a live title of up to 100 characters.')
      }
      const existing = await get(
        db,
        `SELECT id FROM creator_live_sessions
         WHERE host_user_id = ? AND status = 'live'`,
        [req.session.user.id]
      )
      if (existing) return sendHttpError(res, 409, 'You already have a live session running.')

      const profile = await ensureOwnProfile(req.session.user)
      const id = randomUUID()
      const roomName = `nexa-${id}`
      const startedAt = now()
      try {
        await run(
          db,
          `INSERT INTO creator_live_sessions
             (id, host_user_id, room_name, title, status, started_at)
           VALUES (?, ?, ?, ?, 'live', ?)`,
          [id, req.session.user.id, roomName, title, startedAt]
        )
      } catch (error) {
        if (error.code === '23505' || String(error.message).includes('UNIQUE')) {
          return sendHttpError(res, 409, 'You already have a live session running.')
        }
        throw error
      }
      res.status(201).json({
        success: true,
        stream: {
          id,
          title,
          started_at: startedAt,
          username: profile.username,
          display_name: profile.display_name,
          likes: 0,
        },
        livekit_url: process.env.LIVEKIT_URL,
        token: await issueRoomToken(
          roomName,
          req.session.user,
          `${profile.display_name} (@${profile.username})`,
          true
        ),
      })
    })
  )

  router.post(
    '/live/:streamId/token',
    requireAuth,
    asyncRoute(async (req, res) => {
      if (!isLiveKitConfigured()) {
        return sendHttpError(res, 503, 'LiveKit is not configured on the server.')
      }
      const stream = await get(
        db,
        `SELECT s.id, s.host_user_id, s.room_name, s.title, p.display_name, p.username
         FROM creator_live_sessions s
         JOIN creator_profiles p ON p.user_id = s.host_user_id
         WHERE s.id = ? AND s.status = 'live'`,
        [req.params.streamId]
      )
      if (!stream) return sendHttpError(res, 404, 'This live session has ended.')
      const isHost = String(stream.host_user_id) === String(req.session.user.id)
      const cohost = isHost ? null : await get(
        db,
        `SELECT accepted_at FROM creator_live_cohosts
         WHERE live_session_id = ? AND user_id = ?`,
        [stream.id, req.session.user.id]
      )
      const isCohost = Boolean(cohost?.accepted_at)
      const viewerProfile = isHost
        ? { username: stream.username, display_name: stream.display_name }
        : await ensureOwnProfile(req.session.user)
      const participantName = `${viewerProfile.display_name} (@${viewerProfile.username})`
      res.json({
        success: true,
        stream: {
          id: stream.id,
          title: stream.title,
          display_name: stream.display_name,
          username: stream.username,
          likes: await getLiveLikeCount(stream.id),
        },
        livekit_url: process.env.LIVEKIT_URL,
        token: await issueRoomToken(
          stream.room_name,
          req.session.user,
          participantName,
          isHost || isCohost
        ),
        is_host: isHost,
        is_cohost: isCohost,
      })
    })
  )

  router.post(
    '/live/:streamId/cohosts',
    requireAuth,
    asyncRoute(async (req, res) => {
      const stream = await get(
        db,
        `SELECT id, host_user_id FROM creator_live_sessions
         WHERE id = ? AND status = 'live'`,
        [req.params.streamId]
      )
      if (!stream) return sendHttpError(res, 404, 'This live session has ended.')
      if (String(stream.host_user_id) !== String(req.session.user.id)) {
        return sendHttpError(res, 403, 'Only the stream owner can invite a cohost.')
      }
      const username = String(req.body?.username || '').trim()
      const invitee = await get(
        db,
        'SELECT user_id, username, display_name FROM creator_profiles WHERE LOWER(username) = LOWER(?)',
        [username]
      )
      if (!invitee) return sendHttpError(res, 404, 'Creator profile not found.')
      if (String(invitee.user_id) === String(req.session.user.id)) {
        return sendHttpError(res, 400, 'You are already the owner of this stream.')
      }
      const existing = await get(
        db,
        `SELECT accepted_at FROM creator_live_cohosts
         WHERE live_session_id = ? AND user_id = ?`,
        [stream.id, invitee.user_id]
      )
      if (existing) {
        return sendHttpError(
          res,
          409,
          existing.accepted_at ? 'This creator is already a cohost.' : 'This creator has already been invited.'
        )
      }
      await run(
        db,
        `INSERT INTO creator_live_cohosts
           (live_session_id, user_id, invited_by, invited_at, accepted_at)
         VALUES (?, ?, ?, ?, NULL)`,
        [stream.id, invitee.user_id, req.session.user.id, now()]
      )
      res.status(201).json({
        success: true,
        invitee: { username: invitee.username, display_name: invitee.display_name },
      })
    })
  )

  router.get(
    '/live/:streamId/cohost-invitation',
    requireAuth,
    asyncRoute(async (req, res) => {
      const stream = await get(
        db,
        `SELECT id FROM creator_live_sessions
         WHERE id = ? AND status = 'live'`,
        [req.params.streamId]
      )
      if (!stream) return sendHttpError(res, 404, 'This live session has ended.')
      const invite = await get(
        db,
        `SELECT accepted_at FROM creator_live_cohosts
         WHERE live_session_id = ? AND user_id = ?`,
        [stream.id, req.session.user.id]
      )
      res.json({
        success: true,
        invited: Boolean(invite),
        accepted: Boolean(invite?.accepted_at),
      })
    })
  )

  router.post(
    '/live/:streamId/cohost-accept',
    requireAuth,
    asyncRoute(async (req, res) => {
      if (!isLiveKitConfigured()) {
        return sendHttpError(res, 503, 'LiveKit is not configured on the server.')
      }
      const stream = await get(
        db,
        `SELECT s.id, s.room_name, s.title, p.username, p.display_name
         FROM creator_live_sessions s
         JOIN creator_profiles p ON p.user_id = s.host_user_id
         JOIN creator_live_cohosts c ON c.live_session_id = s.id
         WHERE s.id = ? AND c.user_id = ? AND s.status = 'live'`,
        [req.params.streamId, req.session.user.id]
      )
      if (!stream) return sendHttpError(res, 403, 'You do not have an active cohost invitation.')
      const acceptedAt = now()
      await run(
        db,
        `UPDATE creator_live_cohosts SET accepted_at = ?
         WHERE live_session_id = ? AND user_id = ?`,
        [acceptedAt, stream.id, req.session.user.id]
      )
      const profile = await ensureOwnProfile(req.session.user)
      res.json({
        success: true,
        is_cohost: true,
        stream: {
          id: stream.id,
          title: stream.title,
          display_name: stream.display_name,
          username: stream.username,
          likes: await getLiveLikeCount(stream.id),
        },
        livekit_url: process.env.LIVEKIT_URL,
        token: await issueRoomToken(
          stream.room_name,
          req.session.user,
          `${profile.display_name} (@${profile.username})`,
          true
        ),
      })
    })
  )

  router.get(
    '/live/:streamId/likes',
    requireAuth,
    asyncRoute(async (req, res) => {
      const stream = await get(
        db,
        `SELECT id FROM creator_live_sessions WHERE id = ? AND status = 'live'`,
        [req.params.streamId]
      )
      if (!stream) return sendHttpError(res, 404, 'This live session has ended.')
      res.json({ success: true, likes: await getLiveLikeCount(stream.id) })
    })
  )

  router.post(
    '/live/:streamId/likes',
    requireAuth,
    asyncRoute(async (req, res) => {
      const stream = await get(
        db,
        `SELECT id FROM creator_live_sessions WHERE id = ? AND status = 'live'`,
        [req.params.streamId]
      )
      if (!stream) return sendHttpError(res, 404, 'This live session has ended.')
      await run(
        db,
        `INSERT INTO creator_live_likes (live_session_id, user_id, likes, updated_at)
         VALUES (?, ?, 1, ?)
         ON CONFLICT (live_session_id, user_id)
         DO UPDATE SET likes = creator_live_likes.likes + 1, updated_at = excluded.updated_at`,
        [stream.id, req.session.user.id, now()]
      )
      res.json({ success: true, likes: await getLiveLikeCount(stream.id) })
    })
  )

  router.post(
    '/live/:streamId/end',
    requireAuth,
    asyncRoute(async (req, res) => {
      const stream = await get(
        db,
        'SELECT room_name FROM creator_live_sessions WHERE id = ? AND host_user_id = ? AND status = ?',
        [req.params.streamId, req.session.user.id, 'live']
      )
      if (!stream) return sendHttpError(res, 404, 'Your live session was not found.')
      await run(
        db,
        `UPDATE creator_live_sessions
         SET status = 'ended', ended_at = ?
         WHERE id = ? AND host_user_id = ? AND status = 'live'`,
        [now(), req.params.streamId, req.session.user.id]
      )
      res.json({ success: true })
    })
  )

  router.get(
    '/live/:streamId/comments',
    requireAuth,
    asyncRoute(async (req, res) => {
      res.json({
        success: true,
        comments: await getCommentList('c.live_session_id = ?', [req.params.streamId]),
      })
    })
  )

  router.post(
    '/live/:streamId/comments',
    requireAuth,
    asyncRoute(async (req, res) => {
      const body = String(req.body?.body || '').trim()
      if (!body || body.length > 500) {
        return sendHttpError(res, 400, 'Comments must contain 1–500 characters.')
      }
      const stream = await get(
        db,
        `SELECT id FROM creator_live_sessions
         WHERE id = ? AND status = 'live'`,
        [req.params.streamId]
      )
      if (!stream) return sendHttpError(res, 404, 'This live session has ended.')
      const authorProfile = await ensureOwnProfile(req.session.user)
      const id = randomUUID()
      const createdAt = now()
      await run(
        db,
        `INSERT INTO creator_comments (id, post_id, live_session_id, author_id, body, created_at)
         VALUES (?, NULL, ?, ?, ?, ?)`,
        [id, stream.id, req.session.user.id, body, createdAt]
      )
      res.status(201).json({
        success: true,
        comment: {
          id,
          body,
          created_at: createdAt,
          display_name: authorProfile.display_name,
          username: authorProfile.username,
        },
      })
    })
  )

  router.get(
    '/wallet',
    requireAuth,
    asyncRoute(async (req, res) => {
      const [wallet, earnings] = await Promise.all([
        get(db, 'SELECT balance_coins FROM creator_coin_wallets WHERE user_id = ?', [req.session.user.id]),
        get(db, 'SELECT COALESCE(SUM(amount_coins), 0) AS coins FROM creator_gift_earnings WHERE creator_id = ?', [req.session.user.id]),
      ])
      res.json({
        success: true,
        balance_coins: Number(wallet?.balance_coins || 0),
        gift_earnings_coins: Number(earnings?.coins || 0),
        cash_payouts_enabled: false,
      })
    })
  )

  router.post(
    '/coins/checkout',
    requireAuth,
    asyncRoute(async (req, res) => {
      const stripe = getStripe()
      const bundle = COIN_BUNDLES[String(req.body?.bundle_id || '')]
      const publicUrl = process.env.STREAMING_PUBLIC_URL?.replace(/\/+$/, '')
      if (!stripe || !isStripeConfigured() || !publicUrl) {
        return sendHttpError(res, 503, 'Stripe checkout is not fully configured on the server.')
      }
      if (!bundle) return sendHttpError(res, 400, 'Choose a valid coin bundle.')
      if (process.env.NODE_ENV === 'production' && !publicUrl.startsWith('https://')) {
        return sendHttpError(res, 503, 'Streaming checkout requires an HTTPS public app URL.')
      }

      const form = new URLSearchParams({
        mode: 'payment',
        'line_items[0][price_data][currency]': bundle.currency,
        'line_items[0][price_data][unit_amount]': String(bundle.amount_minor),
        'line_items[0][price_data][product_data][name]': `${bundle.coins} Nexa trading coins`,
        'line_items[0][quantity]': '1',
        client_reference_id: String(req.session.user.id),
        'metadata[kind]': 'creator_coin_bundle',
        'metadata[user_id]': String(req.session.user.id),
        'metadata[bundle_id]': bundle.bundle_id,
        'metadata[coins]': String(bundle.coins),
        success_url: `${publicUrl}/streaming?coins=processing`,
        cancel_url: `${publicUrl}/streaming?coins=cancelled`,
      })
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${stripe}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      })
      const checkout = await response.json()
      if (!response.ok || !checkout.url) {
        console.error('Stripe checkout creation failed:', checkout.error?.message || response.status)
        return sendHttpError(res, 502, 'Unable to start Stripe checkout. Please try again later.')
      }
      res.json({ success: true, checkout_url: checkout.url })
    })
  )

  router.post(
    '/stripe/webhook',
    async (req, res) => {
      const stripe = getStripe()
      const signature = req.get('stripe-signature')
      if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
        return sendHttpError(res, 503, 'Stripe webhook is not configured on the server.')
      }
      if (!Buffer.isBuffer(req.rawBody) || !signature) {
        return sendHttpError(res, 400, 'A signed Stripe webhook payload is required.')
      }

      let event
      try {
        if (!hasValidStripeSignature(req.rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)) {
          return sendHttpError(res, 400, 'Invalid Stripe webhook signature.')
        }
        event = JSON.parse(req.rawBody.toString('utf8'))
      } catch (error) {
        console.warn('Stripe webhook signature verification failed:', error.message)
        return sendHttpError(res, 400, 'Invalid Stripe webhook payload.')
      }
      if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
        return sendHttpError(res, 400, 'Invalid Stripe webhook event.')
      }

      if (event.type !== 'checkout.session.completed') {
        return res.json({ received: true })
      }
      const checkout = event.data?.object
      if (!checkout || typeof checkout !== 'object' || typeof checkout.id !== 'string') {
        return sendHttpError(res, 400, 'Invalid Stripe checkout event.')
      }
      if (checkout.payment_status !== 'paid' || checkout.metadata?.kind !== 'creator_coin_bundle') {
        return res.json({ received: true })
      }
      const userId = checkout.metadata.user_id
      const coins = Number(checkout.metadata.coins)
      const bundle = COIN_BUNDLES[checkout.metadata.bundle_id]
      if (
        !isPostgresId(userId) ||
        !bundle ||
        coins !== bundle.coins ||
        Number(checkout.amount_total) !== bundle.amount_minor ||
        checkout.currency !== bundle.currency
      ) {
        return sendHttpError(res, 400, 'Stripe checkout metadata is invalid.')
      }
      const createdAt = now()
      try {
        await transaction(db, async (execute) => {
          const purchase = await execute(
          `INSERT INTO creator_coin_purchases
             (stripe_session_id, user_id, amount_minor, coins, currency, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (stripe_session_id) DO NOTHING`,
          [checkout.id, userId, Number(checkout.amount_total), coins, checkout.currency, createdAt]
          )
          if (!purchase.changes) return
          await execute(
          `INSERT INTO creator_coin_wallets (user_id, balance_coins, updated_at)
           VALUES (?, 0, ?)
           ON CONFLICT (user_id) DO NOTHING`,
          [userId, createdAt]
          )
          await execute(
          `UPDATE creator_coin_wallets
           SET balance_coins = balance_coins + ?, updated_at = ?
           WHERE user_id = ?`,
          [coins, createdAt, userId]
          )
          await execute(
          `INSERT INTO creator_coin_ledger
             (id, user_id, amount_coins, entry_type, reference_id, created_at)
           VALUES (?, ?, ?, 'purchase', ?, ?)`,
          [randomUUID(), userId, coins, `stripe-session:${checkout.id}`, createdAt]
          )
        })
      } catch (error) {
        console.error('Unable to credit coins for Stripe checkout:', error)
        return sendHttpError(res, 500, 'Unable to credit coins yet. Stripe will retry this event.')
      }
      res.json({ received: true })
    }
  )

  router.post(
    '/gifts',
    requireAuth,
    asyncRoute(async (req, res) => {
      const gift = GIFTS[String(req.body?.gift_id || '')]
      const postId = req.body?.post_id ? String(req.body.post_id) : null
      const streamId = req.body?.live_session_id ? String(req.body.live_session_id) : null
      if (!gift || Boolean(postId) === Boolean(streamId)) {
        return sendHttpError(res, 400, 'Choose a gift and one valid video or live session.')
      }

      const target = postId
        ? await get(db, 'SELECT author_id AS recipient_id FROM creator_posts WHERE id = ?', [postId])
        : await get(
            db,
            `SELECT host_user_id AS recipient_id FROM creator_live_sessions
             WHERE id = ? AND status = 'live'`,
            [streamId]
          )
      if (!target) return sendHttpError(res, 404, 'The creator content is no longer available.')
      if (String(target.recipient_id) === String(req.session.user.id)) {
        return sendHttpError(res, 400, 'You cannot send gifts to yourself.')
      }

      const id = randomUUID()
      const createdAt = now()
      try {
        await transaction(db, async (execute) => {
          await execute(
            `INSERT INTO creator_coin_wallets (user_id, balance_coins, updated_at)
             VALUES (?, 0, ?)
             ON CONFLICT (user_id) DO NOTHING`,
            [req.session.user.id, createdAt]
          )
          const debit = await execute(
            `UPDATE creator_coin_wallets
             SET balance_coins = balance_coins - ?, updated_at = ?
             WHERE user_id = ? AND balance_coins >= ?`,
            [gift.coins, createdAt, req.session.user.id, gift.coins]
          )
          if (!debit.changes) {
            const error = new Error('Not enough coins to send this gift.')
            error.code = 'INSUFFICIENT_COINS'
            throw error
          }
          await execute(
            `INSERT INTO creator_gifts
               (id, sender_id, recipient_id, gift_id, amount_coins, live_session_id, post_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, req.session.user.id, target.recipient_id, gift.gift_id, gift.coins, streamId, postId, createdAt]
          )
          await execute(
            `INSERT INTO creator_coin_ledger
               (id, user_id, amount_coins, entry_type, reference_id, created_at)
             VALUES (?, ?, ?, 'gift_sent', ?, ?)`,
            [randomUUID(), req.session.user.id, -gift.coins, `gift:${id}`, createdAt]
          )
          await execute(
            `INSERT INTO creator_gift_earnings (id, creator_id, gift_id, amount_coins, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [randomUUID(), target.recipient_id, id, gift.coins, createdAt]
          )
        })
      } catch (error) {
        if (error.code === 'INSUFFICIENT_COINS') {
          return sendHttpError(res, 402, error.message)
        }
        throw error
      }
      res.status(201).json({ success: true, gift: { ...gift, id } })
    })
  )

  router.get(
    '/admin/profiles',
    requireAuth,
    asyncRoute(async (req, res) => {
      if (!ensureAdmin(req, res)) return
      const profiles = await all(
        db,
        `SELECT p.user_id, p.username, p.display_name, p.bio, p.is_verified, p.verified_at,
                u.email, u.created_at
         FROM creator_profiles p
         JOIN users u ON u.id = p.user_id
         ORDER BY p.is_verified ASC, p.created_at DESC
         LIMIT 200`
      )
      res.json({
        success: true,
        profiles: profiles.map((profile) => ({
          ...profile,
          is_verified: Boolean(profile.is_verified) || isStreamingAdmin({ id: profile.user_id, email: profile.email }),
          is_admin: isStreamingAdmin({ id: profile.user_id, email: profile.email }),
        })),
      })
    })
  )

  router.patch(
    '/admin/profiles/:userId/verification',
    requireAuth,
    asyncRoute(async (req, res) => {
      if (!ensureAdmin(req, res)) return
      if (!isPostgresId(req.params.userId) || typeof req.body?.verified !== 'boolean') {
        return sendHttpError(res, 400, 'A valid account and verification value are required.')
      }
      const targetUser = await get(
        db,
        'SELECT id, first_name, last_name, email FROM users WHERE id = ?',
        [req.params.userId]
      )
      if (!targetUser) return sendHttpError(res, 404, 'Account not found.')
      const profile = await makeProfile({ db, get, run }, targetUser)
      const verifiedAt = req.body.verified ? now() : null
      await run(
        db,
        `UPDATE creator_profiles
         SET is_verified = ?, verified_at = ?, verified_by = ?
         WHERE user_id = ?`,
        [req.body.verified, verifiedAt, req.body.verified ? req.session.user.id : null, req.params.userId]
      )
      res.json({
        success: true,
        profile: presentProfile(
          await get(db, 'SELECT * FROM creator_profiles WHERE user_id = ?', [profile.user_id]),
          { isAdmin: isStreamingAdmin(targetUser) }
        ),
      })
    })
  )

  router.get('/config', (_req, res) => {
    res.json({
      success: true,
      media_configured: Boolean(getStorage()),
      livekit_configured: isLiveKitConfigured(),
      stripe_configured: isStripeConfigured(),
    })
  })

  return router
}
