export const createStreamingSchema = async ({ execute, userIdType }) => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS creator_profiles (
      user_id ${userIdType} PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      avatar_key TEXT,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      verified_at TEXT,
      verified_by ${userIdType},
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS creator_follows (
      follower_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      followed_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (follower_id, followed_id),
      CHECK (follower_id <> followed_id)
    )`,
    `CREATE INDEX IF NOT EXISTS creator_follows_followed_idx
     ON creator_follows(followed_id)`,
    `CREATE TABLE IF NOT EXISTS creator_posts (
      id TEXT PRIMARY KEY,
      author_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      caption TEXT NOT NULL DEFAULT '',
      media_key TEXT NOT NULL,
      media_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS creator_posts_created_idx
     ON creator_posts(created_at)`,
    `CREATE TABLE IF NOT EXISTS creator_post_likes (
      post_id TEXT NOT NULL REFERENCES creator_posts(id) ON DELETE CASCADE,
      user_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (post_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS creator_live_sessions (
      id TEXT PRIMARY KEY,
      host_user_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      room_name TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('live', 'ended')),
      started_at TEXT NOT NULL,
      ended_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS creator_live_sessions_status_idx
     ON creator_live_sessions(status, started_at)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS creator_live_sessions_one_live_per_host
     ON creator_live_sessions(host_user_id) WHERE status = 'live'`,
    `CREATE TABLE IF NOT EXISTS creator_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT REFERENCES creator_posts(id) ON DELETE CASCADE,
      live_session_id TEXT REFERENCES creator_live_sessions(id) ON DELETE CASCADE,
      author_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      CHECK ((post_id IS NOT NULL AND live_session_id IS NULL) OR
             (post_id IS NULL AND live_session_id IS NOT NULL))
    )`,
    `CREATE INDEX IF NOT EXISTS creator_comments_post_idx
     ON creator_comments(post_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS creator_comments_live_idx
     ON creator_comments(live_session_id, created_at)`,
    `CREATE TABLE IF NOT EXISTS creator_coin_wallets (
      user_id ${userIdType} PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      balance_coins INTEGER NOT NULL DEFAULT 0 CHECK (balance_coins >= 0),
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS creator_coin_ledger (
      id TEXT PRIMARY KEY,
      user_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_coins INTEGER NOT NULL CHECK (amount_coins <> 0),
      entry_type TEXT NOT NULL CHECK (entry_type IN ('purchase', 'gift_sent')),
      reference_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS creator_gifts (
      id TEXT PRIMARY KEY,
      sender_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      gift_id TEXT NOT NULL,
      amount_coins INTEGER NOT NULL CHECK (amount_coins > 0),
      live_session_id TEXT REFERENCES creator_live_sessions(id) ON DELETE SET NULL,
      post_id TEXT REFERENCES creator_posts(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      CHECK (sender_id <> recipient_id),
      CHECK ((post_id IS NOT NULL AND live_session_id IS NULL) OR
             (post_id IS NULL AND live_session_id IS NOT NULL))
    )`,
    `CREATE TABLE IF NOT EXISTS creator_gift_earnings (
      id TEXT PRIMARY KEY,
      creator_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      gift_id TEXT NOT NULL UNIQUE REFERENCES creator_gifts(id) ON DELETE CASCADE,
      amount_coins INTEGER NOT NULL CHECK (amount_coins > 0),
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS creator_coin_purchases (
      stripe_session_id TEXT PRIMARY KEY,
      user_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      coins INTEGER NOT NULL CHECK (coins > 0),
      currency TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
  ]

  for (const statement of statements) {
    await execute(statement)
  }
}
