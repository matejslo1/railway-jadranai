// Trip generation routes
const express = require('express');
const router = express.Router();
const { generateTrip } = require('../services/ai');
const { getCombinedForecast } = require('../services/weather');
const { tripLimiter } = require('../middleware/rateLimit');

// Known starting locations with coordinates
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

// Detect starting location from query text
function detectStartLocation(query) {
  const lower = query.toLowerCase();
  for (const [name, coords] of Object.entries(START_LOCATIONS)) {
    if (lower.includes(name)) return { name, ...coords };
  }
  // Default to Split (most popular charter base)
  return { name: 'split', ...START_LOCATIONS.split };
}

// POST /api/trips/generate
router.post('/generate', tripLimiter, async (req, res) => {
  try {
    const { query, startLat, startLng, language } = req.body;

    if (!query || query.trim().length < 10) {
      return res.status(400).json({
        error: 'Please describe your trip in more detail (at least 10 characters).',
      });
    }

    // Validate and sanitize language
    const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';

    // Determine starting coordinates
    let lat, lng, startName;
    if (startLat && startLng) {
      lat = parseFloat(startLat);
      lng = parseFloat(startLng);
      startName = 'custom';
    } else {
      const detected = detectStartLocation(query);
      lat = detected.lat;
      lng = detected.lng;
      startName = detected.name;
    }

    console.log(`[Trip] Generating for: "${query.substring(0, 80)}..." from ${startName} (${lat}, ${lng}) lang=${lang}`);

    // Fetch real weather data
    const weather = await getCombinedForecast(lat, lng, 7);

    // Generate AI itinerary with language
    const itinerary = await generateTrip(query, weather, startName, lang);

    console.log(`[Trip] Generated: "${itinerary.tripTitle}" — ${itinerary.days?.length} days, ${itinerary.totalDistance}`);

    res.json({
      success: true,
      itinerary,
      meta: {
        start_location: startName,
        weather_source: 'open-meteo.com',
        generated_at: new Date().toISOString(),
        ai_model: 'claude-sonnet-4',
        language: lang,
      },
    });
  } catch (err) {
    console.error('[Trip] Generation error:', err.message);
    res.status(500).json({
      error: 'Failed to generate your trip. Please try again.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

module.exports = router;
