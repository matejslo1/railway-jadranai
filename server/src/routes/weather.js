// Weather routes
const express = require('express');
const router = express.Router();
const { getCombinedForecast } = require('../services/weather');

// GET /api/weather?lat=43.5&lng=16.4&days=7
router.get('/', async (req, res) => {
  try {
    const { lat, lng, days } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }

    const forecasts = await getCombinedForecast(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(days) || 7
    );

    res.json({
      success: true,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      forecasts,
      source: 'open-meteo.com',
    });
  } catch (err) {
    console.error('[Weather] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

module.exports = router;
