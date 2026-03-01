// AI Trip Generation Service
// Uses Anthropic Claude API

const marinas = require('../data/marinas.json');
const anchorages = require('../data/anchorages.json');
const restaurants = require('../data/restaurants.json');

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

function buildSystemPrompt(weatherData, startLocation) {
  return `You are "Jadran AI" — an expert Adriatic sailing trip planner with decades of experience navigating the Croatian, Slovenian, and Montenegrin coasts.

You MUST respond ONLY with valid JSON — absolutely no markdown, no backticks, no preamble, no explanation. Just pure JSON.

RESPONSE JSON STRUCTURE:
{
  "tripTitle": "string — catchy descriptive name",
  "summary": "string — 2-3 sentence overview",
  "totalDistance": "string — e.g. '85 nm'",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "bestFor": "string — who this trip suits",
  "days": [
    {
      "day": 1,
      "title": "string — e.g. 'Split → Milna, Brač'",
      "from": "string",
      "to": "string",
      "fromLat": number,
      "fromLng": number,
      "toLat": number,
      "toLng": number,
      "distance": "string — e.g. '12 nm'",
      "sailTime": "string — e.g. '2-3 hours'",
      "departureTime": "string — recommended departure e.g. '09:00'",
      "weather": {
        "temp": number,
        "wind": "string — e.g. 'NW 10-15kt'",
        "waves": "string — e.g. '0.3-0.5m'",
        "condition": "string",
        "safety": "string — e.g. 'Perfect conditions'"
      },
      "highlights": ["string — 3-4 things to do/see"],
      "marina": { "name": "string", "price": "string" },
      "anchorage": { "name": "string", "notes": "string" },
      "restaurant": { "name": "string", "dish": "string", "price": "string" },
      "tip": "string — insider sailing/local tip"
    }
  ],
  "packingTips": ["string — 3-5 essentials"],
  "estimatedBudget": { "low": "string", "high": "string", "includes": "string" },
  "warnings": ["string — any safety warnings based on weather"]
}

LIVE WEATHER FORECAST (from Open-Meteo):
${JSON.stringify(weatherData, null, 2)}

AVAILABLE MARINAS:
${JSON.stringify(marinas.map(m => ({
    name: m.name, lat: m.lat, lng: m.lng,
    price: m.price_range, rating: m.rating,
    facilities: m.facilities, region: m.region
  })), null, 2)}

ANCHORAGES DATABASE:
${JSON.stringify(anchorages.map(a => ({
    name: a.name, location: a.location, lat: a.lat, lng: a.lng,
    depth: a.depth, seabed: a.seabed, protection: a.protection,
    rating: a.rating, notes: a.notes
  })), null, 2)}

TOP RESTAURANTS:
${JSON.stringify(restaurants.map(r => ({
    name: r.name, location: r.location, lat: r.lat, lng: r.lng,
    cuisine: r.cuisine, rating: r.rating, price: r.price,
    must_try: r.must_try, notes: r.notes
  })), null, 2)}

CRITICAL RULES:
- Use the real weather data to make safe route decisions
- If wind > 25kt on any day, suggest a sheltered route or rest day
- If wind > 30kt, mark that day as "stay in port" with indoor activities
- Keep daily distances reasonable: 15-25nm for families/beginners, up to 40nm for experienced
- Include accurate lat/lng coordinates for every from/to location
- Suggest departure times based on wind patterns (mornings are usually calmer)
- Each day must have either a marina OR anchorage recommendation (or both)
- Always recommend a dinner spot with the signature dish
- Add practical insider tips that only a local would know
- Budget should include marina fees, fuel, food, and activities
- If the trip starts from ${startLocation || 'Split'}, include provisioning tips for day 1`;
}

async function generateTrip(userQuery, weatherData, startLocation) {
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY not configured');
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: buildSystemPrompt(weatherData, startLocation),
      messages: [{ role: 'user', content: userQuery }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error('Failed to parse AI response:', text.substring(0, 500));
    throw new Error('AI generated invalid response. Please try again.');
  }
}

module.exports = { generateTrip };
