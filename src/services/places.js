// Places data service
// Serves curated marina, anchorage, and restaurant data
// Later: replace with database queries

const marinas = require('../data/marinas.json');
const anchorages = require('../data/anchorages.json');
const restaurants = require('../data/restaurants.json');

// Find places within radius (km) of a point
function findNearby(places, lat, lng, radiusKm = 50) {
  return places
    .map(p => ({
      ...p,
      distance_km: haversine(lat, lng, p.lat, p.lng),
    }))
    .filter(p => p.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);
}

// Haversine distance in km
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * Math.PI / 180; }

function getMarinas(options = {}) {
  let result = [...marinas];
  if (options.region) result = result.filter(m => m.region === options.region);
  if (options.lat && options.lng) result = findNearby(result, options.lat, options.lng, options.radius || 50);
  if (options.minRating) result = result.filter(m => m.rating >= options.minRating);
  return result;
}

function getAnchorages(options = {}) {
  let result = [...anchorages];
  if (options.lat && options.lng) result = findNearby(result, options.lat, options.lng, options.radius || 50);
  if (options.minRating) result = result.filter(a => a.rating >= options.minRating);
  return result;
}

function getRestaurants(options = {}) {
  let result = [...restaurants];
  if (options.lat && options.lng) result = findNearby(result, options.lat, options.lng, options.radius || 30);
  if (options.minRating) result = result.filter(r => r.rating >= options.minRating);
  if (options.price) result = result.filter(r => r.price === options.price);
  return result;
}

module.exports = { getMarinas, getAnchorages, getRestaurants, findNearby };
