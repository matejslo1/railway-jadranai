/**
 * Jadran AI — Safe Routing Service
 *
 * Approach: graph of known-safe Adriatic nautical waypoints.
 * world-atlas land-50m does NOT include Dalmatian islands reliably,
 * so A* on a raw grid fails. Instead we route through a hand-crafted
 * graph of waypoints that follow real sailing channels.
 *
 * Channels covered:
 *   - Splitski / Brački kanal
 *   - Hvarski kanal
 *   - Korčulanski kanal
 *   - Pelješki kanal
 *   - Viški kanal
 *   - Lastovski kanal
 *   - Open Adriatic (west of islands)
 *   - Northern Dalmatia (Šibenik, Zadar)
 *   - Dubrovnik / Elafiti
 */

// ─── Waypoint definitions [lat, lng] ─────────────────────────────────────────
const WP = {
  // Open Adriatic west corridor
  OA1:  [43.10, 15.80],
  OA2:  [43.30, 15.90],
  OA3:  [43.50, 15.80],
  OA4:  [43.70, 15.70],
  OA5:  [43.90, 15.60],
  OA6:  [44.10, 15.50],
  OA7:  [44.30, 15.40],
  OA8:  [43.95, 15.30],
  OA9:  [43.70, 15.40],

  // Vis island
  VIS_W:   [43.06, 16.00],
  VIS_N:   [43.10, 16.10],
  VIS_E:   [43.06, 16.30],
  VIS_S:   [43.00, 16.15],
  KOM:     [43.05, 16.08],

  // Viški kanal (Vis - Hvar)
  VK1:  [43.15, 16.20],
  VK2:  [43.20, 16.35],
  VK3:  [43.25, 16.50],

  // Hvar island
  HVAR_W:  [43.17, 16.38],
  HVAR_T:  [43.17, 16.44],
  HVAR_E:  [43.18, 16.65],
  HVAR_N:  [43.23, 16.50],
  SUCURAJ: [43.13, 17.19],

  // Hvarski kanal (Hvar - Brač)
  HK1:  [43.27, 16.50],
  HK2:  [43.33, 16.65],
  HK3:  [43.37, 16.80],
  HK4:  [43.37, 17.00],

  // Brač island
  BRAC_W:  [43.32, 16.38],
  BRAC_SW: [43.28, 16.42],
  BRAC_S:  [43.27, 16.65],
  BOL:     [43.26, 16.65],
  BRAC_E:  [43.32, 17.00],
  BRAC_N:  [43.38, 16.75],

  // Splitski kanal
  SPK1: [43.44, 16.38],
  SPK2: [43.46, 16.55],
  SPK3: [43.48, 16.68],
  SPK4: [43.50, 16.82],

  // Brački kanal / Šolta
  BRK1: [43.42, 16.25],
  BRK2: [43.45, 16.42],

  // Split & Trogir
  SPLIT:   [43.51, 16.44],
  SPLIT_S: [43.47, 16.44],
  TROG:    [43.52, 16.25],
  TROG_W:  [43.50, 16.18],

  // Šolta
  SOLTA_N: [43.40, 16.28],
  SOLTA_S: [43.35, 16.28],
  ROGAC:   [43.40, 16.30],

  // Makarska riviera
  BASKA:  [43.36, 16.95],
  MAK:    [43.30, 17.02],
  MAK_S:  [43.18, 17.10],

  // Korčula island
  KOR_W:  [42.97, 16.68],
  KOR_T:  [42.96, 17.13],
  KOR_E:  [42.97, 17.35],
  KOR_N:  [43.03, 17.00],
  KOR_S:  [42.92, 17.00],

  // Korčulanski kanal (Korčula - Pelješac)
  KK1: [43.00, 16.80],
  KK2: [43.02, 17.00],
  KK3: [43.03, 17.15],
  KK4: [43.02, 17.30],

  // Pelješac
  PEL_N1: [43.00, 17.30],
  PEL_N2: [43.02, 17.50],
  OREBIC: [42.98, 17.18],
  TRPANJ: [43.01, 17.27],

  // Pelješki kanal (Pelješac - mainland)
  PK1: [43.05, 17.30],
  PK2: [43.07, 17.50],
  PK3: [43.07, 17.65],

  // Ploče / Neretva
  PLOCE: [43.05, 17.43],
  NER1:  [43.02, 17.55],
  NER2:  [43.00, 17.68],

  // Mljet
  MLJ_W: [42.78, 17.30],
  MLJ_N: [42.83, 17.55],
  MLJ_E: [42.78, 17.75],

  // Lastovo
  LAST_N: [42.78, 16.88],
  LAST_S: [42.73, 16.90],

  // Lastovski kanal
  LK1: [42.88, 16.88],
  LK2: [42.85, 17.10],

  // Dubrovnik & Elafiti
  DBK_N:  [42.68, 18.05],
  DBK:    [42.65, 18.08],
  DBK_W:  [42.65, 17.90],
  DBK_S:  [42.58, 18.10],
  CAVTAT: [42.58, 18.22],
  ELAF_N: [42.72, 17.95],
  ELAF_S: [42.65, 17.85],
  SIPAN:  [42.73, 17.87],
  LOPUD:  [42.68, 17.93],

  // Šibenik
  SIB:    [43.74, 15.90],
  SIB_W:  [43.70, 15.80],
  SIB_S:  [43.65, 15.90],

  // Zadar
  ZAD:    [44.12, 15.23],
  ZAD_S:  [44.00, 15.20],
  ZAD_W:  [44.10, 15.10],
  ZAD_CH: [44.05, 15.30],
  UGL_W:  [44.08, 15.10],
  UGL_S:  [43.90, 15.20],
};

// ─── Graph edges (clear water between each pair) ─────────────────────────────
const EDGES = [
  // Open Adriatic corridor
  ['OA1','OA2'],['OA2','OA3'],['OA3','OA4'],['OA4','OA5'],
  ['OA5','OA6'],['OA6','OA7'],['OA7','ZAD_W'],['OA7','OA8'],
  ['OA8','OA9'],['OA9','OA3'],['OA9','OA4'],
  ['OA5','SIB_W'],['OA6','SIB_W'],

  // Vis
  ['OA1','VIS_S'],['OA1','VIS_W'],['OA2','VIS_N'],['OA2','VIS_W'],
  ['VIS_W','KOM'],['VIS_W','VIS_N'],['VIS_N','VIS_E'],['VIS_E','VK2'],
  ['KOM','VIS_W'],['VIS_N','VK1'],['VIS_E','VK3'],
  ['VIS_S','OA1'],['VIS_S','LAST_N'],

  // Viški kanal
  ['VK1','VK2'],['VK2','VK3'],['VK3','HVAR_E'],
  ['VK1','HVAR_W'],['VK2','HVAR_T'],

  // Hvar
  ['HVAR_W','HVAR_T'],['HVAR_T','HVAR_E'],['HVAR_E','SUCURAJ'],
  ['HVAR_W','OA3'],['HVAR_N','HK1'],
  ['HVAR_T','HVAR_N'],['HVAR_E','HK2'],

  // Hvarski kanal
  ['HK1','HK2'],['HK2','HK3'],['HK3','HK4'],
  ['HK1','BRAC_S'],['HK2','BOL'],['HK3','BRAC_E'],
  ['HK1','HVAR_N'],['HK2','HVAR_E'],
  ['SUCURAJ','HK4'],['HK4','MAK_S'],

  // Brač
  ['BRAC_W','BRAC_SW'],['BRAC_SW','BRAC_S'],['BRAC_S','BOL'],
  ['BOL','BRAC_E'],['BRAC_W','BRK1'],['BRAC_SW','SPK1'],
  ['BRAC_E','HK4'],['BRAC_N','HK3'],['BRAC_N','SPK3'],

  // Splitski kanal
  ['SPLIT_S','SPK1'],['SPK1','SPK2'],['SPK2','SPK3'],['SPK3','SPK4'],
  ['SPK1','BRAC_SW'],['SPK2','BRAC_S'],['SPK3','BOL'],
  ['SPLIT','SPLIT_S'],['SPLIT','SPK2'],
  ['SPK4','BASKA'],['SPK4','MAK'],

  // Brački kanal / Šolta
  ['TROG','BRK1'],['BRK1','BRK2'],['BRK2','SOLTA_N'],
  ['SOLTA_N','ROGAC'],['SOLTA_N','OA4'],['SOLTA_S','OA3'],
  ['ROGAC','SPLIT'],['BRK1','OA4'],

  // Split / Trogir
  ['SPLIT','TROG'],['SPLIT','SIB_S'],['SPLIT','BASKA'],
  ['TROG','TROG_W'],['TROG_W','OA5'],

  // Makarska
  ['BASKA','MAK'],['MAK','MAK_S'],['MAK_S','HK4'],['MAK','SPLIT'],
  ['MAK','BRAC_E'],

  // Šibenik
  ['SIB','SIB_W'],['SIB_W','OA5'],['SIB_W','OA6'],
  ['SIB','SIB_S'],['SIB_S','TROG'],['SIB_W','ZAD_S'],

  // Zadar
  ['ZAD','ZAD_S'],['ZAD','ZAD_W'],['ZAD','ZAD_CH'],
  ['ZAD_W','OA7'],['ZAD_S','SIB_W'],['ZAD_CH','UGL_W'],
  ['UGL_W','OA7'],['UGL_S','OA6'],

  // Korčula
  ['KOR_W','KK1'],['KOR_W','OA2'],
  ['KK1','KK2'],['KK2','KK3'],['KK3','KK4'],
  ['KK2','KOR_N'],['KK3','KOR_T'],['KK4','KOR_E'],
  ['KOR_N','KOR_W'],['KOR_T','KOR_E'],
  ['KOR_S','MLJ_N'],['KOR_S','LAST_N'],
  ['KOR_W','LK1'],['KOR_E','NER1'],
  ['KOR_W','HK1'],['KOR_N','HK2'],

  // Pelješac
  ['KK3','PEL_N1'],['KK4','PEL_N2'],
  ['PEL_N1','OREBIC'],['OREBIC','KOR_T'],
  ['PEL_N2','TRPANJ'],['TRPANJ','PEL_N1'],
  ['PEL_N2','PK1'],['PK1','PLOCE'],['PK2','NER1'],
  ['PLOCE','PK2'],['PK2','PK3'],['PK3','NER2'],

  // Neretva / Ploče
  ['PLOCE','NER1'],['NER1','NER2'],['NER2','DBK_W'],
  ['NER2','PK3'],

  // Mljet
  ['MLJ_W','MLJ_N'],['MLJ_N','MLJ_E'],
  ['MLJ_W','KOR_S'],['MLJ_W','LK2'],
  ['MLJ_N','ELAF_N'],['MLJ_E','DBK_W'],
  ['MLJ_E','ELAF_S'],

  // Lastovo
  ['LAST_N','LAST_S'],['LAST_N','LK1'],['LAST_S','OA1'],
  ['LK1','LK2'],['LK2','MLJ_W'],
  ['LK1','KOR_S'],

  // Elafiti / Dubrovnik
  ['ELAF_N','SIPAN'],['SIPAN','LOPUD'],['LOPUD','ELAF_S'],
  ['ELAF_N','DBK_N'],['ELAF_S','DBK_W'],['ELAF_S','DBK'],
  ['DBK_N','DBK'],['DBK','DBK_W'],['DBK','DBK_S'],
  ['DBK_S','CAVTAT'],['DBK_W','NER2'],

  // Open water cross connections
  ['OA2','KOR_W'],['OA1','LAST_N'],
  ['OA3','VIS_N'],['OA3','SOLTA_S'],
  ['OA4','BRAC_W'],['OA5','TROG_W'],
];

// Build adjacency list
const GRAPH = {};
for (const id of Object.keys(WP)) GRAPH[id] = [];
for (const [a, b] of EDGES) {
  if (GRAPH[a] && GRAPH[b]) {
    GRAPH[a].push(b);
    GRAPH[b].push(a);
  }
}

// ─── Haversine (no external deps) ────────────────────────────────────────────
function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b[0]-a[0]) * Math.PI/180;
  const dLng = (b[1]-a[1]) * Math.PI/180;
  const s = Math.sin(dLat/2)**2 +
    Math.cos(a[0]*Math.PI/180) * Math.cos(b[0]*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}

// ─── Nearest graph node ───────────────────────────────────────────────────────
function nearestNode(lat, lng) {
  let best = null, bestDist = Infinity;
  for (const [id, coord] of Object.entries(WP)) {
    const d = haversineKm([lat,lng], coord);
    if (d < bestDist) { bestDist = d; best = id; }
  }
  return best;
}

// ─── A* on waypoint graph ─────────────────────────────────────────────────────
function graphAStar(startId, goalId) {
  if (startId === goalId) return [startId];

  const open = new Map();
  const gScore = new Map();
  const cameFrom = new Map();

  gScore.set(startId, 0);
  open.set(startId, haversineKm(WP[startId], WP[goalId]));

  const getLowest = () => {
    let best = null, bestF = Infinity;
    for (const [k,f] of open) if (f < bestF) { bestF = f; best = k; }
    return best;
  };

  let iter = 0;
  while (open.size > 0 && iter++ < 10000) {
    const cur = getLowest();
    if (!cur) break;
    if (cur === goalId) {
      const path = [cur];
      let c = cur;
      while (cameFrom.has(c)) { c = cameFrom.get(c); path.push(c); }
      return path.reverse();
    }
    open.delete(cur);
    for (const nb of (GRAPH[cur] || [])) {
      const g = (gScore.get(cur) ?? Infinity) + haversineKm(WP[cur], WP[nb]);
      if (g < (gScore.get(nb) ?? Infinity)) {
        cameFrom.set(nb, cur);
        gScore.set(nb, g);
        open.set(nb, g + haversineKm(WP[nb], WP[goalId]));
      }
    }
  }
  return null;
}

// ─── Build safe leg ───────────────────────────────────────────────────────────
function buildSafeLeg(from, to) {
  const distKm = haversineKm(from, to);
  if (distKm < 4) return [];

  const startId = nearestNode(from[0], from[1]);
  const goalId  = nearestNode(to[0],   to[1]);

  // If both snap to same node, no waypoints needed
  if (startId === goalId) return [];

  const path = graphAStar(startId, goalId);
  if (!path || path.length < 1) return [];

  // Return ALL graph nodes on the path as waypoints
  // This ensures every segment goes through known-safe water
  // We include start and end graph nodes so even the first/last
  // segments from/to the actual coordinates go via the graph nodes
  const result = path.map(id => ({ lat: WP[id][0], lng: WP[id][1] }));
  return result;
}

// ─── Main export ──────────────────────────────────────────────────────────────
function generateSafeRouteLegs(days) {
  return (days || []).map(d => {
    const from = [Number(d.fromLat), Number(d.fromLng)];
    const to   = [Number(d.toLat),   Number(d.toLng)];

    const waypoints = buildSafeLeg(from, to).map((w, idx) => ({
      lat: Number(w.lat.toFixed(5)),
      lng: Number(w.lng.toFixed(5)),
      note: idx === 0 ? 'safe route' : '',
    }));

    return { day: d.day, from: d.from, to: d.to, waypoints };
  });
}

module.exports = { generateSafeRouteLegs };
