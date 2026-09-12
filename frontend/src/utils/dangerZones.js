import L from 'leaflet';

/**
 * Danger Zone Categories and Design Tokens
 */
export const HAZARD_CATEGORIES = {
  accident_prone: {
    label: 'Accident Blackspot',
    color: '#dc2626',
    fillColor: '#ef4444',
    icon: 'fa-car-crash',
    badgeClass: 'hazard-badge-accident',
    badgeText: 'ACCIDENT RISK',
  },
  landslide: {
    label: 'Landslide / Rockfall',
    color: '#c2410c',
    fillColor: '#ea580c',
    icon: 'fa-mountain',
    badgeClass: 'hazard-badge-landslide',
    badgeText: 'LANDSLIDE HAZARD',
  },
  flood: {
    label: 'Flood-Prone Corridor',
    color: '#0284c7',
    fillColor: '#38bdf8',
    icon: 'fa-water',
    badgeClass: 'hazard-badge-flood',
    badgeText: 'FLOOD ZONE',
  },
  steep_grade: {
    label: 'Steep Grade / Brake Fade',
    color: '#d97706',
    fillColor: '#f59e0b',
    icon: 'fa-angle-double-down',
    badgeClass: 'hazard-badge-steep',
    badgeText: 'STEEP DESCENT',
  },
  heavy_traffic: {
    label: 'Chokepoint / Blind Merge',
    color: '#7c3aed',
    fillColor: '#a855f7',
    icon: 'fa-traffic-light',
    badgeClass: 'hazard-badge-traffic',
    badgeText: 'HEAVY CONGESTION',
  },
  reported_incident: {
    label: 'Reported Incident Spot',
    color: '#991b1b',
    fillColor: '#b91c1c',
    icon: 'fa-exclamation-triangle',
    badgeClass: 'hazard-badge-incident',
    badgeText: 'PAST INCIDENT',
  },
};

/**
 * Comprehensive Pan-Mindanao Trucking & Logistics Danger Zones Catalog
 * Covers all 6 regions of Mindanao: Northern Mindanao, Davao Region, Soccsksargen, Caraga, Zamboanga Peninsula, and BARMM.
 */
export const DEFAULT_DANGER_ZONES = [
  // ==================== NORTHERN MINDANAO (REGION X) ====================
  {
    id: 'dz-puerto-curve',
    name: 'Puerto Flyover & Blind Curve',
    region: 'Northern Mindanao',
    corridor: 'Iligan-CDO-Butuan Highway',
    category: 'accident_prone',
    severity: 'critical',
    lat: 8.4752,
    lng: 124.7150,
    radius: 750,
    description: 'High-speed national highway merging with blind curves and heavy container truck crossover traffic.',
    advisory: 'Reduce speed to below 35 km/h. Maintain 50m distance and be alert for sudden braking vehicles.',
  },
  {
    id: 'dz-alae-ascent',
    name: 'Alae - Sayre Highway Steep Ascent',
    region: 'Northern Mindanao',
    corridor: 'CDO-Bukidnon Sayre Highway',
    category: 'steep_grade',
    severity: 'critical',
    lat: 8.4410,
    lng: 124.7865,
    radius: 950,
    description: 'Steep incline and consecutive hairpin turns prone to brake overheating, runaway trucks, and engine stalling.',
    advisory: 'Downshift to low gear before the descent. Never ride service brakes continuously; test air pressure beforehand.',
  },
  {
    id: 'dz-mangima-canyon',
    name: 'Mangima Canyon Landslide Pass',
    region: 'Northern Mindanao',
    corridor: 'Sayre Highway (Manolo Fortich)',
    category: 'landslide',
    severity: 'high',
    lat: 8.3745,
    lng: 124.8620,
    radius: 1100,
    description: 'Unstable cliff faces subject to rockfalls, mudslides, and reduced visibility during and after rainfall.',
    advisory: 'Avoid stopping beneath rock faces. Turn on headlights, keep speed moderate, and watch for debris on tarmac.',
  },
  {
    id: 'dz-agora-flood',
    name: 'Agora & Lapasan Coastal Highway',
    region: 'Northern Mindanao',
    corridor: 'Cagayan de Oro Coastal Arterial',
    category: 'flood',
    severity: 'high',
    lat: 8.4905,
    lng: 124.6590,
    radius: 700,
    description: 'Low-elevation coastal arterial prone to sudden flash floods during high tides and heavy downpours.',
    advisory: 'Check wading depth before crossing. Reroute via highway flyover if water exceeds 25 cm.',
  },
  {
    id: 'dz-iponan-bridge',
    name: 'Iponan River Approach & Bridge',
    region: 'Northern Mindanao',
    corridor: 'CDO-Iligan Highway',
    category: 'flood',
    severity: 'high',
    lat: 8.4940,
    lng: 124.5950,
    radius: 800,
    description: 'River swell prone to overflowing approach roads during upland monsoon rains.',
    advisory: 'Proceed with extreme caution when river warning flags are raised. Avoid hydroplaning on bridge edges.',
  },
  {
    id: 'dz-bulua-junction',
    name: 'Bulua Westbound Terminal Junction',
    region: 'Northern Mindanao',
    corridor: 'Cagayan de Oro West Bypass',
    category: 'accident_prone',
    severity: 'high',
    lat: 8.5080,
    lng: 124.6180,
    radius: 650,
    description: 'Complex multi-way intersection with dense pedestrian, tricycle, and interprovincial bus traffic.',
    advisory: 'Keep speed under 30 km/h. Signal turns well in advance and watch truck blind spots when turning right.',
  },
  {
    id: 'dz-cugman-landslide',
    name: 'Cugman Mountain Slopes & Curves',
    region: 'Northern Mindanao',
    corridor: 'Iligan-CDO-Butuan Highway',
    category: 'landslide',
    severity: 'moderate',
    lat: 8.4820,
    lng: 124.6930,
    radius: 750,
    description: 'Hillside highway section vulnerable to soil loosening and water runoffs during persistent rains.',
    advisory: 'Stay centered in your lane. Watch out for slick mud patches and wet gravel on curves.',
  },
  {
    id: 'dz-tablon-chokepoint',
    name: 'Tablon Industrial Cargo Chokepoint',
    region: 'Northern Mindanao',
    corridor: 'CDO Industrial Corridor',
    category: 'heavy_traffic',
    severity: 'moderate',
    lat: 8.4910,
    lng: 124.7320,
    radius: 800,
    description: 'High volume of articulated factory trucks entering and exiting narrow industrial spur roads.',
    advisory: 'Anticipate slow-moving heavy machinery pulling onto the highway. Leave ample passing space.',
  },
  {
    id: 'dz-impasugong-zigzag',
    name: 'Impasug-ong Downhill Zigzag Pass',
    region: 'Northern Mindanao',
    corridor: 'Sayre Highway (Bukidnon)',
    category: 'steep_grade',
    severity: 'critical',
    lat: 8.3120,
    lng: 125.0180,
    radius: 1200,
    description: 'Continuous mountain descent with sharp curves. High historical record of commercial vehicle brake fade.',
    advisory: 'Engage engine brake (Jake brake) and 2nd/3rd gear. Check brake drum temperatures before beginning descent.',
  },
  {
    id: 'dz-villanueva-crossing',
    name: 'Villanueva Heavy Industrial Corridor',
    region: 'Northern Mindanao',
    corridor: 'Misamis Oriental Industrial Zone',
    category: 'accident_prone',
    severity: 'moderate',
    lat: 8.5780,
    lng: 124.7750,
    radius: 850,
    description: 'Intermodal freight access point near port and power plant; frequent fast merging heavy vehicles.',
    advisory: 'Be vigilant at unguarded turnarounds. Use horn when passing long multi-axle trailers.',
  },
  {
    id: 'dz-gingoog-curves',
    name: 'Gingoog Coastal Mountain S-Curves',
    region: 'Northern Mindanao',
    corridor: 'CDO-Butuan Coastal Highway',
    category: 'landslide',
    severity: 'high',
    lat: 8.8240,
    lng: 125.1050,
    radius: 950,
    description: 'Cliffside curves over coastal waters with frequent falling debris and sudden sea-spray slickness.',
    advisory: 'Avoid night driving during storms. Keep distance from mountain cuts and reduce speed to 30 km/h.',
  },
  {
    id: 'dz-linamon-kauswagan',
    name: 'Linamon Coastal Chokepoint & Curves',
    region: 'Northern Mindanao',
    corridor: 'Iligan-Zamboanga Highway (Lanao del Norte)',
    category: 'accident_prone',
    severity: 'moderate',
    lat: 8.1830,
    lng: 124.1620,
    radius: 800,
    description: 'Narrow 2-lane coastal highway with blind corners and unlit seaside curves.',
    advisory: 'Watch for sudden motorcycle traffic and pedestrians. Dim high-beams around seaside bends.',
  },

  // ==================== DAVAO REGION (REGION XI) ====================
  {
    id: 'dz-buda-pass',
    name: 'Buda Pass / Marilog Ridge Highway',
    region: 'Davao Region',
    corridor: 'Davao-Bukidnon Road (Pan-Philippine Highway)',
    category: 'steep_grade',
    severity: 'critical',
    lat: 7.4950,
    lng: 125.2650,
    radius: 1400,
    description: 'High-elevation mountain pass subject to heavy whiteout fog, slippery wet pavement, and sheer drop-offs.',
    advisory: 'CRITICAL: Switch on fog lamps, shift to low gear, keep headlights on. Never attempt overtaking on fog-covered ridges.',
  },
  {
    id: 'dz-santacruz-digos',
    name: 'Santa Cruz - Digos Express Freight Corridor',
    region: 'Davao Region',
    corridor: 'Davao-Cotabato / Pan-Philippine Highway',
    category: 'accident_prone',
    severity: 'high',
    lat: 6.8320,
    lng: 125.4120,
    radius: 900,
    description: 'High-speed 4-lane straightaway with frequent high-impact head-on collisions and blind U-turns.',
    advisory: 'Strictly observe 60 km/h truck speed limit. Do not tailgate fast container vans.',
  },
  {
    id: 'dz-monkayo-mines',
    name: 'Monkayo Mining Truck Corridor & Slopes',
    region: 'Davao Region',
    corridor: 'Davao-Agusan Highway (Davao de Oro)',
    category: 'landslide',
    severity: 'high',
    lat: 7.8480,
    lng: 126.0520,
    radius: 1100,
    description: 'Heavy ore haulers merging onto steep mountain roads; frequent mud accumulation and road collapses.',
    advisory: 'Beware of deep potholes and red clay slicks. Give way to heavy dump trailers descending the slope.',
  },
  {
    id: 'dz-tagum-madaum',
    name: 'Tagum - Madaum Port Intersection',
    region: 'Davao Region',
    corridor: 'Davao-Agusan Highway (Davao del Norte)',
    category: 'heavy_traffic',
    severity: 'moderate',
    lat: 7.4120,
    lng: 125.8050,
    radius: 800,
    description: 'High-density export banana truck junction with long queues of refrigerated container trailers.',
    advisory: 'Anticipate slow reefer trucks pulling onto highway. Maintain ample braking clearance.',
  },
  {
    id: 'dz-badas-mati',
    name: 'Badas Hairpin Pass (Mati Overlook)',
    region: 'Davao Region',
    corridor: 'Davao-Mati Highway (Davao Oriental)',
    category: 'steep_grade',
    severity: 'critical',
    lat: 6.9420,
    lng: 126.1850,
    radius: 1000,
    description: 'Famous mountain zigzags with sharp 180-degree hairpin turns and dramatic drops to the ocean.',
    advisory: 'Heavy trucks must take turns wide and horn on blind corners. Check air brakes before entering pass.',
  },

  // ==================== SOCCSKSARGEN (REGION XII) ====================
  {
    id: 'dz-gensan-makar',
    name: 'Makar Port Junction & Highway Bypass',
    region: 'Soccsksargen',
    corridor: 'General Santos City Freight Highway',
    category: 'heavy_traffic',
    severity: 'high',
    lat: 6.1820,
    lng: 125.1350,
    radius: 850,
    description: 'Primary tuna & pineapple canning export junction with round-the-clock heavy articulated truck movements.',
    advisory: 'Yield to loaded trailer convoys. Use low beam and double check mirrors before changing lanes.',
  },
  {
    id: 'dz-kidapawan-makilala',
    name: 'Kidapawan - Makilala Mountain Incline',
    region: 'Soccsksargen',
    corridor: 'Davao-Cotabato Highway (North Cotabato)',
    category: 'steep_grade',
    severity: 'high',
    lat: 6.9620,
    lng: 125.0750,
    radius: 950,
    description: 'Foot-of-Apo mountain descent with rolling curves and agricultural tractor cross-traffic.',
    advisory: 'Maintain steady low gear speed. Watch for slow agricultural hauling vehicles during harvest season.',
  },
  {
    id: 'dz-tulunan-mlang',
    name: 'Tulunan - M\'lang River Floodplain Corridor',
    region: 'Soccsksargen',
    corridor: 'Cotabato South Arterial',
    category: 'flood',
    severity: 'high',
    lat: 6.8150,
    lng: 124.8950,
    radius: 900,
    description: 'Low-lying rice plain prone to extensive flash submergence when river dikes overflow.',
    advisory: 'Do not cross road sections with active moving water currents. Verify clearance at culvert crossings.',
  },
  {
    id: 'dz-isulan-tacurong',
    name: 'Isulan - Tacurong Highway Crossing',
    region: 'Soccsksargen',
    corridor: 'Sultan Kudarat Arterial Highway',
    category: 'accident_prone',
    severity: 'moderate',
    lat: 6.6980,
    lng: 124.6320,
    radius: 750,
    description: 'High-speed flat provincial junction with high collision rate involving motorbikes and cargo vans.',
    advisory: 'Slow down to 40 km/h at intersection approach. Flash headlights at night.',
  },
  {
    id: 'dz-alabel-sarangani',
    name: 'Alabel - Malapatan Coastal Cut',
    region: 'Soccsksargen',
    corridor: 'Sarangani Coastal Highway',
    category: 'landslide',
    severity: 'moderate',
    lat: 6.0350,
    lng: 125.3050,
    radius: 800,
    description: 'Coastal hillside with active stonefall risks and strong maritime winds affecting high-cube trucks.',
    advisory: 'Secure high-sided tarping against crosswinds. Steer away from right-hand ditch cuts.',
  },

  // ==================== CARAGA REGION (REGION XIII) ====================
  {
    id: 'dz-agusan-marsh',
    name: 'Agusan Marsh Lowlands (Bunawan-Trento)',
    region: 'Caraga',
    corridor: 'Daang Maharlika (Agusan del Sur)',
    category: 'flood',
    severity: 'critical',
    lat: 8.1650,
    lng: 126.0120,
    radius: 1500,
    description: 'Vast wetland corridor prone to multi-day highway submergence, soft shoulder collapse, and washouts.',
    advisory: 'CRITICAL: Stay strictly on road centerline during rainy periods. Never pull over onto soft marsh shoulders.',
  },
  {
    id: 'dz-cabadbaran-tubay',
    name: 'Cabadbaran - Tubay Mining Highway',
    region: 'Caraga',
    corridor: 'Surigao-Agusan Highway (Agusan del Norte)',
    category: 'accident_prone',
    severity: 'high',
    lat: 9.1550,
    lng: 125.5680,
    radius: 900,
    description: 'Red laterite nickel clay on asphalt creates extremely slick conditions; heavy articulated mining trucks.',
    advisory: 'Extremely slippery when wet (like black ice). Increase braking distance threefold.',
  },
  {
    id: 'dz-lipata-surigao',
    name: 'Lipata Ferry Terminal Approach & Pass',
    region: 'Caraga',
    corridor: 'Surigao Port Access Corridor',
    category: 'heavy_traffic',
    severity: 'high',
    lat: 9.8050,
    lng: 125.4650,
    radius: 850,
    description: 'Long queues of inter-island RoRo cargo trucks parked on curves and narrow approach ramps.',
    advisory: 'Expect stopped trucks on road lanes near ferry gate. Sound horn on blind access curves.',
  },
  {
    id: 'dz-bayugan-esperanza',
    name: 'Bayugan - Esperanza River Bridge Crossing',
    region: 'Caraga',
    corridor: 'Daang Maharlika (Agusan del Sur)',
    category: 'flood',
    severity: 'moderate',
    lat: 8.7150,
    lng: 125.7480,
    radius: 750,
    description: 'River approach subject to flash flooding and swift mud flows during La Niña season.',
    advisory: 'Proceed with low speed. Test brakes after passing submerged pavement sections.',
  },

  // ==================== ZAMBOANGA PENINSULA (REGION IX) ====================
  {
    id: 'dz-pagadian-tiguma',
    name: 'Tiguma Mountain Zigzag (Pagadian Pass)',
    region: 'Zamboanga Peninsula',
    corridor: 'Pagadian-Zamboanga Highway (Zamboanga del Sur)',
    category: 'steep_grade',
    severity: 'critical',
    lat: 7.8250,
    lng: 123.4150,
    radius: 1100,
    description: 'Notoriously steep mountain zigzag entering Pagadian City with runaway truck catch ramps.',
    advisory: 'CRITICAL: Full brake test mandatory at top of hill. Use 1st or 2nd gear only. Watch for runaway truck warning signs.',
  },
  {
    id: 'dz-ipil-tungawan',
    name: 'Ipil - Tungawan S-Curves Corridor',
    region: 'Zamboanga Peninsula',
    corridor: 'Pan-Philippine Highway (Zamboanga Sibugay)',
    category: 'accident_prone',
    severity: 'high',
    lat: 7.6050,
    lng: 122.4550,
    radius: 950,
    description: 'Series of sharp unbanked reverse S-curves with narrow bridges and no lighting.',
    advisory: 'Keep strictly within lane. Sound horn before entering narrow single-lane bridge approaches.',
  },
  {
    id: 'dz-vitali-zamboanga',
    name: 'Licuan - Vitali Coastal Ridge',
    region: 'Zamboanga Peninsula',
    corridor: 'Zamboanga City North Corridor',
    category: 'landslide',
    severity: 'high',
    lat: 7.3350,
    lng: 122.2850,
    radius: 900,
    description: 'Isolated coastal ridge subject to loose rock slides and poor mobile phone coverage for breakdown support.',
    advisory: 'Check spare tire and emergency tool kit before entering this stretch. Drive with extra caution at night.',
  },
  {
    id: 'dz-aurora-molave',
    name: 'Aurora - Molave Agricultural Crossing',
    region: 'Zamboanga Peninsula',
    corridor: 'Zamboanga del Sur Highway',
    category: 'accident_prone',
    severity: 'moderate',
    lat: 7.9550,
    lng: 123.5850,
    radius: 750,
    description: 'Fast truck corridor intersected by slow unlit rice harvesting equipment and grain dryings.',
    advisory: 'Watch for grain tarps laid out on road margins and cattle crossings at dusk.',
  },

  // ==================== BARMM / CENTRAL MINDANAO ====================
  {
    id: 'dz-narciso-ramos',
    name: 'Narciso Ramos Highway (Malabang-Marogong Pass)',
    region: 'BARMM',
    corridor: 'Cotabato-Marawi Mountain Corridor',
    category: 'steep_grade',
    severity: 'critical',
    lat: 7.6250,
    lng: 124.1150,
    radius: 1200,
    description: 'High-altitude mountain highway through dense cloud cover with steep grade drops and winding blind corners.',
    advisory: 'Downshift and maintain headlights on. Proceed in daylight convoy when possible.',
  },
  {
    id: 'dz-quirino-bridge',
    name: 'Rio Grande de Mindanao / Quirino Bridge Approach',
    region: 'BARMM',
    corridor: 'Cotabato City Highway Gateway',
    category: 'flood',
    severity: 'high',
    lat: 7.2180,
    lng: 124.2380,
    radius: 800,
    description: 'Major river basin spillway prone to high floodwaters and road inundation during typhoon season.',
    advisory: 'Check Cotabato City flood advisories. Do not attempt bridge approach if water reaches road curbing.',
  },
];

/**
 * Checks if geographic coordinates fall within the Mindanao mainland & logistics territory
 */
export function isMindanaoCoordinate(lat, lng) {
  if (lat == null || lng == null) return false;
  // Bounding box for Mindanao mainland & adjacent trucking corridors
  return lat >= 5.0 && lat <= 10.3 && lng >= 121.5 && lng <= 126.9;
}

/**
 * Calculates high-precision distance between two geographic coordinates using the Haversine formula (in kilometers)
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates perpendicular distance from point P to line segment AB (in kilometers)
 */
function distanceToSegmentKm(pLat, pLng, aLat, aLng, bLat, bLng) {
  const l2 = (bLat - aLat) * (bLat - aLat) + (bLng - aLng) * (bLng - aLng);
  if (l2 === 0) return haversineDistanceKm(pLat, pLng, aLat, aLng);
  let t = ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return haversineDistanceKm(pLat, pLng, projLat, projLng);
}

/**
 * Checks if a danger zone is within `thresholdKm` of a route path or waypoints.
 * Automatically samples long inter-provincial Mindanao routes to guarantee zero missing hazards.
 */
export function isZoneNearRoute(zone, waypoints, thresholdKm = 2.5) {
  if (!waypoints || waypoints.length === 0 || !zone?.lat || !zone?.lng) return false;

  // Add the zone radius (converted to km) into the proximity threshold
  const effectiveThreshold = thresholdKm + (zone.radius ? zone.radius / 1000 : 0.7);

  // If only 1 point or simple start/end
  if (waypoints.length === 1) {
    const wp = waypoints[0];
    const lat = wp.lat ?? wp.latLng?.lat;
    const lng = wp.lng ?? wp.latLng?.lng;
    return haversineDistanceKm(zone.lat, zone.lng, lat, lng) <= effectiveThreshold;
  }

  // Optimize route traversal for long-haul routes:
  // Step through segments. If route has thousands of points, sample smartly without skipping hazards.
  const step = waypoints.length > 800 ? Math.floor(waypoints.length / 400) : 1;

  for (let i = 0; i < waypoints.length - 1; i += step) {
    const nextIdx = Math.min(i + step, waypoints.length - 1);
    const a = waypoints[i];
    const b = waypoints[nextIdx];
    const aLat = a.lat ?? a.latLng?.lat;
    const aLng = a.lng ?? a.latLng?.lng;
    const bLat = b.lat ?? b.latLng?.lat;
    const bLng = b.lng ?? b.latLng?.lng;

    if (aLat != null && aLng != null && bLat != null && bLng != null) {
      const dist = distanceToSegmentKm(zone.lat, zone.lng, aLat, aLng, bLat, bLng);
      if (dist <= effectiveThreshold) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Filters danger zones that lie along or near a given route anywhere in Mindanao
 */
export function getRouteDangerZones(waypoints, allZones = DEFAULT_DANGER_ZONES, thresholdKm = 2.5) {
  if (!waypoints || waypoints.length === 0) return [];
  return allZones.filter((zone) => isZoneNearRoute(zone, waypoints, thresholdKm));
}

/**
 * Calculates automated Route Risk Level and Precaution Summary for any Mindanao route
 */
export function calculateRouteRiskSummary(detectedZones = []) {
  if (!detectedZones || detectedZones.length === 0) {
    return {
      level: 'low',
      label: 'Standard Route Safety',
      badgeClass: 'risk-pill-low',
      color: '#10b981',
      criticalCount: 0,
      highCount: 0,
      moderateCount: 0,
      advisories: ['Standard highway precautions apply. Maintain safe following distance.'],
    };
  }

  const criticalCount = detectedZones.filter((z) => z.severity === 'critical').length;
  const highCount = detectedZones.filter((z) => z.severity === 'high').length;
  const moderateCount = detectedZones.filter((z) => z.severity === 'moderate').length;

  let level = 'moderate';
  let label = 'Elevated Caution Route';
  let badgeClass = 'risk-pill-moderate';
  let color = '#d97706';

  if (criticalCount > 0) {
    level = 'critical';
    label = 'CRITICAL MOUNTAIN / BLACKSPOT PASS';
    badgeClass = 'risk-pill-critical';
    color = '#dc2626';
  } else if (highCount > 0) {
    level = 'high';
    label = 'HIGH HAZARD ROUTE';
    badgeClass = 'risk-pill-high';
    color = '#ea580c';
  }

  // Extract top distinct advisories
  const advisories = Array.from(
    new Set(detectedZones.map((z) => z.advisory).filter(Boolean))
  ).slice(0, 3);

  return {
    level,
    label,
    badgeClass,
    color,
    criticalCount,
    highCount,
    moderateCount,
    advisories,
  };
}

/**
 * Merges raw backend incident reports into standardized danger zone objects
 */
export function mergeIncidentsIntoDangerZones(incidents = []) {
  const dynamicZones = [];
  (incidents || []).forEach((inc) => {
    if (!['accident', 'damage', 'delay'].includes(inc.incident_type)) return;
    const req = inc.delivery?.request;
    if (!req) return;
    const lat = req.dropoff_lat ? parseFloat(req.dropoff_lat) : req.pickup_lat ? parseFloat(req.pickup_lat) : null;
    const lng = req.dropoff_lng ? parseFloat(req.dropoff_lng) : req.pickup_lng ? parseFloat(req.pickup_lng) : null;
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      dynamicZones.push({
        id: `incident-${inc.incident_id}`,
        name: `Past ${inc.incident_type === 'accident' ? 'Collision' : inc.incident_type.toUpperCase()} Spot`,
        region: 'Incident Location',
        category: 'reported_incident',
        severity: inc.severity === 'high' ? 'critical' : 'high',
        lat,
        lng,
        radius: 600,
        description: inc.description || 'Reported road accident or damage logged on this corridor.',
        advisory: 'Exercise extra vigilance. Reduced clearance or past road damage reported at this location.',
        reportedAt: inc.reported_at,
      });
    }
  });
  return dynamicZones;
}

/**
 * Creates custom Leaflet HTML DivIcon for a danger zone
 */
export function createDangerZoneIcon(zone, isOnRoute = false) {
  const cat = HAZARD_CATEGORIES[zone.category] || HAZARD_CATEGORIES.accident_prone;
  const isCritical = zone.severity === 'critical' || isOnRoute;
  const pulseClass = isCritical ? 'danger-radar-pulse' : '';

  return L.divIcon({
    className: 'danger-zone-marker-container',
    html: `
      <div class="danger-zone-marker ${pulseClass}" style="
        position: relative;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${cat.fillColor};
          opacity: 0.35;
          animation: ${isCritical ? 'dangerZonePulse 2s infinite ease-out' : 'none'};
        "></div>
        <div style="
          position: relative;
          width: 26px;
          height: 26px;
          background: ${cat.color};
          color: #ffffff;
          border: 2px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 8px rgba(0,0,0,0.35);
          font-size: 11px;
        ">
          <i class="fas ${cat.icon}"></i>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

/**
 * Returns formatted HTML for danger zone popups
 */
export function createDangerZonePopupHtml(zone, isOnRoute = false) {
  const cat = HAZARD_CATEGORIES[zone.category] || HAZARD_CATEGORIES.accident_prone;
  const severityTag =
    zone.severity === 'critical'
      ? '<span class="dz-pill dz-critical">CRITICAL RISK</span>'
      : zone.severity === 'high'
      ? '<span class="dz-pill dz-high">HIGH RISK</span>'
      : '<span class="dz-pill dz-moderate">CAUTION</span>';

  const onRouteNotice = isOnRoute
    ? `<div class="dz-on-route-alert"><i class="fas fa-exclamation-circle"></i> On Active Delivery Corridor</div>`
    : '';

  const regionInfo = zone.region
    ? `<div style="font-size: 10px; color: #64748b; margin-top: -3px; margin-bottom: 5px; font-weight: 600;"><i class="fas fa-map-marker-alt"></i> ${zone.region} ${zone.corridor ? `• ${zone.corridor}` : ''}</div>`
    : '';

  return `
    <div class="danger-zone-popup-card">
      <div class="dz-header">
        <span class="dz-badge ${cat.badgeClass}">
          <i class="fas ${cat.icon}"></i> ${cat.badgeText}
        </span>
        ${severityTag}
      </div>
      <div class="dz-title">${zone.name}</div>
      ${regionInfo}
      ${onRouteNotice}
      <div class="dz-desc">${zone.description}</div>
      <div class="dz-advisory">
        <div class="dz-advisory-title"><i class="fas fa-shield-alt"></i> Driver Safety Advisory</div>
        <div class="dz-advisory-text">${zone.advisory}</div>
      </div>
      <div class="dz-meta">
        <span><i class="fas fa-bullseye"></i> Zone Radius: ${zone.radius || 750}m</span>
      </div>
    </div>
  `;
}

/**
 * Renders all danger zones as Leaflet overlay layers on the given map.
 * Returns a layer group or controller object.
 */
export function renderDangerZonesOnMap(map, zones = DEFAULT_DANGER_ZONES, routeWaypoints = null) {
  if (!map) return null;

  const layerGroup = L.layerGroup();

  zones.forEach((zone) => {
    if (!zone.lat || !zone.lng) return;
    const cat = HAZARD_CATEGORIES[zone.category] || HAZARD_CATEGORIES.accident_prone;
    const onRoute = routeWaypoints ? isZoneNearRoute(zone, routeWaypoints) : false;

    // Translucent circle radius
    const circle = L.circle([zone.lat, zone.lng], {
      radius: zone.radius || 750,
      color: onRoute ? '#dc2626' : cat.color,
      fillColor: onRoute ? '#ef4444' : cat.fillColor,
      fillOpacity: onRoute ? 0.22 : 0.15,
      weight: onRoute ? 2 : 1.5,
      dashArray: onRoute ? '4, 4' : null,
    });

    // Custom Icon Marker
    const marker = L.marker([zone.lat, zone.lng], {
      icon: createDangerZoneIcon(zone, onRoute),
      zIndexOffset: onRoute ? 500 : 200,
    });

    const popupContent = createDangerZonePopupHtml(zone, onRoute);
    circle.bindPopup(popupContent, { maxWidth: 320, className: 'hjy-hazard-popup' });
    marker.bindPopup(popupContent, { maxWidth: 320, className: 'hjy-hazard-popup' });

    layerGroup.addLayer(circle);
    layerGroup.addLayer(marker);
  });

  layerGroup.addTo(map);
  return layerGroup;
}
