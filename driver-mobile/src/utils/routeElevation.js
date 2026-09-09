import { API_URL } from "../../services/api";

/**
 * Grade thresholds and visual styling configuration for Driver Mobile
 */
export const STEEPNESS_CONFIG = {
  normal: {
    label: "Normal Road (<8%)",
    color: "#0284C7", // Sky Blue
    weight: 5,
  },
  steep: {
    label: "Steep Road (8% - 12%)",
    color: "#F59E0B", // Amber / Orange
    weight: 6,
  },
  very_steep: {
    label: "Very Steep Road (≥12%)",
    color: "#EF4444", // Danger Red
    weight: 7,
  },
};

/**
 * Fetch elevation and steepness analysis for an array of route coordinates
 * @param {Array<{latitude: number, longitude: number}>} coordinates
 * @returns {Promise<{summary: Object, segments: Array<{coordinates: Array<{latitude: number, longitude: number}>, category: string, grade: number}>}>}
 */
export async function fetchRouteSteepnessMobile(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return {
      summary: { has_steep_segments: false, max_grade_pct: 0 },
      segments: [],
    };
  }

  // Format to standard [lat, lng] array expected by backend
  const formattedCoords = coordinates
    .filter((pt) => pt && Number.isFinite(pt.latitude) && Number.isFinite(pt.longitude))
    .map((pt) => [pt.latitude, pt.longitude]);

  if (formattedCoords.length < 2) {
    return {
      summary: { has_steep_segments: false, max_grade_pct: 0 },
      segments: [],
    };
  }

  try {
    const res = await fetch(`${API_URL}/route/steepness`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        coordinates: formattedCoords,
        sample_interval: 60.0,
        steep_threshold: 8.0,
        very_steep_threshold: 12.0,
      }),
    });

    if (!res.ok) {
      throw new Error(`Steepness API returned status ${res.status}`);
    }

    const data = await res.json();
    const rawSegments = data?.segments || [];

    // Map backend segments back to react-native-maps coordinates
    const segments = rawSegments.map((seg) => {
      const segCoords = (seg.coordinates || []).map((coord) => ({
        latitude: Array.isArray(coord) ? coord[0] : coord.lat,
        longitude: Array.isArray(coord) ? coord[1] : coord.lng,
      }));

      return {
        category: seg.category || "normal",
        grade: seg.grade_percent || 0,
        coordinates: segCoords,
      };
    });

    return {
      summary: data?.summary || { has_steep_segments: false, max_grade_pct: 0 },
      segments,
    };
  } catch (err) {
    console.warn("Route steepness mobile API fallback:", err?.message);
    return {
      summary: { has_steep_segments: false, max_grade_pct: 0 },
      segments: [
        {
          category: "normal",
          grade: 0,
          coordinates,
        },
      ],
    };
  }
}
