/**
 * Free OSRM Road Routing Service for Driver Mobile
 * Connects to Open Source Routing Machine public API (100% free, no API key needed)
 */

export const DEFAULT_HQ_COORDINATES = {
  latitude: 8.4982,
  longitude: 124.6540,
  address: "536 Block 1 Puntod, Cagayan de Oro City",
  name: "HJY Trucking HQ",
};

// In-memory cache for OSRM routes to avoid spamming the free server
const routeCache = new Map();

/**
 * Fetch real road coordinates between two or more points via OSRM
 * @param {Array<{latitude: number, longitude: number}>} points
 * @returns {Promise<{coordinates: Array<{latitude: number, longitude: number}>, distanceKm: number, durationMins: number}>}
 */
export async function fetchRoadRoute(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return { coordinates: [], distanceKm: 0, durationMins: 0 };
  }

  const validPoints = points.filter(
    (p) => p && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))
  );

  if (validPoints.length < 2) {
    return { coordinates: [], distanceKm: 0, durationMins: 0 };
  }

  // Generate cache key rounded to ~10 meters
  const cacheKey = validPoints
    .map((p) => `${Number(p.latitude).toFixed(4)},${Number(p.longitude).toFixed(4)}`)
    .join(";");

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  const coordString = validPoints
    .map((p) => `${Number(p.longitude).toFixed(6)},${Number(p.latitude).toFixed(6)}`)
    .join(";");

  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`OSRM routing failed with status: ${res.status}`);
    }

    const data = await res.json();
    if (!data?.routes || data.routes.length === 0) {
      throw new Error("No route found by OSRM");
    }

    const route = data.routes[0];
    const rawCoords = route.geometry?.coordinates || [];

    // Convert GeoJSON [lng, lat] to react-native-maps {latitude, longitude}
    const coordinates = rawCoords.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));

    const distanceKm = Number(((route.distance || 0) / 1000).toFixed(1));
    const durationMins = Math.max(Math.round((route.duration || 0) / 60), 1);

    const result = {
      coordinates,
      distanceKm,
      durationMins,
    };

    routeCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("OSRM routing fallback to straight line:", error?.message);
    // Fallback to straight line connecting waypoints
    const fallbackCoords = validPoints.map((p) => ({
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
    }));
    return {
      coordinates: fallbackCoords,
      distanceKm: 0,
      durationMins: 0,
    };
  }
}

/**
 * Determine navigation waypoints based on current delivery status and driver location
 */
export function getRouteWaypoints(delivery, navigationState, driverLocation) {
  const request = delivery?.request || {};
  const isRelief = Boolean(delivery?.is_relief);
  const cargoLoaded = Boolean(delivery?.cargo_loaded);
  const isTransshipment = isRelief && cargoLoaded;

  const pickupLat = isTransshipment && Number.isFinite(Number(delivery?.relief_origin_lat))
    ? Number(delivery.relief_origin_lat)
    : Number(request.pickup_lat);
  const pickupLng = isTransshipment && Number.isFinite(Number(delivery?.relief_origin_lng))
    ? Number(delivery.relief_origin_lng)
    : Number(request.pickup_lng);
  const dropoffLat = Number(request.dropoff_lat);
  const dropoffLng = Number(request.dropoff_lng);

  const pickupCoord =
    Number.isFinite(pickupLat) && Number.isFinite(pickupLng)
      ? { latitude: pickupLat, longitude: pickupLng }
      : null;

  const dropoffCoord =
    Number.isFinite(dropoffLat) && Number.isFinite(dropoffLng)
      ? { latitude: dropoffLat, longitude: dropoffLng }
      : null;

  const origin = driverLocation || DEFAULT_HQ_COORDINATES;

  switch (navigationState) {
    // -------------------------------------------------------------
    // LEG 1: Heading to Pick-up Location & Loading Cargo
    // -------------------------------------------------------------
    case "preview":
    case "assigned":
    case "accepted":
    case "in_transit_pickup":
    case "arrived_pickup":
    case "loading":
    case "loading_cargo":
      return {
        leg: "pickup",
        legTitle: isTransshipment ? "Heading to Breakdown / Pick-up Point" : "Heading to Pick-up Location",
        origin,
        destination: pickupCoord,
        waypoints: [origin, pickupCoord].filter(Boolean),
      };

    // -------------------------------------------------------------
    // LEG 2: Delivering Cargo to Drop-off (ONLY after loading cargo!)
    // -------------------------------------------------------------
    case "out_for_delivery":
    case "in_transit_dropoff":
    case "arrived_dropoff":
    case "unloading":
    case "unloading_cargo":
      return {
        leg: "dropoff",
        legTitle: "Delivering to Drop-off Destination",
        origin: driverLocation || pickupCoord || DEFAULT_HQ_COORDINATES,
        destination: dropoffCoord,
        waypoints: [driverLocation || pickupCoord || DEFAULT_HQ_COORDINATES, dropoffCoord].filter(Boolean),
      };

    // -------------------------------------------------------------
    // LEG 3: Returning to HQ Depot (After drop-off is complete)
    // -------------------------------------------------------------
    case "returning_to_hq":
    case "completed":
      return {
        leg: "hq",
        legTitle: "Returning to HQ Depot",
        origin: driverLocation || dropoffCoord || DEFAULT_HQ_COORDINATES,
        destination: DEFAULT_HQ_COORDINATES,
        waypoints: [driverLocation || dropoffCoord || DEFAULT_HQ_COORDINATES, DEFAULT_HQ_COORDINATES].filter(Boolean),
      };

    default:
      return {
        leg: "pickup",
        legTitle: "Heading to Pick-up Location",
        origin,
        destination: pickupCoord,
        waypoints: [origin, pickupCoord].filter(Boolean),
      };
  }
}

/**
 * Great-circle distance between two points in kilometers
 */
export function haversineDistanceKm(p1, p2) {
  if (!p1 || !p2) return 0;
  const lat1 = Number(p1.latitude);
  const lon1 = Number(p1.longitude);
  const lat2 = Number(p2.latitude);
  const lon2 = Number(p2.longitude);

  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return 0;
  }

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Precompute cumulative distance from each point along the road to the destination (O(N) once per leg)
 * Returns an array where cumulative[i] is the remaining distance along the polyline from point i to the end.
 */
export function precomputeCumulativeDistances(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return [];
  const n = coordinates.length;
  const cumulative = new Array(n).fill(0);
  for (let i = n - 2; i >= 0; i--) {
    const segDist = haversineDistanceKm(coordinates[i], coordinates[i + 1]);
    cumulative[i] = cumulative[i + 1] + segDist;
  }
  return cumulative;
}

/**
 * Local fast dead-reckoning progress calculation along the road polyline (O(1) execution in < 0.1ms).
 * Zero network calls needed.
 */
export function calculateRemainingRouteProgress(currentLoc, coordinates, cumulativeDistances, lastIndex = 0) {
  if (!currentLoc || !Array.isArray(coordinates) || coordinates.length < 2) {
    return {
      remainingKm: 0,
      closestIndex: 0,
      distanceToRouteMeters: 0,
      isOffRoute: false,
    };
  }

  const n = coordinates.length;
  // Search within a sliding window ahead of lastIndex to eliminate lag & prevent snapping to loopback curves
  const startSearch = Math.max(0, lastIndex - 2);
  const endSearch = Math.min(n - 1, lastIndex + 45);

  let minDistanceKm = Infinity;
  let bestIndex = lastIndex;

  for (let i = startSearch; i <= endSearch; i++) {
    const dist = haversineDistanceKm(currentLoc, coordinates[i]);
    if (dist < minDistanceKm) {
      minDistanceKm = dist;
      bestIndex = i;
    }
  }

  // If driver jumped significantly, perform full route scan
  if (minDistanceKm * 1000 > 130 && lastIndex === 0) {
    for (let i = 0; i < n; i++) {
      const dist = haversineDistanceKm(currentLoc, coordinates[i]);
      if (dist < minDistanceKm) {
        minDistanceKm = dist;
        bestIndex = i;
      }
    }
  }

  const distanceToRouteMeters = Math.round(minDistanceKm * 1000);
  const isOffRoute = distanceToRouteMeters > 90; // Over 90 meters away from nearest road segment

  const remainingFromBest =
    cumulativeDistances && cumulativeDistances[bestIndex] != null
      ? cumulativeDistances[bestIndex]
      : 0;

  // Add partial distance from current location to the target segment vertex
  const remainingKm = Math.max(
    0,
    Number((remainingFromBest + (bestIndex < n - 1 ? minDistanceKm * 0.4 : 0)).toFixed(2))
  );

  return {
    remainingKm,
    closestIndex: Math.max(lastIndex, bestIndex),
    distanceToRouteMeters,
    isOffRoute,
  };
}

/**
 * Clean user-facing distance format (e.g. "12.4 km", "850 m", "Arrived")
 */
export function formatRemainingDistance(distanceKm) {
  if (distanceKm == null || isNaN(distanceKm)) return "—";
  const km = Number(distanceKm);
  if (km <= 0.035) return "Arrived"; // within 35m
  if (km < 1.0) {
    const meters = Math.round(km * 1000);
    return `${Math.max(meters, 10)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Clean user-facing ETA format (e.g. "25 mins", "1 min", "Arriving")
 */
export function formatRemainingETA(durationMins, distanceKm) {
  if (distanceKm != null && Number(distanceKm) <= 0.035) return "Arrived";
  if (durationMins == null || isNaN(durationMins)) return "—";
  const mins = Math.round(durationMins);
  if (mins <= 0) return "Arriving";
  if (mins === 1) return "1 min";
  return `${mins} mins`;
}
