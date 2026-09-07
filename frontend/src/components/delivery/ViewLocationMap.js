import React, { useState, useEffect, useRef } from 'react';
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
  createSteepnessLegendControl,
} from '../../utils/routeElevation';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Cache geocode results in memory so we don't spam Nominatim on GPS updates
const geocodeCache = new Map();
async function geocode(address) {
  if (!address) return null;
  const trimmed = address.trim();
  if (geocodeCache.has(trimmed)) return geocodeCache.get(trimmed);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`
    );
    const data = await res.json();
    const result =
      data && data.length ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
    if (result) geocodeCache.set(trimmed, result);
    return result;
  } catch {
    return null;
  }
}

export default function ViewLocationMap({
  pickupAddress,
  dropoffAddress,
  driverLocation,
  onEtaChange,
  onDangerZonesDetected,
}) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routingControlRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const dangerZoneLayerRef = useRef(null);
  const centeredOnDriverRef = useRef(false);
  const etaCallbackRef = useRef(onEtaChange);
  const detectedCallbackRef = useRef(onDangerZonesDetected);

  const [status, setStatus] = useState('loading');
  const [coords, setCoords] = useState({ pickup: null, dropoff: null });
  const [dangerZones, setDangerZones] = useState(DEFAULT_DANGER_ZONES);
  const [showDangerZones, setShowDangerZones] = useState(true);
  const [filterRouteOnly, setFilterRouteOnly] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [zonesOnRoute, setZonesOnRoute] = useState([]);
  const [steepnessSummary, setSteepnessSummary] = useState(null);
  const [showSteepness, setShowSteepness] = useState(true);
  const steepnessLayerRef = useRef(null);
  const steepnessLegendControlRef = useRef(null);
  const steepnessDataRef = useRef(null);

  useEffect(() => {
    etaCallbackRef.current = onEtaChange;
  }, [onEtaChange]);

  useEffect(() => {
    detectedCallbackRef.current = onDangerZonesDetected;
  }, [onDangerZonesDetected]);

  // 0. Load server danger zones (combining predefined zones with live incidents)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/danger-zones');
        if (!cancelled && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setDangerZones(res.data);
        }
      } catch {
        // Fallback to DEFAULT_DANGER_ZONES already in state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 1. Initialize Map instance once on mount
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([8.4542, 124.6319], 13); // Default center (CDO)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (dangerZoneLayerRef.current) {
        try {
          map.removeLayer(dangerZoneLayerRef.current);
        } catch (_) {}
      }
      if (routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (_) {}
      }
      map.remove();
      mapInstanceRef.current = null;
      driverMarkerRef.current = null;
      routingControlRef.current = null;
      dangerZoneLayerRef.current = null;
      centeredOnDriverRef.current = false;
    };
  }, []);

  // 2. Geocode addresses when pickupAddress or dropoffAddress change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      const [pickup, dropoff] = await Promise.all([
        geocode(pickupAddress),
        geocode(dropoffAddress),
      ]);
      if (cancelled) return;
      if (!pickup && !dropoff) {
        setStatus('failed');
      } else {
        setCoords({ pickup, dropoff });
        setStatus('ready');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pickupAddress, dropoffAddress]);

  // 3. Create or update the Route when coordinates are ready
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !coords.dropoff) return;

    const startPt = driverLocation || coords.pickup;
    if (!startPt) return;

    if (!routingControlRef.current) {
      try {
        const control = L.Routing.control({
          waypoints: [
            L.latLng(startPt.lat, startPt.lng),
            L.latLng(coords.dropoff.lat, coords.dropoff.lng),
          ],
          routeWhileDragging: false,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: !driverLocation,
          show: false,
          lineOptions: {
            styles: [{ color: '#0284c7', weight: 5, opacity: 0.85 }],
          },
          createMarker: (i, wp, nWps) => {
            const isStart = i === 0;
            const isEnd = i === nWps - 1;
            if (isStart && driverLocation) {
              return null;
            }
            return L.marker(wp.latLng, {
              icon: L.divIcon({
                className: 'route-waypoint-marker',
                html: `
                  <div style="
                    background: ${isStart ? '#10b981' : '#dc2626'};
                    color: #fff;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
                    font-size: 13px;
                  ">
                    <i class="fas fa-${isStart ? 'box' : 'flag-checkered'}"></i>
                  </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -16],
              }),
            }).bindPopup(isStart ? '<b>Pick-up Location</b>' : isEnd ? '<b>Drop-off Destination</b>' : '<b>Waypoint</b>');
          },
        })
          .on('routesfound', (e) => {
            if (e.routes && e.routes[0]) {
              const route = e.routes[0];
              const totalSeconds = route.summary.totalTime;
              const hrs = Math.floor(totalSeconds / 3600);
              const mins = Math.round((totalSeconds % 3600) / 60);
              const text = hrs > 0 ? `${hrs}hr${hrs > 1 ? 's' : ''} ${mins}mins` : `${mins}mins`;
              if (etaCallbackRef.current) {
                etaCallbackRef.current(text);
              }

              // Extract route polyline coordinates for precise danger zone proximity check
              if (route.coordinates && route.coordinates.length > 0) {
                setRouteCoordinates(route.coordinates);
              } else {
                setRouteCoordinates([
                  { lat: startPt.lat, lng: startPt.lng },
                  { lat: coords.dropoff.lat, lng: coords.dropoff.lng },
                ]);
              }
            }
          })
          .addTo(map);

        routingControlRef.current = control;
      } catch (err) {
        console.error('Error creating route control:', err);
      }
    } else {
      try {
        routingControlRef.current.setWaypoints([
          L.latLng(startPt.lat, startPt.lng),
          L.latLng(coords.dropoff.lat, coords.dropoff.lng),
        ]);
      } catch (err) {
        console.error('Error updating waypoints:', err);
      }
    }
  }, [coords, driverLocation]);

  // 4. Check which danger zones intersect the active route
  useEffect(() => {
    const waypoints =
      routeCoordinates.length > 0
        ? routeCoordinates
        : coords.dropoff && (driverLocation || coords.pickup)
        ? [driverLocation || coords.pickup, coords.dropoff]
        : [];

    if (waypoints.length === 0) {
      setZonesOnRoute([]);
      detectedCallbackRef.current?.([]);
      return;
    }

    const detected = dangerZones.filter((zone) => isZoneNearRoute(zone, waypoints, 2.0));
    setZonesOnRoute(detected);
    detectedCallbackRef.current?.(detected);
  }, [routeCoordinates, dangerZones, coords, driverLocation]);

  // 4b. Fetch route steepness / elevation profile
  useEffect(() => {
    if (!routeCoordinates || routeCoordinates.length < 2) return;
    let cancelled = false;

    fetchRouteSteepness(routeCoordinates).then((data) => {
      if (cancelled) return;
      steepnessDataRef.current = data;
      setSteepnessSummary(data.summary);
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [routeCoordinates]);

  // 4c. Render route steepness layer and legend
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (steepnessLayerRef.current) {
      try { map.removeLayer(steepnessLayerRef.current); } catch (_) {}
      steepnessLayerRef.current = null;
    }
    if (steepnessLegendControlRef.current) {
      try { map.removeControl(steepnessLegendControlRef.current); } catch (_) {}
      steepnessLegendControlRef.current = null;
    }

    if (!showSteepness || !steepnessDataRef.current?.segments?.length) {
      return;
    }

    const layer = renderSteepnessPolylines(map, steepnessDataRef.current.segments);
    steepnessLayerRef.current = layer;

    const legend = createSteepnessLegendControl(steepnessDataRef.current.summary);
    legend.addTo(map);
    steepnessLegendControlRef.current = legend;

    return () => {
      if (steepnessLayerRef.current && map) {
        try { map.removeLayer(steepnessLayerRef.current); } catch (_) {}
        steepnessLayerRef.current = null;
      }
      if (steepnessLegendControlRef.current && map) {
        try { map.removeControl(steepnessLegendControlRef.current); } catch (_) {}
        steepnessLegendControlRef.current = null;
      }
    };
  }, [showSteepness, steepnessSummary]);

  // 5. Render Danger Zones Overlay Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (dangerZoneLayerRef.current) {
      map.removeLayer(dangerZoneLayerRef.current);
      dangerZoneLayerRef.current = null;
    }

    if (!showDangerZones) return;

    const layerGroup = L.layerGroup();
    const waypoints =
      routeCoordinates.length > 0
        ? routeCoordinates
        : coords.dropoff && (driverLocation || coords.pickup)
        ? [driverLocation || coords.pickup, coords.dropoff]
        : [];

    // ONLY render near hazards on the chosen route (or all if user toggles off filter)
    const targetZones = filterRouteOnly
      ? (waypoints.length > 0 ? dangerZones.filter((zone) => isZoneNearRoute(zone, waypoints, 2.8)) : [])
      : dangerZones;

    targetZones.forEach((zone) => {
      if (!zone.lat || !zone.lng) return;
      const cat = HAZARD_CATEGORIES[zone.category] || HAZARD_CATEGORIES.accident_prone;
      const onRoute = waypoints.length > 0 ? isZoneNearRoute(zone, waypoints, 2.8) : false;

      // Visual hazard zone circle
      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius || 750,
        color: onRoute ? '#dc2626' : cat.color,
        fillColor: onRoute ? '#ef4444' : cat.fillColor,
        fillOpacity: onRoute ? 0.22 : 0.12,
        weight: onRoute ? 2 : 1.2,
        dashArray: onRoute ? '4, 4' : null,
      });

      // Custom marker with pulsing radar animation for critical or on-route hazards
      const marker = L.marker([zone.lat, zone.lng], {
        icon: createDangerZoneIcon(zone, onRoute),
        zIndexOffset: onRoute ? 600 : 250,
      });

      const popupHtml = createDangerZonePopupHtml(zone, onRoute);
      circle.bindPopup(popupHtml, { maxWidth: 320, className: 'hjy-hazard-popup' });
      marker.bindPopup(popupHtml, { maxWidth: 320, className: 'hjy-hazard-popup' });

      layerGroup.addLayer(circle);
      layerGroup.addLayer(marker);
    });

    layerGroup.addTo(map);
    dangerZoneLayerRef.current = layerGroup;

    return () => {
      if (dangerZoneLayerRef.current && map) {
        map.removeLayer(dangerZoneLayerRef.current);
        dangerZoneLayerRef.current = null;
      }
    };
  }, [dangerZones, showDangerZones, filterRouteOnly, routeCoordinates, coords, driverLocation]);

  // 6. Update Driver Marker and center view smoothly
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !driverLocation?.lat || !driverLocation?.lng) return;

    const latLng = [driverLocation.lat, driverLocation.lng];

    const driverIcon = L.divIcon({
      className: 'driver-live-marker',
      html: `
        <div style="
          position: relative;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(158, 30, 33, 0.25);
          "></div>
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
            background: #9E1E21;
            color: #ffffff;
            border: 2.5px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            font-size: 14px;
          ">
            <i class="fas fa-truck"></i>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -24],
    });

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker(latLng, { icon: driverIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<b>Driver Live Location</b><br/>In Transit');
    } else {
      driverMarkerRef.current.setLatLng(latLng);
    }

    if (!centeredOnDriverRef.current) {
      map.setView(latLng, 15, { animate: true });
      centeredOnDriverRef.current = true;
    } else {
      map.panTo(latLng, { animate: true });
    }
  }, [driverLocation]);

  // Recenter button click
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (map && driverLocation?.lat && driverLocation?.lng) {
      map.setView([driverLocation.lat, driverLocation.lng], 16, { animate: true });
    } else if (map && coords.dropoff) {
      map.setView([coords.dropoff.lat, coords.dropoff.lng], 14, { animate: true });
    }
  };

  return (
    <div className="map-area" style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Floating Danger Zones & Steepness Control Bar */}
      <div className="map-danger-control-bar" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {/* Steepness Overlay Toggle Button */}
        <button
          type="button"
          onClick={() => setShowSteepness(!showSteepness)}
          className={`map-danger-toggle-btn ${showSteepness ? 'active' : ''}`}
          style={{
            background: showSteepness ? '#0284c7' : '#fff',
            color: showSteepness ? '#fff' : '#334155',
            borderColor: showSteepness ? '#0284c7' : '#cbd5e1',
          }}
          title="Toggle Steep Road Elevation Analysis"
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
          title="Toggle Danger Zones Overlay"
        >
          <i className="fas fa-exclamation-triangle"></i>
          <span>{filterRouteOnly ? 'Route Hazards' : 'All Hazards'}</span>
          <span className="map-danger-toggle-badge" title={`${zonesOnRoute.length} hazard zone(s) near this chosen route`}>
            {zonesOnRoute.length} ON ROUTE
          </span>
        </button>

        {showDangerZones && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setFilterRouteOnly(!filterRouteOnly)}
              style={{
                background: filterRouteOnly ? '#fff' : '#fee2e2',
                color: filterRouteOnly ? '#334155' : '#991b1b',
                border: '1px solid #cbd5e1',
                borderRadius: '16px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Click to toggle between only showing near hazards on chosen route vs all Mindanao hazards"
            >
              <i className={`fas ${filterRouteOnly ? 'fa-route' : 'fa-globe-asia'}`}></i>
              {filterRouteOnly ? 'Route Only' : 'All Mindanao'}
            </button>

            <button
              type="button"
              onClick={() => setShowLegend(!showLegend)}
              style={{
                background: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '16px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                color: '#475569',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              }}
            >
              <i className="fas fa-layer-group" style={{ marginRight: '4px' }}></i>
              {showLegend ? 'Hide Legend' : 'Legend'}
            </button>
          </div>
        )}

        {showDangerZones && showLegend && (
          <div className="map-danger-legend">
            <div className="map-danger-legend-title">
              <span>Hazard Categories</span>
              <i
                className="fas fa-times"
                style={{ cursor: 'pointer', opacity: 0.7 }}
                onClick={() => setShowLegend(false)}
              ></i>
            </div>
            {Object.entries(HAZARD_CATEGORIES).map(([key, cat]) => (
              <div key={key} className="map-danger-legend-row">
                <div className="legend-dot" style={{ background: cat.color }} />
                <span>{cat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Recenter / Driver Focus Button */}
      {driverLocation && (
        <button
          type="button"
          onClick={handleRecenter}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 1000,
            background: '#9E1E21',
            color: '#fff',
            border: 'none',
            borderRadius: '24px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          title="Center on Driver"
        >
          <i className="fas fa-crosshairs"></i>
          Focus Driver
        </button>
      )}

      {status === 'failed' && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: '#fff',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            color: '#dc2626',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            zIndex: 1000,
          }}
        >
          <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
          Couldn't load route coordinates for this address.
        </div>
      )}
    </div>
  );
}
