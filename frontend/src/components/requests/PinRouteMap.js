import { useState, useEffect, useRef } from 'react';
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

export async function geocode(address) {
  if (!address) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export function hasCoords(point) {
  return !!point && point.lat != null && point.lng != null;
}

export default function PinRouteMap({ pickup, dropoff, onPickupChange, onDropoffChange, onDistanceChange }) {
  const [mapEl, setMapEl] = useState(null);
  const [activeMode, setActiveMode] = useState('pickup');
  const [routeStatus, setRouteStatus] = useState('idle');
  const [showDangerZones, setShowDangerZones] = useState(true);
  const [filterRouteOnly, setFilterRouteOnly] = useState(true);
  const [dangerZones, setDangerZones] = useState(DEFAULT_DANGER_ZONES);
  const [zonesOnRoute, setZonesOnRoute] = useState([]);
  const [steepnessSummary, setSteepnessSummary] = useState(null);
  const [showSteepness, setShowSteepness] = useState(true);

  const mapRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const routingRef = useRef(null);
  const dangerLayerGroupRef = useRef(null);
  const steepnessLayerRef = useRef(null);
  const steepnessLegendControlRef = useRef(null);
  const steepnessDataRef = useRef(null);
  const activeModeRef = useRef(activeMode);
  const onDistanceChangeRef = useRef(onDistanceChange);
  const prevRouteKeyRef = useRef('');
  const lastReportedDistanceRef = useRef(null);
  const steepnessDebounceTimerRef = useRef(null);

  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);
  useEffect(() => { onDistanceChangeRef.current = onDistanceChange; }, [onDistanceChange]);

  // Load backend danger zones or fallback to defaults
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/danger-zones');
        if (!cancelled && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setDangerZones(res.data);
        }
      } catch {
        // Fallback to DEFAULT_DANGER_ZONES
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapEl || mapRef.current) return;
    const map = L.map(mapEl).setView([8.4542, 124.6319], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      const address = await reverseGeocode(lat, lng);
      if (activeModeRef.current === 'pickup') {
        onPickupChange({ lat, lng, address });
        setActiveMode('dropoff');
      } else {
        onDropoffChange({ lat, lng, address });
      }
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      if (dangerLayerGroupRef.current) {
        try {
          map.removeLayer(dangerLayerGroupRef.current);
        } catch (_) {}
      }
      if (steepnessLayerRef.current) {
        try {
          map.removeLayer(steepnessLayerRef.current);
        } catch (_) {}
      }
      if (steepnessLegendControlRef.current) {
        try {
          map.removeControl(steepnessLegendControlRef.current);
        } catch (_) {}
      }
    };
  }, [mapEl, onPickupChange, onDropoffChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCoords(pickup)) return;
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
    } else {
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng]).addTo(map).bindPopup('<b>Pick-up Location</b>').openPopup();
    }
  }, [pickup]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCoords(dropoff)) return;
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lng]);
    } else {
      dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng]).addTo(map).bindPopup('<b>Drop-off Location</b>').openPopup();
    }
  }, [dropoff]);

  // Route calculation and waypoint handling
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCoords(pickup) || !hasCoords(dropoff)) return;

    const pLat = Number(pickup.lat).toFixed(5);
    const pLng = Number(pickup.lng).toFixed(5);
    const dLat = Number(dropoff.lat).toFixed(5);
    const dLng = Number(dropoff.lng).toFixed(5);
    const routeKey = `${pLat},${pLng}->${dLat},${dLng}`;

    // Skip if identical waypoints already calculated
    if (routeKey === prevRouteKeyRef.current && routingRef.current) {
      return;
    }
    prevRouteKeyRef.current = routeKey;

    setRouteStatus('loading');
    const waypoints = [L.latLng(pickup.lat, pickup.lng), L.latLng(dropoff.lat, dropoff.lng)];

    if (!routingRef.current) {
      routingRef.current = L.Routing.control({
        waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
        createMarker: () => null,
        lineOptions: { styles: [{ color: '#0284c7', weight: 5, opacity: 0.85 }] },
      })
        .on('routesfound', (e) => {
          setRouteStatus('ready');
          const distKm = Math.round((e.routes[0].summary.totalDistance / 1000) * 10) / 10;
          if (lastReportedDistanceRef.current !== distKm) {
            lastReportedDistanceRef.current = distKm;
            onDistanceChangeRef.current?.(distKm);
          }

          const coords = e.routes[0].coordinates || [pickup, dropoff];
          const detected = dangerZones.filter((zone) => isZoneNearRoute(zone, coords, 2.0));
          setZonesOnRoute(detected);

          // Debounce steepness calculation to prevent rapid repeated requests
          if (steepnessDebounceTimerRef.current) {
            clearTimeout(steepnessDebounceTimerRef.current);
          }

          steepnessDebounceTimerRef.current = setTimeout(() => {
            fetchRouteSteepness(coords).then((data) => {
              if (!mapRef.current) return;
              steepnessDataRef.current = data;
              setSteepnessSummary(data.summary);

              if (showSteepness && data.segments && data.segments.length > 0) {
                if (steepnessLayerRef.current) {
                  try { mapRef.current.removeLayer(steepnessLayerRef.current); } catch (_) {}
                }
                steepnessLayerRef.current = renderSteepnessPolylines(mapRef.current, data.segments, {
                  originalCoords: coords,
                });

                if (steepnessLegendControlRef.current) {
                  try { mapRef.current.removeControl(steepnessLegendControlRef.current); } catch (_) {}
                }
                const legend = createSteepnessLegendControl(data.summary);
                legend.addTo(mapRef.current);
                steepnessLegendControlRef.current = legend;
              }
            }).catch(() => {});
          }, 300);
        })
        .on('routingerror', () => {
          setRouteStatus('failed');
          const coords = [pickup, dropoff];
          const detected = dangerZones.filter((zone) => isZoneNearRoute(zone, coords, 2.0));
          setZonesOnRoute(detected);
        })
        .addTo(map);
    } else {
      routingRef.current.setWaypoints(waypoints);
    }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  // Render Danger Zones Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (dangerLayerGroupRef.current) {
      try {
        map.removeLayer(dangerLayerGroupRef.current);
      } catch (_) {}
      dangerLayerGroupRef.current = null;
    }

    if (!showDangerZones) return;

    const group = L.layerGroup();
    const routeCoords = hasCoords(pickup) && hasCoords(dropoff) ? [pickup, dropoff] : [];

    // ONLY render near hazards on the chosen route (or all if filter toggled off)
    const targetZones = filterRouteOnly
      ? (routeCoords.length > 0 ? dangerZones.filter((z) => isZoneNearRoute(z, routeCoords, 2.8)) : [])
      : dangerZones;

    targetZones.forEach((zone) => {
      if (!zone.lat || !zone.lng) return;
      const cat = HAZARD_CATEGORIES[zone.category] || HAZARD_CATEGORIES.accident_prone;
      const isOnRoute = routeCoords.length > 0 && isZoneNearRoute(zone, routeCoords, 2.8);

      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius || 750,
        color: isOnRoute ? '#dc2626' : cat.color,
        fillColor: isOnRoute ? '#ef4444' : cat.fillColor,
        fillOpacity: isOnRoute ? 0.22 : 0.12,
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

    group.addTo(map);
    dangerLayerGroupRef.current = group;

    return () => {
      if (dangerLayerGroupRef.current && map) {
        try {
          map.removeLayer(dangerLayerGroupRef.current);
        } catch (_) {}
      }
    };
  }, [dangerZones, showDangerZones, filterRouteOnly, pickup, dropoff]);

  const pickupReady = hasCoords(pickup);
  const dropoffReady = hasCoords(dropoff);

  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveMode('pickup')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #ccc',
              background: activeMode === 'pickup' ? '#2e7d32' : '#fff',
              color: activeMode === 'pickup' ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <i className="fas fa-box" style={{ marginRight: 6 }}></i>
            Click map: Set Pickup
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('dropoff')}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #ccc',
              background: activeMode === 'dropoff' ? '#9E1E21' : '#fff',
              color: activeMode === 'dropoff' ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <i className="fas fa-flag-checkered" style={{ marginRight: 6 }}></i>
            Click map: Set Drop-off
          </button>
        </div>

        {/* Hazard & Terrain Overlays */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Steepness Overlay Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextState = !showSteepness;
              setShowSteepness(nextState);
              const map = mapRef.current;
              if (!map) return;

              if (nextState) {
                if (steepnessDataRef.current && steepnessDataRef.current.segments && steepnessDataRef.current.segments.length > 0) {
                  if (steepnessLayerRef.current) {
                    try { map.removeLayer(steepnessLayerRef.current); } catch (_) {}
                  }
                  steepnessLayerRef.current = renderSteepnessPolylines(map, steepnessDataRef.current.segments);

                  if (steepnessLegendControlRef.current) {
                    try { map.removeControl(steepnessLegendControlRef.current); } catch (_) {}
                  }
                  const legend = createSteepnessLegendControl(steepnessDataRef.current.summary);
                  legend.addTo(map);
                  steepnessLegendControlRef.current = legend;
                }
              } else {
                if (steepnessLayerRef.current) {
                  try { map.removeLayer(steepnessLayerRef.current); } catch (_) {}
                  steepnessLayerRef.current = null;
                }
                if (steepnessLegendControlRef.current) {
                  try { map.removeControl(steepnessLegendControlRef.current); } catch (_) {}
                  steepnessLegendControlRef.current = null;
                }
              }
            }}
            className={`map-danger-toggle-btn ${showSteepness ? 'active' : ''}`}
            style={{
              padding: '5px 10px',
              fontSize: '11.5px',
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
            style={{ padding: '5px 10px', fontSize: '11.5px' }}
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
                padding: '4px 8px',
                fontSize: '10.5px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Toggle between only showing near hazards on chosen route vs all Mindanao hazards"
            >
              <i className={`fas ${filterRouteOnly ? 'fa-route' : 'fa-globe-asia'}`}></i>
              {filterRouteOnly ? 'Route Only' : 'All Mindanao'}
            </button>
          )}
        </div>
      </div>

      <div ref={setMapEl} style={{ height: 320, borderRadius: 8, background: '#eee', position: 'relative' }} />

      <div style={{ marginTop: 6, fontSize: 13 }}>
        {!pickupReady && <span style={{ color: '#888' }}>Click the map to drop the pickup pin.</span>}
        {pickupReady && !dropoffReady && <span style={{ color: '#888' }}>Pickup set — now click the map for drop-off.</span>}
        {routeStatus === 'loading' && <span style={{ color: '#888' }}>Finding a road route…</span>}
        {routeStatus === 'ready' && <span style={{ color: '#2e7d32' }}>Distance auto-filled from the road route.</span>}
        {routeStatus === 'failed' && <span style={{ color: '#888' }}>Couldn't find a road route between these points — enter distance manually.</span>}
      </div>

      {/* Hazard Advisory Banner for planned route */}
      {zonesOnRoute.length > 0 && (() => {
        const risk = calculateRouteRiskSummary(zonesOnRoute);
        const regionsOnRoute = Array.from(new Set(zonesOnRoute.map((z) => z.region).filter(Boolean)));
        return (
          <div className="route-hazard-alert-banner" style={{ marginTop: '8px', padding: '8px 12px' }}>
            <i className="fas fa-triangle-exclamation"></i>
            <div className="route-hazard-alert-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                <div className="route-hazard-alert-title" style={{ fontSize: '12.5px' }}>
                  Planned Route Crosses {zonesOnRoute.length} Hazard Area{zonesOnRoute.length > 1 ? 's' : ''} ({regionsOnRoute.join(', ') || 'Mindanao Scope'})
                </div>
                <span className={`dz-pill ${risk.level === 'critical' ? 'dz-critical' : risk.level === 'high' ? 'dz-high' : 'dz-moderate'}`}>
                  {risk.label}
                </span>
              </div>
              <div className="route-hazard-chips">
                {zonesOnRoute.map((z) => (
                  <span key={z.id} className="route-hazard-chip" title={`${z.region ? `[${z.region}] ` : ''}${z.advisory || z.description}`}>
                    {z.name} {z.region ? `(${z.region})` : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Steep Road Warning Banner */}
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
              {steepnessSummary.very_steep_segments_count > 0 ? '🚨 Critical Steep Terrain Along Route' : '⚠️ Steep Road Warning'} (Max {steepnessSummary.max_grade_pct}% Grade)
            </div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
              {steepnessSummary.very_steep_segments_count > 0 && `${steepnessSummary.very_steep_segments_count} very steep section(s) (≥12%). `}
              {steepnessSummary.steep_segments_count > 0 && `${steepnessSummary.steep_segments_count} steep section(s) (8-12%). `}
              Total Elevation Gain: +{steepnessSummary.elevation_gain_m}m • Descent: -{steepnessSummary.elevation_loss_m}m.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
