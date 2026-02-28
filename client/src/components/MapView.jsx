import { useEffect, useRef } from 'react';

// ─── Activity type detection ──────────────────────────────────────────────────

const ACTIVITY = {
  marina:     { emoji: '⚓', label: 'Marina',      color: '#1565c0' },
  anchorage:  { emoji: '⛵', label: 'Sidrišče',    color: '#b7791f' },
  buoy:       { emoji: '🔴', label: 'Boja',         color: '#b91c1c' },
  swimming:   { emoji: '🏊', label: 'Kopanje',      color: '#0284c7' },
  snorkeling: { emoji: '🤿', label: 'Snorkljanje',  color: '#047857' },
  diving:     { emoji: '🐠', label: 'Potapljanje',  color: '#1e1b4b' },
};

function detectType(day) {
  if (day.marina?.name) return 'marina';
  if (day.anchorage?.name) {
    const n = (day.anchorage.notes || '').toLowerCase()
      + (day.anchorage.name || '').toLowerCase();
    if (n.includes('potap') || n.includes('diving') || n.includes('div')) return 'diving';
    if (n.includes('snork')) return 'snorkeling';
    if (n.includes('plaz') || n.includes('swim') || n.includes('kopa') || n.includes('beach')) return 'swimming';
    if (n.includes('boja') || n.includes('buoy')) return 'buoy';
    return 'anchorage';
  }
  return 'anchorage';
}

// ─── Leaflet icon factory ─────────────────────────────────────────────────────

function makeDayIcon(L, type, num, isActive) {
  const a = ACTIVITY[type] || ACTIVITY.anchorage;
  const size = isActive ? 46 : 38;
  const ring = isActive ? `3px solid #fff` : `2px solid rgba(255,255,255,0.7)`;
  return L.divIcon({
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="
          width:${size}px;height:${size}px;
          background:${a.color};
          border:${ring};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:${isActive ? 22 : 18}px;
          box-shadow:0 3px 14px rgba(0,0,0,${isActive ? '0.65' : '0.45'});
          cursor:pointer;
        ">${a.emoji}</div>
        <div style="
          position:absolute;top:-6px;right:-6px;
          min-width:17px;height:17px;padding:0 3px;
          background:${isActive ? '#fff' : '#0a1628'};
          color:${isActive ? a.color : '#fff'};
          border:2px solid ${a.color};
          border-radius:9px;
          display:flex;align-items:center;justify-content:center;
          font-weight:900;font-size:9px;font-family:sans-serif;
          box-shadow:0 1px 4px rgba(0,0,0,0.6);
        ">${num}</div>
      </div>`,
    className: 'jadran-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 5)],
  });
}

// ─── Wind helpers ─────────────────────────────────────────────────────────────

function windArrowSVG(deg, kt) {
  const c = kt > 25 ? '#f87171' : kt > 15 ? '#fbbf24' : '#34d399';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="rgba(0,0,0,0.55)" stroke="${c}" stroke-width="1.5"/>
    <g transform="rotate(${deg},16,16)"><polygon points="16,4 12,20 16,17 20,20" fill="${c}"/></g>
    <text x="16" y="29" text-anchor="middle" font-size="7" fill="${c}" font-family="sans-serif">${kt}kt</text>
  </svg>`;
}

function windToDeg(s) {
  const m = { N:0,NNE:22,NE:45,ENE:67,E:90,ESE:112,SE:135,SSE:157,S:180,SSW:202,SW:225,WSW:247,W:270,WNW:292,NW:315,NNW:337 };
  return m[s?.match(/^([A-Z]+)/)?.[1]] ?? 180;
}

function windToKt(s) {
  const n = s?.match(/\d+/g);
  return !n ? 10 : n.length >= 2 ? Math.round((+n[0] + +n[1]) / 2) : +n[0];
}

// ─── Build multi-stop route coords ───────────────────────────────────────────
// Connects: day1.from → (waypoints) → day1.to/day2.from → ... → lastDay.to
// This draws a proper path through ALL stops, not just straight from→to

function buildFullRoute(days, safeRouteMap) {
  const segments = []; // array of coord arrays, one per leg
  const allPoints = [];

  days.forEach((d, i) => {
    if (!d.fromLat || !d.fromLng) return;
    const from = [d.fromLat, d.fromLng];
    const next = days[i + 1];
    const to = next
      ? [next.fromLat, next.fromLng]
      : (d.toLat && d.toLng ? [d.toLat, d.toLng] : null);

    if (!to) {
      allPoints.push(from);
      return;
    }

    const waypoints = (safeRouteMap[d.day] || [])
      .filter(wp => wp.lat && wp.lng)
      .map(wp => [wp.lat, wp.lng]);

    const leg = [from, ...waypoints, to];
    segments.push({ leg, day: d, dayIndex: i });
    allPoints.push(from);
  });

  // Add final destination
  const last = days[days.length - 1];
  if (last?.toLat && last?.toLng) allPoints.push([last.toLat, last.toLng]);

  return { segments, allPoints };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapView({ itinerary, activeDay, onDaySelect, safeRoute }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (!window.L) return;
    const L = window.L;

    // Init map once
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        center: [43.5, 16.2],
        zoom: 8,
      });

      // Base: OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);

      // Nautical overlay: OpenSeaMap — depth, rocks, buoys, channels
      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openseamap.org">OpenSeaMap</a>',
        opacity: 0.85,
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);
    }

    if (!itinerary) return;

    const map = mapInstanceRef.current;
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    const days = itinerary.days || [];
    if (!days.length) return;

    // Build safe route lookup
    const safeRouteMap = {};
    if (Array.isArray(safeRoute)) {
      safeRoute.forEach(leg => { safeRouteMap[leg.day] = leg.waypoints || []; });
    }

    const { segments, allPoints } = buildFullRoute(days, safeRouteMap);

    // ── Draw full route (faint dashed backdrop) ───────────────────────────────
    if (allPoints.length > 1) {
      layersRef.current.push(
        L.polyline(allPoints, {
          color: 'rgba(59,158,206,0.22)',
          weight: 2,
          dashArray: '7 7',
        }).addTo(map)
      );
    }

    // ── Draw per-leg segments ─────────────────────────────────────────────────
    segments.forEach(({ leg, day, dayIndex }) => {
      const isActive = dayIndex === activeDay;
      const hasSafeWp = (safeRouteMap[day.day] || []).length > 0;
      const lineColor = isActive
        ? (hasSafeWp ? '#34d399' : '#3b9ece')
        : (hasSafeWp ? 'rgba(52,211,153,0.35)' : 'rgba(59,158,206,0.20)');

      layersRef.current.push(
        L.polyline(leg, {
          color: lineColor,
          weight: isActive ? 4 : 2,
          opacity: isActive ? 0.95 : 0.7,
        }).addTo(map)
      );

      // Safe waypoint dots
      if (hasSafeWp) {
        (safeRouteMap[day.day] || []).forEach(wp => {
          const icon = L.divIcon({
            html: `<div title="${wp.note || ''}" style="width:9px;height:9px;background:#34d399;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
            className: '',
            iconSize: [9, 9],
            iconAnchor: [4, 4],
          });
          const m = L.marker([wp.lat, wp.lng], { icon }).addTo(map);
          if (wp.note) m.bindPopup(`<div style="font-family:sans-serif;font-size:12px;color:#0a1628">🛡️ ${wp.note}</div>`);
          layersRef.current.push(m);
        });
      }

      // Direction arrow mid-leg
      if (isActive && leg.length >= 2) {
        const mid = leg[Math.floor(leg.length / 2)];
        const nxt = leg[Math.floor(leg.length / 2) + 1] || leg[leg.length - 1];
        const bearing = Math.atan2(nxt[1] - mid[1], nxt[0] - mid[0]) * (180 / Math.PI);
        layersRef.current.push(
          L.marker(mid, {
            icon: L.divIcon({
              html: `<div style="color:${lineColor};font-size:18px;line-height:1;transform:rotate(${bearing - 90}deg)">▲</div>`,
              className: '',
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            }),
            interactive: false,
          }).addTo(map)
        );
      }
    });

    // ── Day markers with activity icons ──────────────────────────────────────
    days.forEach((d, i) => {
      if (!d.fromLat || !d.fromLng) return;
      const isActive = i === activeDay;
      const type = detectType(d);
      const a = ACTIVITY[type] || ACTIVITY.anchorage;

      const marker = L.marker([d.fromLat, d.fromLng], {
        icon: makeDayIcon(L, type, i + 1, isActive),
        zIndexOffset: isActive ? 1000 : 0,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:210px;padding:4px 0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
            <span style="font-size:24px">${a.emoji}</span>
            <div>
              <div style="font-weight:700;font-size:14px;color:#0a1628">Dan ${d.day}: ${d.title || ''}</div>
              <div style="color:${a.color};font-size:11px;font-weight:700">${a.label}</div>
              <div style="color:#4a6a80;font-size:11px">${d.distance || ''} · ${d.sailTime || ''}</div>
            </div>
          </div>
          ${d.marina?.name
            ? `<div style="color:#1565c0;font-size:12px;margin-bottom:4px">⚓ <b>${d.marina.name}</b>${d.marina.price ? ` — ${d.marina.price}` : ''}</div>`
            : ''}
          ${d.anchorage?.name
            ? `<div style="color:#b7791f;font-size:12px;margin-bottom:4px">⛵ <b>${d.anchorage.name}</b>${d.anchorage.notes ? `<br><span style="color:#888;font-size:11px">${d.anchorage.notes}</span>` : ''}</div>`
            : ''}
          ${d.restaurant?.name
            ? `<div style="color:#166534;font-size:12px;margin-bottom:4px">🍽️ ${d.restaurant.name}${d.restaurant.dish ? ` — ${d.restaurant.dish}` : ''}</div>`
            : ''}
          ${d.weather
            ? `<div style="color:#555;font-size:11px;margin-top:6px;padding-top:6px;border-top:1px solid #eee">🌡️ ${d.weather.temp}°C &nbsp; 💨 ${d.weather.wind}</div>`
            : ''}
        </div>
      `);

      marker.on('click', () => onDaySelect?.(i));
      layersRef.current.push(marker);

      // Wind arrow offset from marker
      if (d.weather?.wind) {
        const kt = windToKt(d.weather.wind);
        const deg = windToDeg(d.weather.wind);
        layersRef.current.push(
          L.marker([d.fromLat + 0.05, d.fromLng - 0.06], {
            icon: L.divIcon({ html: windArrowSVG(deg, kt), className: '', iconSize: [30, 30], iconAnchor: [15, 15] }),
            interactive: false,
          }).addTo(map)
        );
      }
    });

    // ── Final destination 🏁 ──────────────────────────────────────────────────
    const last = days[days.length - 1];
    if (last?.toLat && last?.toLng) {
      layersRef.current.push(
        L.marker([last.toLat, last.toLng], {
          icon: L.divIcon({
            html: `<div style="width:30px;height:30px;background:rgba(212,168,64,0.95);border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 10px rgba(0,0,0,0.55)">🏁</div>`,
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        }).addTo(map)
          .bindPopup(`<div style="font-family:sans-serif;font-weight:700;color:#0a1628">🏁 Cilj: ${last.to || ''}</div>`)
      );
    }

    // ── Fit bounds ────────────────────────────────────────────────────────────
    if (allPoints.length > 0) {
      map.fitBounds(allPoints, { padding: [55, 55], maxZoom: 11 });
    }
  }, [itinerary, activeDay, safeRoute]);

  const hasSafeRoute = Array.isArray(safeRoute) && safeRoute.some(l => l.waypoints?.length > 0);

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(59,158,206,0.2)', marginBottom: 20 }}>
      <div ref={mapRef} style={{ height: 440, width: '100%', background: '#0a1628' }} />

      {/* Legend */}
      <div style={{
        background: 'rgba(10,22,40,0.97)',
        padding: '10px 16px',
        borderTop: '1px solid rgba(59,158,206,0.12)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '7px 18px',
        fontSize: 11,
        alignItems: 'center',
      }}>
        {Object.entries(ACTIVITY).map(([key, val]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, color: val.color, fontWeight: 600 }}>
            <span style={{ fontSize: 14 }}>{val.emoji}</span> {val.label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {hasSafeRoute && <span style={{ color: '#34d399', fontSize: 11 }}>🛡️ Varna pot</span>}
          <span style={{ color: '#34d399', fontSize: 11 }}>↑ Varen veter</span>
          <span style={{ color: '#fbbf24', fontSize: 11 }}>↑ Zmeren</span>
          <span style={{ color: '#f87171', fontSize: 11 }}>↑ Močan</span>
        </span>
      </div>

      {/* OpenSeaMap credit */}
      <div style={{
        background: 'rgba(10,22,40,0.88)',
        padding: '4px 16px',
        fontSize: 10,
        color: 'rgba(90,158,192,0.5)',
        borderTop: '1px solid rgba(59,158,206,0.06)',
      }}>
        Nautična karta: <a href="https://www.openseamap.org" target="_blank" rel="noreferrer" style={{ color: '#3b9ece' }}>OpenSeaMap</a>
        {' '}· globine, čeri, boje, plovni kanali
      </div>
    </div>
  );
}
