# React + Vite

## NFP predictor

The NexaFunds backend proxies the live NFP forecast from the USDNewsAI service at
`GET /api/nfp/latest`. Set `USDNEWS_AI_API_URL` to the base URL of the running
USDNewsAI API before starting the backend. For local development, the default is
`http://127.0.0.1:8000`.

The dashboard also proxies the live CPI, PPI, and FOMC forecasts from the same
service at `GET /api/economic/latest`. Missing upstream prediction files are
returned as unavailable data; the dashboard does not fall back to hardcoded values.

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
