import { useState, useRef, useEffect } from 'react';
import { chatWithTrip } from '../lib/api.js';

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const QUICK_QUESTIONS = [
  'Spremeni dan 3 na Vis',
  'Dodaj še en dan',
  'Alternativa za slabo vreme dan 2',
  'Poceni možnost za marine',
  'Kje kupiti živila za plovbo?',
];

export default function AIChat({ itinerary, language = 'en' }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: language === 'sl'
        ? 'Živjo! Sem Jadran AI. Imam vse podrobnosti o vaši poti — vprašajte me kar koli! Npr. "Spremeni dan 3", "Dodaj sidrišče", "Kaj v primeru slabega vremena?"'
        : 'Hi! I\'m Jadran AI. I have all the details of your trip — ask me anything! E.g. "Change day 3", "Add an anchorage", "What if weather is bad on day 2?"',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const reply = await chatWithTrip(msg, itinerary, language);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Napaka pri povezavi. Poskusite znova.' }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Toggle button */}
      <button
        onClick={() => { setIsOpen(!isOpen); setTimeout(() => inputRef.current?.focus(), 100); }}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: isOpen
            ? 'linear-gradient(135deg, rgba(59,158,206,0.2), rgba(30,80,120,0.3))'
            : 'linear-gradient(135deg, rgba(15,40,60,0.7), rgba(10,30,50,0.9))',
          border: '1px solid rgba(59,158,206,0.25)',
          borderRadius: isOpen ? '16px 16px 0 0' : 16,
          color: '#c8dce8',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'Outfit, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        <span>🤖 AI Pomočnik — Spremenite ali prilagodite pot</span>
        <span style={{ color: '#3b9ece', fontSize: 18 }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(10,25,45,0.98), rgba(8,20,38,0.99))',
          border: '1px solid rgba(59,158,206,0.2)',
          borderTop: 'none',
          borderRadius: '0 0 16px 16px',
          overflow: 'hidden',
        }}>
          {/* Messages */}
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role === 'user'
                    ? 'linear-gradient(135deg, #1a7fb5, #3b9ece)'
                    : 'rgba(59,158,206,0.08)',
                  border: m.role === 'assistant' ? '1px solid rgba(59,158,206,0.15)' : 'none',
                  color: m.role === 'user' ? '#fff' : '#c8dce8',
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 4, padding: '8px 14px' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#3b9ece',
                    animation: 'pulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }}/>
                ))}
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Quick questions */}
          <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {QUICK_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => send(q)} style={{
                background: 'rgba(59,158,206,0.08)',
                border: '1px solid rgba(59,158,206,0.15)',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 12,
                color: '#5a9ec0',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
              }}>{q}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{
            display: 'flex',
            gap: 8,
            padding: '10px 16px 16px',
            borderTop: '1px solid rgba(59,158,206,0.08)',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Vprašajte AI o vaši poti..."
              style={{
                flex: 1,
                background: 'rgba(20,40,65,0.8)',
                border: '1px solid rgba(59,158,206,0.2)',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#c8dce8',
                fontFamily: 'Outfit, sans-serif',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                background: 'linear-gradient(135deg, #1a7fb5, #3b9ece)',
                border: 'none',
                borderRadius: 10,
                padding: '10px 16px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'Outfit, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                opacity: loading || !input.trim() ? 0.5 : 1,
              }}
            >
              <SendIcon /> Pošlji
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
