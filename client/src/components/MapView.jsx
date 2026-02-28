import { useEffect, useRef } from 'react';

// ─── Coordinate extractor — tries every possible field name from API ──────────
function getCoords(obj) {
  if (!obj) return null;
  // Direct fields
  if (obj.lat != null && obj.lng != null) return [+obj.lat, +obj.lng];
  if (obj.lat != null && obj.lon != null) return [+obj.lat, +obj.lon];
  if (obj.fromLat != null && obj.fromLng != null) return [+obj.fromLat, +obj.fromLng];
  if (obj.fromLat != null && obj.fromLon != null) return [+obj.fromLat, +obj.fromLon];
  if (obj.latitude != null && obj.longitude != null) return [+obj.latitude, +obj.longitude];
  // Nested location
  if (obj.location?.lat != null) return [+obj.location.lat, +obj.location.lng ?? +obj.location.lon];
  if (obj.coordinates?.lat != null) return [+obj.coordinates.lat, +obj.coordinates.lng];
  // Array [lat, lng]
  if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) return [+obj.coordinates[0], +obj.coordinates[1]];
  if (Array.isArray(obj.position) && obj.position.length >= 2) return [+obj.position[0], +obj.position[1]];
  return null;
}

function getToCoords(obj) {
  if (!obj) return null;
  if (obj.toLat != null && obj.toLng != null) return [+obj.toLat, +obj.toLng];
  if (obj.toLat != null && obj.toLon != null) return [+obj.toLat, +obj.toLon];
  if (obj.toLatitude != null && obj.toLongitude != null) return [+obj.toLatitude, +obj.toLongitude];
  if (obj.destLat != null && obj.destLng != null) return [+obj.destLat, +obj.destLng];
  return null;
}

// ─── Activity types ───────────────────────────────────────────────────────────
const ACTIVITY = {
  marina: {
    label: 'Marina',
    color: '#1565c0',
    emoji: '⚓',
    svgPath: `<circle cx="16" cy="7" r="3" fill="white"/>
      <line x1="16" y1="10" x2="16" y2="26" stroke="white" stroke-width="2"/>
      <path d="M8 18 Q16 22 24 18" stroke="white" stroke-width="2" fill="none"/>
      <line x1="10" y1="18" x2="8" y2="26" stroke="white" stroke-width="1.5"/>
      <line x1="22" y1="18" x2="24" y2="26" stroke="white" stroke-width="1.5"/>`,
  },
  anchorage: {
    label: 'Sidrišče',
    color: '#b45309',
    emoji: '🏖️',
    svgPath: `<circle cx="16" cy="8" r="3" fill="white"/>
      <line x1="16" y1="11" x2="16" y2="15" stroke="white" stroke-width="2"/>
      <path d="M10 15 Q16 26 22 15" stroke="white" stroke-width="2" fill="white" fill-opacity="0.3"/>
      <line x1="8" y1="13" x2="24" y2="13" stroke="white" stroke-width="1.5"/>`,
  },
  swimming: {
    label: 'Kopanje',
    color: '#0284c7',
    emoji: '🏊',
    svgPath: `<circle cx="16" cy="7" r="3" fill="white"/>
      <path d="M10 22 Q13 18 16 20 Q19 22 22 18" stroke="white" stroke-width="2" fill="none"/>
      <path d="M10 26 Q13 22 16 24 Q19 26 22 22" stroke="white" stroke-width="2" fill="none"/>
      <path d="M13 10 L11 16 L16 14 L21 16 L19 10" stroke="white" stroke-width="1.5" fill="none"/>`,
  },
  snorkeling: {
    label: 'Snorkljanje',
    color: '#047857',
    emoji: '🤿',
    svgPath: `<ellipse cx="14" cy="12" rx="5" ry="4" fill="none" stroke="white" stroke-width="2"/>
      <line x1="19" y1="10" x2="24" y2="8" stroke="white" stroke-width="2"/>
      <line x1="24" y1="8" x2="24" y2="14" stroke="white" stroke-width="2"/>
      <path d="M9 16 Q12 22 16 20 Q20 18 22 22" stroke="white" stroke-width="2" fill="none"/>
      <circle cx="12" cy="12" r="1.5" fill="white"/>`,
  },
  diving: {
    label: 'Potapljanje',
    color: '#1e3a8a',
    emoji: '🤿',
    svgPath: `<circle cx="16" cy="8" r="4" fill="none" stroke="white" stroke-width="2"/>
      <path d="M12 12 L10 22 M20 12 L22 22" stroke="white" stroke-width="2"/>
      <path d="M10 17 L22 17" stroke="white" stroke-width="1.5"/>
      <path d="M11 22 Q16 26 21 22" stroke="white" stroke-width="2" fill="none"/>
      <circle cx="22" cy="8" r="2" fill="white"/>`,
  },
  restaurant: {
    label: 'Restavracija',
    color: '#166534',
    emoji: '🍽️',
    svgPath: `<line x1="10" y1="6" x2="10" y2="26" stroke="white" stroke-width="2"/>
      <path d="M10 6 Q14 10 14 15 Q14 18 10 18" stroke="white" stroke-width="1.5" fill="none"/>
      <line x1="20" y1="6" x2="20" y2="13" stroke="white" stroke-width="2"/>
      <line x1="17" y1="13" x2="23" y2="13" stroke="white" stroke-width="1.5"/>
      <line x1="20" y1="13" x2="20" y2="26" stroke="white" stroke-width="2"/>`,
  },
  highlight: {
    label: 'Zanimivost',
    color: '#7c3aed',
    emoji: '⭐',
    svgPath: `<polygon points="16,5 19,13 27,13 21,18 23,26 16,21 9,26 11,18 5,13 13,13" fill="white" fill-opacity="0.9"/>`,
  },
};

// ─── Detect activity type from day object ─────────────────────────────────────
function detectType(day) {
  if (day.marina?.name || typeof day.marina === 'string') return 'marina';
  const notes = [
    day.anchorage?.notes, day.anchorage?.name,
    day.title, day.tip,
    ...(day.highlights || []),
  ].filter(Boolean).join(' ').toLowerCase();

  if (notes.includes('potap') || notes.includes('diving') || notes.includes('div')) return 'diving';
  if (notes.includes('snork')) return 'snorkeling';
  if (notes.includes('plaz') || notes.includes('swim') || notes.includes('kopa') || notes.includes('beach')) return 'swimming';
  if (day.anchorage?.name || typeof day.anchorage === 'string') return 'anchorage';
  return 'anchorage';
}

// ─── Build day marker icon ────────────────────────────────────────────────────
function makeDayIcon(L, type, num, isActive) {
  const a = ACTIVITY[type] || ACTIVITY.anchorage;
  const size = isActive ? 52 : 42;
  const badge = 20;
  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5));">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="${isActive ? 15 : 14}" fill="${a.color}" stroke="white" stroke-width="${isActive ? 2.5 : 2}"/>
        ${a.svgPath}
      </svg>
      <div style="
        position:absolute;top:-7px;right:-7px;
        width:${badge}px;height:${badge}px;
        background:${isActive ? 'white' : '#0a1628'};
        color:${isActive ? a.color : 'white'};
        border:2px solid ${isActive ? a.color : 'rgba(255,255,255,0.4)'};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-weight:900;font-size:10px;font-family:Arial,sans-serif;
        box-shadow:0 2px 6px rgba(0,0,0,0.7);
        line-height:1;
      ">${num}</div>
    </div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 6)],
  });
}

// ─── Small activity marker (restaurant, highlight etc.) ───────────────────────
function makeSmallIcon(L, type) {
  const a = ACTIVITY[type] || ACTIVITY.highlight;
  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;
      background:${a.color};
      border:2px solid white;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:14px;
      box-shadow:0 2px 6px rgba(0,0,0,0.5);
      filter:drop-shadow(0 1px 3px rgba(0,0,0,0.4));
    ">${a.emoji}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
  });
}

// ─── Wind direction helpers ───────────────────────────────────────────────────
function windToDeg(s) {
  if (!s) return null;
  const m = { N: 0, NNE: 22, NE: 45, ENE: 67, E: 90, ESE: 112, SE: 135, SSE: 157, S: 180, SSW: 202, SW: 225, WSW: 247, W: 270, WNW: 292, NW: 315, NNW: 337 };
  const dir = s.match(/\b(NNE|NNW|NE|NW|ENE|ESE|SSE|SSW|WNW|WSW|N|S|E|W)\b/)?.[1];
  return dir != null ? m[dir] : null;
}
function windToKt(s) {
  if (!s) return null;
  const n = s.match(/\d+/g);
  if (!n) return null;
  return n.length >= 2 ? Math.round((+n[0] + +n[1]) / 2) : +n[0];
}

// ─── Build ordered route: collects all stop coords in sequence ────────────────
function buildRoute(days) {
  // Collect one coord per day — try every possible field
  const stopCoords = days.map(d => {
    const c = getCoords(d);
    if (c) return c;
    // fallback: try marina / anchorage sub-objects
    const mc = getCoords(d.marina);
    if (mc) return mc;
    const ac = getCoords(d.anchorage);
    if (ac) return ac;
    return null;
  });

  // Fill gaps: if a day has no coords try to interpolate from neighbors (rare)
  // Build ordered list of [coord, dayIndex] skipping nulls
  const valid = stopCoords
    .map((c, i) => ({ c, i }))
    .filter(x => x.c !== null);

  // Add final destination from last day's "to" coords
  const last = days[days.length - 1];
  const lastTo = getToCoords(last);

  return { stopCoords, valid, lastTo };
}

// ─── Popup HTML ───────────────────────────────────────────────────────────────
function buildPopup(d, num, type) {
  const a = ACTIVITY[type] || ACTIVITY.anchorage;
  const marina = typeof d.marina === 'string' ? { name: d.marina } : d.marina || {};
  const anchorage = typeof d.anchorage === 'string' ? { name: d.anchorage } : d.anchorage || {};
  const restaurant = typeof d.restaurant === 'string' ? { name: d.restaurant } : d.restaurant || {};

  return `
    <div style="font-family:Arial,sans-serif;min-width:220px;padding:2px 0;max-width:260px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 32 32" style="flex-shrink:0">
          <circle cx="16" cy="16" r="14" fill="${a.color}"/>
          ${a.svgPath}
        </svg>
        <div>
          <div style="font-weight:800;font-size:13px;color:#0a1628">Dan ${num}: ${d.title || d.to || ''}</div>
          <div style="color:${a.color};font-size:11px;font-weight:700;margin-top:1px">${a.label}</div>
          ${d.distance || d.sailTime ? `<div style="color:#4a6a80;font-size:11px">${[d.distance, d.sailTime].filter(Boolean).join(' · ')}</div>` : ''}
        </div>
      </div>
      ${marina.name ? `<div style="color:#1565c0;font-size:12px;margin-bottom:4px">⚓ <b>${marina.name}</b>${marina.price ? ` — ${marina.price}` : ''}</div>` : ''}
      ${anchorage.name ? `<div style="color:#b45309;font-size:12px;margin-bottom:4px">🏖️ <b>${anchorage.name}</b>${anchorage.notes ? `<br><span style="color:#888;font-size:11px">${anchorage.notes}</span>` : ''}</div>` : ''}
      ${restaurant.name ? `<div style="color:#166534;font-size:12px;margin-bottom:4px">🍽️ ${restaurant.name}${restaurant.dish ? ` — ${restaurant.dish}` : ''}</div>` : ''}
      ${d.highlights?.length ? `<div style="margin-top:5px;font-size:11px;color:#555">⭐ ${d.highlights.slice(0, 2).join(', ')}</div>` : ''}
      ${d.weather ? `<div style="color:#555;font-size:11px;margin-top:6px;padding-top:6px;border-top:1px solid #eee">🌡️ ${d.weather.temp}°C &nbsp; 💨 ${d.weather.wind || ''}</div>` : ''}
    </div>`;
}

// ─── Wind compass overlay ─────────────────────────────────────────────────────
function WindCompass({ wind }) {
  if (!wind) return null;
  const kt = windToKt(wind);
  const deg = windToDeg(wind);
  if (kt == null && deg == null) return null;

  const color = kt > 25 ? '#f87171' : kt > 15 ? '#fbbf24' : '#34d399';
  const label = kt > 25 ? 'Močan' : kt > 15 ? 'Zmeren' : 'Lahek';

  return (
    <div style={{
      position: 'absolute', bottom: 12, right: 12, zIndex: 1000,
      background: 'rgba(10,22,40,0.92)',
      border: `2px solid ${color}`,
      borderRadius: 12,
      padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      minWidth: 110,
    }}>
      <svg width="44" height="44" viewBox="0 0 44 44">
        {/* Compass ring */}
        <circle cx="22" cy="22" r="20" fill="rgba(255,255,255,0.05)" stroke={color} strokeWidth="1.5"/>
        {/* Cardinal labels */}
        <text x="22" y="7" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.5)" fontFamily="Arial">N</text>
        <text x="22" y="40" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.5)" fontFamily="Arial">S</text>
        <text x="5" y="25" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.5)" fontFamily="Arial">W</text>
        <text x="39" y="25" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.5)" fontFamily="Arial">E</text>
        {/* Wind arrow */}
        {deg != null && (
          <g transform={`rotate(${deg}, 22, 22)`}>
            <polygon points="22,6 19,22 22,19 25,22" fill={color}/>
            <polygon points="22,38 19,22 22,25 25,22" fill={color} opacity="0.35"/>
          </g>
        )}
        {/* Center dot */}
        <circle cx="22" cy="22" r="3" fill={color}/>
      </svg>
      <div>
        <div style={{ color, fontWeight: 800, fontSize: 13 }}>
          {deg != null ? Object.entries({ N:0,NNE:22,NE:45,ENE:67,E:90,ESE:112,SE:135,SSE:157,S:180,SSW:202,SW:225,WSW:247,W:270,WNW:292,NW:315,NNW:337 }).find(([,v]) => v === deg)?.[0] || '' : ''}
          {kt != null ? ` ${kt}kn` : ''}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{label} veter</div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MapView({ itinerary, activeDay, onDaySelect, safeRoute }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);
  const windRef = useRef(null);

  useEffect(() => {
    if (!window.L) return;
    const L = window.L;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        center: [43.5, 16.2],
        zoom: 8,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);

      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openseamap.org">OpenSeaMap</a>',
        opacity: 0.8,
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);
    }

    if (!itinerary) return;

    const map = mapInstanceRef.current;
    layersRef.current.forEach(l => { try { map.removeLayer(l); } catch(e) {} });
    layersRef.current = [];

    const days = itinerary.days || [];
    if (!days.length) return;

    // Safe route map
    const safeRouteMap = {};
    if (Array.isArray(safeRoute)) {
      safeRoute.forEach(leg => { safeRouteMap[leg.day] = leg.waypoints || []; });
    }

    // ── Build ordered route ────────────────────────────────────────────────
    const { stopCoords, valid, lastTo } = buildRoute(days);

    // Ordered list of ALL points including last destination
    const orderedPoints = valid.map(x => x.c);
    if (lastTo) orderedPoints.push(lastTo);

    // ── Draw full dashed background route ─────────────────────────────────
    if (orderedPoints.length > 1) {
      layersRef.current.push(
        L.polyline(orderedPoints, {
          color: 'rgba(59,158,206,0.15)',
          weight: 2,
          dashArray: '8 8',
        }).addTo(map)
      );
    }

    // ── Draw per-leg colored segments ──────────────────────────────────────
    for (let i = 0; i < valid.length; i++) {
      const from = valid[i].c;
      const dayIdx = valid[i].i;
      const isLast = i === valid.length - 1;
      const to = isLast ? lastTo : valid[i + 1]?.c;

      if (!to) continue;

      const isActive = dayIdx === activeDay || (isLast && activeDay >= dayIdx);
      const safeWps = (safeRouteMap[days[dayIdx]?.day] || [])
        .filter(wp => wp.lat && wp.lng)
        .map(wp => [+wp.lat, +wp.lng]);

      const hasSafe = safeWps.length > 0;
      const lineColor = isActive
        ? (hasSafe ? '#34d399' : '#3b9ece')
        : (hasSafe ? 'rgba(52,211,153,0.4)' : 'rgba(59,158,206,0.3)');

      const leg = [from, ...safeWps, to];

      layersRef.current.push(
        L.polyline(leg, {
          color: lineColor,
          weight: isActive ? 4 : 2.5,
          opacity: isActive ? 1 : 0.7,
        }).addTo(map)
      );

      // Direction arrow on active leg
      if (isActive && leg.length >= 2) {
        const mi = Math.floor(leg.length / 2);
        const p1 = leg[mi];
        const p2 = leg[Math.min(mi + 1, leg.length - 1)];
        const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI;
        layersRef.current.push(
          L.marker(p1, {
            icon: L.divIcon({
              html: `<div style="color:${lineColor};font-size:20px;line-height:1;transform:rotate(${angle - 90}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8))">▲</div>`,
              className: '',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            }),
            interactive: false,
          }).addTo(map)
        );
      }

      // Safe waypoint dots
      safeWps.forEach(wp => {
        layersRef.current.push(
          L.circleMarker(wp, {
            radius: 4,
            color: 'white',
            weight: 2,
            fillColor: '#34d399',
            fillOpacity: 1,
          }).addTo(map)
        );
      });
    }

    // ── Activity markers for each day ──────────────────────────────────────
    days.forEach((d, i) => {
      const coord = stopCoords[i];
      if (!coord) return;

      const isActive = i === activeDay;
      const type = detectType(d);

      const marker = L.marker(coord, {
        icon: makeDayIcon(L, type, i + 1, isActive),
        zIndexOffset: isActive ? 1000 : i * 10,
      }).addTo(map);

      marker.bindPopup(buildPopup(d, i + 1, type), { maxWidth: 280 });
      marker.on('click', () => onDaySelect?.(i));
      layersRef.current.push(marker);

      // Restaurant sub-marker (small offset so it doesn't overlap)
      const restaurant = typeof d.restaurant === 'string' ? { name: d.restaurant } : d.restaurant;
      if (restaurant?.name && coord) {
        const rCoord = getCoords(restaurant) || [coord[0] + 0.018, coord[1] + 0.02];
        const rm = L.marker(rCoord, {
          icon: makeSmallIcon(L, 'restaurant'),
          zIndexOffset: i * 10 - 5,
        }).addTo(map);
        rm.bindPopup(`<div style="font-family:Arial;font-size:13px;font-weight:700;color:#166534">🍽️ ${restaurant.name}${restaurant.dish ? `<br><span style="font-weight:400;color:#555;font-size:11px">${restaurant.dish}</span>` : ''}</div>`);
        layersRef.current.push(rm);
      }

      // Highlights sub-markers
      if (d.highlights?.length > 0 && coord) {
        d.highlights.slice(0, 1).forEach((h, hi) => {
          const hCoord = [coord[0] - 0.018, coord[1] + 0.02 * (hi + 1)];
          const hm = L.marker(hCoord, {
            icon: makeSmallIcon(L, 'highlight'),
            zIndexOffset: i * 10 - 3,
          }).addTo(map);
          hm.bindPopup(`<div style="font-family:Arial;font-size:12px;color:#7c3aed">⭐ ${h}</div>`);
          layersRef.current.push(hm);
        });
      }
    });

    // ── Final destination flag marker ──────────────────────────────────────
    if (lastTo) {
      const last = days[days.length - 1];
      layersRef.current.push(
        L.marker(lastTo, {
          icon: L.divIcon({
            html: `<div style="
              width:36px;height:36px;
              background:linear-gradient(135deg,#d4a820,#f5c842);
              border:3px solid white;
              border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              font-size:18px;
              box-shadow:0 2px 8px rgba(0,0,0,0.5);
              filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));
            ">🏁</div>`,
            className: '',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          }),
        }).addTo(map)
          .bindPopup(`<div style="font-family:Arial;font-weight:700;color:#0a1628">🏁 Cilj: ${last?.to || 'Končna destinacija'}</div>`)
      );
    }

    // ── Fit map to all points ──────────────────────────────────────────────
    const allForBounds = [...orderedPoints];
    if (allForBounds.length > 0) {
      map.fitBounds(allForBounds, { padding: [60, 60], maxZoom: 11 });
    }
  }, [itinerary, activeDay, safeRoute]);

  // Wind data from active day
  const activeWindStr = itinerary?.days?.[activeDay]?.weather?.wind || null;
  const hasSafeRoute = Array.isArray(safeRoute) && safeRoute.some(l => l.waypoints?.length > 0);

  const legendItems = Object.entries(ACTIVITY).map(([key, a]) => (
    <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill={a.color} stroke="white" strokeWidth="2"/>
        <g dangerouslySetInnerHTML={{ __html: a.svgPath }} />
      </svg>
      <span style={{ color: a.color, fontWeight: 600, fontSize: 10 }}>{a.label}</span>
    </span>
  ));

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(59,158,206,0.2)', marginBottom: 20 }}>
      <div style={{ position: 'relative' }}>
        <div ref={mapRef} style={{ height: 460, width: '100%', background: '#0a1628' }} />
        <WindCompass wind={activeWindStr} />
      </div>

      {/* Legend */}
      <div style={{
        background: 'rgba(10,22,40,0.97)',
        padding: '9px 14px',
        borderTop: '1px solid rgba(59,158,206,0.12)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px 12px',
        alignItems: 'center',
      }}>
        {legendItems}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {hasSafeRoute && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 20, height: 3, background: '#34d399', borderRadius: 2 }}/>
              <span style={{ color: '#34d399', fontSize: 10, fontWeight: 600 }}>Varna pot</span>
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 20, height: 3, background: '#3b9ece', borderRadius: 2 }}/>
            <span style={{ color: '#3b9ece', fontSize: 10 }}>Ruta</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 14 }}>🍽️</span>
            <span style={{ color: '#166534', fontSize: 10 }}>Restavracija</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 14 }}>⭐</span>
            <span style={{ color: '#7c3aed', fontSize: 10 }}>Zanimivost</span>
          </span>
        </span>
      </div>

      <div style={{
        background: 'rgba(10,22,40,0.88)',
        padding: '4px 14px',
        fontSize: 10,
        color: 'rgba(90,158,192,0.45)',
        borderTop: '1px solid rgba(59,158,206,0.06)',
      }}>
        Nautična karta: <a href="https://www.openseamap.org" target="_blank" rel="noreferrer" style={{ color: '#3b9ece' }}>OpenSeaMap</a>
        {' '}· globine, čeri, boje, plovni kanali
      </div>
    </div>
  );
}
