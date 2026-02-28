import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Robust coordinate normalization (handles swapped lat/lng)
function normalizeCoord(lat, lng) {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  const looksAdriatic = (x, y) => x >= 41 && x <= 47 && y >= 11 && y <= 20;
  if (looksAdriatic(a, b)) return [a, b];
  if (looksAdriatic(b, a)) return [b, a];

  if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
  if (Math.abs(b) > 180 && Math.abs(a) <= 180) return [b, a];

  return [a, b];
}

export default function MapView({ itinerary, activeDay, showDebug, showSafeRoute, showRoute }) {
  const mapRef = useRef(null);
  const layersRef = useRef({});

  const days = itinerary?.days || [];
  const day = days[activeDay] || null;

  // Prefer backend-provided safe route
  const safeWpsRaw = itinerary?.safeRoute?.waypoints || day?.safeRoute?.waypoints || [];
  const safeWps = (safeWpsRaw || []).map(w => normalizeCoord(w.lat, w.lng)).filter(Boolean);

  // Fallback route points ONLY if no safe route
  const routePoints = useMemo(() => {
    if (safeWps.length > 1) return safeWps;
    const pts = [];
    days.forEach((d) => {
      const c = normalizeCoord(d.fromLat, d.fromLng);
      if (c) pts.push(c);
    });
    const last = days[days.length - 1];
    const end = last ? normalizeCoord(last.toLat, last.toLng) : null;
    if (end) pts.push(end);
    return pts;
  }, [days, safeWps]);

  // Stops (day starts + finish)
  const stops = useMemo(() => {
    const out = [];
    days.forEach((d, i) => {
      const c = normalizeCoord(d.fromLat, d.fromLng);
      if (c) out.push({ coord: c, dayIndex: i, label: d.from || `Dan ${i + 1}` });
    });
    const last = days[days.length - 1];
    const fc = last ? normalizeCoord(last.toLat, last.toLng) : null;
    if (fc) out.push({ coord: fc, dayIndex: days.length - 1, label: `🏁 ${last?.to || 'Cilj'}`, isFinish: true });
    return out;
  }, [days]);

  // Places for active day - expect backend already snapped to water where possible
  const places = useMemo(() => {
    const list = [];
    const add = (p, kind) => {
      if (!p) return;
      const lat = p.lat ?? p.latitude;
      const lng = p.lng ?? p.lon ?? p.longitude;
      const c = normalizeCoord(lat, lng);
      if (!c) return;
      list.push({ coord: c, kind, name: p.name || p.title || kind, raw: p });
    };
    if (!day) return list;
    add(day.marina, 'marina');
    add(day.anchorage, 'anchorage');
    add(day.restaurant, 'restaurant');
    (day.activities || []).forEach(a => add(a, 'activity'));
    return list;
  }, [day]);

  // Init map
  useEffect(() => {
    if (mapRef.current) return;
    const el = document.getElementById('map');
    if (!el) return;

    const map = L.map(el, { zoomControl: false, preferCanvas: true });
    mapRef.current = map;
    L.control.zoom({ position: 'topleft' }).addTo(map);

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    });

    const seamarks = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      maxZoom: 18,
      opacity: 0.75,
      attribution: 'OpenSeaMap',
    });

    osm.addTo(map);
    seamarks.addTo(map);
    layersRef.current.base = osm;
    layersRef.current.seamarks = seamarks;

    map.setView([44.0, 15.0], 7);
  }, []);

  // Render overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous layers (except base/seamarks)
    Object.values(layersRef.current)
      .filter((l) => l && l instanceof L.Layer && l !== layersRef.current.base && l !== layersRef.current.seamarks)
      .forEach((l) => {
        try { map.removeLayer(l); } catch {}
      });

    // Icons
    const makeIcon = (emoji) =>
      L.divIcon({
        className: 'poi-marker',
        html: `<div class="poi-badge">${emoji}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

    const icons = {
      marina: makeIcon('⚓'),
      anchorage: makeIcon('🏖️'),
      restaurant: makeIcon('🍽️'),
      activity: makeIcon('⭐'),
    };

    // Lines
    if (showSafeRoute && safeWps.length > 1) {
      const safeLine = L.polyline(safeWps, { weight: 5, opacity: 0.9, className: 'poly-safe' }).addTo(map);
      layersRef.current.safeLine = safeLine;
    }

    if (showRoute && routePoints.length > 1 && safeWps.length <= 1) {
      const routeLine = L.polyline(routePoints, { weight: 3, opacity: 0.55, dashArray: '6 10', className: 'poly-route' }).addTo(map);
      layersRef.current.routeLine = routeLine;
    }

    // Stop markers
    const stopMarkers = stops.map((s) => {
      const marker = L.circleMarker(s.coord, {
        radius: s.isFinish ? 9 : 7,
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
        className: s.isFinish ? 'stop-finish' : 'stop-marker',
      }).addTo(map);

      marker.bindPopup(
        `<div style="font-family:Arial;font-weight:800;color:white;font-size:14px;background:rgba(10,22,40,0.92);padding:8px 10px;border-radius:10px;border:1px solid rgba(59,158,206,0.25)">${s.label}</div>`
      );
      return marker;
    });
    layersRef.current.stopMarkers = L.layerGroup(stopMarkers).addTo(map);

    // POIs
    const poiMarkers = places.map((p) => {
      const marker = L.marker(p.coord, { icon: icons[p.kind] || icons.activity }).addTo(map);
      const title = p.name ? `<b>${p.name}</b>` : '';
      const desc = p.raw?.description ? `<div style="margin-top:6px;opacity:.9">${p.raw.description}</div>` : '';
      marker.bindPopup(`<div style="min-width:220px">${title}${desc}</div>`);
      return marker;
    });
    layersRef.current.poiMarkers = L.layerGroup(poiMarkers).addTo(map);

    // Fit bounds
    const boundsPts = (safeWps.length > 1 ? safeWps : routePoints)
      .concat(stops.map((s) => s.coord))
      .concat(places.map((p) => p.coord));

    if (boundsPts.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPts).pad(0.2));
    } else if (boundsPts.length === 1) {
      map.setView(boundsPts[0], 12);
    }

    if (showDebug) {
      // minimal debug: show point count
      // (no landmask on client to keep bundle small)
      // eslint-disable-next-line no-console
      console.log('Map debug:', { safeWps: safeWps.length, routePoints: routePoints.length, stops: stops.length, places: places.length });
    }
  }, [activeDay, places, routePoints, safeWps, showDebug, showRoute, showSafeRoute, stops]);

  return <div id="map" style={{ width: '100%', height: '100%' }} />;
}
