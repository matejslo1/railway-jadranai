// Rate limiting middleware
const rateLimit = require('express-rate-limit');

// Trip generation: 3 per minute for free users
const tripLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: {
    error: 'Rate limit reached. Upgrade to Pro for unlimited trip planning.',
    upgrade_url: '/pricing',
  },
  keyGenerator: (req) => req.headers['x-user-id'] || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// General API: 60 requests per minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

module.exports = { tripLimiter, apiLimiter };
