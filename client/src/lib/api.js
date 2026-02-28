// API client — works on Vercel/Netlify (frontend) + Railway/Render/etc (backend)
//
// Priority:
//  1) Explicit VITE_API_BASE_URL (recommended for separate frontend/backend hosting)
//  2) In production, assume backend is on same origin (reverse proxy / monorepo deploy)
//  3) In dev, use Vite proxy ("/api" -> localhost:3001) by keeping base empty
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL && String(import.meta.env.VITE_API_BASE_URL).trim() !== ''
    ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
    : (import.meta.env.PROD ? window.location.origin : ''));

async function postJson(path, body) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// --- Trips ---
export function generateTrip(query, language = 'en', startLat, startLng) {
  return postJson('/api/trips/generate', { query, language, startLat, startLng });
}

export async function chatWithTrip(message, itinerary, language = 'en') {
  const data = await postJson('/api/trips/chat', { message, itinerary, language });
  return data.reply;
}

export async function getSafeRoute(days, vesselDraft = 2.0, vesselType = 'sailboat') {
  const data = await postJson('/api/trips/safe-route', { days, vesselDraft, vesselType });
  return data.safeRoute;
}

// --- Waitlist ---
export function joinWaitlist(email, source = 'direct') {
  return postJson('/api/waitlist', { email, source });
}