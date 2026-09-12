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
  const pickupLat = Number(request.pickup_lat);
  const pickupLng = Number(request.pickup_lng);
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
        legTitle: "Heading to Pick-up Location",
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
