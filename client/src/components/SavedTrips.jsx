import { useState, useEffect } from 'react';

const STORAGE_KEY = 'jadran_saved_trips';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' });
}

function DifficultyBadge({ level }) {
  const colors = { Beginner: '#10b981', Intermediate: '#f59e0b', Advanced: '#f87171' };
  return (
    <span style={{
      fontSize: 10,
      padding: '2px 8px',
      borderRadius: 10,
      background: `${colors[level] || '#3b9ece'}22`,
      color: colors[level] || '#3b9ece',
      border: `1px solid ${colors[level] || '#3b9ece'}44`,
      fontWeight: 600,
    }}>{level}</span>
  );
}

export function useSavedTrips() {
  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };
  const save = (trips) => localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));

  const saveTrip = (itinerary, query) => {
    const trips = load();
    const newTrip = {
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      query,
      title: itinerary.tripTitle,
      summary: itinerary.summary,
      days: itinerary.days?.length,
      distance: itinerary.totalDistance,
      difficulty: itinerary.difficulty,
      itinerary,
    };
    save([newTrip, ...trips.slice(0, 19)]); // keep max 20
    return newTrip.id;
  };

  const deleteTrip = (id) => {
    save(load().filter(t => t.id !== id));
  };

  return { saveTrip, deleteTrip, loadTrips: load };
}

export default function SavedTrips({ onLoad, currentItinerary, currentQuery }) {
  const [trips, setTrips] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const { saveTrip, deleteTrip, loadTrips } = useSavedTrips();

  useEffect(() => {
    setTrips(loadTrips());
  }, [isOpen]);

  const handleSave = () => {
    if (!currentItinerary) return;
    saveTrip(currentItinerary, currentQuery);
    setTrips(loadTrips());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    deleteTrip(id);
    setTrips(loadTrips());
  };

  const handleLoad = (trip) => {
    onLoad?.(trip.itinerary, trip.query);
    setIsOpen(false);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {/* Save button */}
        {currentItinerary && (
          <button onClick={handleSave} style={{
            flex: 1,
            padding: '12px 16px',
            background: saved ? 'rgba(16,185,129,0.15)' : 'rgba(59,158,206,0.08)',
            border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(59,158,206,0.2)'}`,
            borderRadius: 12,
            color: saved ? '#10b981' : '#5a9ec0',
            cursor: 'pointer',
            fontFamily: 'Outfit, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}>
            {saved ? '✅ Shranjeno!' : '💾 Shrani to pot'}
          </button>
        )}

        {/* Open saved trips */}
        <button onClick={() => setIsOpen(!isOpen)} style={{
          flex: 1,
          padding: '12px 16px',
          background: isOpen ? 'rgba(59,158,206,0.15)' : 'rgba(59,158,206,0.05)',
          border: '1px solid rgba(59,158,206,0.2)',
          borderRadius: 12,
          color: '#5a9ec0',
          cursor: 'pointer',
          fontFamily: 'Outfit, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          📂 Shranjene poti {trips.length > 0 && `(${trips.length})`}
        </button>
      </div>

      {/* Trips list */}
      {isOpen && (
        <div style={{
          marginTop: 8,
          background: 'linear-gradient(135deg, rgba(10,25,45,0.98), rgba(8,20,38,0.99))',
          border: '1px solid rgba(59,158,206,0.2)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {trips.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#3b7d9e', fontSize: 14 }}>
              Še ni shranjenih poti.<br/>
              <span style={{ fontSize: 12, color: '#2a5a70' }}>Generirajte pot in jo shranite za kasnejši ogled.</span>
            </div>
          ) : (
            trips.map((trip, i) => (
              <div
                key={trip.id}
                onClick={() => handleLoad(trip)}
                style={{
                  padding: '14px 16px',
                  borderBottom: i < trips.length - 1 ? '1px solid rgba(59,158,206,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,158,206,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: '#c8dce8', fontWeight: 600, fontSize: 14 }}>{trip.title}</span>
                    {trip.difficulty && <DifficultyBadge level={trip.difficulty} />}
                  </div>
                  <div style={{ fontSize: 12, color: '#4a7d98', display: 'flex', gap: 12 }}>
                    <span>⛵ {trip.days} dni</span>
                    <span>📍 {trip.distance}</span>
                    <span>🗓️ {formatDate(trip.savedAt)}</span>
                  </div>
                  {trip.query && (
                    <div style={{ fontSize: 11, color: '#2d4f66', marginTop: 4, fontStyle: 'italic' }}>
                      "{trip.query.substring(0, 60)}{trip.query.length > 60 ? '...' : ''}"
                    </div>
                  )}
                </div>
                <button
                  onClick={e => handleDelete(trip.id, e)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#2d4f66',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: 4,
                    borderRadius: 6,
                    lineHeight: 1,
                  }}
                  title="Izbriši"
                >✕</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
