// Trip generation + chat routes
const express = require('express');
const router = express.Router();
const { generateTrip, chatWithTrip, generateSafeRoute } = require('../services/ai');
const { getCombinedForecast } = require('../services/weather');
const { tripLimiter } = require('../middleware/rateLimit');

const START_LOCATIONS = {
  'split': { lat: 43.5081, lng: 16.4402 },
  'dubrovnik': { lat: 42.6507, lng: 18.0944 },
  'trogir': { lat: 43.5125, lng: 16.2472 },
  'zadar': { lat: 44.1194, lng: 15.2314 },
  'šibenik': { lat: 43.7350, lng: 15.8952 },
  'sibenik': { lat: 43.7350, lng: 15.8952 },
  'hvar': { lat: 43.1729, lng: 16.4412 },
  'korčula': { lat: 42.9597, lng: 17.1347 },
  'korcula': { lat: 42.9597, lng: 17.1347 },
  'pula': { lat: 44.8666, lng: 13.8496 },
  'rovinj': { lat: 45.0812, lng: 13.6387 },
  'biograd': { lat: 43.9364, lng: 15.4467 },
  'kaštela': { lat: 43.5511, lng: 16.3700 },
  'kastela': { lat: 43.5511, lng: 16.3700 },
};

const SUPPORTED_LANGUAGES = ['en', 'sl', 'hr', 'it', 'de'];

function detectStartLocation(query) {
  const lower = query.toLowerCase();
  for (const [name, coords] of Object.entries(START_LOCATIONS)) {
    if (lower.includes(name)) return { name, ...coords };
  }
  return { name: 'split', ...START_LOCATIONS.split };
}

// POST /api/trips/generate
router.post('/generate', tripLimiter, async (req, res) => {
  try {
    const { query, startLat, startLng, language, vessel } = req.body;
    if (!query || query.trim().length < 10) {
      return res.status(400).json({ error: 'Please describe your trip in more detail (at least 10 characters).' });
    }
    const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
    let lat, lng, startName;
    if (startLat && startLng) {
      lat = parseFloat(startLat); lng = parseFloat(startLng); startName = 'custom';
    } else {
      const detected = detectStartLocation(query);
      lat = detected.lat; lng = detected.lng; startName = detected.name;
    }
    console.log(`[Trip] "${query.substring(0, 80)}" from ${startName} lang=${lang}`);
    const weather = await getCombinedForecast(lat, lng, 7);
    const itinerary = await generateTrip(query, weather, startName, lang, vessel);
    
    const snapped = await snapItineraryToWater(itinerary);
console.log(`[Trip] Generated: "${itinerary.tripTitle}" — ${itinerary.days?.length} days`);
    res.json({
      success: true, itinerary,
      meta: { start_location: startName, weather_source: 'open-meteo.com', generated_at: new Date().toISOString(), ai_model: 'claude-sonnet-4', language: lang },
    });
  } catch (err) {
    console.error('[Trip] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate your trip. Please try again.', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
});

// POST /api/trips/chat
router.post('/chat', tripLimiter, async (req, res) => {
  try {
    const { message, itinerary, language } = req.body;
    if (!message || !itinerary) {
      return res.status(400).json({ error: 'message and itinerary are required' });
    }
    const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
    console.log(`[Chat] "${message.substring(0, 60)}" lang=${lang}`);
    const reply = await chatWithTrip(message, itinerary, lang);
    res.json({ success: true, reply });
  } catch (err) {
    console.error('[Chat] Error:', err.message);
    res.status(500).json({ error: 'Chat failed. Please try again.' });
  }
});

// POST /api/trips/safe-route
// Generates safe waypoints for an existing itinerary based on vessel characteristics
router.post('/safe-route', tripLimiter, async (req, res) => {
  try {
    const { days, vessel, vesselDraft, vesselType, vesselAirDraft, cruiseSpeedKn } = req.body;
    if (!days || !Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: 'days array is required' });
    }
    const draft = parseFloat(vessel?.draft_m ?? vesselDraft) || 2.0;
    const type = (vessel?.type ?? vesselType) || 'sailboat';
    const airDraft = parseFloat(vessel?.air_draft_m ?? vesselAirDraft) || null;
    const cruiseSpeed = parseFloat(vessel?.cruise_speed_kn ?? cruiseSpeedKn) || null;
    console.log(`[SafeRoute] ${days.length} legs, draft=${draft}m, type=${type}` + (airDraft ? `, airDraft=${airDraft}m` : '') + (cruiseSpeed ? `, speed=${cruiseSpeed}kn` : ''));
    const safeRoute = await generateSafeRoute(days, { draft_m: draft, type, air_draft_m: airDraft, cruise_speed_kn: cruiseSpeed });
    console.log(`[SafeRoute] Generated ${safeRoute.length} legs with waypoints`);
    res.json({ success: true, safeRoute });
  } catch (err) {
    console.error('[SafeRoute] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate safe route. Please try again.' });
  }
});

module.exports = router;
