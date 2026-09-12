import {
  STEEPNESS_CONFIG,
  fetchRouteSteepness,
  createSegmentTooltipHtml,
} from './routeElevation';

// Mock api client
jest.mock('../api/api-client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import api from '../api/api-client';

describe('routeElevation utility tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('STEEPNESS_CONFIG has normal, moderate, steep, and very_steep with distinct colors', () => {
    expect(STEEPNESS_CONFIG.normal).toBeDefined();
    expect(STEEPNESS_CONFIG.moderate).toBeDefined();
    expect(STEEPNESS_CONFIG.steep).toBeDefined();
    expect(STEEPNESS_CONFIG.very_steep).toBeDefined();

    expect(STEEPNESS_CONFIG.normal.color).toBe('#0284c7');
    expect(STEEPNESS_CONFIG.moderate.color).toBe('#f59e0b');
    expect(STEEPNESS_CONFIG.steep.color).toBe('#ea580c');
    expect(STEEPNESS_CONFIG.very_steep.color).toBe('#ef4444');
  });

  test('fetchRouteSteepness returns empty structure when coordinates are empty or less than 2', async () => {
    const res1 = await fetchRouteSteepness([]);
    expect(res1.segments).toEqual([]);
    expect(res1.summary.has_steep_segments).toBe(false);

    const res2 = await fetchRouteSteepness([[8.47, 124.71]]);
    expect(res2.segments).toEqual([]);
  });

  test('fetchRouteSteepness calls /route/steepness with formatted coordinates', async () => {
    const mockData = {
      summary: {
        total_distance_m: 1200,
        max_grade_pct: 9.4,
        steep_segments_count: 1,
        very_steep_segments_count: 0,
        has_steep_segments: true,
      },
      segments: [
        {
          start: { lat: 8.475, lng: 124.715 },
          end: { lat: 8.48, lng: 124.72 },
          grade: 9.4,
          abs_grade: 9.4,
          level: 'steep',
          direction: 'uphill',
          distance_m: 600,
          elevation_change_m: 56.4,
          start_elevation_m: 10,
          end_elevation_m: 66.4,
        },
      ],
      points: [],
    };

    api.post.mockResolvedValueOnce({ data: mockData });

    const coords = [
      { lat: 8.475, lng: 124.715 },
      { lat: 8.48, lng: 124.72 },
    ];

    const result = await fetchRouteSteepness(coords);
    expect(api.post).toHaveBeenCalledWith(
      '/route/steepness',
      expect.objectContaining({
        coordinates: [
          [8.475, 124.715],
          [8.48, 124.72],
        ],
      })
    );
    expect(result.summary.has_steep_segments).toBe(true);
    expect(result.segments.length).toBe(1);
    expect(result.segments[0].level).toBe('steep');
  });

  test('createSegmentTooltipHtml contains grade %, advisory, and direction info', () => {
    const steepSegment = {
      start: { lat: 8.475, lng: 124.715 },
      end: { lat: 8.48, lng: 124.72 },
      grade: 9.4,
      abs_grade: 9.4,
      level: 'steep',
      direction: 'uphill',
      distance_m: 450,
      elevation_change_m: 42.3,
      start_elevation_m: 20,
      end_elevation_m: 62.3,
    };

    const html = createSegmentTooltipHtml(steepSegment);
    expect(html).toContain('9.4% Grade');
    expect(html).toContain('STEEP ROAD WARNING');
    expect(html).toContain('Incline');
    expect(html).toContain('450m');

    const verySteepSegment = {
      start: { lat: 8.48, lng: 124.72 },
      end: { lat: 8.485, lng: 124.725 },
      grade: -13.2,
      abs_grade: 13.2,
      level: 'very_steep',
      direction: 'downhill',
      distance_m: 350,
      elevation_change_m: -46.2,
      start_elevation_m: 62.3,
      end_elevation_m: 16.1,
    };

    const verySteepHtml = createSegmentTooltipHtml(verySteepSegment);
    expect(verySteepHtml).toContain('CRITICAL STEEP ROAD');
    expect(verySteepHtml).toContain('13.2% Grade');
    expect(verySteepHtml).toContain('Decline');
    expect(verySteepHtml).toContain('runaway risk');
  });

  test('renderSteepnessPolylines only renders hazards by default to avoid cluttering base route', () => {
    const { renderSteepnessPolylines } = require('./routeElevation');
    const mockMap = {
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
    };

    const normalSegments = [
      {
        start: { lat: 8.475, lng: 124.715 },
        end: { lat: 8.48, lng: 124.72 },
        grade: 2.1,
        abs_grade: 2.1,
        level: 'normal',
      },
    ];

    const group = renderSteepnessPolylines(mockMap, normalSegments);
    expect(group.getLayers().length).toBe(0);

    const steepSegments = [
      {
        start: { lat: 8.475, lng: 124.715 },
        end: { lat: 8.48, lng: 124.72 },
        path: [
          { lat: 8.475, lng: 124.715 },
          { lat: 8.477, lng: 124.718 },
          { lat: 8.48, lng: 124.72 },
        ],
        grade: 9.5,
        abs_grade: 9.5,
        level: 'steep',
        direction: 'uphill',
        distance_m: 400,
      },
    ];

    const hazardGroup = renderSteepnessPolylines(mockMap, steepSegments);
    // Should have casing + polyline = 2 layers
    expect(hazardGroup.getLayers().length).toBe(2);
  });
});
