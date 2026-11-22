/**
 * Speed and Movement Telemetry Utility for Delivery Fleet Monitoring
 * HJY Logistics & Trucking System
 */

export const SPEED_LIMIT_KMH = 80;
export const URBAN_SPEED_LIMIT_KMH = 60;

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (!Number.isFinite(numLat1) || !Number.isFinite(numLon1) || !Number.isFinite(numLat2) || !Number.isFinite(numLon2)) {
    return 0;
  }

  const radius = 6371; // Earth's mean radius in km
  const latDelta = ((numLat2 - numLat1) * Math.PI) / 180;
  const lonDelta = ((numLon2 - numLon1) * Math.PI) / 180;
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos((numLat1 * Math.PI) / 180) *
      Math.cos((numLat2 * Math.PI) / 180) *
      Math.sin(lonDelta / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculates speed in km/h between two GPS pings
 */
export function calculateSpeedBetweenPoints(p1, p2) {
  if (!p1 || !p2) return 0;

  // If p2 explicitly has hardware/sensor speed provided
  if (p2.speed !== undefined && p2.speed !== null && !isNaN(Number(p2.speed))) {
    const rawSpeed = Number(p2.speed);
    return Math.max(0, Math.round(rawSpeed * 10) / 10);
  }

  const distKm = haversineKm(p1.latitude ?? p1.lat, p1.longitude ?? p1.lng, p2.latitude ?? p2.lat, p2.longitude ?? p2.lng);

  // If vehicle moved less than 3 meters, it is stationary/idle (filters GPS jitter)
  if (distKm < 0.003) {
    return 0;
  }

  const time1 = p1.timestamp ? new Date(p1.timestamp).getTime() : 0;
  const time2 = p2.timestamp ? new Date(p2.timestamp).getTime() : 0;
  const deltaSeconds = Math.abs(time2 - time1) / 1000;

  // If timestamps are unavailable, identical, or separated by more than 30 minutes
  if (!deltaSeconds || deltaSeconds < 1 || deltaSeconds > 1800) {
    return 0;
  }

  const hours = deltaSeconds / 3600;
  const speed = distKm / hours;

  // Sanity ceiling: clamp extreme outliers caused by GPS teleportation
  if (speed > 140) {
    return 80;
  }

  return Math.max(0, Math.round(speed * 10) / 10);
}

/**
 * Returns visual category and badges for a given speed
 */
export function getSpeedCategory(speedKmH, speedLimit = SPEED_LIMIT_KMH) {
  const speed = Number(speedKmH) || 0;

  if (speed >= speedLimit) {
    return {
      key: 'overspeed',
      label: 'Overspeeding',
      shortLabel: 'OVERSPEED',
      badgeClass: 'speed-overspeed',
      color: '#dc2626',
      bg: '#fee2e2',
      border: '#fca5a5',
      icon: 'fa-exclamation-triangle',
      advisory: `Exceeding safe fleet speed limit (${speedLimit} km/h)`,
    };
  }

  if (speed >= 25) {
    return {
      key: 'cruising',
      label: 'Normal Cruising',
      shortLabel: 'IN MOTION',
      badgeClass: 'speed-cruising',
      color: '#16a34a',
      bg: '#dcfce7',
      border: '#86efac',
      icon: 'fa-truck-fast',
      advisory: 'Optimal cruising speed along provincial highway',
    };
  }

  if (speed >= 5) {
    return {
      key: 'traffic',
      label: 'Slow / City Traffic',
      shortLabel: 'SLOW TRAFFIC',
      badgeClass: 'speed-traffic',
      color: '#d97706',
      bg: '#fef3c7',
      border: '#fde68a',
      icon: 'fa-traffic-light',
      advisory: 'Slow movement due to town congestion, intersection, or grade',
    };
  }

  return {
    key: 'idle',
    label: 'Stationary / Idle',
    shortLabel: 'STOPPED',
    badgeClass: 'speed-idle',
    color: '#64748b',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    icon: 'fa-pause-circle',
    advisory: 'Vehicle is currently stopped or parked',
  };
}

/**
 * Computes comprehensive trip movement and speed telemetry metrics
 */
export function computeTripSpeedMetrics(trackingHistory = [], latestDriverLocation = null) {
  const points = (Array.isArray(trackingHistory) ? trackingHistory : [])
    .filter((pt) => pt && (pt.latitude != null || pt.lat != null) && (pt.longitude != null || pt.lng != null))
    .map((pt) => ({
      ...pt,
      lat: Number(pt.latitude ?? pt.lat),
      lng: Number(pt.longitude ?? pt.lng),
      timeMs: pt.timestamp ? new Date(pt.timestamp).getTime() : 0,
    }))
    .sort((a, b) => {
      if (a.timeMs && b.timeMs && a.timeMs !== b.timeMs) {
        return a.timeMs - b.timeMs;
      }
      return (Number(a.tracking_id) || 0) - (Number(b.tracking_id) || 0);
    });

  if (points.length === 0) {
    const category = getSpeedCategory(0);
    return {
      currentSpeed: 0,
      currentSpeedDisplay: '0.0',
      category,
      avgSpeed: 0,
      peakSpeed: 0,
      totalDistanceKm: 0,
      movingPointsCount: 0,
      totalPointsCount: 0,
      isMoving: false,
      isOverspeed: false,
      annotatedPoints: [],
    };
  }

  let totalDistanceKm = 0;
  let movingDistanceKm = 0;
  let movingTimeSeconds = 0;
  let peakSpeed = 0;
  const calculatedSpeeds = [];
  const annotatedPoints = [];

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    let segDist = 0;
    let segSpeed = 0;

    if (i > 0) {
      const prev = points[i - 1];
      segDist = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
      segSpeed = calculateSpeedBetweenPoints(prev, curr);
      totalDistanceKm += segDist;

      if (segSpeed >= 5) {
        movingDistanceKm += segDist;
        const dtSec = curr.timeMs && prev.timeMs ? Math.max(1, (curr.timeMs - prev.timeMs) / 1000) : 15;
        movingTimeSeconds += dtSec;
      }
    } else if (curr.speed !== undefined && curr.speed !== null) {
      segSpeed = Number(curr.speed) || 0;
    }

    if (segSpeed > peakSpeed) {
      peakSpeed = segSpeed;
    }
    calculatedSpeeds.push(segSpeed);

    annotatedPoints.push({
      ...curr,
      speedKmH: segSpeed,
      segmentDistanceKm: Math.round(segDist * 1000) / 1000,
      timeFormatted: curr.timestamp
        ? new Date(curr.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
        : '—',
    });
  }

  // Determine current instantaneous speed
  let currentSpeed = 0;
  if (annotatedPoints.length > 0) {
    const lastPoint = annotatedPoints[annotatedPoints.length - 1];
    if (lastPoint.speed !== undefined && lastPoint.speed !== null && !isNaN(Number(lastPoint.speed))) {
      currentSpeed = Number(lastPoint.speed);
    } else {
      currentSpeed = lastPoint.speedKmH || 0;
    }
  }

  // Calculate moving average speed
  let avgSpeed = 0;
  if (movingTimeSeconds > 0 && movingDistanceKm > 0) {
    avgSpeed = Math.round((movingDistanceKm / (movingTimeSeconds / 3600)) * 10) / 10;
  } else {
    const activeSpeeds = calculatedSpeeds.filter((s) => s >= 5);
    if (activeSpeeds.length > 0) {
      avgSpeed = Math.round((activeSpeeds.reduce((a, b) => a + b, 0) / activeSpeeds.length) * 10) / 10;
    }
  }

  const category = getSpeedCategory(currentSpeed);
  const isMoving = currentSpeed >= 5;
  const isOverspeed = currentSpeed >= SPEED_LIMIT_KMH;

  return {
    currentSpeed: Math.round(currentSpeed * 10) / 10,
    currentSpeedDisplay: (Math.round(currentSpeed * 10) / 10).toFixed(1),
    category,
    avgSpeed: Math.min(peakSpeed, avgSpeed),
    peakSpeed: Math.round(peakSpeed * 10) / 10,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    movingPointsCount: calculatedSpeeds.filter((s) => s >= 5).length,
    totalPointsCount: points.length,
    isMoving,
    isOverspeed,
    annotatedPoints,
  };
}
