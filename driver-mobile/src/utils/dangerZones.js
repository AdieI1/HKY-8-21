/**
 * Pan-Mindanao Trucking & Logistics Danger Zones Catalog for Driver Mobile
 */

export const HAZARD_CATEGORIES = {
  accident_prone: {
    label: "Accident Blackspot",
    color: "#DC2626",
    fillColor: "#EF4444",
    icon: "alert-circle",
    badgeText: "ACCIDENT RISK",
  },
  landslide: {
    label: "Landslide / Rockfall",
    color: "#C2410C",
    fillColor: "#EA580C",
    icon: "warning",
    badgeText: "LANDSLIDE HAZARD",
  },
  flood: {
    label: "Flood-Prone Corridor",
    color: "#0284C7",
    fillColor: "#38BDF8",
    icon: "water",
    badgeText: "FLOOD ZONE",
  },
  steep_grade: {
    label: "Steep Grade / Brake Fade",
    color: "#D97706",
    fillColor: "#F59E0B",
    icon: "trending-down",
    badgeText: "STEEP DESCENT",
  },
  heavy_traffic: {
    label: "Chokepoint / Blind Merge",
    color: "#7C3AED",
    fillColor: "#A855F7",
    icon: "car",
    badgeText: "HEAVY CONGESTION",
  },
  reported_incident: {
    label: "Reported Incident Spot",
    color: "#991B1B",
    fillColor: "#B91C1C",
    icon: "warning-outline",
    badgeText: "PAST INCIDENT",
  },
};

export const DEFAULT_DANGER_ZONES = [
  // ==================== NORTHERN MINDANAO (REGION X) ====================
  {
    id: "dz-puerto-curve",
    name: "Puerto Flyover & Blind Curve",
    region: "Northern Mindanao",
    corridor: "Iligan-CDO-Butuan Highway",
    category: "accident_prone",
    severity: "critical",
    lat: 8.4752,
    lng: 124.7150,
    radius: 750,
    description: "High-speed national highway merging with blind curves and heavy container truck crossover traffic.",
    advisory: "Reduce speed below 35 km/h. Maintain 50m distance and be alert for sudden braking.",
  },
  {
    id: "dz-alae-ascent",
    name: "Alae - Sayre Highway Steep Ascent",
    region: "Northern Mindanao",
    corridor: "CDO-Bukidnon Sayre Highway",
    category: "steep_grade",
    severity: "critical",
    lat: 8.4410,
    lng: 124.7865,
    radius: 950,
    description: "Steep incline and consecutive hairpin turns prone to brake overheating, runaway trucks, and engine stalling.",
    advisory: "Downshift to low gear before descent. Never ride brakes continuously; test air pressure beforehand.",
  },
  {
    id: "dz-mangima-canyon",
    name: "Mangima Canyon Landslide Pass",
    region: "Northern Mindanao",
    corridor: "Sayre Highway (Manolo Fortich)",
    category: "landslide",
    severity: "high",
    lat: 8.3745,
    lng: 124.8620,
    radius: 1100,
    description: "Unstable cliff faces subject to rockfalls, mudslides, and reduced visibility during rainfall.",
    advisory: "Avoid stopping beneath rock faces. Turn on headlights, keep speed moderate, and watch for debris.",
  },
  {
    id: "dz-atugan-bridge",
    name: "Atugan Canyon Bridge & Gorge Winds",
    region: "Northern Mindanao",
    corridor: "Sayre Highway (Impasug-ong)",
    category: "accident_prone",
    severity: "high",
    lat: 8.3120,
    lng: 125.0110,
    radius: 800,
    description: "Deep canyon bridge subject to strong lateral crosswinds, steep gorge approaches, and fog.",
    advisory: "Firmly grip steering wheel against crosswinds. Reduce speed to 40 km/h with heavy container loads.",
  },
  {
    id: "dz-kulaman-canyon",
    name: "Kulaman Canyon Rollercoaster Curves",
    region: "Northern Mindanao",
    corridor: "Sayre Highway (Sumilao)",
    category: "steep_grade",
    severity: "high",
    lat: 8.2850,
    lng: 124.9820,
    radius: 900,
    description: "Sharp downward S-curves crossing canyon bridge with limited runoff escape ramps.",
    advisory: "Engage engine retarder/Jake brake. Keep well within lane boundaries and sound horn on blind bends.",
  },
  {
    id: "dz-katangawan-flooding",
    name: "Valencia-Maramag Pulangi Floodway",
    region: "Northern Mindanao",
    corridor: "Sayre Highway (Bukidnon)",
    category: "flood",
    severity: "medium",
    lat: 7.8420,
    lng: 125.0450,
    radius: 1000,
    description: "Low-lying river valley highway prone to flash flooding and water pooling during heavy rainfall.",
    advisory: "Assess water depth before crossing. Maintain low gear at steady throttle; do not brake inside water.",
  },
  // ==================== DAVAO REGION (REGION XI) ====================
  {
    id: "dz-buda-pass",
    name: "Buda (Bukidnon-Davao) Mountain Pass",
    region: "Davao Region",
    corridor: "Bukidnon-Davao (BuDa) Road",
    category: "landslide",
    severity: "critical",
    lat: 7.5120,
    lng: 125.2340,
    radius: 1400,
    description: "High-altitude mountain highway exceeding 1,200m elevation. Heavy fog, torrential rain, and landslides.",
    advisory: "Turn on fog lights and hazard flashers in dense fog. Verify tire tread depth before entering pass.",
  },
  {
    id: "dz-marilog-grades",
    name: "Marilog District Steep Gradients",
    region: "Davao Region",
    corridor: "BuDa Road (Davao City side)",
    category: "steep_grade",
    severity: "critical",
    lat: 7.4250,
    lng: 125.3210,
    radius: 1200,
    description: "Extended continuous downhill grade descending toward Davao City basin. Severe brake fade corridor.",
    advisory: "Stop at brake check areas before starting long descent. Use auxiliary retarder and low gear.",
  },
  {
    id: "dz-toril-chokepoint",
    name: "Toril National Highway Crossover",
    region: "Davao Region",
    corridor: "Davao-Cotabato Highway",
    category: "heavy_traffic",
    severity: "medium",
    lat: 7.0180,
    lng: 125.4980,
    radius: 700,
    description: "Congested commercial bottleneck with tricycles, jeepneys, and pedestrians crossing highway.",
    advisory: "Stay in center-left lane to avoid stopping public utility vehicles. Scan for pedestrian crossings.",
  },
];

/**
 * Calculate Great Circle distance between two points in kilometers
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
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
 * Check if a danger zone is close to any point on a route
 */
export function isZoneNearRoute(zone, routeCoords, maxDistanceKm = 1.8) {
  if (!zone || !Array.isArray(routeCoords) || routeCoords.length === 0) return false;
  return routeCoords.some((coord) => {
    const lat = coord.latitude || coord.lat;
    const lng = coord.longitude || coord.lng;
    if (lat == null || lng == null) return false;
    return calculateDistanceKm(zone.lat, zone.lng, lat, lng) <= maxDistanceKm;
  });
}

/**
 * Find the nearest hazard to the driver within warning distance (e.g., 2.0 km)
 */
export function findNearestUpcomingHazard(driverLocation, dangerZones = DEFAULT_DANGER_ZONES, maxKm = 2.0) {
  if (!driverLocation?.latitude || !driverLocation?.longitude) return null;

  let nearest = null;
  let minDistance = Infinity;

  for (const zone of dangerZones) {
    const dist = calculateDistanceKm(
      driverLocation.latitude,
      driverLocation.longitude,
      zone.lat,
      zone.lng
    );

    if (dist <= maxKm && dist < minDistance) {
      minDistance = dist;
      nearest = { ...zone, distanceKm: Number(dist.toFixed(1)) };
    }
  }

  return nearest;
}
