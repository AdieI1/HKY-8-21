import {
  DEFAULT_DANGER_ZONES,
  HAZARD_CATEGORIES,
  isMindanaoCoordinate,
  haversineDistanceKm,
  isZoneNearRoute,
  getRouteDangerZones,
  calculateRouteRiskSummary,
  mergeIncidentsIntoDangerZones,
} from './dangerZones';

describe('Pan-Mindanao dangerZones utility', () => {
  test('DEFAULT_DANGER_ZONES covers all 6 regions across Mindanao island scope', () => {
    expect(DEFAULT_DANGER_ZONES.length).toBeGreaterThanOrEqual(25);

    const regions = new Set(DEFAULT_DANGER_ZONES.map((z) => z.region));
    expect(regions.has('Northern Mindanao')).toBe(true);
    expect(regions.has('Davao Region')).toBe(true);
    expect(regions.has('Soccsksargen')).toBe(true);
    expect(regions.has('Caraga')).toBe(true);
    expect(regions.has('Zamboanga Peninsula')).toBe(true);
    expect(regions.has('BARMM')).toBe(true);

    DEFAULT_DANGER_ZONES.forEach((zone) => {
      expect(zone.id).toBeTruthy();
      expect(zone.name).toBeTruthy();
      expect(zone.category).toBeTruthy();
      expect(HAZARD_CATEGORIES[zone.category]).toBeDefined();
      expect(typeof zone.lat).toBe('number');
      expect(typeof zone.lng).toBe('number');
      expect(isMindanaoCoordinate(zone.lat, zone.lng)).toBe(true);
      expect(zone.radius).toBeGreaterThan(0);
      expect(zone.advisory).toBeTruthy();
    });
  });

  test('isMindanaoCoordinate correctly identifies coordinates within Mindanao island territory', () => {
    // Cagayan de Oro (Northern Mindanao)
    expect(isMindanaoCoordinate(8.4542, 124.6319)).toBe(true);
    // Davao City (Davao Region)
    expect(isMindanaoCoordinate(7.0731, 125.6128)).toBe(true);
    // General Santos (Soccsksargen)
    expect(isMindanaoCoordinate(6.1164, 125.1716)).toBe(true);
    // Zamboanga City (Zamboanga Peninsula)
    expect(isMindanaoCoordinate(6.9214, 122.0790)).toBe(true);
    // Butuan City (Caraga)
    expect(isMindanaoCoordinate(8.9475, 125.5406)).toBe(true);

    // Manila (Luzon) - should be false
    expect(isMindanaoCoordinate(14.5995, 120.9842)).toBe(false);
    // Cebu (Visayas) - should be false
    expect(isMindanaoCoordinate(10.3157, 123.8854)).toBe(false);
  });

  test('haversineDistanceKm accurately computes geographic distances across Mindanao corridors', () => {
    // CDO City Center to Puerto (approx 9-10 km)
    const dist = haversineDistanceKm(8.4820, 124.6470, 8.4752, 124.7150);
    expect(dist).toBeGreaterThan(6);
    expect(dist).toBeLessThan(12);

    // CDO to Davao City straight-line distance (approx 180-220 km)
    const cdoDavao = haversineDistanceKm(8.4820, 124.6470, 7.0731, 125.6128);
    expect(cdoDavao).toBeGreaterThan(170);
    expect(cdoDavao).toBeLessThan(230);

    // Null safety
    expect(haversineDistanceKm(null, null, 8.48, 124.65)).toBe(Infinity);
  });

  test('automatically detects Buda Mountain Pass and Bukidnon steep grades on Davao to CDO route', () => {
    // Major Sayre Highway route connecting Davao City and Cagayan de Oro via Buda Pass
    const davaoToCdoRoute = [
      { lat: 7.0731, lng: 125.6128 }, // Davao City Center
      { lat: 7.2500, lng: 125.4200 }, // Calinan
      { lat: 7.4950, lng: 125.2650 }, // Buda Mountain Pass (Marilog)
      { lat: 7.7500, lng: 125.1500 }, // Maramag
      { lat: 8.1500, lng: 125.1200 }, // Malaybalay
      { lat: 8.3120, lng: 125.0180 }, // Impasug-ong Downhill
      { lat: 8.3745, lng: 124.8620 }, // Mangima Canyon
      { lat: 8.4410, lng: 124.7865 }, // Alae Ascent
      { lat: 8.4752, lng: 124.7150 }, // Puerto Junction
      { lat: 8.4820, lng: 124.6470 }, // CDO City Center
    ];

    const detected = getRouteDangerZones(davaoToCdoRoute, DEFAULT_DANGER_ZONES, 3.0);
    expect(detected.length).toBeGreaterThanOrEqual(4);

    const detectedIds = detected.map((z) => z.id);
    expect(detectedIds).toContain('dz-buda-pass');
    expect(detectedIds).toContain('dz-impasugong-zigzag');
    expect(detectedIds).toContain('dz-mangima-canyon');
    expect(detectedIds).toContain('dz-alae-ascent');
    expect(detectedIds).toContain('dz-puerto-curve');

    // Automatic route risk calculation
    const risk = calculateRouteRiskSummary(detected);
    expect(risk.level).toBe('critical');
    expect(risk.criticalCount).toBeGreaterThan(0);
    expect(risk.advisories.length).toBeGreaterThan(0);
  });

  test('automatically detects Agusan Marsh flood lowlands on Butuan to Davao route', () => {
    const butuanToDavaoRoute = [
      { lat: 8.9475, lng: 125.5406 }, // Butuan City
      { lat: 8.7150, lng: 125.7480 }, // Bayugan
      { lat: 8.1650, lng: 126.0120 }, // Agusan Marsh (Bunawan-Trento)
      { lat: 7.8480, lng: 126.0520 }, // Monkayo
      { lat: 7.4120, lng: 125.8050 }, // Tagum
      { lat: 7.0731, lng: 125.6128 }, // Davao City
    ];

    const detected = getRouteDangerZones(butuanToDavaoRoute, DEFAULT_DANGER_ZONES, 3.0);
    const detectedIds = detected.map((z) => z.id);

    expect(detectedIds).toContain('dz-agusan-marsh');
    expect(detectedIds).toContain('dz-monkayo-mines');

    const risk = calculateRouteRiskSummary(detected);
    expect(risk.criticalCount).toBeGreaterThan(0);
  });

  test('automatically detects Pagadian Tiguma Pass and Ipil S-curves on Zamboanga Peninsula route', () => {
    const pagadianToZamboangaRoute = [
      { lat: 7.8250, lng: 123.4150 }, // Pagadian Tiguma Pass
      { lat: 7.7500, lng: 123.0500 }, // Buug
      { lat: 7.6050, lng: 122.4550 }, // Ipil S-curves
      { lat: 7.3350, lng: 122.2850 }, // Vitali Ridge
      { lat: 6.9214, lng: 122.0790 }, // Zamboanga City
    ];

    const detected = getRouteDangerZones(pagadianToZamboangaRoute, DEFAULT_DANGER_ZONES, 3.0);
    const detectedIds = detected.map((z) => z.id);

    expect(detectedIds).toContain('dz-pagadian-tiguma');
    expect(detectedIds).toContain('dz-ipil-tungawan');
    expect(detectedIds).toContain('dz-vitali-zamboanga');
  });

  test('mergeIncidentsIntoDangerZones correctly converts incident reports with coordinates', () => {
    const rawIncidents = [
      {
        incident_id: 101,
        incident_type: 'accident',
        severity: 'high',
        description: 'Brake lock and spin out near highway merge',
        delivery: {
          request: {
            dropoff_lat: '8.4760',
            dropoff_lng: '124.7160',
          },
        },
      },
      {
        incident_id: 102,
        incident_type: 'lost_item', // Should be skipped (not a road danger)
        severity: 'low',
        delivery: {
          request: {
            dropoff_lat: '8.4800',
            dropoff_lng: '124.7200',
          },
        },
      },
    ];

    const merged = mergeIncidentsIntoDangerZones(rawIncidents);
    expect(merged.length).toBe(1);
    expect(merged[0].id).toBe('incident-101');
    expect(merged[0].category).toBe('reported_incident');
    expect(merged[0].severity).toBe('critical');
    expect(merged[0].lat).toBeCloseTo(8.476, 3);
  });
});
