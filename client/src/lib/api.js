// API client — auto-detects dev vs production
const API_BASE = import.meta.env.PROD
  ? 'https://railway-jadranai-production.up.railway.app'
  : ''; // In dev, Vite proxies /api to localhost:3001

export async function generateTrip(query, language = 'en') {
  const res = await fetch(`${API_BASE}/api/trips/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return res.json();
}

export async function chatWithTrip(message, itinerary, language = 'en') {
  const res = await fetch(`${API_BASE}/api/trips/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, itinerary, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  const data = await res.json();
  return data.reply;
}

export async function getWeather(lat, lng, days = 7) {
  const res = await fetch(`${API_BASE}/api/weather?lat=${lat}&lng=${lng}&days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch weather');
  return res.json();
}

export async function getMarinas(options = {}) {
  const params = new URLSearchParams();
  if (options.region) params.set('region', options.region);
  if (options.lat) params.set('lat', options.lat);
  if (options.lng) params.set('lng', options.lng);
  const res = await fetch(`${API_BASE}/api/places/marinas?${params}`);
  if (!res.ok) throw new Error('Failed to fetch marinas');
  return res.json();
}

export async function getSafeRoute(days, vesselDraft = 2.0, vesselType = 'sailboat') {
  const res = await fetch(`${API_BASE}/api/trips/safe-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days, vesselDraft, vesselType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  const data = await res.json();
  return data.safeRoute;
}


export async function joinWaitlist(email, source = 'web') {
  const res = await fetch(`${API_BASE}/api/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source }),
  });
  return res.json();
}

export async function getWaitlistCount() {
  const res = await fetch(`${API_BASE}/api/waitlist/count`);
  return res.json();
}
