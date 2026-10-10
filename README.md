# React + Vite

## NFP predictor

The NexaFunds backend proxies the live NFP forecast from the USDNewsAI service at
`GET /api/nfp/latest`. Set `USDNEWS_AI_API_URL` to the base URL of the running
USDNewsAI API before starting the backend. For local development, the default is
`http://127.0.0.1:8000`.

The dashboard also proxies the live CPI, PPI, and FOMC forecasts from the same
service at `GET /api/economic/latest`. Missing upstream prediction files are
returned as unavailable data; the dashboard does not fall back to hardcoded values.

## MT5 EA account verification and licensing

After creating an account, clients register their broker, exact MT5 server, account
number, and demo/live account type at `/ea-access`. Demo accounts are issued a key
immediately. Live-account requests remain pending until an administrator verifies
that the account is under the NexaFunds IB in `/admin/licenses`. The account number
and server are unique across submissions; each active license is bound to that
account and its demo/live mode.

Configure these backend-only environment variables before accepting license
requests:

```env
ADMIN_API_KEY=<private admin key>
LICENSE_SIGNING_SECRET=<long random signing secret>
EA_DOWNLOAD_PATH=<absolute path to the compiled .ex5 file>
```

If the EA access page reports that licensing is not configured, set
`LICENSE_SIGNING_SECRET` in the hosting environment for the NexaFunds API service
(for example, Render's service environment variables) and redeploy/restart that
service. The API returns HTTP 503 until this backend-only value is present. Use a
long, randomly generated secret; do not put it in frontend `VITE_*` variables.

Do not expose these values through `VITE_*` variables or commit real secrets. The
EA download route serves only the configured compiled `.ex5` file, and only to an
authenticated owner of an active license. The source snapshots in
`C:\Users\USER\NEXA-FUNDS-AI` are not downloadable EA binaries.

The MQL5 EA must validate its input key before enabling trading. Add the NexaFunds
backend origin to MetaTrader's **Tools → Options → Expert Advisors → Allow
WebRequest for listed URL** settings, then POST the following JSON to
`/api/licenses/validate` over HTTPS:

```json
{
  "license_key": "NX1.<license-id>.<signature>",
  "account_login": "12345678",
  "broker_server": "Exact-MT5-Server-Name",
  "account_type": "demo"
}
```

Populate those fields from the entered key and the connected terminal
(`ACCOUNT_LOGIN`, `ACCOUNT_SERVER`, and `ACCOUNT_TRADE_MODE`). Enable trading only
when the API returns HTTP 200 with `{"success":true,"valid":true}`; fail closed on
network errors, other responses, or account/server/type mismatches. Never embed an
admin key or a shared ingestion credential in the EA. License keys are signed by
the server and are not stored in plaintext in the database.

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
