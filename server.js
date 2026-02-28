// ============================================
// Jadran AI — Production Backend Server
// Deploy to Railway with: railway up
// ============================================

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Rate limiting: 3 requests/min for free users
const tripLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Too many requests. Upgrade to Pro for unlimited planning.' },
  keyGenerator: (req) => req.headers['x-user-id'] || req.ip,
});

// --- Data Services ---

// Weather: Open-Meteo (FREE, no API key needed)
async function getWeather(lat, lng, days = 7) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant,uv_index_max&forecast_days=${days}&timezone=Europe/Zagreb`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&daily=wave_height_max,wave_direction_dominant,wave_period_max&forecast_days=${days}&timezone=Europe/Zagreb`;

  const [weather, marine] = await Promise.all([
    fetch(weatherUrl).then(r => r.json()),
    fetch(marineUrl).then(r => r.json()),
  ]);

  // Combine into daily forecasts
  const forecasts = [];
  for (let i = 0; i < days; i++) {
    forecasts.push({
      date: weather.daily?.time?.[i],
      temp_max: weather.daily?.temperature_2m_max?.[i],
      temp_min: weather.daily?.temperature_2m_min?.[i],
      precipitation: weather.daily?.precipitation_sum?.[i],
      wind_max_kmh: weather.daily?.windspeed_10m_max?.[i],
      wind_max_knots: Math.round((weather.daily?.windspeed_10m_max?.[i] || 0) * 0.5399568),
      wind_direction: weather.daily?.winddirection_10m_dominant?.[i],
      uv_index: weather.daily?.uv_index_max?.[i],
      wave_height: marine.daily?.wave_height_max?.[i],
      wave_direction: marine.daily?.wave_direction_dominant?.[i],
      wave_period: marine.daily?.wave_period_max?.[i],
    });
  }
  return forecasts;
}

// --- Curated Data (replace with database later) ---
const MARINAS = [
  { name: "ACI Marina Split", lat: 43.5081, lng: 16.4402, berths: 355, price_range: "€80-150/night", rating: 4.3, facilities: ["fuel", "water", "electricity", "wifi", "restaurant", "showers"], region: "split", website: "https://www.aci-marinas.com/aci_marina/aci-marina-split/" },
  { name: "ACI Marina Milna", lat: 43.3244, lng: 16.4522, berths: 185, price_range: "€60-110/night", rating: 4.5, facilities: ["fuel", "water", "electricity", "restaurant"], region: "brac" },
  { name: "ACI Marina Vis", lat: 43.0622, lng: 16.1836, berths: 120, price_range: "€55-100/night", rating: 4.4, facilities: ["water", "electricity", "wifi"], region: "vis" },
  { name: "ACI Marina Palmižana", lat: 43.1575, lng: 16.3925, berths: 160, price_range: "€70-130/night", rating: 4.7, facilities: ["water", "electricity", "restaurant", "beach"], region: "hvar" },
  { name: "ACI Marina Korčula", lat: 42.9597, lng: 17.1347, berths: 159, price_range: "€65-120/night", rating: 4.2, facilities: ["fuel", "water", "electricity", "wifi"], region: "korcula" },
  { name: "Marina Trogir", lat: 43.5125, lng: 16.2472, berths: 200, price_range: "€70-140/night", rating: 4.6, facilities: ["fuel", "water", "electricity", "wifi", "restaurant", "pool"], region: "trogir" },
  { name: "Marina Kaštela", lat: 43.5511, lng: 16.3700, berths: 420, price_range: "€50-100/night", rating: 4.1, facilities: ["fuel", "water", "electricity", "wifi", "repair"], region: "split" },
  { name: "ACI Marina Dubrovnik", lat: 42.6600, lng: 18.0635, berths: 380, price_range: "€90-200/night", rating: 4.3, facilities: ["fuel", "water", "electricity", "wifi", "restaurant", "showers"], region: "dubrovnik" },
  { name: "Marina Frapa", lat: 43.4900, lng: 15.9200, berths: 462, price_range: "€80-160/night", rating: 4.8, facilities: ["fuel", "water", "electricity", "wifi", "restaurant", "pool", "spa"], region: "rogoznica" },
  { name: "ACI Marina Skradin", lat: 43.8180, lng: 15.9250, berths: 180, price_range: "€50-90/night", rating: 4.5, facilities: ["water", "electricity", "restaurant"], region: "skradin" },
];

const ANCHORAGES = [
  { name: "Uvala Lučice", location: "Milna, Brač", lat: 43.326, lng: 16.448, depth: "4-8m", seabed: "Sand", protection: "All except S", rating: 4.5, notes: "Well protected, walk to town" },
  { name: "Palmižana Bay", location: "Pakleni Islands", lat: 43.157, lng: 16.392, depth: "3-8m", seabed: "Sand", protection: "N-NE winds", rating: 4.8, notes: "Best beach bar scene on the coast" },
  { name: "Stiniva Cove", location: "Vis Island", lat: 43.020, lng: 16.165, depth: "4-6m", seabed: "Sand/rock", protection: "N-NW winds", rating: 4.9, notes: "Famous beach, anchor outside cove" },
  { name: "Vinogradišće Bay", location: "Palmižana", lat: 43.160, lng: 16.388, depth: "3-6m", seabed: "Sand", protection: "All except S", rating: 4.7, notes: "Turquoise water, restaurant access" },
  { name: "Uvala Lovišće", location: "Šćedro Island", lat: 43.100, lng: 16.694, depth: "5-12m", seabed: "Sand/weed", protection: "All winds", rating: 4.6, notes: "Completely protected bay, uninhabited island" },
  { name: "Polače Bay", location: "Mljet Island", lat: 42.793, lng: 17.229, depth: "4-10m", seabed: "Sand/mud", protection: "All except NW", rating: 4.7, notes: "Roman ruins, national park nearby" },
  { name: "Uvala Žukova", location: "Korčula", lat: 42.965, lng: 17.140, depth: "5-12m", seabed: "Sand", protection: "N-NW winds", rating: 4.2, notes: "Quiet bay near Korčula town" },
  { name: "Komiža Bay", location: "Vis Island", lat: 43.044, lng: 16.090, depth: "5-10m", seabed: "Sand", protection: "E-SE winds", rating: 4.4, notes: "Charming fishing village, Blue Cave trips" },
];

const RESTAURANTS = [
  { name: "Konoba Palma", location: "Milna, Brač", lat: 43.324, lng: 16.452, cuisine: "Dalmatian seafood", rating: 4.6, price: "€€", must_try: "Grilled octopus with potatoes", bookable: true },
  { name: "Villa Kaliopa", location: "Vis Town", lat: 43.062, lng: 16.184, cuisine: "Fine dining Mediterranean", rating: 4.8, price: "€€€", must_try: "Lobster linguine in garden setting", bookable: true },
  { name: "Gariful", location: "Hvar Town", lat: 43.173, lng: 16.442, cuisine: "Seafood", rating: 4.5, price: "€€€", must_try: "Fresh fish platter on the harbour", bookable: true },
  { name: "Pojoda", location: "Vis Town", lat: 43.062, lng: 16.183, cuisine: "Traditional Dalmatian", rating: 4.7, price: "€€", must_try: "Viška pogača (local anchovy pie)", bookable: false },
  { name: "Konoba Mate", location: "Korčula Town", lat: 42.960, lng: 17.135, cuisine: "Local Croatian", rating: 4.4, price: "€€", must_try: "Black risotto with cuttlefish", bookable: true },
  { name: "Konoba Stori Komin", location: "Palmižana", lat: 43.158, lng: 16.393, cuisine: "Seafood grill", rating: 4.6, price: "€€", must_try: "Catch of the day over wood fire", bookable: false },
  { name: "LD Restaurant", location: "Korčula Town", lat: 42.961, lng: 17.136, cuisine: "Modern Croatian", rating: 4.7, price: "€€€", must_try: "Tasting menu with local wines", bookable: true },
  { name: "Konoba Hvaranin", location: "Stari Grad, Hvar", lat: 43.184, lng: 16.595, cuisine: "Traditional", rating: 4.5, price: "€", must_try: "Gregada (traditional fish stew)", bookable: false },
];

// --- AI Trip Generation ---
async function generateTrip(userQuery, weather) {
  const systemPrompt = `You are "Jadran AI" — an expert Adriatic sailing trip planner with deep knowledge of the Croatian coast, islands, marinas, anchorages, and restaurants.

You MUST respond ONLY with valid JSON — no markdown, no backticks, no preamble.

JSON structure:
{
  "tripTitle": "string",
  "summary": "string (2-3 sentences)",
  "totalDistance": "string (e.g. '85 nm')",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "bestFor": "string",
  "days": [
    {
      "day": number,
      "title": "string (e.g. 'Split → Milna')",
      "from": "string",
      "to": "string",
      "fromLat": number,
      "fromLng": number,
      "toLat": number,
      "toLng": number,
      "distance": "string (e.g. '12 nm')",
      "sailTime": "string (e.g. '2-3 hours')",
      "weather": {
        "temp": number,
        "wind": "string (e.g. 'NW 10-15kt')",
        "waves": "string (e.g. '0.3-0.5m')",
        "condition": "string"
      },
      "highlights": ["string"],
      "marina": "string",
      "restaurant": "string",
      "tip": "string (insider sailing tip)"
    }
  ],
  "packingTips": ["string"],
  "estimatedBudget": "string"
}

REAL-TIME WEATHER DATA (next 7 days):
${JSON.stringify(weather, null, 2)}

AVAILABLE MARINAS:
${JSON.stringify(MARINAS.map(m => ({ name: m.name, lat: m.lat, lng: m.lng, price: m.price_range, rating: m.rating, facilities: m.facilities })), null, 2)}

RECOMMENDED ANCHORAGES:
${JSON.stringify(ANCHORAGES.map(a => ({ name: a.name, location: a.location, lat: a.lat, lng: a.lng, depth: a.depth, protection: a.protection, rating: a.rating, notes: a.notes })), null, 2)}

TOP RESTAURANTS:
${JSON.stringify(RESTAURANTS.map(r => ({ name: r.name, location: r.location, cuisine: r.cuisine, rating: r.rating, price: r.price, must_try: r.must_try })), null, 2)}

IMPORTANT RULES:
- Use actual weather data to plan safe routes
- Avoid sailing days with wind > 25 knots
- Suggest protected anchorages on windy days
- Keep daily distances reasonable (15-25nm for families, up to 40nm for experienced)
- Include coordinates (lat/lng) for every stop
- Always recommend dinner spots with ratings 4.0+
- Add practical insider tips for each leg`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userQuery }],
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'AI generation failed');
  }

  const text = data.content?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// --- Routes ---

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'jadran-ai', version: '1.0.0' });
});

// Generate trip itinerary
app.post('/api/trips/generate', tripLimiter, async (req, res) => {
  try {
    const { query, startLat, startLng } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Please describe your trip' });
    }

    // Default to Split if no coordinates
    const lat = startLat || 43.5081;
    const lng = startLng || 16.4402;

    // Fetch real weather data
    const weather = await getWeather(lat, lng, 7);

    // Generate AI itinerary with real weather context
    const itinerary = await generateTrip(query, weather);

    res.json({
      success: true,
      itinerary,
      weather_source: 'open-meteo.com',
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Trip generation error:', err);
    res.status(500).json({
      error: 'Failed to generate trip. Please try again.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// Get weather for a location
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lng, days } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng required' });
    }
    const weather = await getWeather(parseFloat(lat), parseFloat(lng), parseInt(days) || 7);
    res.json({ success: true, forecasts: weather });
  } catch (err) {
    console.error('Weather error:', err);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Get marinas (with optional region filter)
app.get('/api/marinas', (req, res) => {
  const { region } = req.query;
  const filtered = region
    ? MARINAS.filter(m => m.region === region)
    : MARINAS;
  res.json({ success: true, marinas: filtered });
});

// Get anchorages
app.get('/api/anchorages', (req, res) => {
  res.json({ success: true, anchorages: ANCHORAGES });
});

// Get restaurants
app.get('/api/restaurants', (req, res) => {
  const { minRating } = req.query;
  const filtered = minRating
    ? RESTAURANTS.filter(r => r.rating >= parseFloat(minRating))
    : RESTAURANTS;
  res.json({ success: true, restaurants: filtered });
});

// Waitlist signup
app.post('/api/waitlist', async (req, res) => {
  try {
    const { email, source } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    // TODO: Save to Supabase
    // const { data, error } = await supabase.from('waitlist').insert({ email, source });
    console.log(`Waitlist signup: ${email} from ${source || 'direct'}`);
    res.json({ success: true, message: 'Welcome aboard! You\'re on the list.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`
  ⛵ Jadran AI Server
  📍 Running on port ${PORT}
  🌊 Environment: ${process.env.NODE_ENV || 'development'}
  🔑 Claude API: ${process.env.CLAUDE_API_KEY ? 'configured' : 'MISSING — set CLAUDE_API_KEY'}
  `);
});
