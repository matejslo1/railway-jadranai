// ============================================
//  ⛵ Jadran AI — Adriatic Voyage Planner
//  Production Server
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { apiLimiter } = require('./middleware/rateLimit');

// Routes
const tripRoutes = require('./routes/trips');
const weatherRoutes = require('./routes/weather');
const placesRoutes = require('./routes/places');
const waitlistRoutes = require('./routes/waitlist');

const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-user-id', 'Authorization'],
};

const PORT = process.env.PORT || 3001;

// Railway runs behind a reverse proxy — required for rate limiting and IP detection
app.set('trust proxy', 1);

// --- Global Middleware ---
app.use(cors(corsOptions));
// Respond to CORS preflight requests (important for Vercel -> Railway)
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

// --- Health Check ---
app.get('/', (req, res) => {
  res.json({
    service: 'Jadran AI',
    status: 'operational',
    version: '1.0.0',
    endpoints: {
      trips: 'POST /api/trips/generate',
      weather: 'GET /api/weather?lat=&lng=&days=',
      marinas: 'GET /api/places/marinas',
      anchorages: 'GET /api/places/anchorages',
      restaurants: 'GET /api/places/restaurants',
      waitlist: 'POST /api/waitlist',
    },
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    claude_api: process.env.CLAUDE_API_KEY ? 'configured' : 'missing',
  });
});

// --- API Routes ---
app.use('/api/trips', tripRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/waitlist', waitlistRoutes);


// --- Serve built client (optional) ---
// If you deploy on a single VPS, build the client and the server will serve it.
// (Railway/Vercel split deployments can ignore this.)
const path = require('path');
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
if (require('fs').existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // SPA fallback (Vite/React Router)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// --- Error Handler ---
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`
  ⛵  Jadran AI Server v1.0.0
  📍  Port: ${PORT}
  🌊  Env: ${process.env.NODE_ENV || 'development'}
  🔑  Claude API: ${process.env.CLAUDE_API_KEY ? '✅ configured' : '❌ MISSING'}
  🌐  CORS: ${process.env.FRONTEND_URL || '*'}
  
  Endpoints:
    POST /api/trips/generate    — AI trip planner
    GET  /api/weather            — Weather forecasts
    GET  /api/places/marinas     — Marina database
    GET  /api/places/anchorages  — Anchorage database
    GET  /api/places/restaurants — Restaurant picks
    POST /api/waitlist           — Email waitlist
  `);
});
