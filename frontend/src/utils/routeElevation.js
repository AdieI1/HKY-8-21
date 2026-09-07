import L from 'leaflet';
import api from '../api/api-client';

/**
 * Grade thresholds and visual styling configuration
 */
export const STEEPNESS_CONFIG = {
  normal: {
    label: 'Normal Road',
    color: '#2563eb', // Royal Blue
    weight: 4,
    opacity: 0.85,
    maxGrade: 8.0,
    badgeBg: '#eff6ff',
    badgeText: '#1d4ed8',
    badgeBorder: '#bfdbfe',
  },
  steep: {
    label: 'Steep Road (8% - 12%)',
    color: '#f59e0b', // Amber / Orange
    weight: 6,
    opacity: 0.95,
    minGrade: 8.0,
    maxGrade: 12.0,
    badgeBg: '#fffbeb',
    badgeText: '#b45309',
    badgeBorder: '#fde68a',
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

  // For long routes across Mindanao (which can have thousands of points), downsample on client to max 250 points
  let payloadCoords = formattedCoords;
  if (formattedCoords.length > 250) {
    const step = Math.ceil(formattedCoords.length / 250);
    payloadCoords = formattedCoords.filter((_, idx) => idx === 0 || idx === formattedCoords.length - 1 || idx % step === 0);
  }

  try {
    const response = await api.post('/route/steepness', {
      coordinates: payloadCoords,
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
  const isSteep = segment.level === 'steep';
  const isVerySteep = segment.level === 'very_steep';
  const style = STEEPNESS_CONFIG[segment.level] || STEEPNESS_CONFIG.normal;

  const title = isVerySteep
    ? '🚨 CRITICAL STEEP ROAD'
    : isSteep
    ? '⚠️ STEEP ROAD WARNING'
    : 'Road Segment';

  const directionText =
    segment.direction === 'uphill'
      ? '▲ Incline / Ascent'
      : segment.direction === 'downhill'
      ? '▼ Decline / Descent'
      : '― Flat / Level';

  const advisory = isVerySteep
    ? segment.direction === 'downhill'
      ? 'CRITICAL: High runaway risk. Downshift to low gear now. Use engine brake and retarder; avoid riding the service brakes.'
      : 'CRITICAL: Heavy engine load. Maintain momentum in low gear, monitor engine temperature and avoid stopping on gradient.'
    : isSteep
    ? segment.direction === 'downhill'
      ? 'CAUTION: Steep descent. Shift to lower gear to prevent brake overheating and fade.'
      : 'CAUTION: Steep incline. Heavy cargo trucks shift to lower gear to maintain torque.'
    : 'Standard highway grade. Safe for all commercial truck classes.';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 210px; font-size: 12px; color: #1e293b;">
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
      <div style="background: ${style.badgeBg}; border-left: 3px solid ${style.color}; padding: 5px 8px; border-radius: 4px; font-size: 11px; color: #334155; line-height: 1.35;">
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

  segments.forEach((seg) => {
    if (!seg.start || !seg.end) return;

    const latLngs = [
      [seg.start.lat, seg.start.lng],
      [seg.end.lat, seg.end.lng],
    ];

    const conf = STEEPNESS_CONFIG[seg.level] || STEEPNESS_CONFIG.normal;
    const isHazard = seg.level === 'steep' || seg.level === 'very_steep';

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
      `<strong>${seg.level === 'very_steep' ? '🔴' : seg.level === 'steep' ? '🟠' : '🔵'} ${seg.abs_grade}% Grade</strong> (${seg.direction}, ${seg.distance_m}m)`,
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
    div.style.padding = '8px 12px';
    div.style.borderRadius = '8px';
    div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
    div.style.fontSize = '11.5px';
    div.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    div.style.color = '#1e293b';
    div.style.border = '1px solid #cbd5e1';
    div.style.lineHeight = '1.4';
    div.style.maxWidth = '220px';
    div.style.backdropFilter = 'blur(4px)';

    const steepCount = summary.steep_segments_count || 0;
    const verySteepCount = summary.very_steep_segments_count || 0;
    const maxGrade = summary.max_grade_pct || 0;

    div.innerHTML = `
      <div style="font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
        <span><i class="fas fa-mountain" style="color: #64748b; margin-right: 4px;"></i> Route Terrain</span>
        ${maxGrade > 0 ? `<span style="font-size: 10.5px; background: #fee2e2; color: #991b1b; padding: 1px 5px; border-radius: 4px; font-weight: 700;">Max ${maxGrade}%</span>` : ''}
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <span style="display: inline-block; width: 14px; height: 4px; background: ${STEEPNESS_CONFIG.normal.color}; border-radius: 2px; margin-right: 6px;"></span>
        <span>Normal Road (< 8%)</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 4px;">
        <span style="display: inline-block; width: 14px; height: 5px; background: ${STEEPNESS_CONFIG.steep.color}; border-radius: 2px; margin-right: 6px;"></span>
        <span>Steep Road (8-12%) ${steepCount > 0 ? `<strong>(${steepCount})</strong>` : ''}</span>
      </div>
      <div style="display: flex; align-items: center; margin-bottom: 6px;">
        <span style="display: inline-block; width: 14px; height: 6px; background: ${STEEPNESS_CONFIG.very_steep.color}; border-radius: 2px; margin-right: 6px;"></span>
        <span>Very Steep (≥ 12%) ${verySteepCount > 0 ? `<strong style="color: #b91c1c;">(${verySteepCount})</strong>` : ''}</span>
      </div>
      ${steepCount > 0 || verySteepCount > 0 ? `
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 4px 6px; font-size: 10px; color: #92400e; margin-top: 4px;">
          ⚠️ <strong>Truck Advisory:</strong> Steep grades ahead. Inspect brakes & downshift.
        </div>
      ` : ''}
    `;

    L.DomEvent.disableClickPropagation(div);
    return div;
  };

  return legend;
}
