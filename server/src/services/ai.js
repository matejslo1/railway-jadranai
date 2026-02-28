// AI Trip Generation + Chat Service
const marinas = require('../data/marinas.json');
const anchorages = require('../data/anchorages.json');
const restaurants = require('../data/restaurants.json');

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

const LANGUAGE_NAMES = {
  en: 'English', sl: 'Slovenian', hr: 'Croatian', it: 'Italian', de: 'German',
};

function buildSystemPrompt(weatherData, startLocation, language = 'en') {
  const langName = LANGUAGE_NAMES[language] || 'English';
  return `You are "Jadran AI" — an expert Adriatic sailing trip planner with decades of experience navigating the Croatian, Slovenian, and Montenegrin coasts.

LANGUAGE: You MUST respond entirely in ${langName}. Every field in the JSON must be in ${langName}.

You MUST respond ONLY with valid JSON — no markdown, no backticks, no preamble. Just pure JSON.

RESPONSE JSON STRUCTURE:
{
  "tripTitle": "string",
  "summary": "string — 2-3 sentences",
  "totalDistance": "string — e.g. '85 nm'",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "bestFor": "string",
  "days": [
    {
      "day": 1,
      "title": "string — e.g. 'Split → Milna, Brač'",
      "from": "string", "to": "string",
      "fromLat": number, "fromLng": number,
      "toLat": number, "toLng": number,
      "distance": "string", "sailTime": "string", "departureTime": "string",
      "weather": { "temp": number, "wind": "string", "waves": "string", "condition": "string", "safety": "string" },
      "highlights": ["string"],
      "marina": { "name": "string", "price": "string" },
      "anchorage": { "name": "string", "notes": "string" },
      "restaurant": { "name": "string", "dish": "string", "price": "string" },
      "tip": "string"
    }
  ],
  "packingTips": ["string"],
  "estimatedBudget": { "low": "string", "high": "string", "includes": "string" },
  "warnings": ["string"]
}

LIVE WEATHER FORECAST:
${JSON.stringify(weatherData, null, 2)}

AVAILABLE MARINAS:
${JSON.stringify(marinas.map(m => ({ name: m.name, lat: m.lat, lng: m.lng, price: m.price_range, rating: m.rating, facilities: m.facilities, region: m.region })), null, 2)}

ANCHORAGES:
${JSON.stringify(anchorages.map(a => ({ name: a.name, location: a.location, lat: a.lat, lng: a.lng, depth: a.depth, seabed: a.seabed, protection: a.protection, rating: a.rating, notes: a.notes })), null, 2)}

RESTAURANTS:
${JSON.stringify(restaurants.map(r => ({ name: r.name, location: r.location, lat: r.lat, lng: r.lng, cuisine: r.cuisine, rating: r.rating, price: r.price, must_try: r.must_try, notes: r.notes })), null, 2)}

CRITICAL RULES:
- ALL text content in JSON must be in ${langName}
- If wind > 25kt suggest sheltered route; if > 30kt mark as stay in port
- Daily distances: 15-25nm beginners, up to 40nm experienced
- Include accurate lat/lng for every from/to location
- Each day must have marina OR anchorage (or both)
- Always recommend dinner with signature dish
- Starting from ${startLocation || 'Split'}: include day 1 provisioning tips`;
}

async function callClaude(system, userMessage, maxTokens = 4000) {
  if (!process.env.CLAUDE_API_KEY) throw new Error('CLAUDE_API_KEY not configured');
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error: ${response.status}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text || '';
}

async function generateTrip(userQuery, weatherData, startLocation, language = 'en') {
  const text = await callClaude(buildSystemPrompt(weatherData, startLocation, language), userQuery, 4000);
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error('Failed to parse AI response:', text.substring(0, 500));
    throw new Error('AI generated invalid response. Please try again.');
  }
}

async function chatWithTrip(message, itinerary, language = 'en') {
  const langName = LANGUAGE_NAMES[language] || 'English';
  const system = `You are "Jadran AI", an expert Adriatic sailing assistant. The user has already generated a sailing itinerary and wants to ask follow-up questions or request modifications.

LANGUAGE: Always respond in ${langName}.
FORMATTING: Never use markdown. No **bold**, no *italic*, no ### headers, no code blocks. Write plain text with line breaks only. For lists use: "1. item" or "• item".

You have full context of their current itinerary:
${JSON.stringify(itinerary, null, 2)}

You can:
- Answer questions about the route, marinas, anchorages, restaurants
- Suggest alternatives for specific days
- Advise on weather, safety, local tips
- Help modify the itinerary conceptually

Keep responses concise and practical. If suggesting changes to a day, be specific. Use nautical terminology naturally. Respond in ${langName}.`;

  return await callClaude(system, message, 1000);
}

// Known safe Adriatic waypoints — major channels, straits, and open sea passages
// Used to route paths around islands and shallow areas
const ADRIATIC_SAFE_CHANNELS = `
KNOWN SAFE CHANNELS AND WAYPOINTS IN THE ADRIATIC:

Istria / North Adriatic:
- Rovinj approach: 45.08, 13.64
- Pula outer anchorage: 44.85, 13.82
- Lošinj channel north: 44.58, 14.40
- Lošinj channel south: 44.47, 14.47

Zadar area:
- Zadar north approach (outside Ugljan): 44.17, 15.15
- Murter channel (Srima side): 43.82, 15.65
- Kornati north entry: 43.83, 15.42
- Kornati south entry: 43.57, 15.55
- Dugi Otok east channel: 44.00, 15.18

Split / Central Dalmatia:
- Šolta north channel: 43.40, 16.25
- Brač north channel (Splitska vrata): 43.47, 16.42
- Hvar west approach: 43.19, 16.35
- Hvar east approach (Pakleni): 43.15, 16.47
- Vis north approach: 43.10, 16.15
- Vis south passage: 43.00, 16.18

South Dalmatia:
- Korčula north channel: 42.98, 17.08
- Korčula south channel (Pelješac strait): 42.93, 17.12
- Mljet north channel: 42.77, 17.40
- Lastovo east passage: 42.76, 16.92
- Dubrovnik outer approach: 42.65, 18.05

AREAS TO AVOID:
- Vrulje shoals near Murter: depth < 3m
- Žirje south: rocks and shoals
- Prijevor passage (Brač south): strong currents
- Inside Kornati without local knowledge: many submerged rocks
`;

async function generateSafeRoute(days, vesselDraft = 2.0, vesselType = 'sailboat') {
  const system = `You are a professional Adriatic sailing navigator with 30 years of experience. 
Your task is to generate safe intermediate waypoints between sailing legs, taking into account the vessel characteristics and known hazards.

You MUST respond ONLY with valid JSON — no markdown, no backticks, no explanation. Pure JSON only.

VESSEL: ${vesselType}, draft ${vesselDraft}m

${ADRIATIC_SAFE_CHANNELS}

RULES:
- For each leg, provide 0-3 intermediate waypoints between from and to coordinates
- Only add waypoints where needed to avoid islands, shoals, or known hazards
- Stay in well-known channels and passages
- Keep minimum 0.5nm clearance from coastlines unless entering a marina
- If the direct route is already safe open water, return empty waypoints array
- Coordinates must be in Croatian waters (lat: 42.3-45.5, lng: 13.5-18.5)

Response format — array of legs matching input order:
[
  {
    "day": 1,
    "from": "Split",
    "to": "Milna",
    "waypoints": [
      { "lat": 43.48, "lng": 16.38, "note": "Splitska vrata - main channel" }
    ]
  }
]`;

  const userMsg = `Generate safe waypoints for these sailing legs:\n${JSON.stringify(days.map(d => ({
    day: d.day,
    from: d.from,
    to: d.to,
    fromLat: d.fromLat,
    fromLng: d.fromLng,
    toLat: d.toLat,
    toLng: d.toLng,
  })), null, 2)}`;

  const text = await callClaude(system, userMsg, 2000);
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error('Failed to parse safe route response:', text.substring(0, 300));
    return days.map(d => ({ day: d.day, from: d.from, to: d.to, waypoints: [] }));
  }
}

module.exports = { generateTrip, chatWithTrip, generateSafeRoute };
