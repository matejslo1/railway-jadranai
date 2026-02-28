import { useEffect, useRef } from 'react';

// Leaflet + OpenSeaMap nautical charts
// Custom icons for each destination/activity type

// ─── Icons per activity type ─────────────────────────────────────────────────

const ICONS = {
  marina:     { emoji: '⚓', label: 'Marina',      color: '#0a4a8a', bg: '#0a4a8a' },
  anchorage:  { emoji: '⛵', label: 'Sidrišče',    color: '#d4a840', bg: '#d4a840' },
  buoy:       { emoji: '🔴', label: 'Boja',         color: '#cc2200', bg: '#cc2200' },
  swimming:   { emoji: '🏊', label: 'Kopanje',      color: '#1a9adb', bg: '#1a9adb' },
  snorkeling: { emoji: '🤿', label: 'Snorkljanje',  color: '#00897b', bg: '#00897b' },
  diving:     { emoji: '🐠', label: 'Potapljanje',  color: '#1a237e', bg: '#1a237e' },
};

function detectActivityType(day) {
  if (day.marina?.name) return 'marina';
  if (day.anchorage?.name) {
    const notes = (day.anchorage.notes || '').toLowerCase();
    if (notes.includes('diving') || notes.includes('potap')) return 'diving';
    if (notes.includes('snork')) return 'snorkeling';
    if (notes.includes('pla') || notes.includes('swim') || notes.includes('kopa')) return 'swimming';
    if (notes.includes('boja') || notes.includes('buoy')) return 'buoy';
    return 'anchorage';
  }
  return 'anchorage';
}

function makeActivityIcon(L, type, dayNum, isActive) {
  const ico = ICONS[type] || ICONS.anchorage;
  const size = isActive ? 44 : 36;
  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      <div style="
        width:${size}px;height:${size}px;
        background:${ico.bg};
        border:${isActive ? '3px' : '2px'} solid #fff;
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:${isActive ? 22 : 18}px;
        box-shadow:0 3px 12px rgba(0,0,0,${isActive ? '0.6' : '0.4'});
        cursor:pointer;
      ">${ico.emoji}</div>
      <div style="
        position:absolute;top:-5px;right:-5px;
        width:17px;height:17px;
        background:${isActive ? '#fff' : 'rgba(10,25,45,0.9)'};
        color:${isActive ? ico.color : '#fff'};
        border:2px solid ${ico.color};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-weight:900;font-size:9px;
        font-family:sans-serif;
        box-shadow:0 1px 4px rgba(0,0,0,0.5);
      ">${dayNum}</div>
    </div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

// ─── Wind helpers ─────────────────────────────────────────────────────────────

function windArrowSVG(dirDeg, speed) {
  const color = speed > 25 ? '#f87171' : speed > 15 ? '#fbbf24' : '#34d399';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="rgba(0,0,0,0.55)" stroke="${color}" stroke-width="1.5"/>
    <g transform="rotate(${dirDeg}, 16, 16)">
      <polygon points="16,4 12,20 16,17 20,20" fill="${color}"/>
    </g>
    <text x="16" y="29" text-anchor="middle" font-size="7" fill="${color}" font-family="sans-serif">${speed}kt</text>
  </svg>`;
}

function windToDeg(windStr) {
  const dirMap = { N:0,NNE:22,NE:45,ENE:67,E:90,ESE:112,SE:135,SSE:157,S:180,SSW:202,SW:225,WSW:247,W:270,WNW:292,NW:315,NNW:337 };
  const match = windStr?.match(/^([A-Z]+)/);
  return dirMap[match?.[1]] ?? 180;
}

function windToKt(windStr) {
  const nums = windStr?.match(/\d+/g);
  if (!nums) return 10;
  return nums.length >= 2 ? Math.round((+nums[0] + +nums[1]) / 2) : +nums[0];
}

// ─── Route helpers ────────────────────────────────────────────────────────────

function buildLegCoords(fromCoord, toCoord, waypoints = []) {
  const coords = [fromCoord];
  for (const wp of waypoints) {
    if (wp.lat && wp.lng) coords.push([wp.lat, wp.lng]);
  }
  coords.push(toCoord);
  return coords;
}

// ─── Component ────────────────────────────────────────────────────────────────

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
        center: [43.5, 16.4],
        zoom: 8,
      });

      // Base: OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(mapInstanceRef.current);

      // Nautical overlay: OpenSeaMap — depth contours, rocks, buoys, channels
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

    const fromCoords = days
      .filter(d => d.fromLat && d.fromLng)
      .map(d => [d.fromLat, d.fromLng]);
    const last = days[days.length - 1];
    const lastCoord = last?.toLat && last?.toLng ? [last.toLat, last.toLng] : null;
    const allCoords = [...fromCoords, ...(lastCoord ? [lastCoord] : [])];

    const safeRouteMap = {};
    if (Array.isArray(safeRoute)) {
      safeRoute.forEach(leg => { safeRouteMap[leg.day] = leg.waypoints || []; });
    }

    // Faint full dashed route
    if (allCoords.length > 1) {
      layersRef.current.push(
        L.polyline(allCoords, { color: 'rgba(59,158,206,0.20)', weight: 2, dashArray: '7 7' }).addTo(map)
      );
    }

    // Per-leg routes + waypoints
    days.forEach((d, i) => {
      const fromCoord = fromCoords[i];
      const toCoord = fromCoords[i + 1] || lastCoord;
      if (!fromCoord || !toCoord) return;

      const waypoints = safeRouteMap[d.day] || [];
      const legCoords = buildLegCoords(fromCoord, toCoord, waypoints);
      const isActive = i === activeDay;
      const hasSafeWp = waypoints.length > 0;

      layersRef.current.push(
        L.polyline(legCoords, {
          color: isActive
            ? (hasSafeWp ? '#34d399' : '#3b9ece')
            : (hasSafeWp ? 'rgba(52,211,153,0.3)' : 'rgba(59,158,206,0.18)'),
          weight: isActive ? 4 : 2,
          opacity: isActive ? 0.95 : 0.6,
        }).addTo(map)
      );

      // Waypoint dots
      waypoints.forEach(wp => {
        const wpIcon = L.divIcon({
          html: `<div title="${wp.note || ''}" style="width:9px;height:9px;background:#34d399;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
          className: '',
          iconSize: [9, 9],
          iconAnchor: [4, 4],
        });
        const m = L.marker([wp.lat, wp.lng], { icon: wpIcon }).addTo(map);
        if (wp.note) m.bindPopup(`<div style="font-family:sans-serif;font-size:12px;color:#0a1628">🛡️ ${wp.note}</div>`);
        layersRef.current.push(m);
      });

      // Direction arrow on active leg
      if (isActive && legCoords.length >= 2) {
        const mid = legCoords[Math.floor(legCoords.length / 2)];
        const next = legCoords[Math.floor(legCoords.length / 2) + 1] || toCoord;
        const bearing = Math.atan2(next[1] - mid[1], next[0] - mid[0]) * (180 / Math.PI);
        layersRef.current.push(
          L.marker(mid, {
            icon: L.divIcon({
              html: `<div style="color:${hasSafeWp ? '#34d399' : '#3b9ece'};font-size:18px;line-height:1;transform:rotate(${bearing - 90}deg);">▲</div>`,
              className: '',
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
      const actType = detectActivityType(d);
      const ico = ICONS[actType] || ICONS.anchorage;

      const marker = L.marker([d.fromLat, d.fromLng], {
        icon: makeActivityIcon(L, actType, i + 1, isActive),
      }).addTo(map).bindPopup(`
        <div style="font-family:sans-serif;min-width:210px;padding:4px 0">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
            <span style="font-size:22px">${ico.emoji}</span>
            <div>
              <div style="font-weight:700;font-size:14px;color:#0a1628">Dan ${d.day}: ${d.title || ''}</div>
              <div style="color:${ico.color};font-size:11px;font-weight:600">${ico.label}</div>
              <div style="color:#4a6a80;font-size:11px">${d.distance || ''} · ${d.sailTime || ''}</div>
            </div>
          </div>
          ${d.marina?.name ? `<div style="color:#0a4a8a;font-size:12px;margin-bottom:3px">⚓ <b>${d.marina.name}</b>${d.marina.price ? ` — ${d.marina.price}` : ''}</div>` : ''}
          ${d.anchorage?.name ? `<div style="color:#b07d10;font-size:12px;margin-bottom:3px">⛵ <b>${d.anchorage.name}</b>${d.anchorage.notes ? `<br><span style="color:#888;font-size:11px">${d.anchorage.notes}</span>` : ''}</div>` : ''}
          ${d.restaurant?.name ? `<div style="color:#2a6a40;font-size:12px;margin-bottom:3px">🍽️ ${d.restaurant.name}${d.restaurant.dish ? ` — ${d.restaurant.dish}` : ''}</div>` : ''}
          ${d.weather ? `<div style="color:#555;font-size:11px;margin-top:6px;padding-top:6px;border-top:1px solid #eee">🌡️ ${d.weather.temp}°C &nbsp; 💨 ${d.weather.wind}</div>` : ''}
        </div>
      `);

      marker.on('click', () => onDaySelect?.(i));
      layersRef.current.push(marker);

      // Wind arrow
      if (d.weather?.wind) {
        const kt = windToKt(d.weather.wind);
        const deg = windToDeg(d.weather.wind);
        layersRef.current.push(
          L.marker([d.fromLat + 0.045, d.fromLng - 0.05], {
            icon: L.divIcon({ html: windArrowSVG(deg, kt), className: '', iconSize: [32, 32], iconAnchor: [16, 16] }),
            interactive: false,
          }).addTo(map)
        );
      }
    });

    // Final destination 🏁
    if (lastCoord) {
      layersRef.current.push(
        L.marker(lastCoord, {
          icon: L.divIcon({
            html: `<div style="width:30px;height:30px;background:rgba(212,168,64,0.95);border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.5);">🏁</div>`,
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        }).addTo(map)
          .bindPopup(`<div style="font-family:sans-serif;font-weight:700;color:#0a1628">🏁 Cilj: ${last.to || ''}</div>`)
      );
    }

    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [55, 55], maxZoom: 11 });
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
        {Object.entries(ICONS).map(([key, val]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, color: val.color, fontWeight: 600 }}>
            <span style={{ fontSize: 14 }}>{val.emoji}</span> {val.label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 11 }}>
          {hasSafeRoute && <span style={{ color: '#34d399' }}>🛡️ Varna pot</span>}
          <span style={{ color: '#34d399' }}>↑ Varen veter</span>
          <span style={{ color: '#fbbf24' }}>↑ Zmeren</span>
          <span style={{ color: '#f87171' }}>↑ Močan</span>
        </span>
      </div>

      {/* Credits */}
      <div style={{
        background: 'rgba(10,22,40,0.88)',
        padding: '4px 16px',
        fontSize: 10,
        color: 'rgba(90,158,192,0.55)',
        borderTop: '1px solid rgba(59,158,206,0.06)',
      }}>
        Nautična karta: <a href="https://www.openseamap.org" target="_blank" rel="noreferrer" style={{ color: '#3b9ece' }}>OpenSeaMap</a>
        {' '}· globine, čeri, boje, plovni kanali
      </div>
    </div>
  );
}
