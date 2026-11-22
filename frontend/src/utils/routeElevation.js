import L from 'leaflet';
import api from '../api/api-client';

/**
 * Grade thresholds and visual styling configuration
 */
export const STEEPNESS_CONFIG = {
  normal: {
    label: 'Normal Road (< 5%)',
    color: '#0284c7', // Sky Blue matching base route
    weight: 4,
    opacity: 0.85,
    maxGrade: 5.0,
    badgeBg: '#f0f9ff',
    badgeText: '#0369a1',
    badgeBorder: '#bae6fd',
  },
  moderate: {
    label: 'Moderate Slope (5% - 7.9%)',
    color: '#f59e0b', // Amber / Gold
    weight: 5,
    opacity: 0.95,
    minGrade: 5.0,
    maxGrade: 8.0,
    badgeBg: '#fffbeb',
    badgeText: '#b45309',
    badgeBorder: '#fde68a',
  },
  steep: {
    label: 'Steep Road (8% - 11.9%)',
    color: '#ea580c', // Vivid Orange
    weight: 6,
    opacity: 0.98,
    minGrade: 8.0,
    maxGrade: 12.0,
    badgeBg: '#fff7ed',
    badgeText: '#c2410c',
    badgeBorder: '#fed7aa',
  },
  very_steep: {
    label: 'Very Steep Road (≥ 12%)',
    color: '#ef4444', // Danger Red
    weight: 7,
    opacity: 1.0,
    minGrade: 12.0,
    badgeBg: '#fef2f2',
    badgeText: '#b91c1c',
    badgeBorder: '#fecaca',
  },
};

/**
 * Fetch elevation and steepness analysis for an array of route coordinates
 * @param {Array<[number, number]|{lat: number, lng: number}>} coordinates
 * @param {Object} options
 * @returns {Promise<{summary: Object, segments: Array, points: Array}>}
 */
export async function fetchRouteSteepness(coordinates, options = {}) {
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    return {
      summary: {
        total_distance_m: 0,
        elevation_gain_m: 0,
        elevation_loss_m: 0,
        max_grade_pct: 0,
        moderate_segments_count: 0,
        steep_segments_count: 0,
        very_steep_segments_count: 0,
        has_steep_segments: false,
      },
      segments: [],
      points: [],
    };
  }

  // Format coordinates to standard array
  const formattedCoords = coordinates.map((pt) => {
    if (Array.isArray(pt)) {
      return [pt[0], pt[1]];
    }
    if (pt && typeof pt === 'object') {
      return [pt.lat, pt.lng];
    }
    return pt;
  }).filter((pt) => Array.isArray(pt) && Number.isFinite(pt[0]) && Number.isFinite(pt[1]));

  if (formattedCoords.length < 2) {
    return {
      summary: { has_steep_segments: false },
      segments: [],
      points: [],
    };
  }

  try {
    const response = await api.post('/route/steepness', {
      coordinates: formattedCoords,
      sample_interval: options.sampleInterval || 45.0,
      steep_threshold: options.steepThreshold || 8.0,
      very_steep_threshold: options.verySteepThreshold || 12.0,
    });

    return response.data;
  } catch (err) {
    console.warn('Route steepness API failed, rendering route with standard styling:', err.message);
    return {
      summary: {
        total_distance_m: 0,
        elevation_gain_m: 0,
        elevation_loss_m: 0,
        max_grade_pct: 0,
        moderate_segments_count: 0,
        steep_segments_count: 0,
        very_steep_segments_count: 0,
        has_steep_segments: false,
      },
      segments: [],
      points: [],
    };
  }
}

/**
 * Creates HTML popup/tooltip content for a route segment
 */
export function createSegmentTooltipHtml(segment) {
  const isModerate = segment.level === 'moderate';
  const isSteep = segment.level === 'steep';
  const isVerySteep = segment.level === 'very_steep';
  const style = STEEPNESS_CONFIG[segment.level] || STEEPNESS_CONFIG.normal;

  const title = isVerySteep
    ? '🚨 CRITICAL STEEP ROAD'
    : isSteep
    ? '⚠️ STEEP ROAD WARNING'
    : isModerate
    ? '▲ MODERATE SLOPE'
    : 'Road Segment';

  const directionText =
    segment.direction === 'uphill'
      ? '▲ Incline / Ascent'
      : segment.direction === 'downhill'
      ? '▼ Decline / Descent'
      : '― Flat / Level';

  const advisory = isVerySteep
    ? segment.direction === 'downhill'
      ? 'CRITICAL: Severe runaway risk. Stop or downshift to 1st/2nd gear immediately. Engage engine brake and retarder; do NOT ride service brakes.'
      : 'CRITICAL: Extreme engine load. Shift to 1st/2nd gear, monitor coolant/transmission temps, and avoid stalling on gradient.'
    : isSteep
    ? segment.direction === 'downhill'
      ? 'CAUTION: Steep descent. Shift to lower gear (2nd/3rd gear) to prevent brake overheating and fade.'
      : 'CAUTION: Steep incline. Heavy cargo trucks shift to lower gear to maintain torque.'
    : isModerate
    ? segment.direction === 'downhill'
      ? 'ADVISORY: Moderate descent (DPWH standard). Downshift to maintain controlled engine braking.'
      : 'ADVISORY: Moderate incline. Heavy cargo trucks shift down to maintain engine momentum.'
    : 'Standard highway grade. Safe for all commercial truck classes.';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px; font-size: 12px; color: #1e293b;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
        <span style="font-weight: 700; color: ${style.color}; font-size: 13px;">${title}</span>
        <span style="background: ${style.badgeBg}; color: ${style.badgeText}; border: 1px solid ${style.badgeBorder}; padding: 1px 6px; border-radius: 9999px; font-weight: 700; font-size: 11px;">
          ${segment.abs_grade}% Grade
        </span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px; font-size: 11.5px;">
        <div><strong>Direction:</strong> ${directionText}</div>
        <div><strong>Distance:</strong> ${segment.distance_m}m</div>
        <div><strong>Elevation:</strong> ${segment.start_elevation_m}m → ${segment.end_elevation_m}m</div>
        <div><strong>Delta:</strong> ${segment.elevation_change_m > 0 ? '+' : ''}${segment.elevation_change_m}m</div>
      </div>
      <div style="background: ${style.badgeBg}; border-left: 3px solid ${style.color}; padding: 6px 8px; border-radius: 4px; font-size: 11px; color: #334155; line-height: 1.4;">
        ${advisory}
      </div>
    </div>
  `;
}

/**
 * Render color-coded steepness polyline segments onto a Leaflet map
 * @param {L.Map} map
 * @param {Array} segments
 * @param {Object} options
 * @returns {L.LayerGroup}
 */
export function renderSteepnessPolylines(map, segments, options = {}) {
  if (!map || !segments || !Array.isArray(segments) || segments.length === 0) {
    return L.layerGroup();
  }

  const layerGroup = L.layerGroup();
  const renderNormal = options.renderNormal === true;

  segments.forEach((seg) => {
    if (!seg.start || !seg.end) return;

    const isHazard = seg.level === 'moderate' || seg.level === 'steep' || seg.level === 'very_steep';

    // The base OSRM route is already rendered in Sky Blue (#0284c7).
    // Overlay all elevated grades (moderate, steep, and very steep)
    if (!isHazard && !renderNormal) return;

    // Determine the precise path coordinates for this segment
    let latLngs = null;
    if (Array.isArray(seg.path) && seg.path.length > 1) {
      latLngs = seg.path.map((p) => [p.lat, p.lng]);
    } else if (
      Array.isArray(options.originalCoords) &&
      Number.isInteger(seg.start_index) &&
      Number.isInteger(seg.end_index) &&
      seg.end_index >= seg.start_index
    ) {
      const slice = options.originalCoords.slice(seg.start_index, seg.end_index + 1);
      if (slice.length > 0) {
        latLngs = slice.map((pt) => {
          if (Array.isArray(pt)) return [pt[0], pt[1]];
          if (pt && typeof pt === 'object') return [pt.lat, pt.lng];
          return pt;
        });
      }
    }

    if (!latLngs || latLngs.length < 2) {
      latLngs = [
        [seg.start.lat, seg.start.lng],
        [seg.end.lat, seg.end.lng],
      ];
    }

    const conf = STEEPNESS_CONFIG[seg.level] || STEEPNESS_CONFIG.normal;

    // 1. High-contrast white casing under hazards so they stand out boldly
    if (isHazard) {
      const casing = L.polyline(latLngs, {
        color: '#ffffff',
        weight: conf.weight + 3,
        opacity: 0.92,
        lineCap: 'round',
        lineJoin: 'round',
      });
      layerGroup.addLayer(casing);
    }

    // 2. Glowing danger halo for critical very steep segments
    if (seg.level === 'very_steep') {
      const underlay = L.polyline(latLngs, {
        color: '#f87171',
        weight: conf.weight + 7,
        opacity: 0.55,
        lineCap: 'round',
        lineJoin: 'round',
      });
      layerGroup.addLayer(underlay);
    }

    // 3. Colored elevation polyline
    const polyline = L.polyline(latLngs, {
      color: conf.color,
      weight: conf.weight,
      opacity: conf.opacity,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: seg.level === 'very_steep' ? '6, 6' : null,
      dashOffset: '0',
    });

    // Tooltip on hover
    polyline.bindTooltip(
      `<strong>${seg.level === 'very_steep' ? '🔴' : seg.level === 'steep' ? '🟠' : '🟡'} ${seg.abs_grade}% Grade</strong> (${seg.direction}, ${seg.distance_m}m)`,
      {
        sticky: true,
        direction: 'top',
        className: 'hjy-steepness-tooltip',
      }
    );

    // Popup on click with full details
    polyline.bindPopup(createSegmentTooltipHtml(seg), {
      maxWidth: 320,
      className: 'hjy-steepness-popup',
    });

    layerGroup.addLayer(polyline);
  });

  layerGroup.addTo(map);
  return layerGroup;
}

/**
 * Creates a floating Leaflet Legend control for steepness indicators
 * @param {Object} summary
 * @param {Function} onToggle
 * @returns {L.Control}
 */
export function createSteepnessLegendControl(summary = {}, onToggle = null) {
  const legend = L.control({ position: 'bottomright' });

  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'hjy-steepness-legend-box');
    div.style.background = 'rgba(255, 255, 255, 0.96)';
    div.style.padding = '10px 14px';
    div.style.borderRadius = '10px';
    div.style.boxShadow = '0 4px 14px rgba(0,0,0,0.18)';
    div.style.fontSize = '11.5px';
    div.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    div.style.color = '#1e293b';
    div.style.border = '1px solid #cbd5e1';
    div.style.lineHeight = '1.45';
    div.style.maxWidth = '230px';
    div.style.backdropFilter = 'blur(6px)';

    const moderateCount = summary.moderate_segments_count || 0;
    const steepCount = summary.steep_segments_count || 0;
    const verySteepCount = summary.very_steep_segments_count || 0;
    const maxGrade = summary.max_grade_pct || 0;
    const gainM = summary.elevation_gain_m || 0;
    const lossM = summary.elevation_loss_m || 0;

    div.innerHTML = `
      <div style="font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 12px; color: #0f172a;"><i class="fas fa-mountain" style="color: #0284c7; margin-right: 5px;"></i> Road Elevation</span>
        ${maxGrade > 0 ? `<span style="font-size: 10px; background: ${maxGrade >= 12 ? '#fee2e2' : maxGrade >= 8 ? '#ffedd5' : '#fef3c7'}; color: ${maxGrade >= 12 ? '#991b1b' : maxGrade >= 8 ? '#c2410c' : '#92400e'}; padding: 1px 6px; border-radius: 4px; font-weight: 800;">Max ${maxGrade}%</span>` : ''}
      </div>

      ${(gainM > 0 || lossM > 0) ? `
        <div style="display: flex; gap: 8px; font-size: 10.5px; color: #64748b; margin-bottom: 6px; background: #f8fafc; padding: 4px 8px; border-radius: 6px;">
          <span>▲ Climb: +${gainM}m</span>
          <span>▼ Descent: -${lossM}m</span>
        </div>
      ` : ''}

      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <span style="display: inline-block; width: 14px; height: 4px; background: ${STEEPNESS_CONFIG.normal.color}; border-radius: 2px; margin-right: 6px;"></span>
        <span>Normal Road (< 5%)</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <span style="display: inline-block; width: 14px; height: 5px; background: ${STEEPNESS_CONFIG.moderate.color}; border-radius: 2px; margin-right: 6px;"></span>
        <span>Moderate Slope (5-8%) ${moderateCount > 0 ? `<strong style="color: #b45309;">(${moderateCount})</strong>` : ''}</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <span style="display: inline-block; width: 14px; height: 5px; background: ${STEEPNESS_CONFIG.steep.color}; border-radius: 2px; margin-right: 6px;"></span>
        <span>Steep Road (8-12%) ${steepCount > 0 ? `<strong style="color: #c2410c;">(${steepCount})</strong>` : ''}</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 6px;">
        <span style="display: inline-block; width: 14px; height: 6px; background: ${STEEPNESS_CONFIG.very_steep.color}; border-radius: 2px; margin-right: 6px;"></span>
        <span>Very Steep (≥ 12%) ${verySteepCount > 0 ? `<strong style="color: #b91c1c;">(${verySteepCount})</strong>` : ''}</span>
      </div>
      ${(moderateCount > 0 || steepCount > 0 || verySteepCount > 0) ? `
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 5px 8px; font-size: 10px; color: #92400e; margin-top: 4px; line-height: 1.35;">
          ⚠️ <strong>Truck Advisory:</strong> Mountain grades detected. Downshift to lower gear.
        </div>
      ` : ''}
    `;

    L.DomEvent.disableClickPropagation(div);
    return div;
  };

  return legend;
}
