import {
  createHash,
  createPrivateKey,
  createPublicKey,
  randomInt,
  sign,
  verify,
} from 'node:crypto'

export const DIGIT_CODES = Object.freeze({
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

const CODE_DIGITS = Object.freeze(
  Object.fromEntries(Object.entries(DIGIT_CODES).map(([digit, code]) => [code, digit]))
)
const LICENSE_PREFIX = 'NEXA-AI'
const LICENSE_VERSION = 1
const LICENSE_ALGORITHM = 'NEXA-AI-ACCOUNT-V1'
const PRIVATE_KEY_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex')
const OPAQUE_LICENSE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const OPAQUE_LICENSE_PATTERN = /^NEXA-AI-(?:[A-HJ-NP-Z2-9]{4}-){3}[A-HJ-NP-Z2-9]{4}$/

export const createOpaqueLicenseKey = () => {
  const characters = Array.from(
    { length: 16 },
    () => OPAQUE_LICENSE_ALPHABET[randomInt(OPAQUE_LICENSE_ALPHABET.length)]
  )
  const groups = Array.from({ length: 4 }, (_, index) =>
    characters.slice(index * 4, index * 4 + 4).join('')
  )
  return `NEXA-AI-${groups.join('-')}`
}

export const isOpaqueLicenseKey = (licenseKey) =>
  typeof licenseKey === 'string' && OPAQUE_LICENSE_PATTERN.test(licenseKey)

export const isSigningSecretConfigured = (secret = process.env.LICENSE_SIGNING_SECRET) =>
  typeof secret === 'string' && Buffer.byteLength(secret, 'utf8') >= 32

const getSigningKeys = (secret = process.env.LICENSE_SIGNING_SECRET) => {
  if (!isSigningSecretConfigured(secret)) {
    throw new Error('LICENSE_SIGNING_SECRET must contain at least 32 bytes.')
  }

  const seed = createHash('sha256')
    .update('nexafunds-license-ed25519-v1\0')
    .update(secret, 'utf8')
    .digest()
  const privateKey = createPrivateKey({
    key: Buffer.concat([PRIVATE_KEY_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  })

  return { privateKey, publicKey: createPublicKey(privateKey) }
}

export const getLicensePublicKey = (secret = process.env.LICENSE_SIGNING_SECRET) =>
  getSigningKeys(secret).publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')

export const encodeAccount = (accountNumber) => {
  if (typeof accountNumber !== 'string' || !/^\d{1,20}$/.test(accountNumber)) {
    throw new TypeError('MT5 account number must be a string of 1 to 20 digits.')
  }

  return [...accountNumber].map((digit) => DIGIT_CODES[digit]).join('')
}

export const decodeAccount = (encodedAccount, accountLength) => {
  if (
    typeof encodedAccount !== 'string' ||
    !Number.isInteger(accountLength) ||
    accountLength < 1 ||
    accountLength > 20 ||
    encodedAccount.length !== accountLength * 2
  ) {
    throw new TypeError('Encoded MT5 account number or length is invalid.')
  }

  let accountNumber = ''
  for (let index = 0; index < encodedAccount.length; index += 2) {
    const digit = CODE_DIGITS[encodedAccount.slice(index, index + 2)]
    if (digit === undefined) {
      throw new TypeError('Encoded MT5 account number contains an unknown digit code.')
    }
    accountNumber += digit
  }
  return accountNumber
}

const getAccountMetadata = (accountNumber) => {
  const frequencies = new Map()
  for (const digit of accountNumber) {
    frequencies.set(digit, (frequencies.get(digit) || 0) + 1)
  }

  const modeFrequency = Math.max(...frequencies.values())
  const digitModes = [...frequencies.keys()].filter(
    (digit) => frequencies.get(digit) === modeFrequency
  )
  const sortedDigits = [...accountNumber].sort()
  const lowerDigit = sortedDigits[Math.floor((sortedDigits.length - 1) / 2)]
  const upperDigit = sortedDigits[Math.floor(sortedDigits.length / 2)]
  const medianSum = Number(lowerDigit) + Number(upperDigit)

  return {
    account_length: accountNumber.length,
    first_digit: accountNumber[0],
    last_digit: accountNumber[accountNumber.length - 1],
    digit_modes: digitModes,
    mode_frequency: modeFrequency,
    median: {
      lower_digit: lowerDigit,
      upper_digit: upperDigit,
      value: medianSum % 2 === 0 ? String(medianSum / 2) : `${Math.floor(medianSum / 2)}.5`,
    },
  }
}

const createCanonicalPayload = ({
  accountLogin,
  accountType,
  brokerServer,
  productId,
}) => {
  const accountCode = encodeAccount(accountLogin)
  if (
    typeof productId !== 'string' ||
    !/^[a-z0-9][a-z0-9-]{1,47}$/.test(productId) ||
    typeof accountType !== 'string' ||
    !['demo', 'real'].includes(accountType) ||
    typeof brokerServer !== 'string' ||
    !brokerServer.trim() ||
    brokerServer.length > 120
  ) {
    throw new TypeError('License product, account type, or broker server is invalid.')
  }

  return {
    version: LICENSE_VERSION,
    algorithm: LICENSE_ALGORITHM,
    product_id: productId,
    account_type: accountType,
    broker_server: brokerServer,
    account_code: accountCode,
    ...getAccountMetadata(accountLogin),
  }
}

const toBase64Url = (buffer) => buffer.toString('base64url')

const fromBase64Url = (value) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return null
  const decoded = Buffer.from(value, 'base64url')
  return toBase64Url(decoded) === value ? decoded : null
}

export const createLicenseKey = (license, productId, secret) => {
  const payload = createCanonicalPayload({
    accountLogin: license.account_login,
    accountType: license.account_type,
    brokerServer: license.broker_server,
    productId,
  })
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8')
  const signature = sign(null, payloadBytes, getSigningKeys(secret).privateKey)
  return `${LICENSE_PREFIX}.${toBase64Url(payloadBytes)}.${toBase64Url(signature)}`
}

export const verifyLicenseKeyDetailed = (
  licenseKey,
  expected = {},
  secret = process.env.LICENSE_SIGNING_SECRET
) => {
  const reject = (reason) => ({ claims: null, reason })
  if (typeof licenseKey !== 'string') return reject('invalid_key_type')
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)) {
    return reject('invalid_expected_claims')
  }

  const parts = licenseKey.split('.')
  if (parts.length !== 3 || parts[0] !== LICENSE_PREFIX) {
    return reject('invalid_key_format')
  }

  const payloadBytes = fromBase64Url(parts[1])
  const signature = fromBase64Url(parts[2])
  if (!payloadBytes || !signature || signature.length !== 64) {
    return reject('invalid_key_encoding')
  }

  let payload
  try {
    payload = JSON.parse(payloadBytes.toString('utf8'))
  } catch {
    return reject('malformed_payload')
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return reject('malformed_payload')
  }

  let accountLogin
  try {
    accountLogin = decodeAccount(payload.account_code, payload.account_length)
  } catch {
    return reject('malformed_account_claim')
  }

  let canonicalPayload
  try {
    canonicalPayload = createCanonicalPayload({
      accountLogin,
      accountType: payload.account_type,
      brokerServer: payload.broker_server,
      productId: payload.product_id,
    })
  } catch {
    return reject('malformed_signed_claims')
  }
  const canonicalBytes = Buffer.from(JSON.stringify(canonicalPayload), 'utf8')
  if (!payloadBytes.equals(canonicalBytes)) return reject('noncanonical_payload')

  let signatureValid = false
  try {
    signatureValid = verify(
      null,
      payloadBytes,
      getSigningKeys(secret).publicKey,
      signature
    )
  } catch {
    return reject(
      isSigningSecretConfigured(secret) ? 'signature_verification_failed' : 'signing_secret_invalid'
    )
  }
  if (!signatureValid) return reject('signature_mismatch')

  const brokerServerMatches =
    expected.brokerServer === undefined ||
    (typeof expected.brokerServer === 'string' &&
      typeof payload.broker_server === 'string' &&
      payload.broker_server.toLowerCase() === expected.brokerServer.toLowerCase())
  if (
    (expected.accountLogin !== undefined && accountLogin !== expected.accountLogin) ||
    (expected.accountType !== undefined && payload.account_type !== expected.accountType) ||
    (expected.productId !== undefined && payload.product_id !== expected.productId) ||
    !brokerServerMatches
  ) {
    return reject('expected_claims_mismatch')
  }

  return {
    claims: { ...payload, account_login: accountLogin },
    reason: null,
  }
}

export const verifyLicenseKey = (licenseKey, expected = {}, secret = process.env.LICENSE_SIGNING_SECRET) =>
  verifyLicenseKeyDetailed(licenseKey, expected, secret).claims
