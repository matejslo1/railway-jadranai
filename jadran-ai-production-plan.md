# Jadran AI — Production Roadmap & Technical Blueprint

## Executive Summary

Jadran AI is an AI-powered Adriatic sailing trip planner that combines real-time weather data, curated local knowledge, and AI reasoning to generate personalized sailing itineraries. The product targets the 20M+ annual tourists visiting Croatia and the broader Mediterranean sailing community.

**Business model:** Freemium SaaS + affiliate commissions + B2B white-label
**Target launch:** MVP in 8 weeks, revenue-generating product in 16 weeks
**Estimated monthly costs at launch:** €150-300/month
**Break-even target:** ~200 paid users or €3,000/month affiliate revenue

---

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Domain & Branding

**Action items:**
- Register domain: `jadran.ai` (primary) or `jadran.hr` / `jadranai.com` (fallbacks)
- Set up Cloudflare DNS (you already have experience with this from drapple.si)
- Create simple brand identity: logo, color palette (deep navy #0a1628, ocean blue #3b9ece, warm gold #f0b429)
- Social accounts: Instagram @jadran.ai, Facebook, TikTok

**Estimated cost:** €10-30/year for domain

### 1.2 Tech Stack Setup

```
Frontend:       React (Vite) + Tailwind CSS
Backend:        Node.js / Express
Database:       PostgreSQL (Supabase — you already know it)
Hosting:        Railway (backend) + Vercel or Cloudflare Pages (frontend)
AI:             Claude API (Anthropic)
Auth:           Supabase Auth
Payments:       Stripe
Email:          Resend or Brevo (free tier)
Analytics:      Plausible or Umami (privacy-first, GDPR compliant)
```

**Project structure:**
```
jadran-ai/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── TripPlanner.jsx        # Main AI input + results
│   │   │   ├── ItineraryMap.jsx       # Interactive map view
│   │   │   ├── DayCard.jsx            # Day-by-day cards
│   │   │   ├── WeatherWidget.jsx      # Weather overlay
│   │   │   ├── MarinaPicker.jsx       # Marina browser
│   │   │   └── WaitlistForm.jsx       # Email capture
│   │   ├── pages/
│   │   │   ├── Home.jsx               # Landing + planner
│   │   │   ├── Pricing.jsx            # Free vs Pro
│   │   │   ├── Blog.jsx               # SEO content
│   │   │   └── Dashboard.jsx          # Saved trips (Pro)
│   │   └── lib/
│   │       ├── api.js                 # Backend API calls
│   │       └── auth.js                # Supabase auth
│   └── package.json
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── trips.js               # Trip generation endpoint
│   │   │   ├── weather.js             # Weather proxy
│   │   │   ├── places.js              # Restaurants, marinas
│   │   │   ├── auth.js                # Auth routes
│   │   │   └── webhooks.js            # Stripe webhooks
│   │   ├── services/
│   │   │   ├── ai.js                  # Claude API integration
│   │   │   ├── weather.js             # Weather API aggregator
│   │   │   ├── places.js              # Places data service
│   │   │   └── affiliate.js           # Affiliate link builder
│   │   ├── data/
│   │   │   ├── marinas.json           # Curated marina database
│   │   │   ├── anchorages.json        # Anchorage database
│   │   │   ├── restaurants.json       # Restaurant database
│   │   │   └── routes.json            # Popular route templates
│   │   └── middleware/
│   │       ├── rateLimit.js           # API rate limiting
│   │       └── auth.js                # JWT verification
│   └── package.json
├── database/
│   └── schema.sql                     # Supabase schema
└── scripts/
    └── seed-data.js                   # Initial data seeding
```

### 1.3 Database Schema (Supabase/PostgreSQL)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'free',  -- 'free', 'pro', 'seasonal'
  stripe_customer_id TEXT,
  queries_today INTEGER DEFAULT 0,
  queries_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated trips
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  query TEXT NOT NULL,
  itinerary JSONB NOT NULL,
  start_location TEXT,
  duration_days INTEGER,
  difficulty TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Curated places (your competitive moat)
CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,         -- 'marina', 'anchorage', 'restaurant', 'beach', 'attraction'
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  region TEXT,                -- 'dalmatia', 'istria', 'kvarner', 'montenegro'
  description TEXT,
  rating DECIMAL(2,1),
  price_range TEXT,
  facilities JSONB,
  photos TEXT[],
  affiliate_url TEXT,
  source TEXT,                -- 'curated', 'user', 'partner'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User reviews (builds your unique data)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  place_id UUID REFERENCES places(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  visited_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waitlist (pre-launch)
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  source TEXT,                -- 'landing', 'facebook', 'reddit'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics: track what users search for
CREATE TABLE search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  query TEXT,
  region TEXT,
  duration_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 2: Core API Integrations (Weeks 3-4)

### 2.1 Weather & Marine Data

**Primary: Open-Meteo Marine API (FREE)**
```
Endpoint: https://marine-api.open-meteo.com/v1/marine
Data: Wave height, wave direction, wave period, wind, temperature
Coverage: Global, 7-day forecast
Rate limit: 10,000 requests/day (free)
Docs: https://open-meteo.com/en/docs/marine-weather-api
```

**Secondary: Open-Meteo Weather API (FREE)**
```
Endpoint: https://api.open-meteo.com/v1/forecast
Data: Temperature, precipitation, cloud cover, UV index, sunrise/sunset
Rate limit: 10,000 requests/day (free)
```

**Premium upgrade: Stormglass.io**
```
Cost: Free (10 requests/day) → €19/month (1,000/day)
Data: More granular marine data, tidal info
Use when: You need higher precision or more API calls
```

**Implementation pattern:**
```javascript
// server/src/services/weather.js
async function getMarineForecast(lat, lng, days = 7) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    hourly: 'wave_height,wave_direction,wave_period,wind_wave_height',
    daily: 'wave_height_max,wave_direction_dominant',
    forecast_days: days,
    timezone: 'Europe/Zagreb'
  });

  const res = await fetch(
    `https://marine-api.open-meteo.com/v1/marine?${params}`
  );
  return res.json();
}

async function getWeatherForecast(lat, lng, days = 7) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant,uv_index_max',
    forecast_days: days,
    timezone: 'Europe/Zagreb'
  });

  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`
  );
  return res.json();
}
```

### 2.2 Places & Points of Interest

**Google Places API**
```
Cost: $17 per 1,000 requests (Place Details)
     $32 per 1,000 requests (Nearby Search)
Use: Restaurant details, ratings, hours, photos
Free credit: Google gives $200/month free = ~6,000 searches
```

**OpenStreetMap / Overpass API (FREE)**
```
Use: Marinas, anchorages, fuel stations, beaches
Strategy: Bulk download Croatian coast data, store locally
Update: Weekly refresh
```

**Your own curated database (FREE, highest value)**
```
Strategy: Manually curate top 200 spots along Croatian coast
Sources: Your local knowledge, sailing forums, guidebooks
This is your competitive moat — data Google doesn't have
```

### 2.3 Claude API Integration

**Cost estimation:**
```
Model: claude-sonnet-4-20250514
Input: ~2,000 tokens (user query + context data)
Output: ~1,500 tokens (itinerary JSON)
Cost per query: ~$0.015-0.025 (roughly €0.02)
1,000 queries/month: ~€20
10,000 queries/month: ~€200
```

**Production prompt architecture:**
```javascript
// server/src/services/ai.js
async function generateItinerary(userQuery, contextData) {
  const systemPrompt = buildSystemPrompt(contextData);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userQuery }]
    })
  });

  const data = await response.json();
  const text = data.content[0]?.text || '';
  return JSON.parse(text);
}

function buildSystemPrompt(ctx) {
  return `You are Jadran AI, expert Adriatic sailing planner.
  
LIVE WEATHER (next 7 days):
${JSON.stringify(ctx.weather)}

MARINAS IN RANGE:
${JSON.stringify(ctx.marinas)}

ANCHORAGES:
${JSON.stringify(ctx.anchorages)}

RESTAURANTS (rated 4.0+):
${JSON.stringify(ctx.restaurants)}

Respond with valid JSON only...`;
}
```

### 2.4 Interactive Map

**Mapbox GL JS (recommended)**
```
Cost: Free up to 50,000 map loads/month
Features: Custom styling (nautical theme), route lines, markers
Why: Better custom styling than Google Maps, generous free tier
```

**Alternative: Leaflet + OpenSeaMap (FREE)**
```
Cost: Completely free
Features: Nautical charts overlay, basic but functional
Why: Zero cost, good enough for MVP
```

---

## Phase 3: MVP Product (Weeks 5-8)

### 3.1 Core Features for Launch

**Free tier:**
- 3 AI trip plans per day
- Basic itinerary (day-by-day text)
- Weather overview (current conditions)
- Map view of route
- Share trip via link

**Pro tier (€6.99/month or €29.99/season May-Oct):**
- Unlimited trip plans
- Real-time weather routing (updates as conditions change)
- Detailed marina info (availability, prices, contacts)
- Offline-ready itineraries (PWA)
- Save & edit trips
- Restaurant booking links
- Printable PDF itinerary
- Priority AI (faster responses)

### 3.2 Landing Page Structure

```
Hero:         "Your AI Co-Captain for the Adriatic"
              [Try it free — input field]

Social proof: "Join 500+ sailors planning smarter trips"
              (use waitlist numbers)

How it works: 1. Tell us your trip → 2. AI plans your route → 3. Sail with confidence

Demo:         Live interactive demo (the prototype we built)

Features:     Weather-aware routing | 1,200+ islands covered | Local insider picks

Pricing:      Free (3/day) | Pro (€6.99/mo) | Seasonal (€29.99)

Testimonials: (add after beta)

Footer:       Blog | About | Contact | Privacy | Terms
```

### 3.3 SEO Content Strategy

Create blog posts targeting high-intent sailing queries:

```
"Best sailing routes in Croatia [current year]"         — 12,000 monthly searches
"Croatia sailing itinerary 7 days"                      — 4,400 monthly searches
"Split to Dubrovnik sailing route"                      — 2,900 monthly searches
"Best anchorages Dalmatian coast"                       — 1,600 monthly searches
"Sailing weather Croatia"                               — 1,200 monthly searches
"Hvar to Vis sailing"                                   — 800 monthly searches
```

Each blog post ends with a CTA: "Plan this exact route with Jadran AI →"

### 3.4 Rate Limiting & Cost Control

```javascript
// Free: 3 queries/day, Pro: unlimited
// Cache popular routes (Split 7-day, Dubrovnik 5-day, etc.)
// Cache weather data for 6 hours (it doesn't change faster)
// Pre-generate "trending" routes daily to serve instantly
```

---

## Phase 4: Monetization Setup (Weeks 9-12)

### 4.1 Stripe Integration

```
Products:
- jadran_pro_monthly:  €6.99/month
- jadran_pro_seasonal: €29.99 (May 1 - Oct 31)
- jadran_pro_annual:   €49.99/year

Payment methods: Cards, SEPA (important for EU), Apple Pay, Google Pay
```

### 4.2 Affiliate Programs to Join

| Partner | Commission | How to Join |
|---------|-----------|-------------|
| Booking.com | 25-40% of their commission | booking.com/affiliate |
| GetYourGuide | 8% per activity booking | partner.getyourguide.com |
| Viator | 8% per activity | viator.com/partners |
| Charter companies (direct) | 5-15% per booking | Contact individually |
| Nautal (boat rental) | 5-10% | nautal.com/affiliates |
| Click&Boat | 8% per booking | clickandboat.com/affiliate |
| Worldpackers | Per referral | Travel experience platform |
| SafetyWing | Travel insurance affiliate | safetywing.com/affiliates |

**How affiliate links work in the product:**

When the AI recommends a restaurant or marina, the link goes through your affiliate tracking:
```
User sees: "Dinner at Villa Kaliopa, Vis Town ★4.8"
Link goes to: jadran.ai/go/villa-kaliopa
Which redirects to: booking.com/restaurant/villa-kaliopa?aid=YOUR_AFFILIATE_ID
You earn: commission on any booking
```

### 4.3 B2B Outreach (Month 3+)

**Target: Charter companies**
```
Pitch: "We send you qualified leads who already have a trip plan.
       Embed our AI planner on your website as a 'Trip Planner' feature.
       €200-500/month or revenue share on bookings."

Companies to contact:
- Sunsail Croatia
- The Moorings
- Dream Yacht Charter
- Navigare Yachting
- Ultra Sailing
- Nava (Croatian company)
- SailChecker
```

**Target: Tourism boards**
```
- Croatian National Tourist Board
- Split Tourist Board
- Dubrovnik Tourist Board
- Zadar Tourist Board
- Slovenian Tourist Board (Portorož, Piran)
```

---

## Phase 5: Growth (Weeks 13-20)

### 5.1 Launch Strategy

**Week 1-2 pre-launch:**
- Post in sailing Facebook groups (Sailing Croatia, Adriatic Sailing, etc.)
- Reddit: r/sailing, r/croatia, r/digitalnomad
- Product Hunt launch
- Sailing forums: cruisersforum.com, sailboatowners.com

**Launch channels:**
- Facebook/Instagram ads targeting "Croatia sailing" interests (€5-10/day)
- Google Ads on "croatia sailing itinerary" keywords
- Partner with sailing YouTubers / Instagram influencers
- Guest posts on sailing blogs

### 5.2 Expansion Roadmap

```
Month 1-3:  Croatian Dalmatian coast (Split → Dubrovnik)
Month 4-6:  Full Croatian coast + Slovenia (Portorož, Piran, Izola)  
Month 7-9:  Montenegro (Kotor, Budva) + Greek Ionian islands
Month 10-12: Italy (Sardinia, Amalfi) + Turkey (Bodrum, Fethiye)
Year 2:     Full Mediterranean coverage
```

### 5.3 Key Metrics to Track

```
Acquisition:  Waitlist signups, daily active users, traffic sources
Activation:   % who generate first trip, % who generate 2nd trip
Revenue:      MRR, affiliate revenue, ARPU, conversion rate free→pro
Retention:    Monthly active users, trip saves, return visits
Referral:     Shared trips, referral signups
```

---

## Budget Summary

### Monthly Costs (at MVP launch)

| Item | Cost |
|------|------|
| Railway hosting (backend) | €5-10 |
| Vercel (frontend) | Free |
| Supabase (database + auth) | Free tier |
| Claude API (~2,000 queries) | €30-50 |
| Open-Meteo weather API | Free |
| Mapbox (maps) | Free tier |
| Domain + Cloudflare | €2 |
| Resend (email) | Free tier |
| **Total** | **€40-65/month** |

### Monthly Costs (at 1,000 active users)

| Item | Cost |
|------|------|
| Railway hosting | €20-30 |
| Supabase Pro | €25 |
| Claude API (~10,000 queries) | €150-200 |
| Google Places API | €50 |
| Mapbox | Free (under 50K loads) |
| Stormglass (premium weather) | €19 |
| Stripe fees (2.9% + €0.25) | Variable |
| **Total** | **€270-330/month** |

---

## Immediate Next Steps (This Week)

1. **Register domain** — check availability of jadran.ai, jadranai.com, jadran.hr
2. **Set up GitHub repo** — initialize the project structure above
3. **Create Supabase project** — set up database with the schema provided
4. **Set up Railway project** — deploy a basic Express server
5. **Get API keys** — Anthropic (Claude), Open-Meteo (no key needed), Mapbox
6. **Start data curation** — create initial JSON files with 50 marinas, 50 restaurants, 30 anchorages
7. **Deploy the prototype** — get the React app live on Vercel with the backend on Railway
8. **Set up waitlist** — simple email capture on the landing page
9. **First social post** — "Building an AI sailing planner for the Adriatic — who wants early access?"

---

## Legal Notes (EU/Slovenia Specific)

- **GDPR compliance**: Privacy policy, cookie consent, data processing agreement
- **Business registration**: Can operate as s.p. (sole proprietor) initially, upgrade to d.o.o. when revenue justifies it
- **VAT**: EU digital services VAT applies, use Stripe Tax or Paddle for automatic handling
- **Terms of service**: Include disclaimers that AI-generated routes are suggestions, not navigation advice
- **Cookie policy**: Use privacy-first analytics (Plausible/Umami) to minimize cookie requirements

---

*Document version: 1.0 | Created: February 2026 | Author: Jadran AI Project*
