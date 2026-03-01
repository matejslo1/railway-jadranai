// Places routes (marinas, anchorages, restaurants)
const express = require('express');
const router = express.Router();
const { getMarinas, getAnchorages, getRestaurants } = require('../services/places');

// GET /api/places/marinas?region=split&lat=43.5&lng=16.4&minRating=4.0
router.get('/marinas', (req, res) => {
  const { region, lat, lng, radius, minRating } = req.query;
  const results = getMarinas({
    region,
    lat: lat ? parseFloat(lat) : undefined,
    lng: lng ? parseFloat(lng) : undefined,
    radius: radius ? parseFloat(radius) : undefined,
    minRating: minRating ? parseFloat(minRating) : undefined,
  });
  res.json({ success: true, count: results.length, marinas: results });
});

// GET /api/places/anchorages?lat=43.5&lng=16.4&minRating=4.0
router.get('/anchorages', (req, res) => {
  const { lat, lng, radius, minRating } = req.query;
  const results = getAnchorages({
    lat: lat ? parseFloat(lat) : undefined,
    lng: lng ? parseFloat(lng) : undefined,
    radius: radius ? parseFloat(radius) : undefined,
    minRating: minRating ? parseFloat(minRating) : undefined,
  });
  res.json({ success: true, count: results.length, anchorages: results });
});

// GET /api/places/restaurants?lat=43.5&lng=16.4&minRating=4.5&price=€€
router.get('/restaurants', (req, res) => {
  const { lat, lng, radius, minRating, price } = req.query;
  const results = getRestaurants({
    lat: lat ? parseFloat(lat) : undefined,
    lng: lng ? parseFloat(lng) : undefined,
    radius: radius ? parseFloat(radius) : undefined,
    minRating: minRating ? parseFloat(minRating) : undefined,
    price,
  });
  res.json({ success: true, count: results.length, restaurants: results });
});

module.exports = router;
