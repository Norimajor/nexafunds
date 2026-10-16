# React + Vite

## USD economic predictors

The dashboard reads the latest NFP, CPI, PPI, and FOMC forecasts directly from
`GET https://usdnewsai.onrender.com/api/usd/latest` and refreshes them every five
minutes. Set the frontend build variable `VITE_USDNEWS_AI_API_URL` to override the
service base URL. The upstream API allows browser requests from the NexaFunds site.
The backend's `/api/nfp/latest` and `/api/economic/latest` routes remain available
as server-side proxy endpoints for other clients.

## Persistent account registration

Production requires `DATABASE_URL` for a hosted PostgreSQL database (for example,
a Neon database). Add its connection string to the Render API service's environment
variables before deploying this version. Do not set it as a `VITE_*` variable or
commit it. The API stores account emails/password hashes and EA licenses in
PostgreSQL, and the dashboard's registered-user counter is calculated from those
persistent account rows. Login sessions are stored in the same PostgreSQL database
so a Render restart or another API instance does not sign users out. A first startup
imports users and EA licenses from the existing SQLite database when that file is
available and the PostgreSQL database does not yet contain users.

Without `DATABASE_URL`, the production API intentionally refuses to start instead
of silently accepting registrations into temporary storage. Other local SQLite data
(such as MT5 telemetry and demo transactions/settings) is separate from this
account/license store. Render's free filesystem may not retain the old SQLite file
through a deployment; if automatic import cannot see it, existing users may need to
register again. Once this PostgreSQL setup is active, new account records and the
registered-user count survive API restarts and redeploys.

## MT5 EA account verification and licensing

After creating an account, clients register their broker, exact MT5 server, account
number, and demo/live account type at `/ea-access`. All requests remain pending
until an administrator verifies them in `/admin/licenses`. Approved clients receive
a distinct signed key for every uploaded EA product. Every product key is bound to
the approved MT5 account, broker server, and demo/live mode.

Configure these backend-only environment variables on the NexaFunds API service:

```env
ADMIN_API_KEY=<private admin key>
LICENSE_SIGNING_SECRET=<at least 32 random bytes, API server only>
EA_DOWNLOAD_PATH=<absolute path to the compiled .ex5 file>
```

The administrator opens `/admin/licenses` and supplies `ADMIN_API_KEY` to review
requests and upload compiled `.ex5` files. The page has two fixed product slots:
`nexa-ai-pro` for NexaFunds AI Pro and `nexa-ml` for Nexa ML EA. Replacing a build
in its slot preserves that product's account keys; deleting it removes the binary
and revokes that product's keys. `EA_DOWNLOAD_PATH` must point to a `.ex5` path on
the API server; uploads are stored in that file's directory as `<product-id>.ex5`.
On hosts such as Render, attach a persistent disk and point `EA_DOWNLOAD_PATH` into
its mount path so product files survive deploys and restarts.

Clients can submit requests while `LICENSE_SIGNING_SECRET` is missing, but the
administrator cannot approve requests or issue keys until it is set. Configure at
least 32 cryptographically random bytes in the API hosting environment (for example,
Render's service environment variables), then restart/redeploy the API. The API
derives an Ed25519 signing key from this secret using SHA-256 with a
NexaFunds-specific context string; the private key is never sent to clients or
stored in the license payload. Do not put it in frontend `VITE_*` variables, expose
it, or commit real secrets. Because the key is deterministically derived, changing
the secret invalidates all existing license signatures; issue replacement keys and
update the verifier's public key together.

Do not expose these values through `VITE_*` variables or commit real secrets.
Approved account keys and matching EA downloads are available on the authenticated
`/ea-downloads` page, separate from account registration at `/ea-access`. Each EA
download is served only to an authenticated owner of an active account license and
a product-specific entitlement. The source snapshots in
`C:\Users\USER\NEXA-FUNDS-AI` are not downloadable EA binaries.

## Signed license format and EA compatibility

New issued keys have the format
`NEXA-AI.<base64url-payload>.<base64url-signature>`, with Base64URL components
without padding. The signature is Ed25519 over the exact UTF-8 bytes of the
canonical JSON payload, not over the displayed key. The payload includes version
and algorithm identifiers, product ID, account type, exact broker-server name,
encoded account data, encoded account length, first/last digits, all most-frequent
digits, mode frequency, and median metadata. Account digits are encoded pairwise
using exactly `0=ZA, 1=XE, 2=YD, 3=KR, 4=JF, 5=IM, 6=UN, 7=GL, 8=OV, 9=PT`.
Decoding each pair reconstructs the whole original account string; the metadata is
checked for consistency, not used to guess account numbers. For an even digit
count, the median is represented by its two middle sorted digits and their exact
integer-or-half value. Tied modes are listed in order of first appearance in the
account number. Account identifiers are never converted to floating-point values.

The API validates the Ed25519 signature, canonical payload, decoded account,
product, account type, broker server, and active server-side entitlement at
`/api/licenses/validate`. Send the key with the terminal's current values over
HTTPS:

```json
{
  "product_id": "nexa-ai-pro",
  "license_key": "NEXA-AI.<base64url-payload>.<base64url-signature>",
  "account_login": "12345678",
  "broker_server": "Exact-MT5-Server-Name",
  "account_type": "demo"
}
```

Each approved account/product pair receives a distinct signed license. Set the
product ID in the EA source before compiling; it must exactly match the product ID
used when uploading that build in `/admin/licenses`. The current source snapshot at
`C:\Users\USER\NEXA-FUNDS-AI\EA.txt` identifies telemetry account logins but does
not contain the requested digit mapping, license decoder, Ed25519 verification, or
a call to `/api/licenses/validate`. Therefore this backend's signed format and
validation endpoint are implemented and tested, but that EA source is **not yet
integrated** and must not be represented as verifying these signed licenses. Its
MQL5 implementation must either call this HTTPS validation endpoint and fail
closed, or implement the same account decoding and Ed25519 verification locally.
For a local verifier, configure only the derived public key in the EA; never embed
the private signing secret. The public key can be exported from the API environment
with:

```sh
node --input-type=module -e "import { getLicensePublicKey } from './server/license-encoding.js'; console.log(getLicensePublicKey())"
```

The MQL5 verifier must agree on canonical UTF-8 JSON bytes, exact JSON field order
and types, Base64URL decoding, the digit map and metadata rules, and Ed25519
signature verification. If the public key or the signing secret changes, replace
the verifier configuration and reissue keys as a coordinated rotation. The EA must
enable trading only after successful signature/entitlement verification and fail
closed on invalid keys, account mismatches, or unavailable validation.

Populate those fields from the entered key and the connected terminal
(`ACCOUNT_LOGIN`, `ACCOUNT_SERVER`, and `ACCOUNT_TRADE_MODE`) and include the
EA build's fixed `product_id`. Enable trading only
when the API returns HTTP 200 with `{"success":true,"valid":true}`; fail closed on
network errors, other responses, or product/key/account/server/type mismatches.
Never embed an admin key or a shared ingestion credential in the EA. Signed license
keys are stored server-side for entitlement lookup; never expose the database or
its contents to clients.

## Nexa Stream

The authenticated Streaming page is linked immediately before Strategy AI. It
provides creator profiles, searchable creators and follows, a video feed with
likes and comments, LiveKit rooms for live video/screen sharing, a live chat,
trading-themed gifts, and administrator-managed gold verification. Stripe
checkout offers fixed KSh bundles (10/50/100/500 coins for KSh10/KSh50/KSh100/
KSh500) and trading gifts cost 5/10/50/100 coins. Signed webhook events credit
the server-side coin wallet. Creator gift earnings are tracked in coins only;
cash conversion, payouts, and ads are deliberately not enabled in this release.
Live viewers join with subscribe-only access; only the owner can invite a creator
to cohost, and the invitee must accept before publishing. Viewers can double-tap
the live stage to add a like, while profile follower/following counts open the
corresponding creator lists. Creators choose the username shown to viewers in
their profile editor and can request a gold verification tick there. The
configured streaming administrator reviews requests at `/admin/licenses` using
`ADMIN_API_KEY`; approving a request automatically displays the tick after the
creator's username. The configured streaming administrator's own account is
verified automatically.

Before enabling the streaming features:

1. Link the existing Neon project and confirm it is in an Object Storage/Functions
   supported region (`aws-us-east-2`, `aws-us-east-1`, `aws-eu-central-1`, or
   `aws-ap-southeast-1`). Review the bucket change in `neon.ts` and run `neon deploy`
   to provision the private `stream-media` bucket.
2. Add the branch's Neon Object Storage values (`AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, and `AWS_REGION`) to the API
   hosting environment. Keep them server-side.
3. Configure `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` for the
   LiveKit project. LiveKit credentials must never be sent to the browser; the API
   creates short-lived room tokens.
4. Configure `STREAM_ADMIN_EMAIL` and `STREAM_ADMIN_USER_ID` to the exact email
   and account ID of the intended administrator,
   `STREAMING_PUBLIC_URL` to the deployed frontend origin, `STRIPE_SECRET_KEY`,
   and `STRIPE_WEBHOOK_SECRET`. In Stripe, subscribe the HTTPS endpoint
   `/api/streaming/stripe/webhook` to `checkout.session.completed`.
   Streaming write actions accept that public origin and any additional exact
   frontend origins listed in the comma-separated `CORS_ORIGINS` setting. Keep
   this list limited to trusted app origins; do not include paths or wildcards.

The existing account login flow does not enforce email verification. The
streaming-admin check therefore requires both a matching email and the numeric
account ID, configured server-side after the intended account is registered and
its credentials are secured. The account ID is returned by the authenticated
`GET /api/auth/me` endpoint. Stripe payments are configured as fixed-price KES
bundles. Confirm that the Stripe account can accept KES payments before enabling
checkout in production.
Choose and publish the applicable gift/coin terms before accepting real payments.

Optional timeout configuration:

```env
USDNEWS_AI_API_URL=https://your-usdnewsai-service.example.com
USDNEWS_AI_TIMEOUT_MS=10000
```

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
