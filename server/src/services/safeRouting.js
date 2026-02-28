const { point, lineString, featureCollection } = require('@turf/helpers');
const booleanIntersects = require('@turf/boolean-intersects').default || require('@turf/boolean-intersects');
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default || require('@turf/boolean-point-in-polygon');
const bbox = require('@turf/bbox').default || require('@turf/bbox');
const buffer = require('@turf/buffer').default || require('@turf/buffer');
const lineIntersect = require('@turf/line-intersect').default || require('@turf/line-intersect');

// Deterministic water-safe routing (Adriatic MVP)
// Goal: never draw a segment that crosses land.
// Implementation: A* over a water grid constrained by a buffered landmask.
// NOTE: This is NOT an official nautical router (no ENC/bathymetry), but it reliably avoids coastline/islands.

const topojson = require('topojson-client');

// Natural Earth land polygons via world-atlas TopoJSON.
// Prefer 50m; fall back to 110m.
let land;
try {
  const landTopo = require('world-atlas/land-50m.json');
  land = topojson.feature(landTopo, landTopo.objects.land);
} catch (e) {
  const landTopo = require('world-atlas/land-110m.json');
  land = topojson.feature(landTopo, landTopo.objects.land);
}

// Buffer land a bit so routes don't "scrape" the coastline.
// 0.2 km works well as a conservative default for plotting.
const LAND_BUFFER_KM = Number(process.env.LAND_BUFFER_KM || 0.2);
const landBuffered = buffer(land, LAND_BUFFER_KM, { units: 'kilometers' });

function mkPoint(lat, lng) {
  return point([lng, lat]);
}

function isOnLand(lat, lng) {
  return booleanPointInPolygon(mkPoint(lat, lng), landBuffered);
}

function crossesLand(a, b) {
  const seg = lineString([[a[1], a[0]], [b[1], b[0]]]); // [lng,lat]
  return booleanIntersects(seg, landBuffered);
}

function clampAdriatic(lat, lng) {
  // broad Adriatic bounds (avoid runaway search)
  const clat = Math.min(46.2, Math.max(41.2, lat));
  const clng = Math.min(20.0, Math.max(12.0, lng));
  return [clat, clng];
}

function haversineKm(a, b) {
  const R = 6371; // km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}


function key(lat, lng) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function neighbors(lat, lng, dLat, dLng) {
  // 8-connected grid
  const res = [];
  for (const dl of [-1, 0, 1]) {
    for (const dn of [-1, 0, 1]) {
      if (dl === 0 && dn === 0) continue;
      res.push([lat + dl * dLat, lng + dn * dLng]);
    }
  }
  return res;
}

function aStarWaterRoute(from, to, debugOut) {
  // Build a limited search window around the leg
  const distKm = haversineKm(from, to);

  // grid step: shorter legs = finer grid
  const stepKm = distKm < 20 ? 0.4 : distKm < 60 ? 0.7 : 1.0;
  // rough conversion km -> degrees (lat). lng depends on latitude; adjust by cos(lat)
  const dLat = stepKm / 111.0;
  const meanLat = (from[0] + to[0]) / 2;
  const dLng = stepKm / (111.0 * Math.cos((meanLat * Math.PI) / 180) || 1);

  // expand bbox
  const padLat = Math.max(dLat * 20, 0.08);
  const padLng = Math.max(dLng * 20, 0.12);

  const minLat = Math.min(from[0], to[0]) - padLat;
  const maxLat = Math.max(from[0], to[0]) + padLat;
  const minLng = Math.min(from[1], to[1]) - padLng;
  const maxLng = Math.max(from[1], to[1]) + padLng;

  if (debugOut) {
    debugOut.meta = {
      stepKm,
      dLat,
      dLng,
      bbox: { minLat, maxLat, minLng, maxLng },
      landBufferKm: LAND_BUFFER_KM,
    };
    debugOut.explored = [];
    debugOut.blocked = [];
  }


  // Snap function to grid
  const snap = (lat, lng) => {
    const slat = Math.round((lat - minLat) / dLat) * dLat + minLat;
    const slng = Math.round((lng - minLng) / dLng) * dLng + minLng;
    return clampAdriatic(slat, slng);
  };

  const start = snap(from[0], from[1]);
  const goal = snap(to[0], to[1]);

  // If endpoints are on land due to buffer, nudge them slightly seawards by relaxing buffer for endpoints.
  // (But usually from/to are ports so they can be close to land.)
  const startOnLand = isOnLand(start[0], start[1]);
  const goalOnLand = isOnLand(goal[0], goal[1]);
  if (startOnLand || goalOnLand) {
    // Try a few nearby snaps
    const tryNudge = (p) => {
      const [lat, lng] = p;
      for (let r = 1; r <= 6; r++) {
        for (const nb of neighbors(lat, lng, dLat, dLng)) {
          const c = clampAdriatic(nb[0], nb[1]);
          if (!isOnLand(c[0], c[1])) return c;
        }
      }
      return p;
    };
    if (startOnLand) {
      const nudged = tryNudge(start);
      start[0] = nudged[0];
      start[1] = nudged[1];
    }
    if (goalOnLand) {
      const nudged = tryNudge(goal);
      goal[0] = nudged[0];
      goal[1] = nudged[1];
    }
  }

  // A* data
  const open = new Map(); // key -> f
  const gScore = new Map();
  const fScore = new Map();
  const cameFrom = new Map();

  const startK = key(start[0], start[1]);
  const goalK = key(goal[0], goal[1]);

  gScore.set(startK, 0);
  fScore.set(startK, haversineKm(start, goal));
  open.set(startK, fScore.get(startK));

  const maxIterations = Math.min(120000, Math.floor(5000 + distKm * 600));
  let iter = 0;

  const getLowestOpen = () => {
    let bestK = null;
    let bestF = Infinity;
    for (const [k, f] of open.entries()) {
      if (f < bestF) {
        bestF = f;
        bestK = k;
      }
    }
    return bestK;
  };

  const parseK = (k) => k.split(',').map(Number);

  while (open.size > 0 && iter++ < maxIterations) {
    const currentK = getLowestOpen();
    if (!currentK) break;
    if (currentK === goalK) {
      // reconstruct
      const path = [goal];
      let ck = currentK;
      while (cameFrom.has(ck)) {
        ck = cameFrom.get(ck);
        const [clat, clng] = parseK(ck);
        path.push([clat, clng]);
      }
      path.reverse();
      if (debugOut) {
        debugOut.found = true;
        debugOut.iterations = iter;
        debugOut.path = path;
      }
      return path;
    }

    open.delete(currentK);
    const [clat, clng] = parseK(currentK);
    if (debugOut && debugOut.explored.length < 2000) debugOut.explored.push([clat, clng]);

    for (const nbRaw of neighbors(clat, clng, dLat, dLng)) {
      const nb = clampAdriatic(nbRaw[0], nbRaw[1]);
      if (nb[0] < minLat || nb[0] > maxLat || nb[1] < minLng || nb[1] > maxLng) {
        if (debugOut && debugOut.blocked.length < 1000) debugOut.blocked.push([nb[0], nb[1]]);
        continue;
      }
      if (isOnLand(nb[0], nb[1])) {
        if (debugOut && debugOut.blocked.length < 1000) debugOut.blocked.push([nb[0], nb[1]]);
        continue;
      }
      // Prevent edges crossing land too
      if (crossesLand([clat, clng], nb)) {
        if (debugOut && debugOut.blocked.length < 1000) debugOut.blocked.push([nb[0], nb[1]]);
        continue;
      }

      const nbK = key(nb[0], nb[1]);
      const tentativeG = (gScore.get(currentK) ?? Infinity) + haversineKm([clat, clng], nb);

      if (tentativeG < (gScore.get(nbK) ?? Infinity)) {
        cameFrom.set(nbK, currentK);
        gScore.set(nbK, tentativeG);
        const h = haversineKm(nb, goal);
        const f = tentativeG + h;
        fScore.set(nbK, f);
        open.set(nbK, f);
      }
    }
  }

  if (debugOut) { debugOut.found = false; debugOut.iterations = iter; }
  return null;
}

function rdpSimplify(points, epsDeg) {
  if (!points || points.length < 3) return points;
  const sq = (x) => x * x;
  const distToSegSq = (p, a, b) => {
    // p,a,b are [lat,lng]
    const x = p[1], y = p[0];
    const x1 = a[1], y1 = a[0];
    const x2 = b[1], y2 = b[0];
    const dx = x2 - x1, dy = y2 - y1;
    if (dx === 0 && dy === 0) return sq(x - x1) + sq(y - y1);
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    const tt = Math.max(0, Math.min(1, t));
    const xx = x1 + tt * dx;
    const yy = y1 + tt * dy;
    return sq(x - xx) + sq(y - yy);
  };

  const epsSq = epsDeg * epsDeg;

  const recur = (pts) => {
    if (pts.length < 3) return pts;
    const a = pts[0];
    const b = pts[pts.length - 1];
    let idx = -1;
    let best = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = distToSegSq(pts[i], a, b);
      if (d > best) {
        best = d;
        idx = i;
      }
    }
    if (best <= epsSq) return [a, b];
    const left = recur(pts.slice(0, idx + 1));
    const right = recur(pts.slice(idx));
    return left.slice(0, -1).concat(right);
  };

  return recur(points);
}

function simplifyAndSmooth(path) {
  if (!path || path.length < 3) return path;

  // Simplify to reduce point count; keep it conservative.
  // epsDeg roughly: 0.002 ~ 200m at mid-latitudes
  const simplified = rdpSimplify(path, 0.002);

  // Ensure no segment crosses land after simplify; if it does, keep original.
  for (let i = 0; i < simplified.length - 1; i++) {
    if (crossesLand(simplified[i], simplified[i + 1])) return path;
  }
  return simplified;
}

function buildSafeLeg(from, to, opts = {}) {
  // If direct is safe, still return a lightly smoothed path (3 points) for nicer visuals
  if (!crossesLand(from, to) && !isOnLand(from[0], from[1]) && !isOnLand(to[0], to[1])) {
    const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    // tiny offset to avoid perfect straight line
    const dx = to[1] - from[1];
    const dy = to[0] - from[0];
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const off = 0.01;
    const mid2 = clampAdriatic(mid[0] + off * py, mid[1] + off * px);
    const wps = [mid2];
    if (opts.debug) {
      return { wps, debug: { meta: { direct: true, landBufferKm: LAND_BUFFER_KM } } };
    }
    return wps;
  }

  const dbg = opts.debug ? {} : null;
  const path = aStarWaterRoute(from, to, dbg);
  if (!path) {
    // No water-only path found within limits.
    if (opts.debug) return { wps: [], debug: dbg || { found: false } };
    return [];
  }

  const smooth = simplifyAndSmooth(path);

  // Return waypoints excluding endpoints
  const inner = smooth.slice(1, -1);
  // Guarantee at least 1 waypoint
  let wps = inner;
  if (wps.length === 0) wps = [[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]];
  if (opts.debug) {
    return { wps, debug: dbg };
  }
  return wps;
}

function generateSafeRouteLegs(days, opts = {}) {
  return (days || []).map(d => {
    const from = [Number(d.fromLat), Number(d.fromLng)];
    const to = [Number(d.toLat), Number(d.toLng)];

    try {
      const built = buildSafeLeg(from, to, opts);
      const wpsCoords = Array.isArray(built) ? built : (built.wps || []);
      const debug = (!Array.isArray(built) && built.debug) ? built.debug : null;
      const failed = (wpsCoords.length === 0) && crossesLand(from, to);

      const waypoints = wpsCoords.map((c, idx) => ({
        lat: Number(c[0].toFixed(5)),
        lng: Number(c[1].toFixed(5)),
        note: idx === 0 ? 'safe route' : ''
      }));

      const out = { day: d.day, from: d.from, to: d.to, waypoints, failed };
      if (opts && opts.debug) out.debug = debug;
      return out;
    } catch (err) {
      // Never crash the whole request because of one leg — report failure instead.
      const out = { day: d.day, from: d.from, to: d.to, waypoints: [], failed: true, error: String(err?.message || err) };
      if (opts && opts.debug) out.debug = { error: out.error };
      return out;
    }
  });
}

module.exports = { generateSafeRouteLegs };