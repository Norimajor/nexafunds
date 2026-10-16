import test from 'node:test'
import assert from 'node:assert/strict'
import sqlite3 from 'sqlite3'
import {
  COIN_BUNDLES,
  createLiveKitRoomToken,
  formatStreamParticipantName,
  getStreamingAllowedOrigins,
  GIFTS,
} from './routes/streaming.js'
import { createStreamingSchema } from './streaming-schema.js'

const executeSqlite = (database, sql) =>
  new Promise((resolve, reject) => {
    database.run(sql, (error) => (error ? reject(error) : resolve()))
  })

const getSqlite = (database, sql, parameters) =>
  new Promise((resolve, reject) => {
    database.get(sql, parameters, (error, row) => (error ? reject(error) : resolve(row)))
  })

test('creates streaming tables in SQLite and enforces follow/gift constraints', async () => {
  const database = new sqlite3.Database(':memory:')
  try {
    await executeSqlite(
      database,
      `CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE)`
    )
    await executeSqlite(database, `INSERT INTO users (id, email) VALUES (1, 'one@example.com'), (2, 'two@example.com')`)
    await createStreamingSchema({
      execute: (sql) => executeSqlite(database, sql),
      userIdType: 'INTEGER',
    })

    await executeSqlite(
      database,
      `INSERT INTO creator_profiles
         (user_id, username, display_name, created_at)
       VALUES (1, 'one_trader', 'One Trader', CURRENT_TIMESTAMP),
              (2, 'two_trader', 'Two Trader', CURRENT_TIMESTAMP)`
    )
    await executeSqlite(
      database,
      `INSERT INTO creator_follows (follower_id, followed_id, created_at)
       VALUES (1, 2, CURRENT_TIMESTAMP)`
    )
    const searchResult = await getSqlite(
      database,
      `SELECT p.username,
              (SELECT COUNT(*) FROM creator_follows f
               WHERE f.follower_id = ? AND f.followed_id = p.user_id) AS is_following
       FROM creator_profiles p
       WHERE p.user_id <> ?
         AND (LOWER(p.username) LIKE LOWER(?) ESCAPE '\\'
           OR LOWER(p.display_name) LIKE LOWER(?) ESCAPE '\\')
       ORDER BY is_following DESC
       LIMIT 20`,
      [1, 1, '%two\\_trader%', '%Two\\_Trader%']
    )
    assert.equal(searchResult.username, 'two_trader')
    assert.equal(searchResult.is_following, 1)

    const selfFollow = executeSqlite(
      database,
      `INSERT INTO creator_follows (follower_id, followed_id, created_at)
       VALUES (1, 1, CURRENT_TIMESTAMP)`
    )
    await assert.rejects(selfFollow, /CHECK constraint failed/)

    await executeSqlite(
      database,
      `INSERT INTO creator_live_sessions
         (id, host_user_id, room_name, title, status, started_at)
       VALUES ('live-one', 2, 'room-one', 'Market open', 'live', CURRENT_TIMESTAMP)`
    )
    await executeSqlite(
      database,
      `INSERT INTO creator_live_cohosts
         (live_session_id, user_id, invited_by, invited_at, accepted_at)
       VALUES ('live-one', 1, 2, CURRENT_TIMESTAMP, NULL)`
    )
    await executeSqlite(
      database,
      `INSERT INTO creator_verification_requests
         (id, user_id, request_message, status, created_at)
       VALUES ('verify-one', 1, 'I am requesting creator verification.', 'pending', CURRENT_TIMESTAMP)`
    )
    const duplicateVerificationRequest = executeSqlite(
      database,
      `INSERT INTO creator_verification_requests
         (id, user_id, request_message, status, created_at)
       VALUES ('verify-two', 1, 'I am requesting another verification.', 'pending', CURRENT_TIMESTAMP)`
    )
    await assert.rejects(duplicateVerificationRequest, /UNIQUE constraint failed/)
    await executeSqlite(
      database,
      `UPDATE creator_verification_requests SET status = 'rejected' WHERE id = 'verify-one'`
    )
    await executeSqlite(
      database,
      `INSERT INTO creator_verification_requests
         (id, user_id, request_message, status, created_at)
       VALUES ('verify-two', 1, 'I am requesting an updated verification.', 'pending', CURRENT_TIMESTAMP)`
    )
    await executeSqlite(
      database,
      `INSERT INTO creator_live_likes (live_session_id, user_id, likes, updated_at)
       VALUES ('live-one', 1, 1, CURRENT_TIMESTAMP)
       ON CONFLICT (live_session_id, user_id)
       DO UPDATE SET likes = creator_live_likes.likes + 1`
    )
    await executeSqlite(
      database,
      `INSERT INTO creator_live_likes (live_session_id, user_id, likes, updated_at)
       VALUES ('live-one', 1, 1, CURRENT_TIMESTAMP)
       ON CONFLICT (live_session_id, user_id)
       DO UPDATE SET likes = creator_live_likes.likes + 1`
    )
    const liveLikes = await getSqlite(
      database,
      'SELECT SUM(likes) AS likes FROM creator_live_likes WHERE live_session_id = ?',
      ['live-one']
    )
    assert.equal(liveLikes.likes, 2)
    await executeSqlite(
      database,
      `INSERT INTO creator_gifts
         (id, sender_id, recipient_id, gift_id, amount_coins, live_session_id, created_at)
       VALUES ('gift-one', 1, 2, 'bull_run', 100, 'live-one', CURRENT_TIMESTAMP)`
    )

    const duplicateHostLiveSession = executeSqlite(
      database,
      `INSERT INTO creator_live_sessions
         (id, host_user_id, room_name, title, status, started_at)
       VALUES ('live-two', 2, 'room-two', 'Another stream', 'live', CURRENT_TIMESTAMP)`
    )
    await assert.rejects(duplicateHostLiveSession, /UNIQUE constraint failed/)
  } finally {
    await new Promise((resolve, reject) => {
      database.close((error) => (error ? reject(error) : resolve()))
    })
  }
})

test('uses the persistent PostgreSQL user ID type in every streaming relation', async () => {
  const statements = []
  await createStreamingSchema({
    execute: async (sql) => statements.push(sql),
    userIdType: 'BIGINT',
  })

  assert.ok(statements.length > 0)
  assert.ok(statements.some((sql) => sql.includes('user_id BIGINT PRIMARY KEY REFERENCES users(id)')))
  assert.ok(statements.some((sql) => sql.includes('follower_id BIGINT NOT NULL REFERENCES users(id)')))
  assert.ok(statements.some((sql) => sql.includes('host_user_id BIGINT NOT NULL REFERENCES users(id)')))
  assert.ok(statements.some((sql) => sql.includes('user_id BIGINT NOT NULL REFERENCES users(id)')))
  assert.ok(statements.some((sql) => sql.includes('invited_by BIGINT NOT NULL REFERENCES users(id)')))
  assert.ok(statements.some((sql) => sql.includes('reviewed_by BIGINT REFERENCES users(id)')))
})

test('prices the requested KSh coin bundles in KES minor units', () => {
  assert.deepEqual(
    Object.values(COIN_BUNDLES).map(({ coins, amount_minor, currency }) => ({
      coins,
      amount_minor,
      currency,
    })),
    [
      { coins: 10, amount_minor: 1000, currency: 'kes' },
      { coins: 50, amount_minor: 5000, currency: 'kes' },
      { coins: 100, amount_minor: 10000, currency: 'kes' },
      { coins: 500, amount_minor: 50000, currency: 'kes' },
    ]
  )
  assert.deepEqual(Object.values(GIFTS).map((gift) => gift.coins), [5, 10, 50, 100])
})

test('resolves the primary streaming URL and additional CORS origins', () => {
  assert.deepEqual(
    getStreamingAllowedOrigins({
      streamingPublicUrl: 'https://nexafunds.example/streaming/',
      corsOrigins: ' https://preview.nexafunds.example,https://partner.example ',
    }),
    [
      'https://preview.nexafunds.example',
      'https://partner.example',
      'https://nexafunds.example',
    ]
  )
  assert.deepEqual(
    getStreamingAllowedOrigins({
      streamingPublicUrl: 'not-a-url',
      corsOrigins: '',
    }),
    []
  )
})

test('LiveKit viewer tokens can subscribe but cannot publish media or data', () => {
  assert.equal(formatStreamParticipantName({ username: 'viewer', is_verified: false }), 'viewer')
  assert.equal(formatStreamParticipantName({ username: 'creator_name', is_verified: true }), 'creator_name ✓')

  const token = createLiveKitRoomToken({
    roomName: 'nexa-test-room',
    user: { id: 12 },
    displayName: formatStreamParticipantName({ username: 'viewer', is_verified: false }),
    canPublish: false,
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    issuedAt: 1000,
  })
  const [header, claims] = token.split('.')
  const decoded = JSON.parse(Buffer.from(claims, 'base64url').toString())

  assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url').toString()), {
    alg: 'HS256',
    typ: 'JWT',
  })
  assert.equal(decoded.video.roomJoin, true)
  assert.equal(decoded.video.canSubscribe, true)
  assert.equal(decoded.video.canPublish, false)
  assert.equal(decoded.video.canPublishData, false)
  assert.equal(decoded.name, 'viewer')

  const ownerClaims = JSON.parse(
    Buffer.from(
      createLiveKitRoomToken({
        roomName: 'nexa-test-room',
        user: { id: 7 },
        displayName: 'Owner (@owner)',
        canPublish: true,
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        issuedAt: 1000,
      }).split('.')[1],
      'base64url'
    ).toString()
  )
  assert.equal(ownerClaims.video.canPublish, true)
  assert.equal(ownerClaims.video.canPublishData, true)
})
