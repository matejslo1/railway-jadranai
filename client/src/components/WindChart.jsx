import { useState } from 'react';

function WindBar({ day, index, isActive, onClick }) {
  const wind = day?.weather?.wind || '';
  const windKt = parseInt(wind.match(/\d+/)?.[0]) || 0;
  const waveH = parseFloat(day?.weather?.waves) || 0;

  const windColor = windKt > 25 ? '#f87171' : windKt > 15 ? '#fbbf24' : '#34d399';
  const maxWind = 35;
  const windPct = Math.min((windKt / maxWind) * 100, 100);
  const wavePct = Math.min((waveH / 4) * 100, 100);

  // Parse wind direction from string like "NW 10-15kt" or "NE 20kt"
  const dirMatch = wind.match(/^([A-Z]+)/);
  const dirStr = dirMatch?.[1] || 'N';
  const dirMap = { N: 0, NNE: 22, NE: 45, ENE: 67, E: 90, ESE: 112, SE: 135, SSE: 157, S: 180, SSW: 202, SW: 225, WSW: 247, W: 270, WNW: 292, NW: 315, NNW: 337 };
  const deg = dirMap[dirStr] || 0;

  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '10px 4px',
        borderRadius: 10,
        cursor: 'pointer',
        background: isActive ? 'rgba(59,158,206,0.15)' : 'transparent',
        border: `1px solid ${isActive ? 'rgba(59,158,206,0.4)' : 'transparent'}`,
        transition: 'all 0.2s',
      }}
    >
      {/* Wind direction arrow */}
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="13" fill="rgba(59,158,206,0.08)" stroke="rgba(59,158,206,0.2)" strokeWidth="1"/>
        <g transform={`rotate(${deg}, 14, 14)`}>
          <polygon points="14,3 11,18 14,15 17,18" fill={windColor}/>
        </g>
        <text x="14" y="26" textAnchor="middle" fontSize="5.5" fill="#5a9ec0" fontFamily="sans-serif">{dirStr}</text>
      </svg>

      {/* Wind bar */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${windPct}%`, background: windColor, borderRadius: 3, transition: 'width 0.6s' }}/>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${wavePct}%`, background: '#3b9ece', borderRadius: 3, opacity: 0.7 }}/>
        </div>
      </div>

      <div style={{ fontSize: 11, color: windColor, fontWeight: 700 }}>{windKt}kt</div>
      <div style={{ fontSize: 10, color: '#4a7d98' }}>{waveH}m</div>
      <div style={{ fontSize: 10, color: '#4a7d98' }}>Dan {index + 1}</div>
    </div>
  );
}

function SafetyBadge({ wind }) {
  const windKt = parseInt(wind?.match(/\d+/)?.[0]) || 0;
  if (windKt > 30) return <span style={{ color: '#f87171', fontSize: 12 }}>⛔ Ne jadraj</span>;
  if (windKt > 25) return <span style={{ color: '#f87171', fontSize: 12 }}>⚠️ Samo izkušeni</span>;
  if (windKt > 20) return <span style={{ color: '#fbbf24', fontSize: 12 }}>🟡 Zmerni pogoji</span>;
  if (windKt > 15) return <span style={{ color: '#22c55e', fontSize: 12 }}>🟢 Dobro jadranaje</span>;
  return <span style={{ color: '#10b981', fontSize: 12 }}>✅ Idealni pogoji</span>;
}

export default function WindChart({ itinerary, activeDay, onDaySelect }) {
  const days = itinerary?.days || [];
  const day = days[activeDay];

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,40,60,0.7), rgba(10,30,50,0.9))',
      border: '1px solid rgba(59,158,206,0.12)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#3b7d9e' }}>
          💨 Analiza Vetra & Valov
        </div>
        {day && <SafetyBadge wind={day.weather?.wind} />}
      </div>

      {/* Daily bars */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {days.map((d, i) => (
          <WindBar key={i} day={d} index={i} isActive={i === activeDay} onClick={() => onDaySelect?.(i)} />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#3b7d9e', borderTop: '1px solid rgba(59,158,206,0.08)', paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 4, background: '#34d399', borderRadius: 2 }}/> Veter (kt)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 12, height: 3, background: '#3b9ece', borderRadius: 2 }}/> Valovi (m)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Puščica = smer vetra
        </div>
      </div>

      {/* Active day detail */}
      {day?.weather && (
        <div style={{
          marginTop: 14,
          padding: '12px 16px',
          background: 'rgba(59,158,206,0.06)',
          borderRadius: 10,
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          fontSize: 13,
          color: '#8eb8d0',
        }}>
          <span>🌡️ {day.weather.temp}°C</span>
          <span>💨 {day.weather.wind}</span>
          <span>🌊 Val: {day.weather.waves}</span>
          {day.weather.safety && <span style={{ color: '#5a9ec0' }}>{day.weather.safety}</span>}
          <span>🌅 Odhod: {day.departureTime}</span>
        </div>
      )}
    </div>
  );
}
