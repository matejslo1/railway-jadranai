import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { generateTrip, joinWaitlist } from './lib/api.js';

// --- Icons ---
const Icons = {
  Wave: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12c1.5-2 3-3 4.5-3s3 1 4.5 3 3 3 4.5 3 3-1 4.5-3"/><path d="M2 17c1.5-2 3-3 4.5-3s3 1 4.5 3 3 3 4.5 3 3-1 4.5-3"/></svg>,
  Wind: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>,
  Anchor: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="21"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>,
  Compass: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor"/></svg>,
  Send: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Sun: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Mail: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  Sail: () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3b9ece" strokeWidth="1.5"><path d="M2 20L12 4l3 6 5-2-6 12H2z" fill="rgba(59,158,206,0.15)"/><path d="M2 20L12 4l3 6 5-2-6 12H2z"/></svg>,
  Globe: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'sl', label: 'SL', name: 'Slovenščina' },
  { code: 'hr', label: 'HR', name: 'Hrvatski' },
  { code: 'it', label: 'IT', name: 'Italiano' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
];

// --- Language Switcher ---
function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const select = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="lang-switcher">
      <button className="lang-btn" onClick={() => setOpen(!open)}>
        <Icons.Globe /> {current.label}
      </button>
      {open && (
        <div className="lang-dropdown">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`lang-option ${lang.code === current.code ? 'active' : ''}`}
              onClick={() => select(lang.code)}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Waitlist Form ---
function WaitlistForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) return;
    setStatus('loading');
    try {
      const data = await joinWaitlist(email);
      if (data.success) { setStatus('success'); setMessage(data.message); }
      else { setStatus('error'); setMessage(data.error || 'Something went wrong'); }
    } catch { setStatus('error'); setMessage('Connection failed. Please try again.'); }
  };

  if (status === 'success') {
    return (
      <div className="waitlist-success">
        <Icons.Check /> <span>{message}</span>
      </div>
    );
  }

  return (
    <div className="waitlist-form">
      <div className="waitlist-input-wrap">
        <Icons.Mail />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder={t('waitlist_placeholder')} />
      </div>
      <button onClick={handleSubmit} disabled={status === 'loading'} className="waitlist-btn">
        {status === 'loading' ? t('waitlist_joining') : t('waitlist_btn')}
      </button>
    </div>
  );
}

// --- Main App ---
export default function App() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [streamText, setStreamText] = useState('');
  const [activeDay, setActiveDay] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [error, setError] = useState(null);
  const resultRef = useRef(null);

  const plan = async (inputQuery) => {
    const q = inputQuery || query;
    if (!q.trim()) return;

    setLoading(true); setShowWelcome(false); setItinerary(null);
    setMeta(null); setError(null);

    const phases = t('loading_phases', { returnObjects: true });
    setStreamText(phases[0]);
    let i = 0;
    const interval = setInterval(() => { i++; if (i < phases.length) setStreamText(phases[i]); }, 2200);

    try {
      const data = await generateTrip(q, i18n.language);
      clearInterval(interval);
      if (data.success && data.itinerary) {
        setItinerary(data.itinerary); setMeta(data.meta);
        setActiveDay(0); setStreamText('');
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } else {
        throw new Error(data.error || 'Failed to generate itinerary');
      }
    } catch (err) {
      clearInterval(interval); setError(err.message); setStreamText('');
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); plan(); } };
  const reset = () => { setItinerary(null); setMeta(null); setQuery(''); setError(null); setShowWelcome(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const suggestions = t('loading_phases', { returnObjects: true }) && t('suggestions', { returnObjects: true });

  const day = itinerary?.days?.[activeDay];
  const weather = day ? (day.weather || {}) : {};
  const marina = day ? (typeof day.marina === 'string' ? { name: day.marina } : day.marina || {}) : {};
  const anchorage = day ? (typeof day.anchorage === 'string' ? { name: day.anchorage } : day.anchorage || {}) : {};
  const restaurant = day ? (typeof day.restaurant === 'string' ? { name: day.restaurant } : day.restaurant || {}) : {};

  return (
    <>
      <div className="app">
        <div className="bg-gradient" />
        <div className="content">

          {/* Header */}
          <header className="header">
            <div className="header-top">
              <LanguageSwitcher />
            </div>
            <div className="logo-mark">
              <div className="logo-icon"><Icons.Sail /></div>
              <h1 className="title">Jadran AI</h1>
            </div>
            <p className="subtitle">{t('subtitle')}</p>
            {showWelcome && (
              <div className="fade-in">
                <p className="tagline">{t('tagline')}</p>
                <div className="badge"><span className="live-dot" /> {t('badge')}</div>
              </div>
            )}
          </header>

          {/* Input */}
          <div className="input-section">
            <div className="input-wrapper">
              <textarea placeholder={t('placeholder')} value={query}
                onChange={e => setQuery(e.target.value)} onKeyDown={handleKey} rows={2} disabled={loading} />
              <div className="input-footer">
                <span className="hint">{t('hint')}</span>
                <button className="send-btn" onClick={() => plan()} disabled={loading || !query.trim()}>
                  {loading ? t('planning_btn') : <><Icons.Send /> {t('plan_btn')}</>}
                </button>
              </div>
            </div>
            {showWelcome && Array.isArray(suggestions) && (
              <div className="suggestions fade-in">
                {suggestions.map((sg, i) => (
                  <button key={i} className="chip" onClick={() => { setQuery(sg); plan(sg); }}>
                    <Icons.Compass /> {sg}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Waitlist */}
          {showWelcome && (
            <div className="waitlist-section fade-in">
              <p className="waitlist-label">{t('waitlist_label')}</p>
              <WaitlistForm />
            </div>
          )}

          {/* Loading */}
          {loading && streamText && (
            <div className="loading fade-in">
              <div className="dots">{[0,1,2].map(i => <div key={i} className="dot" style={{ animationDelay: `${i*0.2}s` }} />)}</div>
              <p>{streamText}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error-box fade-in">
              <p>{error}</p>
              <button onClick={() => plan()}>{t('try_again')}</button>
            </div>
          )}

          {/* Results */}
          {itinerary && (
            <div ref={resultRef} className="fade-in">
              <div className="trip-header">
                <h2 className="trip-title">{itinerary.tripTitle} <span className="live-tag"><span className="live-dot" /> {t('live_weather')}</span></h2>
                <p className="trip-summary">{itinerary.summary}</p>
                <div className="meta-grid">
                  <div className="meta-item"><div className="meta-label">{t('duration')}</div><div className="meta-value">{itinerary.days?.length} {t('days_label')}</div></div>
                  <div className="meta-item"><div className="meta-label">{t('distance')}</div><div className="meta-value">{itinerary.totalDistance}</div></div>
                  <div className="meta-item"><div className="meta-label">{t('difficulty')}</div><div className="meta-value">{itinerary.difficulty}</div></div>
                  <div className="meta-item"><div className="meta-label">{t('best_for')}</div><div className="meta-value">{itinerary.bestFor}</div></div>
                  {itinerary.estimatedBudget && (
                    <div className="meta-item"><div className="meta-label">{t('budget')}</div><div className="meta-value">
                      {typeof itinerary.estimatedBudget === 'string' ? itinerary.estimatedBudget : `${itinerary.estimatedBudget.low} – ${itinerary.estimatedBudget.high}`}
                    </div></div>
                  )}
                </div>
              </div>

              {itinerary.warnings?.length > 0 && (
                <div className="warning-box">{itinerary.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}</div>
              )}

              <div className="day-nav">
                {itinerary.days?.map((d, i) => (
                  <button key={i} className={`day-tab ${i === activeDay ? 'active' : ''}`} onClick={() => setActiveDay(i)}>{t('day')} {d.day}</button>
                ))}
              </div>

              {day && (
                <div className="day-card" key={activeDay}>
                  <h3 className="day-title">{day.title}</h3>
                  <div className="day-route">
                    <Icons.Compass /> {day.distance} • {day.sailTime}
                    {day.departureTime && <span className="dim"> • {t('depart')} {day.departureTime}</span>}
                  </div>

                  <div className="info-grid">
                    <div className="info-card">
                      <div className="info-card-title"><Icons.Sun /> {t('weather')}</div>
                      <div className="info-card-value">
                        {weather.condition} • {weather.temp}°C<br/>
                        <span className="wind-row"><Icons.Wind /> {weather.wind}</span><br/>
                        <span className="dim">{t('waves')}: {weather.waves}</span>
                        {weather.safety && <><br/><span className="dim">{weather.safety}</span></>}
                      </div>
                    </div>
                    <div className="info-card">
                      <div className="info-card-title"><Icons.Anchor /> {t('berth')}</div>
                      <div className="info-card-value">
                        {marina.name && <div>⚓ {marina.name}{marina.price ? ` (${marina.price})` : ''}</div>}
                        {anchorage.name && <div style={{ marginTop: marina.name ? 6 : 0 }}>🏖️ {anchorage.name}{anchorage.notes ? <><br/><span className="dim">{anchorage.notes}</span></> : ''}</div>}
                      </div>
                    </div>
                    <div className="info-card">
                      <div className="info-card-title">🍽️ {t('dinner')}</div>
                      <div className="info-card-value">
                        {restaurant.name || t('ask_locals')}
                        {restaurant.dish && <><br/><span className="dim">{t('try_dish')}: {restaurant.dish}</span></>}
                        {restaurant.price && <span className="dim" style={{ marginLeft: 6 }}>{restaurant.price}</span>}
                      </div>
                    </div>
                  </div>

                  {day.highlights?.length > 0 && (
                    <div className="highlights">
                      <div className="section-label">{t('highlights')}</div>
                      <div className="chip-list">{day.highlights.map((h, i) => <span key={i} className="highlight-chip">{h}</span>)}</div>
                    </div>
                  )}

                  {day.tip && <div className="tip-box"><strong>⚓ {t('captains_tip')}:</strong> {day.tip}</div>}
                </div>
              )}

              {itinerary.packingTips?.length > 0 && (
                <div className="trip-header" style={{ marginTop: 16 }}>
                  <div className="section-label">{t('packing')}</div>
                  <div className="chip-list" style={{ marginTop: 8 }}>
                    {itinerary.packingTips.map((tip, i) => <span key={i} className="highlight-chip">🎒 {tip}</span>)}
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'center' }}>
                <button className="new-trip-btn" onClick={reset}>{t('new_trip_btn')}</button>
              </div>
            </div>
          )}

          <footer className="footer">
            <p>{t('footer')}</p>
            <p className="footer-sub">{t('footer_sub')}</p>
          </footer>
        </div>
      </div>
    </>
  );
}
