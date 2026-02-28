import { useEffect, useRef } from 'react';

// ─── Activity config ──────────────────────────────────────────────────────────
const ACT = {
  marina:     { label: 'Marina',       color: '#1565c0', icon: '⚓' },
  anchorage:  { label: 'Sidrišče',     color: '#b45309', icon: '🏖️' },
  swimming:   { label: 'Kopanje',      color: '#0284c7', icon: '🏊' },
  snorkeling: { label: 'Snorkljanje',  color: '#047857', icon: '🤿' },
  diving:     { label: 'Potapljanje',  color: '#1e3a8a', icon: '🤿' },
  restaurant: { label: 'Restavracija', color: '#166534', icon: '🍽️' },
  highlight:  { label: 'Zanimivost',   color: '#7c3aed', icon: '⭐' },
};

const SVG = {
  marina: `<circle cx="16" cy="7" r="3" fill="white"/>
    <line x1="16" y1="10" x2="16" y2="26" stroke="white" stroke-width="2"/>
    <path d="M8 18 Q16 22 24 18" stroke="white" stroke-width="2.5" fill="none"/>
    <line x1="10" y1="18" x2="8" y2="26" stroke="white" stroke-width="1.5"/>
    <line x1="22" y1="18" x2="24" y2="26" stroke="white" stroke-width="1.5"/>`,
  anchorage: `<circle cx="16" cy="8" r="3" fill="white"/>
    <line x1="16" y1="11" x2="16" y2="16" stroke="white" stroke-width="2"/>
    <path d="M9 14 Q16 26 23 14" stroke="white" stroke-width="2" fill="white" fill-opacity="0.25"/>
    <line x1="8" y1="12" x2="24" y2="12" stroke="white" stroke-width="1.5"/>`,
  swimming: `<circle cx="16" cy="7" r="3" fill="white"/>
    <path d="M10 21 Q13 17 16 19 Q19 21 22 17" stroke="white" stroke-width="2.5" fill="none"/>
    <path d="M10 26 Q13 22 16 24 Q19 26 22 22" stroke="white" stroke-width="2" fill="none"/>
    <path d="M13 10 L11 16 L16 14 L21 16 L19 10" stroke="white" stroke-width="1.5" fill="none"/>`,
  snorkeling: `<ellipse cx="14" cy="12" rx="5" ry="4" fill="none" stroke="white" stroke-width="2"/>
    <line x1="19" y1="10" x2="24" y2="8" stroke="white" stroke-width="2"/>
    <line x1="24" y1="8" x2="24" y2="14" stroke="white" stroke-width="2"/>
    <path d="M9 16 Q12 22 16 20 Q20 18 22 22" stroke="white" stroke-width="2" fill="none"/>`,
  diving: `<circle cx="16" cy="8" r="4" fill="none" stroke="white" stroke-width="2"/>
    <path d="M12 12 L10 22 M20 12 L22 22" stroke="white" stroke-width="2"/>
    <path d="M10 17 L22 17" stroke="white" stroke-width="1.5"/>
    <path d="M11 22 Q16 26 21 22" stroke="white" stroke-width="2" fill="none"/>
    <circle cx="22" cy="8" r="2" fill="white"/>`,
};

// ─── Detect primary activity type for a day ───────────────────────────────────
function detectType(day) {
  if (day.marina?.name) return 'marina';
  const text = [
    day.anchorage?.notes, day.anchorage?.name, day.title, day.tip,
    ...(day.highlights || [])
  ].filter(Boolean).join(' ').toLowerCase();
  if (text.includes('potap') || text.includes('divin')) return 'diving';
  if (text.includes('snork')) return 'snorkeling';
  if (text.includes('plaz') || text.includes('swim') || text.includes('kopa') || text.includes('beach')) return 'swimming';
  return 'anchorage';
}

// ─── Leaflet icon builders ────────────────────────────────────────────────────
function makePinIcon(L, type, num, isActive) {
  const a = ACT[type] || ACT.anchorage;
  const s = isActive ? 52 : 42;
  const svgInner = SVG[type] || SVG.anchorage;
  return L.divIcon({
    html: `
      <div style="position:relative;width:${s}px;height:${s}px;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.55));">
        <svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="${isActive ? 15 : 14}" fill="${a.color}" stroke="white" stroke-width="${isActive ? 3 : 2}"/>
          ${svgInner}
        </svg>
        <div style="
          position:absolute;top:-8px;right:-8px;
          width:20px;height:20px;
          background:${isActive ? 'white' : '#0a1628'};
          color:${isActive ? a.color : 'white'};
          border:2px solid ${a.color};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-weight:900;font-size:10px;font-family:Arial,sans-serif;
          box-shadow:0 2px 6px rgba(0,0,0,0.7);
        ">${num}</div>
      </div>`,
    className: '',
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    popupAnchor: [0, -(s / 2 + 8)],
  });
}


// ─── Wind helpers ─────────────────────────────────────────────────────────────
const DIR_MAP = { N:0,NNE:22,NE:45,ENE:67,E:90,ESE:112,SE:135,SSE:157,S:180,SSW:202,SW:225,WSW:247,W:270,WNW:292,NW:315,NNW:337 };
function windDeg(s) {
  if (!s) return null;
  const sl = { SV:45,JV:135,JZ:225,SZ:315,S:0,J:180,V:90,Z:270,SSV:22,VSV:67,VJV:112,JJV:157,JJZ:202,ZJZ:247,ZSZ:292,SSZ:337 };
  const mSl = s.match(/\b(SSV|VSV|VJV|JJV|JJZ|ZJZ|ZSZ|SSZ|SV|JV|JZ|SZ|S|J|V|Z)\b/);
  if (mSl && sl[mSl[1]] != null) return sl[mSl[1]];
  const mEn = s.match(/\b(NNE|NNW|ENE|ESE|SSE|SSW|WSW|WNW|NE|NW|SE|SW|N|S|E|W)\b/);
  if (mEn && DIR_MAP[mEn[1]] != null) return DIR_MAP[mEn[1]];
  return null;
}
function windKt(s) {
  if (!s) return null;
  const n = s.match(/\d+/g);
  if (!n) return null;
  return n.length >= 2 ? Math.round((+n[0] + +n[1]) / 2) : +n[0];
}
function windDirLabel(deg) {
  if (deg == null) return '';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ─── Wind compass overlay ─────────────────────────────────────────────────────
function WindCompass({ windStr }) {
  if (!windStr) return null;
  const kt = windKt(windStr);
  const deg = windDeg(windStr);
  if (kt == null && deg == null) return null;
  const color = kt > 25 ? '#f87171' : kt > 15 ? '#fbbf24' : '#34d399';
  const strength = kt > 25 ? 'Močan' : kt > 15 ? 'Zmeren' : 'Lahek';

  return (
    <div style={{
      position: 'absolute', bottom: 14, right: 14, zIndex: 1000,
      background: 'rgba(8,18,36,0.93)',
      border: `2px solid ${color}44`,
      borderRadius: 14, padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      backdropFilter: 'blur(6px)',
    }}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="23" fill="rgba(255,255,255,0.04)" stroke={`${color}55`} strokeWidth="1.5"/>
        {[['N',26,8],['S',26,46],['W',6,29],['E',46,29]].map(([l,x,y]) => (
          <text key={l} x={x} y={y} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.4)" fontFamily="Arial">{l}</text>
        ))}
        {Array.from({length:16},(_,i) => {
          const a = i * 22.5 * Math.PI / 180;
          const r1 = i%4===0 ? 16 : 19, r2 = 22;
          return <line key={i}
            x1={26 + r1*Math.sin(a)} y1={26 - r1*Math.cos(a)}
            x2={26 + r2*Math.sin(a)} y2={26 - r2*Math.cos(a)}
            stroke={`${color}44`} strokeWidth={i%4===0?1.5:0.8}/>;
        })}
        {deg != null && (
          <g transform={`rotate(${deg},26,26)`}>
            <polygon points="26,6 23,24 26,21 29,24" fill={color}/>
            <polygon points="26,46 23,28 26,31 29,28" fill={color} opacity="0.3"/>
          </g>
        )}
        <circle cx="26" cy="26" r="3.5" fill={color}/>
      </svg>
      <div>
        <div style={{ color, fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>
          {deg != null ? windDirLabel(deg) : ''}{kt != null ? ` ${kt} kn` : ''}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 1 }}>{strength} veter</div>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 1 }}>{windStr}</div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MapView({ itinerary, activeDay, onDaySelect, safeRoute }) {
  const mapRef  = useRef(null);
  const mapInst = useRef(null);
  const layers  = useRef([]);

  useEffect(() => {
    if (!window.L) return;
    const L = window.L;

    if (!mapInst.current) {
      mapInst.current = L.map(mapRef.current, {
        center: [43.5, 16.2], zoom: 8,
        zoomControl: true, scrollWheelZoom: true,
      });
      // ESRI Ocean Basemap — nautical look with depths, reefs, channels
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles &copy; Esri &mdash; GEBCO, NOAA, Nat. Geo.', maxZoom: 13 }
      ).addTo(mapInst.current);
      // ESRI Ocean Reference — port labels, depth numbers on top
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
        { attribution: '', maxZoom: 13, opacity: 0.9 }
      ).addTo(mapInst.current);
      // OpenSeaMap — boje, svetilniki, sidrišča
      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        opacity: 0.85, maxZoom: 18,
      }).addTo(mapInst.current);
    }

    if (!itinerary) return;
    const map = mapInst.current;

    layers.current.forEach(l => { try { map.removeLayer(l); } catch(_) {} });
    layers.current = [];

    const days = itinerary.days || [];
    if (!days.length) return;

    // ── 1. Ordered stop coordinates (fromLat/fromLng per day) ─────────────
    const stops = [];
    days.forEach((d, i) => {
      if (d.fromLat != null && d.fromLng != null) {
        stops.push({ coord: [+d.fromLat, +d.fromLng], dayIndex: i, day: d });
      }
    });

    const lastDay = days[days.length - 1];
    const finalCoord = lastDay?.toLat != null && lastDay?.toLng != null
      ? [+lastDay.toLat, +lastDay.toLng] : null;

    const routePoints = [...stops.map(s => s.coord)];
    if (finalCoord) routePoints.push(finalCoord);

    // ── 2. Safe route waypoints ────────────────────────────────────────────
    const safeMap = {};
    if (Array.isArray(safeRoute)) {
      safeRoute.forEach(leg => {
        if (leg.day != null) safeMap[String(leg.day)] = leg.waypoints || [];
      });
    }

    // ── 3. Background dashed route — REMOVED: show only safe route ────────

    // ── 4. Per-leg colored segments ────────────────────────────────────────
    for (let i = 0; i < stops.length; i++) {
      const from = stops[i].coord;
      const to = i < stops.length - 1 ? stops[i + 1].coord : finalCoord;
      if (!to) continue;

      const isActive = stops[i].dayIndex === activeDay;
      const dayNum = stops[i].day?.day;
      const safeWps = (safeMap[String(dayNum)] || [])
        .filter(w => w.lat != null && w.lng != null)
        .map(w => [+w.lat, +w.lng]);

      const hasSafe = safeWps.length > 0;
      
      // Only draw if we have a safe route; skip direct lines that could cross land
      if (!hasSafe) continue;
      
      const color = isActive ? '#34d399' : '#34d39966';
      const legPts = [from, ...safeWps, to];

      layers.current.push(
        L.polyline(legPts, {
          color, weight: isActive ? 4.5 : 2.5, opacity: isActive ? 1 : 0.8,
        }).addTo(map)
      );

      // Safe waypoint dots
      safeWps.forEach(wp => {
        layers.current.push(
          L.circleMarker(wp, {
            radius: 5, color: 'white', weight: 2,
            fillColor: '#34d399', fillOpacity: 1,
          }).addTo(map)
        );
      });

      // Direction arrow
      if (isActive && legPts.length >= 2) {
        const mi = Math.floor(legPts.length / 2);
        const p1 = legPts[Math.max(0, mi - 1)];
        const p2 = legPts[mi];
        const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI;
        layers.current.push(
          L.marker([(p1[0]+p2[0])/2, (p1[1]+p2[1])/2], {
            icon: L.divIcon({
              html: `<div style="color:${color};font-size:22px;line-height:1;transform:rotate(${angle-90}deg);filter:drop-shadow(0 1px 3px rgba(0,0,0,0.9))">▲</div>`,
              className: '', iconSize: [22,22], iconAnchor: [11,11],
            }),
            interactive: false,
          }).addTo(map)
        );
      }
    }

    // ── 5. Day markers + sub-markers ───────────────────────────────────────
    days.forEach((d, i) => {
      if (d.fromLat == null || d.fromLng == null) return;
      const coord = [+d.fromLat, +d.fromLng];
      const isActive = i === activeDay;
      const type = detectType(d);
      const a = ACT[type] || ACT.anchorage;
      const marina = typeof d.marina === 'string' ? { name: d.marina } : (d.marina || {});
      const anchorage = typeof d.anchorage === 'string' ? { name: d.anchorage } : (d.anchorage || {});
      const restaurant = typeof d.restaurant === 'string' ? { name: d.restaurant } : (d.restaurant || {});

      const popup = `
        <div style="font-family:Arial,sans-serif;min-width:230px;max-width:270px;padding:2px 0">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 32 32" style="flex-shrink:0">
              <circle cx="16" cy="16" r="14" fill="${a.color}"/>
              ${SVG[type] || SVG.anchorage}
            </svg>
            <div>
              <div style="font-weight:800;font-size:13px;color:#0a1628">Dan ${d.day}: ${d.title||''}</div>
              <div style="color:${a.color};font-size:11px;font-weight:700">${a.label}</div>
              <div style="color:#4a6a80;font-size:11px">${[d.distance,d.sailTime].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          ${marina.name ? `<div style="color:#1565c0;font-size:12px;margin-bottom:4px">⚓ <b>${marina.name}</b>${marina.price?` — ${marina.price}`:''}</div>` : ''}
          ${anchorage.name ? `<div style="color:#b45309;font-size:12px;margin-bottom:4px">🏖️ <b>${anchorage.name}</b>${anchorage.notes?`<br><span style="color:#888;font-size:11px">${anchorage.notes}</span>`:''}</div>` : ''}
          ${restaurant.name ? `<div style="color:#166534;font-size:12px;margin-bottom:4px">🍽️ <b>${restaurant.name}</b>${restaurant.dish?` — ${restaurant.dish}`:''}${restaurant.price?` <span style="color:#888">${restaurant.price}</span>`:''}</div>` : ''}
          ${d.highlights?.length ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #eee">${d.highlights.map(h=>`<div style="font-size:11px;color:#7c3aed;margin-bottom:2px">⭐ ${h}</div>`).join('')}</div>` : ''}
          ${d.weather ? `<div style="color:#555;font-size:11px;margin-top:6px;padding-top:6px;border-top:1px solid #eee">🌡️ ${d.weather.temp}°C &nbsp;💨 ${d.weather.wind||''}</div>` : ''}
          ${d.tip ? `<div style="margin-top:6px;padding:5px 8px;background:#fffbeb;border-radius:6px;font-size:11px;color:#92400e">⚓ ${d.tip}</div>` : ''}
        </div>`;

      const m = L.marker(coord, {
        icon: makePinIcon(L, type, i+1, isActive),
        zIndexOffset: isActive ? 2000 : i*10,
      }).addTo(map);
      m.bindPopup(popup, { maxWidth: 290 });
      m.on('click', () => onDaySelect?.(i));
      layers.current.push(m);

    });

    // ── 6. Final destination ───────────────────────────────────────────────
    if (finalCoord) {
      const fm = L.marker(finalCoord, {
        icon: L.divIcon({
          html: `<div style="width:38px;height:38px;background:linear-gradient(135deg,#d4a820,#f5c842);border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 3px 10px rgba(0,0,0,0.5);">🏁</div>`,
          className: '', iconSize: [38,38], iconAnchor: [19,19],
        }),
        zIndexOffset: 3000,
      }).addTo(map);
      fm.bindPopup(`<div style="font-family:Arial;font-weight:800;color:#0a1628;font-size:14px">🏁 Cilj: ${lastDay?.to||'Končna destinacija'}</div>`);
      layers.current.push(fm);
    }

    // ── 7. Fit bounds ──────────────────────────────────────────────────────
    if (routePoints.length > 0) {
      map.fitBounds(routePoints, { padding: [60,60], maxZoom: 12 });
    }

  }, [itinerary, activeDay, safeRoute]);

  const activeWind = itinerary?.days?.[activeDay]?.weather?.wind || null;
  const hasSafeRoute = Array.isArray(safeRoute) && safeRoute.some(l => (l.waypoints||[]).length > 0);

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(59,158,206,0.18)', marginBottom: 20 }}>
      <div style={{ position: 'relative' }}>
        <div ref={mapRef} style={{ height: 460, width: '100%', background: '#0a1628' }} />
        <WindCompass windStr={activeWind} />
      </div>

      <div style={{
        background: 'rgba(10,22,40,0.97)', padding: '9px 14px',
        borderTop: '1px solid rgba(59,158,206,0.1)',
        display: 'flex', flexWrap: 'wrap', gap: '5px 14px', alignItems: 'center',
      }}>
        {Object.entries(ACT).filter(([k]) => !['restaurant','highlight'].includes(k)).map(([key, a]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill={a.color} stroke="white" strokeWidth="2"/>
              <g dangerouslySetInnerHTML={{ __html: SVG[key] || SVG.anchorage }} />
            </svg>
            <span style={{ color: a.color, fontWeight: 600, fontSize: 10 }}>{a.label}</span>
          </span>
        ))}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14 }}>🍽️</span>
            <span style={{ color: '#166534', fontSize: 10, fontWeight: 600 }}>Restavracija</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14 }}>⭐</span>
            <span style={{ color: '#7c3aed', fontSize: 10, fontWeight: 600 }}>Zanimivost</span>
          </span>
          {hasSafeRoute && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 22, height: 3, background: '#34d399', borderRadius: 2 }}/>
              <span style={{ color: '#34d399', fontSize: 10, fontWeight: 600 }}>Varna plovbna pot</span>
            </span>
          )}
        </span>
      </div>

      <div style={{
        background: 'rgba(10,22,40,0.88)', padding: '4px 14px', fontSize: 10,
        color: 'rgba(90,158,192,0.4)', borderTop: '1px solid rgba(59,158,206,0.05)',
      }}>
        Nautična karta: <a href="https://www.esri.com" target="_blank" rel="noreferrer" style={{ color: '#3b9ece' }}>ESRI Ocean</a>
        {' '}· <a href="https://www.openseamap.org" target="_blank" rel="noreferrer" style={{ color: '#3b9ece' }}>OpenSeaMap</a>
        {' '}· globine, čeri, boje, plovni kanali
      </div>
    </div>
  );
}
