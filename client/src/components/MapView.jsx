import { useEffect, useRef } from 'react';

// ─── SVG icon paths per activity type ────────────────────────────────────────
// Using inline SVG paths — 100% reliable in Leaflet divIcon (no emoji rendering issues)

const ACTIVITY = {
  marina: {
    label: 'Marina',
    color: '#1565c0',
    svgPath: `<circle cx="16" cy="7" r="3" fill="white"/>
      <line x1="16" y1="10" x2="16" y2="26" stroke="white" stroke-width="2"/>
      <path d="M8 18 Q16 22 24 18" stroke="white" stroke-width="2" fill="none"/>
      <line x1="10" y1="18" x2="8" y2="26" stroke="white" stroke-width="1.5"/>
      <line x1="22" y1="18" x2="24" y2="26" stroke="white" stroke-width="1.5"/>`,
  },
  anchorage: {
    label: 'Sidrišče',
    color: '#b45309',
    svgPath: `<circle cx="16" cy="8" r="3" fill="white"/>
      <line x1="16" y1="11" x2="16" y2="15" stroke="white" stroke-width="2"/>
      <path d="M10 15 Q16 26 22 15" stroke="white" stroke-width="2" fill="white" fill-opacity="0.3"/>
      <line x1="8" y1="13" x2="24" y2="13" stroke="white" stroke-width="1.5"/>`,
  },
  buoy: {
    label: 'Boja',
    color: '#b91c1c',
    svgPath: `<ellipse cx="16" cy="14" rx="7" ry="9" fill="white" fill-opacity="0.9"/>
      <ellipse cx="16" cy="14" rx="7" ry="4" fill="none" stroke="white" stroke-width="1.5"/>
      <line x1="16" y1="23" x2="16" y2="28" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="9" r="2" fill="none" stroke="white" stroke-width="1.5"/>`,
  },
  swimming: {
    label: 'Kopanje',
    color: '#0369a1',
    svgPath: `<circle cx="16" cy="7" r="3" fill="white"/>
      <path d="M10 22 Q13 18 16 20 Q19 22 22 18" stroke="white" stroke-width="2" fill="none"/>
      <path d="M10 26 Q13 22 16 24 Q19 26 22 22" stroke="white" stroke-width="2" fill="none"/>
      <path d="M13 10 L11 16 L16 14 L21 16 L19 10" stroke="white" stroke-width="1.5" fill="none"/>`,
  },
  snorkeling: {
    label: 'Snorkljanje',
    color: '#047857',
    svgPath: `<ellipse cx="14" cy="12" rx="5" ry="4" fill="none" stroke="white" stroke-width="2"/>
      <line x1="19" y1="10" x2="24" y2="8" stroke="white" stroke-width="2"/>
      <line x1="24" y1="8" x2="24" y2="14" stroke="white" stroke-width="2"/>
      <path d="M9 16 Q12 22 16 20 Q20 18 22 22" stroke="white" stroke-width="2" fill="none"/>
      <circle cx="12" cy="12" r="1.5" fill="white"/>`,
  },
  diving: {
    label: 'Potapljanje',
    color: '#1e3a8a',
    svgPath: `<circle cx="16" cy="8" r="4" fill="none" stroke="white" stroke-width="2"/>
      <path d="M12 12 L10 22 M20 12 L22 22" stroke="white" stroke-width="2"/>
      <path d="M10 17 L22 17" stroke="white" stroke-width="1.5"/>
      <path d="M11 22 Q16 26 21 22" stroke="white" stroke-width="2" fill="none"/>
      <circle cx="22" cy="8" r="2" fill="white"/>
      <line x1="22" y1="10" x2="22" y2="16" stroke="white" stroke-width="1.5"/>`,
  },
};

function detectType(day) {
  if (day.marina?.name) return 'marina';
  if (day.anchorage?.name) {
    const n = (day.anchorage.notes || '').toLowerCase() + (day.anchorage.name || '').toLowerCase();
    if (n.includes('potap') || n.includes('diving') || n.includes('div')) return 'diving';
    if (n.includes('snork')) return 'snorkeling';
    if (n.includes('plaz') || n.includes('swim') || n.includes('kopa') || n.includes('beach')) return 'swimming';
    if (n.includes('boja') || n.includes('buoy')) return 'buoy';
    return 'anchorage';
  }
  return 'anchorage';
}

// ─── Icon factory ─────────────────────────────────────────────────────────────

function makeDayIcon(L, type, num, isActive) {
  const a = ACTIVITY[type] || ACTIVITY.anchorage;
  const size = isActive ? 48 : 40;
  const badgeSize = 18;
  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="${isActive ? 15 : 14}"
          fill="${a.color}"
          stroke="white"
          stroke-width="${isActive ? 2.5 : 2}"/>
        ${a.svgPath}
      </svg>
      <div style="
        position:absolute;
        top:-6px;right:-6px;
        width:${badgeSize}px;height:${badgeSize}px;
        background:${isActive ? 'white' : '#0a1628'};
        color:${isActive ? a.color : 'white'};
        border:2px solid ${a.color};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-weight:900;font-size:9px;font-family:Arial,sans-serif;
        box-shadow:0 1px 5px rgba(0,0,0,0.6);
        line-height:1;
      ">${num}</div>
    </div>`,
    className: 'jadran-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

// ─── Wind arrow (SVG, no emoji) ───────────────────────────────────────────────

function windArrowSVG(deg, kt) {
  const c = kt > 25 ? '#f87171' : kt > 15 ? '#fbbf24' : '#34d399';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="rgba(0,0,0,0.6)" stroke="${c}" stroke-width="1.5"/>
    <g transform="rotate(${deg},16,16)">
      <polygon points="16,4 12,21 16,18 20,21" fill="${c}"/>
    </g>
    <text x="16" y="29" text-anchor="middle" font-size="7" fill="${c}" font-family="Arial,sans-serif">${kt}kt</text>
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

// ─── Route builder ────────────────────────────────────────────────────────────

function buildFullRoute(days, safeRouteMap) {
  const segments = [];
  const allPoints = [];

  days.forEach((d, i) => {
    if (!d.fromLat || !d.fromLng) return;
    const from = [d.fromLat, d.fromLng];
    const nextDay = days[i + 1];
    const to = nextDay?.fromLat && nextDay?.fromLng
      ? [nextDay.fromLat, nextDay.fromLng]
      : (d.toLat && d.toLng ? [d.toLat, d.toLng] : null);

    allPoints.push(from);

    if (!to) return;

    const waypoints = (safeRouteMap[d.day] || [])
      .filter(wp => wp.lat && wp.lng)
      .map(wp => [wp.lat, wp.lng]);

    segments.push({ leg: [from, ...waypoints, to], day: d, dayIndex: i });
  });

  const last = days[days.length - 1];
  if (last?.toLat && last?.toLng) allPoints.push([last.toLat, last.toLng]);

  return { segments, allPoints };
}

// ─── Legend item (SVG icon + label) ──────────────────────────────────────────

function LegendIcon({ type }) {
  const a = ACTIVITY[type];
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill={a.color} stroke="white" stroke-width="2"/>
        {/* render svgPath as dangerouslySetInnerHTML won't work in SVG — use a small colored circle */}
        <circle cx="16" cy="16" r="7" fill="white" fill-opacity="0.3"/>
      </svg>
      <span style={{ color: a.color, fontWeight: 600, fontSize: 11 }}>{a.label}</span>
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapView({ itinerary, activeDay, onDaySelect, safeRoute }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

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

    const safeRouteMap = {};
    if (Array.isArray(safeRoute)) {
      safeRoute.forEach(leg => { safeRouteMap[leg.day] = leg.waypoints || []; });
    }

    const { segments, allPoints } = buildFullRoute(days, safeRouteMap);

    // Faint full dashed route
    if (allPoints.length > 1) {
      layersRef.current.push(
        L.polyline(allPoints, { color: 'rgba(59,158,206,0.2)', weight: 2, dashArray: '7 7' }).addTo(map)
      );
    }

    // Per-leg segments
    segments.forEach(({ leg, day, dayIndex }) => {
      const isActive = dayIndex === activeDay;
      const hasSafeWp = (safeRouteMap[day.day] || []).length > 0;
      const lineColor = isActive
        ? (hasSafeWp ? '#34d399' : '#3b9ece')
        : (hasSafeWp ? 'rgba(52,211,153,0.3)' : 'rgba(59,158,206,0.18)');

      layersRef.current.push(
        L.polyline(leg, { color: lineColor, weight: isActive ? 4 : 2, opacity: isActive ? 0.95 : 0.65 }).addTo(map)
      );

      // Safe waypoint dots
      if (hasSafeWp) {
        (safeRouteMap[day.day] || []).forEach(wp => {
          const icon = L.divIcon({
            html: `<div style="width:9px;height:9px;background:#34d399;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
            className: 'jadran-marker',
            iconSize: [9, 9],
            iconAnchor: [4, 4],
          });
          const m = L.marker([wp.lat, wp.lng], { icon }).addTo(map);
          if (wp.note) m.bindPopup(`<div style="font-size:12px">🛡️ ${wp.note}</div>`);
          layersRef.current.push(m);
        });
      }

      // Direction arrow
      if (isActive && leg.length >= 2) {
        const mid = leg[Math.floor(leg.length / 2)];
        const nxt = leg[Math.floor(leg.length / 2) + 1] || leg[leg.length - 1];
        const bearing = Math.atan2(nxt[1] - mid[1], nxt[0] - mid[0]) * (180 / Math.PI);
        layersRef.current.push(
          L.marker(mid, {
            icon: L.divIcon({
              html: `<div style="color:${lineColor};font-size:18px;line-height:1;transform:rotate(${bearing - 90}deg)">&#9650;</div>`,
              className: 'jadran-marker',
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            }),
            interactive: false,
          }).addTo(map)
        );
      }
    });

    // Activity markers
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
        <div style="font-family:Arial,sans-serif;min-width:210px;padding:4px 0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" style="flex-shrink:0">
              <circle cx="16" cy="16" r="14" fill="${a.color}"/>
              ${a.svgPath}
            </svg>
            <div>
              <div style="font-weight:700;font-size:14px;color:#0a1628">Dan ${d.day}: ${d.title || ''}</div>
              <div style="color:${a.color};font-size:11px;font-weight:700">${a.label}</div>
              <div style="color:#4a6a80;font-size:11px">${d.distance || ''} · ${d.sailTime || ''}</div>
            </div>
          </div>
          ${d.marina?.name ? `<div style="color:#1565c0;font-size:12px;margin-bottom:4px">&#9875; <b>${d.marina.name}</b>${d.marina.price ? ` — ${d.marina.price}` : ''}</div>` : ''}
          ${d.anchorage?.name ? `<div style="color:#b45309;font-size:12px;margin-bottom:4px">&#9875; <b>${d.anchorage.name}</b>${d.anchorage.notes ? `<br><span style="color:#888;font-size:11px">${d.anchorage.notes}</span>` : ''}</div>` : ''}
          ${d.restaurant?.name ? `<div style="color:#166534;font-size:12px;margin-bottom:4px">&#127860; ${d.restaurant.name}${d.restaurant.dish ? ` — ${d.restaurant.dish}` : ''}</div>` : ''}
          ${d.weather ? `<div style="color:#555;font-size:11px;margin-top:6px;padding-top:6px;border-top:1px solid #eee">&#127777; ${d.weather.temp}°C &nbsp; &#128168; ${d.weather.wind}</div>` : ''}
        </div>
      `);

      marker.on('click', () => onDaySelect?.(i));
      layersRef.current.push(marker);

      // Wind arrow
      if (d.weather?.wind) {
        const kt = windToKt(d.weather.wind);
        const deg = windToDeg(d.weather.wind);
        layersRef.current.push(
          L.marker([d.fromLat + 0.05, d.fromLng - 0.06], {
            icon: L.divIcon({ html: windArrowSVG(deg, kt), className: 'jadran-marker', iconSize: [30, 30], iconAnchor: [15, 15] }),
            interactive: false,
          }).addTo(map)
        );
      }
    });

    // Final destination marker
    const last = days[days.length - 1];
    if (last?.toLat && last?.toLng) {
      layersRef.current.push(
        L.marker([last.toLat, last.toLng], {
          icon: L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="rgba(212,168,64,0.95)" stroke="white" stroke-width="2"/>
              <text x="16" y="21" text-anchor="middle" font-size="16" font-family="Arial">&#127937;</text>
            </svg>`,
            className: 'jadran-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        }).addTo(map)
          .bindPopup(`<div style="font-family:Arial,sans-serif;font-weight:700;color:#0a1628">Cilj: ${last.to || ''}</div>`)
      );
    }

    if (allPoints.length > 0) {
      map.fitBounds(allPoints, { padding: [55, 55], maxZoom: 11 });
    }
  }, [itinerary, activeDay, safeRoute]);

  const hasSafeRoute = Array.isArray(safeRoute) && safeRoute.some(l => l.waypoints?.length > 0);

  // Legend SVG icons inline
  const legendItems = Object.entries(ACTIVITY).map(([key, a]) => (
    <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill={a.color} stroke="white" stroke-width="2"/>
        <g dangerouslySetInnerHTML={{ __html: a.svgPath }} />
      </svg>
      <span style={{ color: a.color, fontWeight: 600, fontSize: 11 }}>{a.label}</span>
    </span>
  ));

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(59,158,206,0.2)', marginBottom: 20 }}>
      <div ref={mapRef} style={{ height: 440, width: '100%', background: '#0a1628' }} />

      <div style={{
        background: 'rgba(10,22,40,0.97)',
        padding: '10px 16px',
        borderTop: '1px solid rgba(59,158,206,0.12)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '7px 16px',
        alignItems: 'center',
      }}>
        {legendItems}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {hasSafeRoute && <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600 }}>&#128737; Varna pot</span>}
          <span style={{ color: '#34d399', fontSize: 11 }}>&#8593; Varen veter</span>
          <span style={{ color: '#fbbf24', fontSize: 11 }}>&#8593; Zmeren</span>
          <span style={{ color: '#f87171', fontSize: 11 }}>&#8593; Mocan</span>
        </span>
      </div>

      <div style={{
        background: 'rgba(10,22,40,0.88)',
        padding: '4px 16px',
        fontSize: 10,
        color: 'rgba(90,158,192,0.5)',
        borderTop: '1px solid rgba(59,158,206,0.06)',
      }}>
        Nauticna karta: <a href="https://www.openseamap.org" target="_blank" rel="noreferrer" style={{ color: '#3b9ece' }}>OpenSeaMap</a>
        {' '}· globine, ceri, boje, plovni kanali
      </div>
    </div>
  );
}
