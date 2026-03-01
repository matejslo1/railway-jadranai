// ============================================
// Jadran AI — Production Backend Server v1.1
// Sea routing fix + vessel parameters
// ============================================

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

const tripLimiter = rateLimit({
  windowMs: 60 * 1000, max: 3,
  message: { error: 'Too many requests. Upgrade to Pro for unlimited planning.' },
  keyGenerator: (req) => req.headers['x-user-id'] || req.ip,
});

// --- Weather ---
async function getWeather(lat, lng, days = 7) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant,uv_index_max&forecast_days=${days}&timezone=Europe/Zagreb`;
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&daily=wave_height_max,wave_direction_dominant,wave_period_max&forecast_days=${days}&timezone=Europe/Zagreb`;
  const [weather, marine] = await Promise.all([
    fetch(weatherUrl).then(r => r.json()),
    fetch(marineUrl).then(r => r.json()),
  ]);
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

// --- Curated Data ---
const MARINAS = [
  { name: "ACI Marina Split", lat: 43.5081, lng: 16.4402, berths: 355, price_range: "\u20ac80-150/night", rating: 4.3, facilities: ["fuel","water","electricity","wifi","restaurant","showers"], region: "split" },
  { name: "ACI Marina Milna", lat: 43.3244, lng: 16.4522, berths: 185, price_range: "\u20ac60-110/night", rating: 4.5, facilities: ["fuel","water","electricity","restaurant"], region: "brac" },
  { name: "ACI Marina Vis", lat: 43.0622, lng: 16.1836, berths: 120, price_range: "\u20ac55-100/night", rating: 4.4, facilities: ["water","electricity","wifi"], region: "vis" },
  { name: "ACI Marina Palmižana", lat: 43.1575, lng: 16.3925, berths: 160, price_range: "\u20ac70-130/night", rating: 4.7, facilities: ["water","electricity","restaurant","beach"], region: "hvar" },
  { name: "ACI Marina Korčula", lat: 42.9597, lng: 17.1347, berths: 159, price_range: "\u20ac65-120/night", rating: 4.2, facilities: ["fuel","water","electricity","wifi"], region: "korcula" },
  { name: "Marina Trogir", lat: 43.5125, lng: 16.2472, berths: 200, price_range: "\u20ac70-140/night", rating: 4.6, facilities: ["fuel","water","electricity","wifi","restaurant","pool"], region: "trogir" },
  { name: "Marina Kaštela", lat: 43.5511, lng: 16.3700, berths: 420, price_range: "\u20ac50-100/night", rating: 4.1, facilities: ["fuel","water","electricity","wifi","repair"], region: "split" },
  { name: "ACI Marina Dubrovnik", lat: 42.6600, lng: 18.0635, berths: 380, price_range: "\u20ac90-200/night", rating: 4.3, facilities: ["fuel","water","electricity","wifi","restaurant","showers"], region: "dubrovnik" },
  { name: "Marina Frapa", lat: 43.4900, lng: 15.9200, berths: 462, price_range: "\u20ac80-160/night", rating: 4.8, facilities: ["fuel","water","electricity","wifi","restaurant","pool","spa"], region: "rogoznica" },
  { name: "ACI Marina Skradin", lat: 43.8180, lng: 15.9250, berths: 180, price_range: "\u20ac50-90/night", rating: 4.5, facilities: ["water","electricity","restaurant"], region: "skradin" },
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
  { name: "Konoba Palma", location: "Milna, Brač", lat: 43.324, lng: 16.452, cuisine: "Dalmatian seafood", rating: 4.6, price: "\u20ac\u20ac", must_try: "Grilled octopus with potatoes" },
  { name: "Villa Kaliopa", location: "Vis Town", lat: 43.062, lng: 16.184, cuisine: "Fine dining Mediterranean", rating: 4.8, price: "\u20ac\u20ac\u20ac", must_try: "Lobster linguine in garden setting" },
  { name: "Gariful", location: "Hvar Town", lat: 43.173, lng: 16.442, cuisine: "Seafood", rating: 4.5, price: "\u20ac\u20ac\u20ac", must_try: "Fresh fish platter on the harbour" },
  { name: "Pojoda", location: "Vis Town", lat: 43.062, lng: 16.183, cuisine: "Traditional Dalmatian", rating: 4.7, price: "\u20ac\u20ac", must_try: "Viška pogača" },
  { name: "Konoba Mate", location: "Korčula Town", lat: 42.960, lng: 17.135, cuisine: "Local Croatian", rating: 4.4, price: "\u20ac\u20ac", must_try: "Black risotto with cuttlefish" },
  { name: "Konoba Stori Komin", location: "Palmižana", lat: 43.158, lng: 16.393, cuisine: "Seafood grill", rating: 4.6, price: "\u20ac\u20ac", must_try: "Catch of the day over wood fire" },
  { name: "LD Restaurant", location: "Korčula Town", lat: 42.961, lng: 17.136, cuisine: "Modern Croatian", rating: 4.7, price: "\u20ac\u20ac\u20ac", must_try: "Tasting menu with local wines" },
  { name: "Konoba Hvaranin", location: "Stari Grad, Hvar", lat: 43.184, lng: 16.595, cuisine: "Traditional", rating: 4.5, price: "\u20ac", must_try: "Gregada (traditional fish stew)" },
];

// --- Known safe sea passages between destinations ---
const SEA_ROUTES = {
  "split_to_milna": [[43.50,16.44],[43.45,16.43],[43.38,16.44],[43.32,16.45]],
  "split_to_hvar": [[43.50,16.44],[43.45,16.43],[43.35,16.43],[43.25,16.44],[43.20,16.44],[43.17,16.44]],
  "split_to_vis": [[43.50,16.44],[43.45,16.40],[43.35,16.35],[43.25,16.28],[43.15,16.22],[43.06,16.18]],
  "split_to_trogir": [[43.50,16.44],[43.50,16.38],[43.51,16.30],[43.51,16.25]],
  "hvar_to_vis": [[43.17,16.44],[43.15,16.39],[43.12,16.35],[43.08,16.25],[43.06,16.18]],
  "hvar_to_korcula": [[43.17,16.44],[43.15,16.50],[43.10,16.60],[43.05,16.75],[43.00,16.90],[42.96,17.13]],
  "korcula_to_dubrovnik": [[42.96,17.13],[42.92,17.25],[42.85,17.40],[42.78,17.55],[42.72,17.70],[42.66,18.06]],
  "vis_to_komiza": [[43.06,16.18],[43.05,16.15],[43.04,16.10],[43.04,16.09]],
  "milna_to_hvar": [[43.32,16.45],[43.28,16.44],[43.23,16.44],[43.20,16.44],[43.17,16.44]],
  "hvar_to_palmizana": [[43.17,16.44],[43.16,16.42],[43.16,16.40],[43.157,16.392]],
  "korcula_to_mljet": [[42.96,17.13],[42.92,17.15],[42.85,17.18],[42.80,17.22]],
};

// --- AI Trip Generation ---
async function generateTrip(userQuery, weather, vessel) {
  let vesselCtx = '';
  if (vessel && vessel.type) {
    vesselCtx = `\nVESSEL: ${vessel.type}, draft ${vessel.draft_m||2.0}m, air draft ${vessel.air_draft_m||15}m${vessel.cruise_speed_kn ? ', cruise ' + vessel.cruise_speed_kn + 'kt' : ''}
- Only suggest anchorages deeper than ${(vessel.draft_m||2.0)+1}m
- ${vessel.type === 'motorboat' ? 'Calculate times at 12-15kt' : 'Calculate times at 5-7kt'}
${vessel.cruise_speed_kn ? '- Use ' + vessel.cruise_speed_kn + 'kt for time estimates' : ''}`;
  }

  const systemPrompt = `You are "Jadran AI" — expert Adriatic sailing trip planner.
Respond ONLY with valid JSON. No markdown, no backticks, no preamble.

CRITICAL — SEA ROUTING (routes must NEVER cross land):
The Croatian coast has complex island geography. Routes must go AROUND islands through sea channels.
Key rules:
- SPLIT to BRAČ: south through Splitska vrata (Split Gate), along west coast of Brač
- SPLIT to HVAR: south through Split Gate, then Hvarski kanal between Brač and Hvar  
- SPLIT to VIS: south through Split Gate, southwest through open sea
- HVAR to KORČULA: east along south of Hvar, through Korčulanski kanal
- KORČULA to DUBROVNIK: east then south of Pelješac peninsula (NEVER through it)
- VIS TOWN to KOMIŽA: around western tip of Vis island
NEVER route through any island. Always route through sea channels between them.

For each day include "routeWaypoints": array of [lat,lng] pairs tracing the sea path (5-8 points per leg).

REFERENCE SEA ROUTES:
${JSON.stringify(SEA_ROUTES)}
${vesselCtx}

JSON structure:
{"tripTitle":"string","summary":"string","totalDistance":"string","difficulty":"Beginner|Intermediate|Advanced","bestFor":"string",
"days":[{"day":1,"title":"A → B","from":"A","to":"B","fromLat":0,"fromLng":0,"toLat":0,"toLng":0,
"routeWaypoints":[[lat,lng],[lat,lng]],"distance":"12 nm","sailTime":"2-3h",
"weather":{"temp":28,"wind":"NW 10-15kt","waves":"0.3m","condition":"Sunny"},
"highlights":["..."],"marina":"name","restaurant":"name","tip":"..."}],
"packingTips":["..."],"estimatedBudget":"string"}

WEATHER DATA:
${JSON.stringify(weather)}

MARINAS: ${JSON.stringify(MARINAS.map(m=>({name:m.name,lat:m.lat,lng:m.lng,price:m.price_range,rating:m.rating})))}
ANCHORAGES: ${JSON.stringify(ANCHORAGES.map(a=>({name:a.name,location:a.location,lat:a.lat,lng:a.lng,depth:a.depth,rating:a.rating})))}
RESTAURANTS: ${JSON.stringify(RESTAURANTS.map(r=>({name:r.name,location:r.location,rating:r.rating,price:r.price,must_try:r.must_try})))}

Rules: Use weather data for safety. Wind>25kt = suggest shelter. Families: 15-25nm/day. Experienced: up to 40nm. Include coordinates for all stops. Recommend restaurants rated 4.0+. Add insider tips.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userQuery }],
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'AI generation failed');
  const text = data.content?.[0]?.text || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// --- Routes ---
app.get('/', (req, res) => res.json({ status: 'ok', service: 'jadran-ai', version: '1.1.0' }));
app.get('/health', (req, res) => res.json({ status: 'ok', claude_api: process.env.CLAUDE_API_KEY ? 'configured' : 'missing' }));

app.post('/api/trips/generate', tripLimiter, async (req, res) => {
  try {
    const { query, startLat, startLng, vessel, language } = req.body;
    if (!query) return res.status(400).json({ error: 'Please describe your trip' });

    const lat = startLat || 43.5081;
    const lng = startLng || 16.4402;

    let fullQuery = query;
    if (language && language !== 'en') {
      const langNames = { sl:'Slovenian', hr:'Croatian', it:'Italian', de:'German' };
      fullQuery = `${query}\n\nRespond with all text in ${langNames[language]||language}. Keep JSON keys in English.`;
    }

    const weather = await getWeather(lat, lng, 7);
    const itinerary = await generateTrip(fullQuery, weather, vessel);

    res.json({ success: true, itinerary, weather_source: 'open-meteo.com', generated_at: new Date().toISOString() });
  } catch (err) {
    console.error('Trip generation error:', err);
    res.status(500).json({ error: 'Failed to generate trip. Please try again.' });
  }
});

app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lng, days } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
    const weather = await getWeather(parseFloat(lat), parseFloat(lng), parseInt(days) || 7);
    res.json({ success: true, forecasts: weather });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch weather data' }); }
});

app.get('/api/marinas', (req, res) => {
  const { region } = req.query;
  res.json({ success: true, marinas: region ? MARINAS.filter(m => m.region === region) : MARINAS });
});
app.get('/api/anchorages', (req, res) => res.json({ success: true, anchorages: ANCHORAGES }));
app.get('/api/restaurants', (req, res) => {
  const { minRating } = req.query;
  res.json({ success: true, restaurants: minRating ? RESTAURANTS.filter(r => r.rating >= parseFloat(minRating)) : RESTAURANTS });
});
app.post('/api/waitlist', async (req, res) => {
  try {
    const { email, source } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    console.log(`Waitlist signup: ${email} from ${source || 'direct'}`);
    res.json({ success: true, message: "Welcome aboard! You're on the list." });
  } catch (err) { res.status(500).json({ error: 'Failed to join waitlist' }); }
});

app.listen(PORT, () => {
  console.log(`⛵ Jadran AI v1.1.0 | Port ${PORT} | Claude API: ${process.env.CLAUDE_API_KEY ? '✅' : '❌'}`);
});
