import { useEffect, useRef } from 'react';

// Leaflet loaded via CDN in index.html
// This component renders a full interactive route map

const MARINA_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#3b9ece" stroke="white" stroke-width="1.5"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="21"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`;
const ANCHOR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#d4a840" stroke="white" stroke-width="1.5"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="21"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`;

function windArrowSVG(direction, speed) {
  const color = speed > 25 ? '#f87171' : speed > 15 ? '#fbbf24' : '#34d399';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="rgba(0,0,0,0.5)" stroke="${color}" stroke-width="1.5"/>
    <g transform="rotate(${direction}, 16, 16)">
      <polygon points="16,4 12,20 16,17 20,20" fill="${color}"/>
    </g>
    <text x="16" y="29" text-anchor="middle" font-size="7" fill="${color}" font-family="sans-serif">${speed}kt</text>
  </svg>`;
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

    const allCoords = [];

    // Draw full route line (faint)
    const routeCoords = days.map(d => [d.fromLat, d.fromLng]).filter(c => c[0] && c[1]);
    if (days[days.length - 1]) {
      const last = days[days.length - 1];
      if (last.toLat && last.toLng) routeCoords.push([last.toLat, last.toLng]);
    }

    if (routeCoords.length > 1) {
      const routeLine = L.polyline(routeCoords, {
        color: 'rgba(59,158,206,0.3)',
        weight: 2,
        dashArray: '6 6',
      }).addTo(map);
      layersRef.current.push(routeLine);
      routeCoords.forEach(c => allCoords.push(c));
    }

    // Draw active day segment (bright)
    const activeD = days[activeDay];
    if (activeD?.fromLat && activeD?.toLat) {
      const activeLine = L.polyline(
        [[activeD.fromLat, activeD.fromLng], [activeD.toLat, activeD.toLng]],
        { color: '#3b9ece', weight: 4, opacity: 0.9 }
      ).addTo(map);
      layersRef.current.push(activeLine);

      // Arrow decorator (manual midpoint arrow)
      const midLat = (activeD.fromLat + activeD.toLat) / 2;
      const midLng = (activeD.fromLng + activeD.toLng) / 2;
      const arrowIcon = L.divIcon({
        html: `<div style="color:#3b9ece;font-size:20px;line-height:1;">➤</div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const arrowMarker = L.marker([midLat, midLng], { icon: arrowIcon }).addTo(map);
      layersRef.current.push(arrowMarker);
    }

    // Add markers for each day
    days.forEach((d, i) => {
      if (!d.fromLat || !d.fromLng) return;

      const isActive = i === activeDay;
      const isMarina = !!d.marina?.name;

      const markerIcon = L.divIcon({
        html: `<div style="
          width:${isActive ? 36 : 28}px;
          height:${isActive ? 36 : 28}px;
          background:${isActive ? '#3b9ece' : 'rgba(20,40,65,0.9)'};
          border:2px solid ${isActive ? '#fff' : '#3b9ece'};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          color:white;font-weight:700;font-size:${isActive ? 14 : 11}px;
          font-family:sans-serif;
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
          cursor:pointer;
        ">${i + 1}</div>`,
        className: '',
        iconSize: [isActive ? 36 : 28, isActive ? 36 : 28],
        iconAnchor: [isActive ? 18 : 14, isActive ? 18 : 14],
      });

      const marker = L.marker([d.fromLat, d.fromLng], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:180px">
            <div style="font-weight:700;color:#0a1628;margin-bottom:4px">Day ${d.day}: ${d.title}</div>
            <div style="color:#555;font-size:13px">${d.distance} • ${d.sailTime}</div>
            ${d.marina?.name ? `<div style="color:#3b9ece;font-size:12px;margin-top:4px">⚓ ${d.marina.name}</div>` : ''}
            ${d.anchorage?.name ? `<div style="color:#d4a840;font-size:12px">🏖️ ${d.anchorage.name}</div>` : ''}
            ${d.weather ? `<div style="font-size:12px;color:#666;margin-top:4px">🌡️ ${d.weather.temp}°C • 💨 ${d.weather.wind}</div>` : ''}
          </div>
        `);

      marker.on('click', () => onDaySelect && onDaySelect(i));
      layersRef.current.push(marker);
      allCoords.push([d.fromLat, d.fromLng]);

      // Wind arrow at each stop
      if (d.weather?.wind && d.fromLat) {
        const windKt = parseInt(d.weather.wind) || 10;
        const windDir = d.weather.wind.match(/^[A-Z]+/) ? 180 : 270; // rough estimate
        const windIcon = L.divIcon({
          html: windArrowSVG(windDir, windKt),
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const windMarker = L.marker(
          [d.fromLat + 0.03, d.fromLng + 0.03],
          { icon: windIcon, interactive: false }
        ).addTo(map);
        layersRef.current.push(windMarker);
      }
    });

    // Fit map to all coords
    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [40, 40] });
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
