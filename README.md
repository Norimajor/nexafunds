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
a different random key for every uploaded EA product. Every product key is bound to
the approved MT5 account, broker server, and demo/live mode.

Configure these backend-only environment variables on the NexaFunds API service:

```env
ADMIN_API_KEY=<private admin key>
LICENSE_SIGNING_SECRET=<long random signing secret>
EA_DOWNLOAD_PATH=<absolute path to the compiled .ex5 file>
```

The administrator opens `/admin/licenses` and supplies `ADMIN_API_KEY` to review
requests and upload compiled `.ex5` files. Each product needs a stable product ID
(lowercase letters, numbers, and hyphens) and display name. `EA_DOWNLOAD_PATH` must
point to a `.ex5` path on the API server; uploads are stored in that file's directory
as `<product-id>.ex5`. On hosts such as Render, attach a persistent disk and point
`EA_DOWNLOAD_PATH` into its mount path so product files survive deploys and restarts.

Clients can submit requests while `LICENSE_SIGNING_SECRET` is missing, but the
administrator cannot approve requests or issue keys until it is set. Configure a
long, randomly generated secret in the API hosting environment (for example,
Render's service environment variables), then restart/redeploy the API. Do not put it
in frontend `VITE_*` variables. Never expose these values through `VITE_*`
variables or commit real secrets.

Do not expose these values through `VITE_*` variables or commit real secrets. Each
EA download is served only to an authenticated owner of an active account license
and a product-specific entitlement. The source snapshots in
`C:\Users\USER\NEXA-FUNDS-AI` are not downloadable EA binaries.

The MQL5 EA must validate its input key before enabling trading. Add the NexaFunds
backend origin to MetaTrader's **Tools → Options → Expert Advisors → Allow
WebRequest for listed URL** settings, then POST the following JSON to
`/api/licenses/validate` over HTTPS:

```json
{
  "product_id": "nexa-ai-pro",
  "license_key": "NEXA-AI-<random-key>",
  "account_login": "12345678",
  "broker_server": "Exact-MT5-Server-Name",
  "account_type": "demo"
}
```

Each approved account/product pair receives a separate random `NEXA-AI-...` key
(for example, `NEXA-AI-2F09A81B773C4D17A6BC9120FE3385D4`). Set the product ID in
the EA source before compiling; it must exactly match the product ID used when
uploading that build in `/admin/licenses`. An EA's compiled product ID and its
account-specific key must both match for validation to succeed.
The current `EA.txt` source uses `nexa-ai-pro`; `EA.TXT2` uses `nexa-ml`. Re-upload
an updated build with its existing product ID to replace that EA while preserving
its product keys.

Populate those fields from the entered key and the connected terminal
(`ACCOUNT_LOGIN`, `ACCOUNT_SERVER`, and `ACCOUNT_TRADE_MODE`) and include the
EA build's fixed `product_id`. Enable trading only
when the API returns HTTP 200 with `{"success":true,"valid":true}`; fail closed on
network errors, other responses, or product/key/account/server/type mismatches.
Never embed an admin key or a shared ingestion credential in the EA. License keys
are randomly generated and stored server-side for comparison; never expose the
database or its contents to clients.

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
