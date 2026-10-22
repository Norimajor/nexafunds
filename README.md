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
a distinct random key for every EA product. Every product key is bound in the
server-side database to the approved MT5 account, broker server, demo/live mode,
and product entitlement.

Configure these backend-only environment variables on the NexaFunds API service:

```env
ADMIN_API_KEY=<private admin key>
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

Approved account keys and matching EA downloads are available on the authenticated
`/ea-downloads` page, separate from account registration at `/ea-access`. Each EA
download is served only to an authenticated owner of an active account license and
a product-specific entitlement. The source snapshots in
`C:\Users\USER\NEXA-FUNDS-AI` are not downloadable EA binaries.

## MT5 HTML Dashboard Panel

The EA chart panel is a browser-rendered image, not an embedded browser. The API
loads `/ea-panel` in headless Chromium, applies the EA state, and returns a BMP
plus `X-Hitmap` coordinates for MQL5 chart click handling. The React page exposes
the state and hitmap hooks required by the renderer.

Configure these values on the API hosting service:

```env
MT5_API_KEY=<long random shared secret>
PANEL_URL=https://your-frontend-domain.example/ea-panel
```

`PANEL_URL` defaults to the same Express service at `/ea-panel` when omitted. If
the frontend is deployed separately, set it to that public HTTPS URL. Keep
`MT5_API_KEY` private and set the same value in the EA's `WP_ApiKey` input. In MT5,
allow the API origin under Tools > Options > Expert Advisors > Allow WebRequest for
listed URL, and configure the EA's `WP_Url` as
`https://your-api-domain.example/api/mt5/panel.bmp`.

The API service requires Node.js 22.12 or newer and must be able to launch Chromium.
Render's build and runtime environments may not share Puppeteer's browser cache, so
the start script explicitly runs `puppeteer browsers install chrome-headless-shell`
immediately before starting the API. Puppeteer launches that same headless-shell
build explicitly, so its runtime executable matches the installed browser. Use the Render build command
`npm install --include=dev && npm run build` and start command `npm run start`.
The build installs frontend tooling; the start command installs the matching headless shell
in the runtime cache before the renderer launches. The host must also provide the
shared libraries required by Chromium. The panel renderer is rate-limited by the
EA refresh timer and serializes screenshots through one browser page.

## Compact license keys and EA validation

New keys use the format `NEXA-AI-XXXX-XXXX-XXXX-XXXX`, where each `X` is a
cryptographically random Base32 character (80 bits of randomness in total). The
key is an opaque database token, not a self-contained signed payload. The API
validates it against the active product entitlement and the account number, exact
broker server, and demo/live type sent by the EA. The public
`/api/licenses/validate` endpoint accepts:

```json
{
  "product_id": "nexa-ai-pro",
  "license_key": "NEXA-AI-XXXX-XXXX-XXXX-XXXX",
  "account_login": "12345678",
  "broker_server": "Exact-MT5-Server-Name",
  "account_type": "demo"
}
```

The EA sends those fields over HTTPS through the NexaFunds website's validation
route. It enables trading only after HTTP 200 with
`{"success":true,"valid":true}`; it fails closed for invalid, revoked,
account-mismatched, or unavailable licenses. The EA build's fixed product ID must
match the product slot used to upload the compiled EA. Never embed an admin key or
a shared ingestion credential in the EA.

When this compact-key format is deployed, old long signed keys are replaced with
new random keys the next time the authenticated download page or admin license list
is loaded. Users should copy the newly displayed key into the EA; the old key will
no longer validate after rotation.

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
