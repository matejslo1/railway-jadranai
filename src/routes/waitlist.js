// Waitlist routes
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Simple file-based storage until Supabase is set up
const WAITLIST_FILE = path.join(__dirname, '../../data/waitlist.json');

function loadWaitlist() {
  try {
    if (fs.existsSync(WAITLIST_FILE)) {
      return JSON.parse(fs.readFileSync(WAITLIST_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveWaitlist(list) {
  const dir = path.dirname(WAITLIST_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(WAITLIST_FILE, JSON.stringify(list, null, 2));
}

// POST /api/waitlist
router.post('/', (req, res) => {
  try {
    const { email, source } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const waitlist = loadWaitlist();

    // Check duplicate
    if (waitlist.some(e => e.email.toLowerCase() === email.toLowerCase())) {
      return res.json({ success: true, message: "You're already on the list! We'll be in touch soon." });
    }

    waitlist.push({
      email: email.toLowerCase().trim(),
      source: source || 'direct',
      joined_at: new Date().toISOString(),
    });

    saveWaitlist(waitlist);
    console.log(`[Waitlist] New signup: ${email} (source: ${source || 'direct'}) — Total: ${waitlist.length}`);

    res.json({
      success: true,
      message: "Welcome aboard! You're on the list.",
      position: waitlist.length,
    });
  } catch (err) {
    console.error('[Waitlist] Error:', err.message);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

// GET /api/waitlist/count (public — for social proof)
router.get('/count', (req, res) => {
  const waitlist = loadWaitlist();
  res.json({ count: waitlist.length });
});

module.exports = router;
