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
FORMATTING: Never use markdown. No **bold**, no *italic*, no ### headers, no ``` code blocks. Write plain text with line breaks only. For lists use: "1. item" or "• item".

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

module.exports = { generateTrip, chatWithTrip };
