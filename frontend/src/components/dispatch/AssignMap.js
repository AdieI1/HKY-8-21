import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import api from '../../api/api-client';
import {
  DEFAULT_DANGER_ZONES,
  HAZARD_CATEGORIES,
  isZoneNearRoute,
  createDangerZoneIcon,
  createDangerZonePopupHtml,
} from '../../utils/dangerZones';
import {
  fetchRouteSteepness,
  renderSteepnessPolylines,
} from '../../utils/routeElevation';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function toDistance(value) {
  const distance = Number(value);
  return Number.isFinite(distance) ? distance : null;
}

function toCoordinate(latitude, longitude) {
  if (latitude == null || latitude === '' || longitude == null || longitude === '') {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const radius = 6371;
  const latitudeDelta = ((lat2 - lat1) * Math.PI) / 180;
  const longitudeDelta = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2;

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocode(address) {
  if (!address) return null;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ph&viewbox=121.50,10.25,126.75,5.30&bounded=1&q=${encodeURIComponent(address)}`
    );
    const data = await response.json();

    if (data && Array.isArray(data) && data.length > 0) {
      for (const item of data) {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (lat >= 5.30 && lat <= 10.25 && lng >= 121.50 && lng <= 126.75) {
          return { lat, lng };
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

export default function AssignMap({
  pickupAddress,
  pickupLat,
  pickupLng,
  dropoffAddress,
  dropoffLat,
  dropoffLng,
  fallbackDistanceKm,
  dangerPoints,
  onDistanceResolved,
}) {
  const [status, setStatus] = useState('loading');
  const [distanceKm, setDistanceKm] = useState(null);
  const [mapEl, setMapEl] = useState(null);
  const [showDangerZones, setShowDangerZones] = useState(true);
  const [filterRouteOnly, setFilterRouteOnly] = useState(true);
  const [zonesOnRoute, setZonesOnRoute] = useState([]);
  const [allZones, setAllZones] = useState(DEFAULT_DANGER_ZONES);
  const [steepnessSummary, setSteepnessSummary] = useState(null);
  const [showSteepness, setShowSteepness] = useState(true);
  const [showSafetyDetails, setShowSafetyDetails] = useState(false);
  const dangerLayerGroupRef = useRef(null);
  const steepnessLayerGroupRef = useRef(null);
  const steepnessLegendControlRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const steepnessDataRef = useRef(null);

  // Fetch API danger zones or merge with props
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/danger-zones');
        if (!cancelled && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setAllZones(res.data);
        }
      } catch {
        // Fallback to DEFAULT_DANGER_ZONES
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Merge any dynamic incident danger points from props
  const combinedZones = useRef(DEFAULT_DANGER_ZONES);
  useEffect(() => {
    let list = [...allZones];
    if (dangerPoints && Array.isArray(dangerPoints) && dangerPoints.length > 0) {
      const extraPoints = dangerPoints.map((pt, idx) => ({
        id: `prop-incident-${idx}-${pt.lat}-${pt.lng}`,
        name: `Reported ${pt.type ? pt.type.toUpperCase() : 'INCIDENT'}`,
        category: 'reported_incident',
        severity: 'critical',
        lat: pt.lat,
        lng: pt.lng,
        radius: 650,
        description: pt.description || 'Past incident reported near this corridor.',
        advisory: 'Exercise caution. Past road collision or breakdown logged here.',
      }));

      // Avoid duplicates
      const existingIds = new Set(list.map((z) => `${z.lat.toFixed(4)},${z.lng.toFixed(4)}`));
      extraPoints.forEach((ep) => {
        const key = `${ep.lat.toFixed(4)},${ep.lng.toFixed(4)}`;
        if (!existingIds.has(key)) {
          list.push(ep);
          existingIds.add(key);
        }
      });
    }
    combinedZones.current = list;
  }, [allZones, dangerPoints]);

  useEffect(() => {
    let cancelled = false;
    let map = null;
    let resizeTimer = null;

    setStatus('loading');
    setDistanceKm(null);
    setZonesOnRoute([]);

    const resolveDistance = (value) => {
      const distance = toDistance(value);
      setDistanceKm(distance);
      onDistanceResolved?.(distance);
      return distance;
    };

    (async () => {
      const savedPickup = toCoordinate(pickupLat, pickupLng);
      const savedDropoff = toCoordinate(dropoffLat, dropoffLng);
      const [pickup, dropoff] = await Promise.all([
        savedPickup || geocode(pickupAddress),
        savedDropoff || geocode(dropoffAddress),
      ]);

      if (cancelled) return;

      if (!pickup || !dropoff) {
        setStatus('failed');
        resolveDistance(fallbackDistanceKm);
        return;
      }

      if (!mapEl) return;

      mapEl.innerHTML = '';
      map = L.map(mapEl, {
        maxBounds: [
          [5.30, 121.50],
          [10.25, 126.75],
        ],
        maxBoundsViscosity: 1.0,
        minZoom: 7,
      });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Route control setup
      const routeWaypoints = [
        L.latLng(pickup.lat, pickup.lng),
        L.latLng(dropoff.lat, dropoff.lng),
      ];

      const routingControl = L.Routing.control({
        waypoints: routeWaypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
        collapsible: true,
        lineOptions: { styles: [{ color: '#0284c7', weight: 5, opacity: 0.85 }] },
        createMarker: (index, waypoint) =>
          L.marker(waypoint.latLng).bindPopup(index === 0 ? '<b>Pick-up Origin</b>' : '<b>Drop-off Destination</b>'),
      });

      const hideRoutingItinerary = () => {
        try {
          const container = routingControl.getContainer();
          if (container) {
            container.style.display = 'none';
            container.style.visibility = 'hidden';
          }
        } catch (_) {}
      };

      routingControl
        .on('routesfound', (event) => {
          hideRoutingItinerary();
          if (cancelled) return;
          const route = event.routes[0];
          resolveDistance(route.summary.totalDistance / 1000);
          setStatus('ready');

          // Check proximity to real road coordinates
          const coords = route.coordinates && route.coordinates.length > 1 ? route.coordinates : [];
          const detected = coords.length > 1 ? combinedZones.current.filter((zone) => isZoneNearRoute(zone, coords, 0.4)) : [];
          setZonesOnRoute(detected);

          // Render danger zones
          updateDangerLayers(map, coords, detected);

          // Detect & visually mark steep segments along the OSRM route
          if (coords.length > 1) {
            fetchRouteSteepness(coords).then((steepnessData) => {
              if (cancelled || !map) return;
              steepnessDataRef.current = steepnessData;
              setSteepnessSummary(steepnessData.summary);

              if (showSteepness && steepnessData.segments && steepnessData.segments.length > 0) {
                if (steepnessLayerGroupRef.current) {
                  try { map.removeLayer(steepnessLayerGroupRef.current); } catch (_) {}
                }
                steepnessLayerGroupRef.current = renderSteepnessPolylines(map, steepnessData.segments, {
                  originalCoords: coords,
                });

                if (steepnessLegendControlRef.current) {
                  try { map.removeControl(steepnessLegendControlRef.current); } catch (_) {}
                  steepnessLegendControlRef.current = null;
                }
              }
            }).catch(() => {});
          }
        })
        .on('routingerror', () => {
          hideRoutingItinerary();
          if (cancelled) return;
          resolveDistance(haversineKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng));
          setStatus('ready');

          const detected = [];
          setZonesOnRoute(detected);
          updateDangerLayers(map, [], detected);
        })
        .addTo(map);

      hideRoutingItinerary();

      const updateDangerLayers = (mapInstance, pathCoords, onRouteList) => {
        if (!mapInstance) return;
        if (dangerLayerGroupRef.current) {
          try {
            mapInstance.removeLayer(dangerLayerGroupRef.current);
          } catch (_) {}
          dangerLayerGroupRef.current = null;
        }

        if (!showDangerZones) return;

        const group = L.layerGroup();
        const targetZones = filterRouteOnly ? onRouteList : combinedZones.current;

        targetZones.forEach((zone) => {
          if (!zone.lat || !zone.lng) return;
          const cat = HAZARD_CATEGORIES[zone.category] || HAZARD_CATEGORIES.accident_prone;
          const isOnRoute = onRouteList.some((z) => z.id === zone.id);

          const circle = L.circle([zone.lat, zone.lng], {
            radius: zone.radius || 750,
            color: isOnRoute ? '#dc2626' : cat.color,
            fillColor: isOnRoute ? '#ef4444' : cat.fillColor,
            fillOpacity: isOnRoute ? 0.24 : 0.12,
            weight: isOnRoute ? 2 : 1.2,
            dashArray: isOnRoute ? '4, 4' : null,
          });

          const marker = L.marker([zone.lat, zone.lng], {
            icon: createDangerZoneIcon(zone, isOnRoute),
            zIndexOffset: isOnRoute ? 600 : 200,
          });

          const popupHtml = createDangerZonePopupHtml(zone, isOnRoute);
          circle.bindPopup(popupHtml, { maxWidth: 240, className: 'hjy-hazard-popup compact' });
          marker.bindPopup(popupHtml, { maxWidth: 240, className: 'hjy-hazard-popup compact' });

          group.addLayer(circle);
          group.addLayer(marker);
        });

        group.addTo(mapInstance);
        dangerLayerGroupRef.current = group;
      };

      resizeTimer = setTimeout(() => map?.invalidateSize(), 150);
    })();

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      if (dangerLayerGroupRef.current && map) {
        try {
          map.removeLayer(dangerLayerGroupRef.current);
        } catch (_) {}
      }
      if (steepnessLayerGroupRef.current && map) {
        try {
          map.removeLayer(steepnessLayerGroupRef.current);
        } catch (_) {}
      }
      if (steepnessLegendControlRef.current && map) {
        try {
          map.removeControl(steepnessLegendControlRef.current);
        } catch (_) {}
      }
      map?.remove();
      mapInstanceRef.current = null;
    };
  }, [
    pickupAddress,
    pickupLat,
    pickupLng,
    dropoffAddress,
    dropoffLat,
    dropoffLng,
    fallbackDistanceKm,
    dangerPoints,
    mapEl,
    showDangerZones,
    filterRouteOnly,
    showSteepness,
    onDistanceResolved,
  ]);

  return (
    <div>
      {/* Map Toolbar Header: clean and outside the map canvas */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fas fa-route" style={{ color: '#C53030' }}></i>
          <span>Route &amp; Safety Overview</span>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Steepness Overlay Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const nextState = !showSteepness;
              setShowSteepness(nextState);
              const map = mapInstanceRef.current;
              if (!map) return;

              if (nextState) {
                if (steepnessDataRef.current && steepnessDataRef.current.segments && steepnessDataRef.current.segments.length > 0) {
                  if (steepnessLayerGroupRef.current) {
                    try { map.removeLayer(steepnessLayerGroupRef.current); } catch (_) {}
                  }
                  steepnessLayerGroupRef.current = renderSteepnessPolylines(map, steepnessDataRef.current.segments);
                }
              } else {
                if (steepnessLayerGroupRef.current) {
                  try { map.removeLayer(steepnessLayerGroupRef.current); } catch (_) {}
                  steepnessLayerGroupRef.current = null;
                }
              }
            }}
            className={`map-danger-toggle-btn ${showSteepness ? 'active' : ''}`}
            style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: showSteepness ? '#0284c7' : '#fff',
              color: showSteepness ? '#fff' : '#334155',
              borderColor: showSteepness ? '#0284c7' : '#cbd5e1',
            }}
            title="Toggle Road Steepness / Grade Analysis"
          >
            <i className="fas fa-mountain"></i>
            <span>Steepness</span>
          </button>

          {/* Hazard Toggle Button */}
          <button
            type="button"
            onClick={() => setShowDangerZones(!showDangerZones)}
            className={`map-danger-toggle-btn ${showDangerZones ? 'active' : ''}`}
            style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}
            title="Toggle Danger Zones Overlay"
          >
            <i className="fas fa-exclamation-triangle"></i>
            <span>Hazards</span>
            <span className="map-danger-toggle-badge">{zonesOnRoute.length}</span>
          </button>

          {showDangerZones && (
            <button
              type="button"
              onClick={() => setFilterRouteOnly(!filterRouteOnly)}
              style={{
                background: filterRouteOnly ? '#fff' : '#fee2e2',
                color: filterRouteOnly ? '#334155' : '#991b1b',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Toggle between near route hazards only vs all Mindanao hazards"
            >
              <i className={`fas ${filterRouteOnly ? 'fa-route' : 'fa-globe-asia'}`}></i>
              {filterRouteOnly ? 'Route Only' : 'All'}
            </button>
          )}
        </div>
      </div>

      {/* Map Canvas: Clean & Unobstructed */}
      <div style={{ position: 'relative' }}>
        <div ref={setMapEl} style={{ height: 230, borderRadius: 8, background: '#eee' }} />
      </div>

      {/* Minimalist 1-Line Safety Status Bar */}
      <div
        style={{
          marginTop: 8,
          padding: '8px 12px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {/* Distance & Status Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-road" style={{ color: '#64748B', fontSize: 12 }}></i>
              <strong style={{ color: '#0F172A', fontWeight: 700 }}>
                {distanceKm != null ? `${distanceKm.toFixed(1)} km` : status === 'loading' ? 'Calculating…' : '—'}
              </strong>
              <span style={{ color: '#64748B', fontSize: 12 }}>by road</span>
            </div>

            {/* Danger Zones Pill */}
            {zonesOnRoute.length > 0 ? (
              <span
                style={{
                  background: '#FEE2E2',
                  color: '#991B1B',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '1px solid #FECACA',
                }}
              >
                <i className="fas fa-triangle-exclamation"></i>
                {zonesOnRoute.length} Danger Zone{zonesOnRoute.length > 1 ? 's' : ''}
              </span>
            ) : (
              <span
                style={{
                  background: '#F0FDF4',
                  color: '#166534',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <i className="fas fa-circle-check"></i> Clear Route
              </span>
            )}

            {/* Terrain Steepness Pill */}
            {steepnessSummary && steepnessSummary.has_steep_segments && (
              <span
                style={{
                  background: steepnessSummary.very_steep_segments_count > 0 ? '#FEE2E2' : '#FFEDD5',
                  color: steepnessSummary.very_steep_segments_count > 0 ? '#991B1B' : '#C2410C',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  border: `1px solid ${steepnessSummary.very_steep_segments_count > 0 ? '#FECACA' : '#FED7AA'}`,
                }}
              >
                <i className="fas fa-mountain"></i>
                Steep: Max {steepnessSummary.max_grade_pct}% Grade
              </span>
            )}
          </div>

          {/* Expand Details Trigger */}
          {(zonesOnRoute.length > 0 || (steepnessSummary && steepnessSummary.has_steep_segments)) && (
            <button
              type="button"
              onClick={() => setShowSafetyDetails(!showSafetyDetails)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>{showSafetyDetails ? 'Hide Details' : 'View Safety Details'}</span>
              <i className={`fas fa-chevron-${showSafetyDetails ? 'up' : 'down'}`} style={{ fontSize: 10 }}></i>
            </button>
          )}
        </div>

        {/* Collapsible Details (Zero bloat, only when clicked) */}
        {showSafetyDetails && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12,
            }}
          >
            {zonesOnRoute.length > 0 && (
              <div>
                <div style={{ color: '#991B1B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>
                  <i className="fas fa-shield-halved" style={{ marginRight: 4 }}></i>
                  Detected Hazards on Route:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {zonesOnRoute.map((z) => {
                    // Clean up name by removing repetitive '(Northern Mindanao)' or similar suffix
                    const cleanName = (z.name || '').replace(/\s*\([^)]*\)\s*$/, '').trim() || z.name;
                    return (
                      <span
                        key={z.id}
                        style={{
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          color: '#7F1D1D',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                        title={z.advisory || z.description || z.name}
                      >
                        • {cleanName}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {steepnessSummary && steepnessSummary.has_steep_segments && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '6px 10px', color: '#92400E', fontSize: 11 }}>
                <i className="fas fa-triangle-exclamation" style={{ marginRight: 4 }}></i>
                <strong>Mountain Pass Advice:</strong> Total Climb +{steepnessSummary.elevation_gain_m}m, Descent -{steepnessSummary.elevation_loss_m}m. Advise driver to use low gears on steep passes.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
