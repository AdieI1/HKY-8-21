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
  calculateRouteRiskSummary,
} from '../../utils/dangerZones';
import {
  fetchRouteSteepness,
  renderSteepnessPolylines,
  createSteepnessLegendControl,
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
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
    );
    const data = await response.json();

    if (!data.length) return null;

    return {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
    };
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
      map = L.map(mapEl);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Route control setup
      const routeWaypoints = [
        L.latLng(pickup.lat, pickup.lng),
        L.latLng(dropoff.lat, dropoff.lng),
      ];

      L.Routing.control({
        waypoints: routeWaypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
        lineOptions: { styles: [{ color: '#0284c7', weight: 5, opacity: 0.85 }] },
        createMarker: (index, waypoint) =>
          L.marker(waypoint.latLng).bindPopup(index === 0 ? '<b>Pick-up Origin</b>' : '<b>Drop-off Destination</b>'),
      })
        .on('routesfound', (event) => {
          if (cancelled) return;
          const route = event.routes[0];
          resolveDistance(route.summary.totalDistance / 1000);
          setStatus('ready');

          // Check proximity to route coordinates
          const coords = route.coordinates && route.coordinates.length > 0 ? route.coordinates : [pickup, dropoff];
          const detected = combinedZones.current.filter((zone) => isZoneNearRoute(zone, coords, 2.0));
          setZonesOnRoute(detected);

          // Render danger zones
          updateDangerLayers(map, coords, detected);

          // Detect & visually mark steep segments along the OSRM route
          fetchRouteSteepness(coords).then((steepnessData) => {
            if (cancelled || !map) return;
            steepnessDataRef.current = steepnessData;
            setSteepnessSummary(steepnessData.summary);

            if (showSteepness && steepnessData.segments && steepnessData.segments.length > 0) {
              if (steepnessLayerGroupRef.current) {
                try { map.removeLayer(steepnessLayerGroupRef.current); } catch (_) {}
              }
              steepnessLayerGroupRef.current = renderSteepnessPolylines(map, steepnessData.segments);

              if (steepnessLegendControlRef.current) {
                try { map.removeControl(steepnessLegendControlRef.current); } catch (_) {}
              }
              const legendCtrl = createSteepnessLegendControl(steepnessData.summary);
              legendCtrl.addTo(map);
              steepnessLegendControlRef.current = legendCtrl;
            }
          }).catch(() => {});
        })
        .on('routingerror', () => {
          if (cancelled) return;
          resolveDistance(haversineKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng));
          setStatus('ready');

          const coords = [pickup, dropoff];
          const detected = combinedZones.current.filter((zone) => isZoneNearRoute(zone, coords, 2.0));
          setZonesOnRoute(detected);
          updateDangerLayers(map, coords, detected);
        })
        .addTo(map);

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
          circle.bindPopup(popupHtml, { maxWidth: 300, className: 'hjy-hazard-popup' });
          marker.bindPopup(popupHtml, { maxWidth: 300, className: 'hjy-hazard-popup' });

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
    onDistanceResolved,
  ]);

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <div ref={setMapEl} style={{ height: 230, borderRadius: 8, background: '#eee' }} />

        {/* Floating Toggle on Top-Right of Map */}
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1000, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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

                  if (steepnessLegendControlRef.current) {
                    try { map.removeControl(steepnessLegendControlRef.current); } catch (_) {}
                  }
                  const legend = createSteepnessLegendControl(steepnessDataRef.current.summary);
                  legend.addTo(map);
                  steepnessLegendControlRef.current = legend;
                }
              } else {
                if (steepnessLayerGroupRef.current) {
                  try { map.removeLayer(steepnessLayerGroupRef.current); } catch (_) {}
                  steepnessLayerGroupRef.current = null;
                }
                if (steepnessLegendControlRef.current) {
                  try { map.removeControl(steepnessLegendControlRef.current); } catch (_) {}
                  steepnessLegendControlRef.current = null;
                }
              }
            }}
            className={`map-danger-toggle-btn ${showSteepness ? 'active' : ''}`}
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              background: showSteepness ? '#0284c7' : '#fff',
              color: showSteepness ? '#fff' : '#334155',
              borderColor: showSteepness ? '#0284c7' : '#cbd5e1',
            }}
            title="Toggle Road Steepness / Grade Analysis"
          >
            <i className="fas fa-mountain"></i>
            <span>Steepness</span>
            {steepnessSummary && (steepnessSummary.steep_segments_count > 0 || steepnessSummary.very_steep_segments_count > 0) && (
              <span
                className="map-danger-toggle-badge"
                style={{ background: steepnessSummary.very_steep_segments_count > 0 ? '#ef4444' : '#f59e0b' }}
              >
                {steepnessSummary.steep_segments_count + steepnessSummary.very_steep_segments_count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowDangerZones(!showDangerZones)}
            className={`map-danger-toggle-btn ${showDangerZones ? 'active' : ''}`}
            style={{ fontSize: '11px', padding: '4px 10px' }}
            title="Toggle Danger Zones Overlay"
          >
            <i className="fas fa-exclamation-triangle"></i>
            <span>{filterRouteOnly ? 'Route Hazards' : 'All Hazards'}</span>
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
                borderRadius: '14px',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Toggle between near route hazards only vs all Mindanao hazards"
            >
              <i className={`fas ${filterRouteOnly ? 'fa-route' : 'fa-globe-asia'}`}></i>
              {filterRouteOnly ? 'Near Route Only' : 'All Mindanao'}
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 13 }}>
        {status === 'loading' && <span style={{ color: '#888' }}>Finding a road route…</span>}
        {status === 'ready' && distanceKm != null && (
          <span>
            <strong>{distanceKm.toFixed(1)} km</strong> by road (OSRM route estimate)
          </span>
        )}
        {status === 'failed' && (
          <span style={{ color: '#888' }}>
            Couldn't geocode one of the addresses — using request distance:{' '}
            <strong>{distanceKm != null ? `${distanceKm} km` : 'not set'}</strong>
          </span>
        )}

        {/* Danger Zones Route Warning Banner */}
        {zonesOnRoute.length > 0 && (() => {
          const risk = calculateRouteRiskSummary(zonesOnRoute);
          const regionsOnRoute = Array.from(new Set(zonesOnRoute.map((z) => z.region).filter(Boolean)));
          return (
            <div className="route-hazard-alert-banner">
              <i className="fas fa-triangle-exclamation"></i>
              <div className="route-hazard-alert-content">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 3 }}>
                  <div className="route-hazard-alert-title">
                    {zonesOnRoute.length} Danger Zone{zonesOnRoute.length > 1 ? 's' : ''} Detected ({regionsOnRoute.join(', ') || 'Mindanao Scope'})
                  </div>
                  <span className={`dz-pill ${risk.level === 'critical' ? 'dz-critical' : risk.level === 'high' ? 'dz-high' : 'dz-moderate'}`}>
                    {risk.label}
                  </span>
                </div>
                <div className="route-hazard-alert-sub">
                  Automated Mindanao Logistics Advisory: Review vehicle braking condition and transit schedule before dispatching.
                </div>
                <div className="route-hazard-chips">
                  {zonesOnRoute.map((z) => (
                    <span key={z.id} className="route-hazard-chip" title={`${z.region ? `[${z.region}] ` : ''}${z.advisory || z.description}`}>
                      <i className="fas fa-shield-alt"></i> {z.name} {z.region ? `(${z.region})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Steep Road Terrain Warning Banner */}
        {steepnessSummary && steepnessSummary.has_steep_segments && (
          <div
            style={{
              marginTop: 8,
              padding: '8px 12px',
              borderRadius: 8,
              background: steepnessSummary.very_steep_segments_count > 0 ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${steepnessSummary.very_steep_segments_count > 0 ? '#fecaca' : '#fde68a'}`,
              color: steepnessSummary.very_steep_segments_count > 0 ? '#991b1b' : '#92400e',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <i
              className={`fas ${steepnessSummary.very_steep_segments_count > 0 ? 'fa-triangle-exclamation' : 'fa-mountain'}`}
              style={{ fontSize: 16 }}
            ></i>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>
                {steepnessSummary.very_steep_segments_count > 0 ? '🚨 Critical Steep Road Segments Detected' : '⚠️ Steep Road Warning'} (Max {steepnessSummary.max_grade_pct}% Grade)
              </div>
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
                {steepnessSummary.very_steep_segments_count > 0 && `${steepnessSummary.very_steep_segments_count} very steep section(s) (≥12%). `}
                {steepnessSummary.steep_segments_count > 0 && `${steepnessSummary.steep_segments_count} steep section(s) (8-12%). `}
                Total Elevation Gain: +{steepnessSummary.elevation_gain_m}m • Descent: -{steepnessSummary.elevation_loss_m}m.
                Advise assigned driver to use low gears and exhaust/engine brakes.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
