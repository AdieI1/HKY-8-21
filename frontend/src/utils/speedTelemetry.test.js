import {
  haversineKm,
  calculateSpeedBetweenPoints,
  getSpeedCategory,
  computeTripSpeedMetrics,
  SPEED_LIMIT_KMH,
} from './speedTelemetry';

describe('speedTelemetry utility tests', () => {
  test('haversineKm computes distance accurately', () => {
    // Cagayan de Oro to Tagoloan (~18 km)
    const dist = haversineKm(8.4862, 124.6522, 8.5414, 124.7538);
    expect(dist).toBeGreaterThan(12);
    expect(dist).toBeLessThan(22);

    // Identical points return 0
    expect(haversineKm(8.4862, 124.6522, 8.4862, 124.6522)).toBe(0);
    expect(haversineKm(null, null, 8.4862, 124.6522)).toBe(0);
  });

  test('calculateSpeedBetweenPoints returns 0 when stationary or jitter', () => {
    const p1 = { lat: 8.4862, lng: 124.6522, timestamp: '2026-09-09T10:00:00Z' };
    const p2 = { lat: 8.486201, lng: 124.652201, timestamp: '2026-09-09T10:00:15Z' };
    const speed = calculateSpeedBetweenPoints(p1, p2);
    expect(speed).toBe(0);
  });

  test('calculateSpeedBetweenPoints computes realistic velocity', () => {
    // 0.2 km in 15 seconds => 0.2 / (15 / 3600) = 48 km/h
    const p1 = { lat: 8.4800, lng: 124.6500, timestamp: '2026-09-09T10:00:00Z' };
    // Let's create p2 exactly ~0.2 km away
    // 1 deg lat is ~111 km, so 0.2 km is ~0.0018 deg
    const p2 = { lat: 8.4818, lng: 124.6500, timestamp: '2026-09-09T10:00:15Z' };
    const speed = calculateSpeedBetweenPoints(p1, p2);
    expect(speed).toBeGreaterThan(30);
    expect(speed).toBeLessThan(65);
  });

  test('calculateSpeedBetweenPoints uses explicit sensor speed if provided', () => {
    const p1 = { lat: 8.4800, lng: 124.6500 };
    const p2 = { lat: 8.4818, lng: 124.6500, speed: 55.4 };
    expect(calculateSpeedBetweenPoints(p1, p2)).toBe(55.4);
  });

  test('getSpeedCategory correctly categorizes idle, traffic, cruising, and overspeed', () => {
    expect(getSpeedCategory(0).key).toBe('idle');
    expect(getSpeedCategory(4.5).key).toBe('idle');
    expect(getSpeedCategory(15).key).toBe('traffic');
    expect(getSpeedCategory(45).key).toBe('cruising');
    expect(getSpeedCategory(85).key).toBe('overspeed');
    expect(getSpeedCategory(SPEED_LIMIT_KMH).key).toBe('overspeed');
  });

  test('computeTripSpeedMetrics calculates currentSpeed, avgSpeed, peakSpeed, and distance', () => {
    const history = [
      { tracking_id: 1, latitude: 8.4800, longitude: 124.6500, timestamp: '2026-09-09T10:00:00Z' },
      { tracking_id: 2, latitude: 8.4818, longitude: 124.6500, timestamp: '2026-09-09T10:00:15Z' }, // ~48 km/h
      { tracking_id: 3, latitude: 8.4840, longitude: 124.6500, timestamp: '2026-09-09T10:00:30Z' }, // ~58 km/h
    ];

    const metrics = computeTripSpeedMetrics(history);
    expect(metrics.totalPointsCount).toBe(3);
    expect(metrics.totalDistanceKm).toBeGreaterThan(0.3);
    expect(metrics.currentSpeed).toBeGreaterThan(30);
    expect(metrics.peakSpeed).toBeGreaterThanOrEqual(metrics.currentSpeed);
    expect(metrics.isMoving).toBe(true);
    expect(metrics.annotatedPoints.length).toBe(3);
  });

  test('computeTripSpeedMetrics handles empty history safely', () => {
    const metrics = computeTripSpeedMetrics([]);
    expect(metrics.currentSpeed).toBe(0);
    expect(metrics.isMoving).toBe(false);
    expect(metrics.category.key).toBe('idle');
  });
});
