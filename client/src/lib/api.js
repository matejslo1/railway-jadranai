// API client — auto-detects dev vs production
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? window.location.origin : ''); // In dev, Vite proxies /api to localhost:3001