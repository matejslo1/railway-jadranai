import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-10m.json';
import { point as turfPoint } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

// --- Coordinate utilities ---
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

function metersToDegLat(m) {
  return m / 111320;
}
function metersToDegLng(m, atLat) {
  const c = Math.cos((atLat * Math.PI) / 180) || 1;
  return m / (111320 * c);
}

// If a point is on land, push it offshore a bit (client-side visual fix).
function snapToWater(lat, lng, landPoly, maxMeters = 1200, stepMeters = 50) {
  const c = normalizeCoord(lat, lng);
  if (!c) return null;
  const [clat, clng] = c;

  const isLand = (la, lo) => {
    try {
      return booleanPointInPolygon(turfPoint([lo, la]), landPoly);
    } catch {
      return false;
    }
  };

  if (!landPoly || !isLand(clat, clng)) return [clat, clng];

  for (let r = stepMeters; r <= maxMeters; r += stepMeters) {
    const dLat = metersToDegLat(r);
    const dLng = metersToDegLng(r, clat);
    for (let k = 0; k < 24; k++) {
      const ang = (2 * Math.PI * k) / 24;
      const tlat = clat + Math.sin(ang) * dLat;
      const tlng = clng + Math.cos(ang) * dLng;
      if (!isLand(tlat, tlng)) return [tlat, tlng];
    }
  }
  return [clat, clng];
}

export default function MapView({ itinerary, activeDay, showDebug, showSafeRoute, showRoute }) {
  const mapRef = useRef(null);
  const layersRef = useRef({});

  // Build land polygon once (GeoJSON FeatureCollection -> MultiPolygon/Polygon)
  const landPoly = useMemo(() => {
    try {
      const fc = feature(landTopo, landTopo.objects.land);
      // booleanPointInPolygon accepts Feature<Polygon|MultiPolygon>
      // landTopo is a FeatureCollection with 1 feature
      return fc.features?.[0] || fc;
    } catch {
      return null;
    }
  }, []);

  const days = itinerary?.days || [];
  const day = days[activeDay] || null;

  // Prefer safeRoute from backend for polylines
  const safeWpsRaw = itinerary?.safeRoute?.waypoints || day?.safeRoute?.waypoints || [];
  const safeWps = (safeWpsRaw || []).map(w => snapToWater(w.lat, w.lng, landPoly)).filter(Boolean);

  // Build fallback route points only if safe route is missing
  const routePoints = useMemo(() => {
    if (safeWps.length > 1) return safeWps;
    const pts = [];
    days.forEach((d) => {
      const c = snapToWater(d.fromLat, d.fromLng, landPoly);
      if (c) pts.push(c);
    });
    const last = days[days.length - 1];
    const end = last ? snapToWater(last.toLat, last.toLng, landPoly) : null;
    if (end) pts.push(end);
    return pts;
  }, [days, landPoly, safeWps]);

  // Stops (markers) for each day start + final destination
  const stops = useMemo(() => {
    const out = [];
    days.forEach((d, i) => {
      const c = snapToWater(d.fromLat, d.fromLng, landPoly);
      if (c) out.push({ coord: c, dayIndex: i, label: d.from || `Dan ${i + 1}` });
    });
    const last = days[days.length - 1];
    const fc = last ? snapToWater(last.toLat, last.toLng, landPoly) : null;
    if (fc) out.push({ coord: fc, dayIndex: days.length - 1, label: `🏁 ${last?.to || 'Cilj'}`, isFinish: true });
    return out;
  }, [days, landPoly]);

  // Places for the active day (marinas/anchorages/restaurants/activities)
  const places = useMemo(() => {
    const list = [];
    const add = (p, kind) => {
      if (!p) return;
      const lat = p.lat ?? p.latitude ?? p.fromLat ?? p.toLat;
      const lng = p.lng ?? p.lon ?? p.longitude ?? p.fromLng ?? p.toLng;
      const c = snapToWater(lat, lng, landPoly);
      if (!c) return;
      list.push({ coord: c, kind, name: p.name || p.title || kind, raw: p });
    };
    if (!day) return list;
    add(day.marina, 'marina');
    add(day.anchorage, 'anchorage');
    add(day.restaurant, 'restaurant');
    (day.activities || []).forEach(a => add(a, 'activity'));
    return list;
  }, [day, landPoly]);

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;

    const el = document.getElementById('map');
    if (!el) return;

    const map = L.map(el, { zoomControl: false, preferCanvas: true });
    mapRef.current = map;

    L.control.zoom({ position: 'topleft' }).addTo(map);

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    });

    const seamarks = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      maxZoom: 18,
      opacity: 0.75,
      attribution: 'OpenSeaMap'
    });

    osm.addTo(map);
    seamarks.addTo(map);

    layersRef.current.base = osm;
    layersRef.current.seamarks = seamarks;

    // Default view (Adriatic)
    map.setView([44.0, 15.0], 7);
  }, []);

  // Render layers (markers + lines)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old layers
    Object.values(layersRef.current)
      .filter(l => l && l instanceof L.Layer && l !== layersRef.current.base && l !== layersRef.current.seamarks)
      .forEach(l => {
        try { map.removeLayer(l); } catch {}
      });

    // Marker icons
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

    // Route polylines
    if (showSafeRoute && safeWps.length > 1) {
      const safeLine = L.polyline(safeWps, { weight: 5, opacity: 0.9, className: 'poly-safe' });
      safeLine.addTo(map);
      layersRef.current.safeLine = safeLine;
    }

    if (showRoute && routePoints.length > 1 && safeWps.length <= 1) {
      const routeLine = L.polyline(routePoints, { weight: 3, opacity: 0.55, dashArray: '6 10', className: 'poly-route' });
      routeLine.addTo(map);
      layersRef.current.routeLine = routeLine;
    }

    // Stop markers (day starts + finish)
    const stopMarkers = [];
    stops.forEach((s) => {
      const marker = L.circleMarker(s.coord, {
        radius: s.isFinish ? 9 : 7,
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
        className: s.isFinish ? 'stop-finish' : 'stop-marker'
      }).addTo(map);

      marker.bindPopup(
        `<div style="font-family:Arial;font-weight:800;color:white;font-size:14px;background:rgba(10,22,40,0.92);padding:8px 10px;border-radius:10px;border:1px solid rgba(59,158,206,0.25)">${s.label}</div>`
      );

      stopMarkers.push(marker);
    });
    layersRef.current.stopMarkers = L.layerGroup(stopMarkers).addTo(map);

    // POI markers
    const poiMarkers = [];
    places.forEach((p) => {
      const marker = L.marker(p.coord, { icon: icons[p.kind] || icons.activity }).addTo(map);
      const title = p.name ? `<b>${p.name}</b>` : '';
      const desc = p.raw?.description ? `<div style="margin-top:6px;opacity:.9">${p.raw.description}</div>` : '';
      marker.bindPopup(`<div style="min-width:220px">${title}${desc}</div>`);
      poiMarkers.push(marker);
    });
    layersRef.current.poiMarkers = L.layerGroup(poiMarkers).addTo(map);

    // Fit bounds
    const boundsPts = (safeWps.length > 1 ? safeWps : routePoints).concat(stops.map(s => s.coord)).concat(places.map(p => p.coord));
    if (boundsPts.length > 1) {
      const b = L.latLngBounds(boundsPts);
      map.fitBounds(b.pad(0.2));
    } else if (boundsPts.length === 1) {
      map.setView(boundsPts[0], 12);
    }

    // Debug: show land polygon outline
    if (showDebug && landPoly) {
      const landLayer = L.geoJSON(landPoly, { style: { weight: 1, opacity: 0.5 } }).addTo(map);
      layersRef.current.landLayer = landLayer;
    }
  }, [activeDay, itinerary, landPoly, places, routePoints, safeWps, showDebug, showRoute, showSafeRoute, stops]);

  return <div id="map" style={{ width: '100%', height: '100%' }} />;
}
