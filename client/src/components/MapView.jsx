import { useEffect, useRef } from 'react';

// Leaflet loaded via CDN in index.html
// This component renders a full interactive route map

const MARINA_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#3b9ece" stroke="white" stroke-width="1.5"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="21"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`;
const ANCHOR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#d4a840" stroke="white" stroke-width="1.5"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="21"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`;

function windArrowSVG(dirDeg, speed) {
  const color = speed > 25 ? '#f87171' : speed > 15 ? '#fbbf24' : '#34d399';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="rgba(0,0,0,0.5)" stroke="${color}" stroke-width="1.5"/>
    <g transform="rotate(${dirDeg}, 16, 16)">
      <polygon points="16,4 12,20 16,17 20,20" fill="${color}"/>
    </g>
    <text x="16" y="29" text-anchor="middle" font-size="7" fill="${color}" font-family="sans-serif">${speed}kt</text>
  </svg>`;
}

// Parse wind direction string like "NW 10-15kt" → degrees
function windToDeg(windStr) {
  const dirMap = { N:0, NNE:22, NE:45, ENE:67, E:90, ESE:112, SE:135, SSE:157, S:180, SSW:202, SW:225, WSW:247, W:270, WNW:292, NW:315, NNW:337 };
  const match = windStr?.match(/^([A-Z]+)/);
  return dirMap[match?.[1]] ?? 180;
}

// Parse wind speed "NW 10-15kt" → average kt
function windToKt(windStr) {
  const nums = windStr?.match(/\d+/g);
  if (!nums) return 10;
  return nums.length >= 2 ? Math.round((+nums[0] + +nums[1]) / 2) : +nums[0];
}

export default function MapView({ itinerary, activeDay, onDaySelect }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    if (!itinerary || !window.L) return;
    const L = window.L;

    // Init map once
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 17,
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear previous layers
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    const days = itinerary.days || [];
    if (!days.length) return;

    // Build strictly sequential route: fromLat of each day + toLat of last day
    // This guarantees correct order with no crossing lines
    const routeCoords = days
      .filter(d => d.fromLat && d.fromLng)
      .map(d => [d.fromLat, d.fromLng]);
    const last = days[days.length - 1];
    if (last?.toLat && last?.toLng) routeCoords.push([last.toLat, last.toLng]);

    // Draw full faint dashed route
    if (routeCoords.length > 1) {
      const routeLine = L.polyline(routeCoords, {
        color: 'rgba(59,158,206,0.25)',
        weight: 2,
        dashArray: '6 6',
      }).addTo(map);
      layersRef.current.push(routeLine);
    }

    // Draw active segment using sequential coords — no crossing
    const fromCoord = routeCoords[activeDay];
    const toCoord = routeCoords[activeDay + 1];
    if (fromCoord && toCoord) {
      const activeLine = L.polyline([fromCoord, toCoord], {
        color: '#3b9ece',
        weight: 4,
        opacity: 0.95,
      }).addTo(map);
      layersRef.current.push(activeLine);

      // Bearing-correct arrow at midpoint
      const midLat = (fromCoord[0] + toCoord[0]) / 2;
      const midLng = (fromCoord[1] + toCoord[1]) / 2;
      const bearing = Math.atan2(toCoord[1] - fromCoord[1], toCoord[0] - fromCoord[0]) * (180 / Math.PI);
      const arrowIcon = L.divIcon({
        html: `<div style="color:#3b9ece;font-size:18px;line-height:1;transform:rotate(${bearing - 90}deg);">▲</div>`,
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      layersRef.current.push(L.marker([midLat, midLng], { icon: arrowIcon, interactive: false }).addTo(map));
    }

    // Day markers
    days.forEach((d, i) => {
      if (!d.fromLat || !d.fromLng) return;
      const isActive = i === activeDay;

      const markerIcon = L.divIcon({
        html: `<div style="
          width:${isActive ? 36 : 28}px;height:${isActive ? 36 : 28}px;
          background:${isActive ? '#3b9ece' : 'rgba(10,25,45,0.92)'};
          border:2px solid ${isActive ? '#fff' : '#3b9ece'};
          border-radius:50%;display:flex;align-items:center;justify-content:center;
          color:white;font-weight:700;font-size:${isActive ? 14 : 11}px;
          font-family:sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.5);cursor:pointer;
        ">${i + 1}</div>`,
        className: '',
        iconSize: [isActive ? 36 : 28, isActive ? 36 : 28],
        iconAnchor: [isActive ? 18 : 14, isActive ? 18 : 14],
      });

      const marker = L.marker([d.fromLat, d.fromLng], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:190px;padding:4px 0">
            <div style="font-weight:700;font-size:14px;color:#0a1628;margin-bottom:4px">Dan ${d.day}: ${d.title || ''}</div>
            <div style="color:#4a6a80;font-size:12px;margin-bottom:6px">${d.distance || ''} • ${d.sailTime || ''}</div>
            ${d.marina?.name ? `<div style="color:#1a7fb5;font-size:12px">⚓ ${d.marina.name}${d.marina.price ? ` (${d.marina.price})` : ''}</div>` : ''}
            ${d.anchorage?.name ? `<div style="color:#b07d10;font-size:12px">🏖️ ${d.anchorage.name}</div>` : ''}
            ${d.restaurant?.name ? `<div style="color:#2a6a40;font-size:12px">🍽️ ${d.restaurant.name}</div>` : ''}
            ${d.weather ? `<div style="color:#555;font-size:11px;margin-top:6px;border-top:1px solid #eee;padding-top:6px">🌡️ ${d.weather.temp}°C &nbsp; 💨 ${d.weather.wind}</div>` : ''}
          </div>
        `);

      marker.on('click', () => onDaySelect?.(i));
      layersRef.current.push(marker);

      // Wind arrow offset slightly from day marker
      if (d.weather?.wind) {
        const kt = windToKt(d.weather.wind);
        const deg = windToDeg(d.weather.wind);
        const windIcon = L.divIcon({
          html: windArrowSVG(deg, kt),
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        layersRef.current.push(L.marker([d.fromLat + 0.04, d.fromLng - 0.04], { icon: windIcon, interactive: false }).addTo(map));
      }
    });

    // Final destination marker (🏁)
    if (last?.toLat && last?.toLng) {
      const endIcon = L.divIcon({
        html: `<div style="width:26px;height:26px;background:rgba(212,168,64,0.9);border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🏁</div>`,
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      layersRef.current.push(
        L.marker([last.toLat, last.toLng], { icon: endIcon })
          .addTo(map)
          .bindPopup(`<div style="font-family:sans-serif;font-weight:700;color:#0a1628">🏁 Cilj: ${last.to || ''}</div>`)
      );
    }

    // Fit map to full route
    if (routeCoords.length > 0) {
      map.fitBounds(routeCoords, { padding: [50, 50], maxZoom: 10 });
    }
  }, [itinerary, activeDay]);

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(59,158,206,0.2)', marginBottom: 20 }}>
      <div ref={mapRef} style={{ height: 420, width: '100%', background: '#0a1628' }} />
      <div style={{
        background: 'rgba(10,22,40,0.95)',
        padding: '10px 16px',
        display: 'flex',
        gap: 20,
        fontSize: 12,
        color: '#5a9ec0',
        borderTop: '1px solid rgba(59,158,206,0.1)',
        flexWrap: 'wrap',
      }}>
        <span>🔵 Aktivna pot</span>
        <span style={{ color: 'rgba(59,158,206,0.5)' }}>- - Celotna ruta</span>
        <span style={{ color: '#34d399' }}>↑ Smer vetra (zeleno = varno)</span>
        <span style={{ color: '#fbbf24' }}>↑ Zmeren veter</span>
        <span style={{ color: '#f87171' }}>↑ Močan veter</span>
      </div>
    </div>
  );
}
