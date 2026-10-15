import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createLicenseKey,
  decodeAccount,
  DIGIT_CODES,
  encodeAccount,
  isSigningSecretConfigured,
  verifyLicenseKey,
} from './license-encoding.js'

const secret = 'test-only signing secret with sufficient length'
const accountLicense = {
  account_login: '12345678',
  account_type: 'demo',
  broker_server: 'Broker-MT5',
}

test('uses the EA digit mapping exactly and reverses every mapped digit', () => {
  assert.deepEqual(DIGIT_CODES, {
    '0': 'ZA',
    '1': 'XE',
    '2': 'YD',
    '3': 'KR',
    '4': 'JF',
    '5': 'IM',
    '6': 'UN',
    '7': 'GL',
    '8': 'OV',
    '9': 'PT',
  })

  for (const [digit, code] of Object.entries(DIGIT_CODES)) {
    assert.equal(encodeAccount(digit), code)
    assert.equal(decodeAccount(code, 1), digit)
  }
})

test('round-trips the 12345678 test vector and generates its license in code', () => {
  const accountCode = encodeAccount('12345678')
  assert.equal(decodeAccount(accountCode, 8), '12345678')

  const licenseKey = createLicenseKey(accountLicense, 'nexa-ai-pro', secret)
  assert.match(licenseKey, /^NEXA-AI\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
  assert.equal(
    verifyLicenseKey(
      licenseKey,
      {
        accountLogin: '12345678',
        accountType: 'demo',
        brokerServer: 'Broker-MT5',
        productId: 'nexa-ai-pro',
      },
      secret
    )?.account_login,
    '12345678'
  )
})

test('preserves leading zeros and checks account length', () => {
  const encoded = encodeAccount('000123')
  assert.equal(decodeAccount(encoded, 6), '000123')
  assert.throws(() => decodeAccount(encoded, 5), /invalid/)
  assert.throws(() => encodeAccount(123), /string/)
  assert.throws(() => encodeAccount('12x3'), /digits/)
})

test('records odd and even median representations', () => {
  const oddKey = createLicenseKey(
    { ...accountLicense, account_login: '987' },
    'nexa-ai-pro',
    secret
  )
  const oddClaims = verifyLicenseKey(oddKey, {}, secret)
  assert.deepEqual(oddClaims.median, {
    lower_digit: '8',
    upper_digit: '8',
    value: '8',
  })

  const evenClaims = verifyLicenseKey(
    createLicenseKey(accountLicense, 'nexa-ai-pro', secret),
    {},
    secret
  )
  assert.deepEqual(evenClaims.median, {
    lower_digit: '4',
    upper_digit: '5',
    value: '4.5',
  })
})

test('records repeated digits and breaks tied modes by first occurrence', () => {
  const repeatedClaims = verifyLicenseKey(
    createLicenseKey(
      { ...accountLicense, account_login: '11121' },
      'nexa-ai-pro',
      secret
    ),
    {},
    secret
  )
  assert.deepEqual(repeatedClaims.digit_modes, ['1'])
  assert.equal(repeatedClaims.mode_frequency, 4)

  const tiedClaims = verifyLicenseKey(
    createLicenseKey(
      { ...accountLicense, account_login: '2121' },
      'nexa-ai-pro',
      secret
    ),
    {},
    secret
  )
  assert.deepEqual(tiedClaims.digit_modes, ['2', '1'])
  assert.equal(tiedClaims.mode_frequency, 2)
})

test('rejects payload and signature tampering', () => {
  const key = createLicenseKey(accountLicense, 'nexa-ai-pro', secret)
  const [, encodedPayload, encodedSignature] = key.split('.')
  const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8')
  const changedPayload = Buffer.from(
    payload.replace('"product_id":"nexa-ai-pro"', '"product_id":"nexa-ml"')
  ).toString('base64url')
  assert.equal(
    verifyLicenseKey(`NEXA-AI.${changedPayload}.${encodedSignature}`, {}, secret),
    null
  )

  const changedSignature =
    encodedSignature[0] === 'A' ? `B${encodedSignature.slice(1)}` : `A${encodedSignature.slice(1)}`
  assert.equal(
    verifyLicenseKey(`NEXA-AI.${encodedPayload}.${changedSignature}`, {}, secret),
    null
  )
})

test('rejects an invalid signature and licenses used by another account', () => {
  const key = createLicenseKey(accountLicense, 'nexa-ai-pro', secret)
  assert.equal(verifyLicenseKey(key, {}, 'different signing secret that is long enough'), null)
  assert.equal(verifyLicenseKey(key, { accountLogin: '87654321' }, secret), null)
  assert.equal(verifyLicenseKey(key, { productId: 'nexa-ml' }, secret), null)
  assert.equal(verifyLicenseKey(key, { accountType: 'real' }, secret), null)
  assert.equal(verifyLicenseKey(key, { brokerServer: 'Other-Server' }, secret), null)
  assert.equal(verifyLicenseKey(key, null, secret), null)
  assert.equal(verifyLicenseKey(key, 'not-an-object', secret), null)
})

test('requires an adequately sized signing secret', () => {
  assert.equal(isSigningSecretConfigured('short'), false)
  assert.equal(isSigningSecretConfigured(secret), true)
  assert.throws(() => createLicenseKey(accountLicense, 'nexa-ai-pro', 'short'), /32 bytes/)
})

test('uses the API environment secret when issuing keys without an explicit secret', () => {
  const originalSecret = process.env.LICENSE_SIGNING_SECRET
  process.env.LICENSE_SIGNING_SECRET = secret
  try {
    const key = createLicenseKey(accountLicense, 'nexa-ai-pro')
    assert.equal(verifyLicenseKey(key)?.account_login, '12345678')
  } finally {
    if (originalSecret === undefined) delete process.env.LICENSE_SIGNING_SECRET
    else process.env.LICENSE_SIGNING_SECRET = originalSecret
  }
})
