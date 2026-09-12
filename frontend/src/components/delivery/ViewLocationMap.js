import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import {
  computeTripSpeedMetrics,
  getSpeedCategory,
  SPEED_LIMIT_KMH,
} from '../../utils/speedTelemetry';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Cagayan de Oro City Center Fallbacks
const CDO_DEFAULT_CENTER = { lat: 8.4862, lng: 124.6522 };
const DEFAULT_HQ = { lat: 8.4982, lng: 124.6540 };

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

function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 30) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 1) return `${secs}s ago`;
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// In-memory geocoding cache
const geocodeCache = new Map();
async function geocode(address) {
  if (!address) return null;
  const trimmed = address.trim();
  if (geocodeCache.has(trimmed)) return geocodeCache.get(trimmed);

  try {
    // Restricted to entire Mindanao bounding box
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ph&viewbox=121.50,10.25,126.75,5.30&bounded=1&q=${encodeURIComponent(
      trimmed
    )}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    let result = null;
    if (data && Array.isArray(data) && data.length > 0) {
      for (const item of data) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (lat >= 5.30 && lat <= 10.25 && lng >= 121.50 && lng <= 126.75) {
          result = { lat, lng };
          break;
        }
      }
    }
    if (result) geocodeCache.set(trimmed, result);
    return result;
  } catch {
    return null;
  }
}

export default function ViewLocationMap({
  pickupAddress,
  pickupLat,
  pickupLng,
  dropoffAddress,
  dropoffLat,
  dropoffLng,
  driverLocation,
  trackingHistory = [],
  deliveryStatus,
  driverName,
  driverPhone,
  vehiclePlate,
  onEtaChange,
  onDangerZonesDetected,
}) {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routingControlRef = useRef(null);
  const fallbackPolylineRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const driverPulseCircleRef = useRef(null);
  const breadcrumbTrailRef = useRef(null);
  const trajectoryLineRef = useRef(null);
  const dangerZoneLayerRef = useRef(null);
  const steepnessLayerRef = useRef(null);
  const steepnessLegendControlRef = useRef(null);
  const steepnessDataRef = useRef(null);

  const initialFitDoneRef = useRef(false);
  const prevRouteKeyRef = useRef('');
  const prevDriverCoordRef = useRef(null);
  const currentBearingRef = useRef(0);
  const etaCallbackRef = useRef(onEtaChange);
  const detectedCallbackRef = useRef(onDangerZonesDetected);

  const [status, setStatus] = useState('loading');
  const [coords, setCoords] = useState({ pickup: null, dropoff: null });
  const [dangerZones, setDangerZones] = useState(DEFAULT_DANGER_ZONES);
  // Route hazards are optional and defaulted to OFF to focus on steepness and speed
  const [showDangerZones, setShowDangerZones] = useState(false);
  const [filterRouteOnly, setFilterRouteOnly] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [zonesOnRoute, setZonesOnRoute] = useState([]);
  const [steepnessSummary, setSteepnessSummary] = useState(null);
  const [showSteepness, setShowSteepness] = useState(true);
  const [followDriver, setFollowDriver] = useState(true);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);
  const [showSpeedHud, setShowSpeedHud] = useState(true);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const layersMenuRef = useRef(null);

  // Speed and movement telemetry computed from tracking history and latest GPS ping
  const speedMetrics = useMemo(() => {
    return computeTripSpeedMetrics(trackingHistory, driverLocation);
  }, [trackingHistory, driverLocation]);

  // Click-outside listener to close the overlays dropdown menu
  useEffect(() => {
    function handleClickOutside(e) {
      if (layersMenuRef.current && !layersMenuRef.current.contains(e.target)) {
        setShowLayersMenu(false);
      }
    }
    if (showLayersMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLayersMenu]);

  useEffect(() => {
    etaCallbackRef.current = onEtaChange;
  }, [onEtaChange]);

  useEffect(() => {
    detectedCallbackRef.current = onDangerZonesDetected;
  }, [onDangerZonesDetected]);

  // 0. Load server danger zones
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

  // 1. Initialize Leaflet Map instance
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
      maxBounds: [
        [5.30, 121.50],
        [10.25, 126.75],
      ],
      maxBoundsViscosity: 1.0,
      minZoom: 7,
    }).setView([CDO_DEFAULT_CENTER.lat, CDO_DEFAULT_CENTER.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      detectRetina: true,
    }).addTo(map);

    // If user manually drags/pans map, temporarily disable auto-follow so it doesn't fight them
    map.on('dragstart', () => {
      setFollowDriver(false);
    });

    mapInstanceRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (routingControlRef.current) {
        try { map.removeControl(routingControlRef.current); } catch (_) {}
      }
      if (fallbackPolylineRef.current) {
        try { map.removeLayer(fallbackPolylineRef.current); } catch (_) {}
      }
      if (dangerZoneLayerRef.current) {
        try { map.removeLayer(dangerZoneLayerRef.current); } catch (_) {}
      }
      if (steepnessLayerRef.current) {
        try { map.removeLayer(steepnessLayerRef.current); } catch (_) {}
      }
      if (steepnessLegendControlRef.current) {
        try { map.removeControl(steepnessLegendControlRef.current); } catch (_) {}
      }
      if (breadcrumbTrailRef.current) {
        try { map.removeLayer(breadcrumbTrailRef.current); } catch (_) {}
      }
      if (trajectoryLineRef.current) {
        try { map.removeLayer(trajectoryLineRef.current); } catch (_) {}
      }
      map.remove();
      mapInstanceRef.current = null;
      driverMarkerRef.current = null;
      driverPulseCircleRef.current = null;
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;
      routingControlRef.current = null;
      dangerZoneLayerRef.current = null;
      breadcrumbTrailRef.current = null;
      trajectoryLineRef.current = null;
      initialFitDoneRef.current = false;
      prevRouteKeyRef.current = '';
    };
  }, []);

  // 2. High-Accuracy Coordinates Resolution: Prioritize exact GPS props over geocoding
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStatus('loading');
      const savedPickup = toCoordinate(pickupLat, pickupLng);
      const savedDropoff = toCoordinate(dropoffLat, dropoffLng);

      const [resolvedPickup, resolvedDropoff] = await Promise.all([
        savedPickup || geocode(pickupAddress),
        savedDropoff || geocode(dropoffAddress),
      ]);

      if (cancelled) return;

      const finalPickup = resolvedPickup || (resolvedDropoff ? DEFAULT_HQ : CDO_DEFAULT_CENTER);
      const finalDropoff = resolvedDropoff || (resolvedPickup ? resolvedPickup : null);

      if (!finalDropoff && !finalPickup) {
        setStatus('failed');
      } else {
        setCoords({ pickup: finalPickup, dropoff: finalDropoff });
        setStatus('ready');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pickupAddress, pickupLat, pickupLng, dropoffAddress, dropoffLat, dropoffLng]);

  // 3. Render Permanent Pick-up & Drop-off Markers with exact coordinates & popups
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // --- PICKUP MARKER ---
    if (coords.pickup) {
      const pickupLatLng = [coords.pickup.lat, coords.pickup.lng];
      if (!pickupMarkerRef.current) {
        const pickupIcon = L.divIcon({
          className: 'map-waypoint-pin-wrapper',
          html: `
            <div class="map-waypoint-pin pickup" title="Pick-up Location">
              <i class="fas fa-box"></i>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -18],
        });

        const marker = L.marker(pickupLatLng, { icon: pickupIcon, zIndexOffset: 800 }).addTo(map);
        marker.bindPopup(`
          <div class="map-popup-card">
            <span class="map-popup-tag pickup">ORIGIN • PICK-UP</span>
            <div class="map-popup-title">${pickupAddress || 'Pick-up Location'}</div>
            <div class="map-popup-coord">GPS: ${coords.pickup.lat.toFixed(6)}, ${coords.pickup.lng.toFixed(6)}</div>
          </div>
        `);
        pickupMarkerRef.current = marker;
      } else {
        pickupMarkerRef.current.setLatLng(pickupLatLng);
      }
    }

    // --- DROPOFF MARKER ---
    if (coords.dropoff) {
      const dropoffLatLng = [coords.dropoff.lat, coords.dropoff.lng];
      if (!dropoffMarkerRef.current) {
        const dropoffIcon = L.divIcon({
          className: 'map-waypoint-pin-wrapper',
          html: `
            <div class="map-waypoint-pin dropoff" title="Drop-off Destination">
              <i class="fas fa-flag-checkered"></i>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -18],
        });

        const marker = L.marker(dropoffLatLng, { icon: dropoffIcon, zIndexOffset: 800 }).addTo(map);
        marker.bindPopup(`
          <div class="map-popup-card">
            <span class="map-popup-tag dropoff">DESTINATION • DROP-OFF</span>
            <div class="map-popup-title">${dropoffAddress || 'Drop-off Destination'}</div>
            <div class="map-popup-coord">GPS: ${coords.dropoff.lat.toFixed(6)}, ${coords.dropoff.lng.toFixed(6)}</div>
          </div>
        `);
        dropoffMarkerRef.current = marker;
      } else {
        dropoffMarkerRef.current.setLatLng(dropoffLatLng);
      }
    }
  }, [coords, pickupAddress, dropoffAddress]);

  // 4. Stable Route Engine: Calculate baseline route between pickup & dropoff once (no OSRM spamming)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !coords.pickup || !coords.dropoff) return;

    const routeKey = `${coords.pickup.lat.toFixed(4)},${coords.pickup.lng.toFixed(4)}->${coords.dropoff.lat.toFixed(4)},${coords.dropoff.lng.toFixed(4)}`;
    if (routeKey === prevRouteKeyRef.current) return;
    prevRouteKeyRef.current = routeKey;

    if (routingControlRef.current) {
      try { map.removeControl(routingControlRef.current); } catch (_) {}
      routingControlRef.current = null;
    }
    if (fallbackPolylineRef.current) {
      try { map.removeLayer(fallbackPolylineRef.current); } catch (_) {}
      fallbackPolylineRef.current = null;
    }

    const waypoints = [
      L.latLng(coords.pickup.lat, coords.pickup.lng),
      L.latLng(coords.dropoff.lat, coords.dropoff.lng),
    ];

    try {
      const control = L.Routing.control({
        waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        show: false,
        createMarker: () => null, // We maintain our custom, styled markers
        lineOptions: {
          styles: [
            { color: '#0284c7', weight: 6, opacity: 0.85 },
            { color: '#38bdf8', weight: 3, opacity: 0.95 },
          ],
        },
      })
        .on('routesfound', (e) => {
          if (e.routes && e.routes[0]) {
            const route = e.routes[0];
            const totalSeconds = route.summary.totalTime;
            const hrs = Math.floor(totalSeconds / 3600);
            const mins = Math.round((totalSeconds % 3600) / 60);
            const text = hrs > 0 ? `${hrs}hr${hrs > 1 ? 's' : ''} ${mins}mins` : `${mins}mins`;
            etaCallbackRef.current?.(text);

            if (route.coordinates && route.coordinates.length > 0) {
              setRouteCoordinates(route.coordinates);
            } else {
              setRouteCoordinates([
                { lat: coords.pickup.lat, lng: coords.pickup.lng },
                { lat: coords.dropoff.lat, lng: coords.dropoff.lng },
              ]);
            }
          }
        })
        .on('routingerror', () => {
          // Fallback straight-line polyline if OSRM service is rate-limited or unreachable
          if (!fallbackPolylineRef.current) {
            const polyline = L.polyline(
              [
                [coords.pickup.lat, coords.pickup.lng],
                [coords.dropoff.lat, coords.dropoff.lng],
              ],
              { color: '#0284c7', weight: 5, dashArray: '6, 8', opacity: 0.8 }
            ).addTo(map);
            fallbackPolylineRef.current = polyline;
            setRouteCoordinates([
              { lat: coords.pickup.lat, lng: coords.pickup.lng },
              { lat: coords.dropoff.lat, lng: coords.dropoff.lng },
            ]);
          }
        })
        .addTo(map);

      routingControlRef.current = control;
    } catch (err) {
      console.warn('Leaflet routing initialization notice:', err);
    }
  }, [coords]);

  // 5. Initial Camera Framing: Fit bounds to encompass Pickup, Dropoff, and Driver
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || initialFitDoneRef.current) return;

    const pts = [];
    if (coords.pickup) pts.push([coords.pickup.lat, coords.pickup.lng]);
    if (coords.dropoff) pts.push([coords.dropoff.lat, coords.dropoff.lng]);
    if (driverLocation?.lat && driverLocation?.lng) {
      pts.push([driverLocation.lat, driverLocation.lng]);
    }

    if (pts.length > 0) {
      map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 16 });
      initialFitDoneRef.current = true;
    }
  }, [coords, driverLocation]);

  // 6. Live Driver Marker & Dynamic Heading Direction Bearing
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !driverLocation?.lat || !driverLocation?.lng) return;

    const latLng = [driverLocation.lat, driverLocation.lng];

    // Compute dynamic bearing angle
    let bearing = currentBearingRef.current;
    if (prevDriverCoordRef.current) {
      const dist = haversineKm(
        prevDriverCoordRef.current.lat,
        prevDriverCoordRef.current.lng,
        driverLocation.lat,
        driverLocation.lng
      );
      if (dist > 0.003) {
        // moved > 3 meters
        bearing = calculateBearing(
          prevDriverCoordRef.current.lat,
          prevDriverCoordRef.current.lng,
          driverLocation.lat,
          driverLocation.lng
        );
        currentBearingRef.current = bearing;
      }
    } else if (coords.dropoff) {
      // Default bearing pointing towards drop-off
      bearing = calculateBearing(
        driverLocation.lat,
        driverLocation.lng,
        coords.dropoff.lat,
        coords.dropoff.lng
      );
      currentBearingRef.current = bearing;
    }
    prevDriverCoordRef.current = { lat: driverLocation.lat, lng: driverLocation.lng };

    // Distance remaining to drop-off
    const remainingKm = coords.dropoff
      ? haversineKm(driverLocation.lat, driverLocation.lng, coords.dropoff.lat, coords.dropoff.lng)
      : null;

    const driverHtml = `
      <div class="driver-marker-wrapper" title="${driverName || 'Driver'} • Live GPS • ${speedMetrics.currentSpeed} km/h">
        <div class="driver-speed-pill ${speedMetrics.category.badgeClass}">
          <span class="speed-pulse-dot" style="background: ${speedMetrics.category.color};"></span>
          <span>${speedMetrics.currentSpeed} km/h</span>
        </div>
        <div class="driver-marker-radar"></div>
        <div class="driver-marker-core">
          <div class="driver-heading-pointer" style="transform: translateX(-50%) rotate(${Math.round(bearing)}deg); transform-origin: 50% 24px;"></div>
          <i class="fas fa-truck"></i>
        </div>
      </div>
    `;

    const driverIcon = L.divIcon({
      className: 'driver-live-marker',
      html: driverHtml,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -26],
    });

    const popupHtml = `
      <div class="map-popup-card">
        <span class="map-popup-tag driver">LIVE DRIVER GPS</span>
        <div class="map-popup-title">${driverName || 'Assigned Driver'}</div>
        <div class="map-popup-speed-row" style="background: ${speedMetrics.category.bg}; border: 1px solid ${speedMetrics.category.border}; color: ${speedMetrics.category.color};">
          <i class="fas ${speedMetrics.category.icon}"></i>
          <span><strong>${speedMetrics.currentSpeed} km/h</strong> • ${speedMetrics.category.label}</span>
        </div>
        <div class="map-popup-meta">
          <span><i class="fas fa-truck"></i> ${vehiclePlate || 'Assigned Fleet Vehicle'}</span>
          <span><i class="fas fa-phone"></i> ${driverPhone || 'No contact on file'}</span>
          <span><i class="fas fa-clock"></i> Updated ${formatRelativeTime(driverLocation.timestamp)}</span>
          ${remainingKm != null ? `<span><i class="fas fa-route"></i> ${remainingKm.toFixed(1)} km to destination</span>` : ''}
          <span><i class="fas fa-tachometer-alt"></i> Avg: ${speedMetrics.avgSpeed} km/h • Peak: ${speedMetrics.peakSpeed} km/h</span>
        </div>
        <div class="map-popup-coord">GPS: ${driverLocation.lat.toFixed(6)}, ${driverLocation.lng.toFixed(6)}</div>
      </div>
    `;

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker(latLng, { icon: driverIcon, zIndexOffset: 1200 })
        .addTo(map)
        .bindPopup(popupHtml);
    } else {
      driverMarkerRef.current.setIcon(driverIcon);
      driverMarkerRef.current.setLatLng(latLng);
      driverMarkerRef.current.setPopupContent(popupHtml);
    }

    // Subtle GPS accuracy aura circle
    if (!driverPulseCircleRef.current) {
      driverPulseCircleRef.current = L.circle(latLng, {
        radius: 35,
        color: '#C53030',
        fillColor: '#C53030',
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '3, 4',
      }).addTo(map);
    } else {
      driverPulseCircleRef.current.setLatLng(latLng);
    }

    // Smooth auto-follow if enabled
    if (followDriver) {
      map.panTo(latLng, { animate: true, duration: 0.8 });
    }
  }, [driverLocation, coords, driverName, driverPhone, vehiclePlate, followDriver, speedMetrics]);

  // 7. Render Traveled Breadcrumb History Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (breadcrumbTrailRef.current) {
      try { map.removeLayer(breadcrumbTrailRef.current); } catch (_) {}
      breadcrumbTrailRef.current = null;
    }

    if (!showBreadcrumbs || !Array.isArray(trackingHistory) || trackingHistory.length < 2) {
      return;
    }

    const trailPts = trackingHistory
      .filter((pt) => pt.latitude != null && pt.longitude != null)
      .map((pt) => [Number(pt.latitude), Number(pt.longitude)]);

    if (trailPts.length < 2) return;

    const polyline = L.polyline(trailPts, {
      color: '#0284c7',
      weight: 4,
      opacity: 0.8,
      dashArray: '6, 6',
      lineJoin: 'round',
    });

    polyline.bindTooltip(
      `<span><i class="fas fa-history"></i> Traveled Path (${trailPts.length} GPS pings) • Avg Speed: <strong>${speedMetrics.avgSpeed} km/h</strong> • Peak: <strong>${speedMetrics.peakSpeed} km/h</strong></span>`,
      { sticky: true }
    );

    polyline.addTo(map);
    breadcrumbTrailRef.current = polyline;

    return () => {
      if (breadcrumbTrailRef.current && map) {
        try { map.removeLayer(breadcrumbTrailRef.current); } catch (_) {}
        breadcrumbTrailRef.current = null;
      }
    };
  }, [trackingHistory, showBreadcrumbs, speedMetrics]);

  // 8. Dynamic Trajectory Line from Driver to Drop-off Destination
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (trajectoryLineRef.current) {
      try { map.removeLayer(trajectoryLineRef.current); } catch (_) {}
      trajectoryLineRef.current = null;
    }

    if (driverLocation?.lat && driverLocation?.lng && coords.dropoff) {
      const line = L.polyline(
        [
          [driverLocation.lat, driverLocation.lng],
          [coords.dropoff.lat, coords.dropoff.lng],
        ],
        {
          color: '#f59e0b',
          weight: 2.5,
          opacity: 0.55,
          dashArray: '4, 8',
        }
      ).addTo(map);

      trajectoryLineRef.current = line;
    }

    return () => {
      if (trajectoryLineRef.current && map) {
        try { map.removeLayer(trajectoryLineRef.current); } catch (_) {}
        trajectoryLineRef.current = null;
      }
    };
  }, [driverLocation, coords.dropoff]);

  // 9. Danger Zones Detection along active route
  useEffect(() => {
    const waypoints =
      routeCoordinates.length > 0
        ? routeCoordinates
        : coords.dropoff && coords.pickup
        ? [coords.pickup, coords.dropoff]
        : [];

    if (waypoints.length === 0) {
      setZonesOnRoute([]);
      detectedCallbackRef.current?.([]);
      return;
    }

    const detected = dangerZones.filter((zone) => isZoneNearRoute(zone, waypoints, 2.0));
    setZonesOnRoute(detected);
    detectedCallbackRef.current?.(detected);
  }, [routeCoordinates, dangerZones, coords]);

  // 10. Route Steepness / Elevation Profile
  useEffect(() => {
    if (!routeCoordinates || routeCoordinates.length < 2) return;
    let cancelled = false;

    fetchRouteSteepness(routeCoordinates)
      .then((data) => {
        if (cancelled) return;
        steepnessDataRef.current = data;
        setSteepnessSummary(data.summary);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [routeCoordinates]);

  // 11. Render Steepness Polylines and Legend
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

    const layer = renderSteepnessPolylines(map, steepnessDataRef.current.segments, {
      originalCoords: routeCoordinates,
    });
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
  }, [showSteepness, steepnessSummary, routeCoordinates]);

  // 12. Danger Zones Overlay Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (dangerZoneLayerRef.current) {
      try { map.removeLayer(dangerZoneLayerRef.current); } catch (_) {}
      dangerZoneLayerRef.current = null;
    }

    if (!showDangerZones) return;

    const layerGroup = L.layerGroup();
    const waypoints =
      routeCoordinates.length > 0
        ? routeCoordinates
        : coords.dropoff && coords.pickup
        ? [coords.pickup, coords.dropoff]
        : [];

    const targetZones = filterRouteOnly
      ? waypoints.length > 0
        ? dangerZones.filter((zone) => isZoneNearRoute(zone, waypoints, 2.8))
        : []
      : dangerZones;

    targetZones.forEach((zone) => {
      if (!zone.lat || !zone.lng) return;
      const cat = HAZARD_CATEGORIES[zone.category] || HAZARD_CATEGORIES.accident_prone;
      const onRoute = waypoints.length > 0 ? isZoneNearRoute(zone, waypoints, 2.8) : false;

      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius || 750,
        color: onRoute ? '#dc2626' : cat.color,
        fillColor: onRoute ? '#ef4444' : cat.fillColor,
        fillOpacity: onRoute ? 0.22 : 0.12,
        weight: onRoute ? 2 : 1.2,
        dashArray: onRoute ? '4, 4' : null,
      });

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
        try { map.removeLayer(dangerZoneLayerRef.current); } catch (_) {}
        dangerZoneLayerRef.current = null;
      }
    };
  }, [dangerZones, showDangerZones, filterRouteOnly, routeCoordinates, coords]);

  // Camera Action Handlers
  const handleFocusDriver = useCallback(() => {
    const map = mapInstanceRef.current;
    if (map && driverLocation?.lat && driverLocation?.lng) {
      map.setView([driverLocation.lat, driverLocation.lng], 16, { animate: true });
      setFollowDriver(true);
      if (driverMarkerRef.current) {
        driverMarkerRef.current.openPopup();
      }
    }
  }, [driverLocation]);

  const handleFitRoute = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const pts = [];
    if (coords.pickup) pts.push([coords.pickup.lat, coords.pickup.lng]);
    if (coords.dropoff) pts.push([coords.dropoff.lat, coords.dropoff.lng]);
    if (driverLocation?.lat && driverLocation?.lng) {
      pts.push([driverLocation.lat, driverLocation.lng]);
    }
    if (pts.length > 0) {
      map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 16 });
      setFollowDriver(false);
    }
  }, [coords, driverLocation]);

  return (
    <div className="map-area" style={{ position: 'relative', height: '100%', width: '100%' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      {/* Compact Floating Map Overlays & Telemetry Control Button */}
      <div className="map-layers-control-wrapper" ref={layersMenuRef}>
        <button
          type="button"
          onClick={() => setShowLayersMenu(!showLayersMenu)}
          className={`map-layers-trigger-btn ${showLayersMenu ? 'active' : ''}`}
          title="Map Overlays & Telemetry (Steepness, Speed, Route Hazards)"
        >
          <i className="fas fa-layer-group"></i>
          <span>Overlays</span>
          <div className="map-layers-active-indicators">
            {showSpeedHud && <span className="layer-dot speed" title="Speed HUD: ON" />}
            {showSteepness && <span className="layer-dot steepness" title="Steepness: ON" />}
            {showDangerZones && <span className="layer-dot hazard" title="Hazards: ON" />}
          </div>
          <i className={`fas fa-chevron-${showLayersMenu ? 'up' : 'down'}`} style={{ fontSize: '10px', opacity: 0.6 }}></i>
        </button>

        {/* Dropdown Menu Popover */}
        {showLayersMenu && (
          <div className="map-layers-popover">
            <div className="map-layers-popover-header">
              <span><i className="fas fa-sliders-h" style={{ marginRight: 6 }}></i> MAP OVERLAYS</span>
              <button
                type="button"
                className="map-layers-popover-close"
                onClick={() => setShowLayersMenu(false)}
                title="Close menu"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="map-layers-items-list">
              {/* 1. Speed Telemetry HUD Toggle */}
              <div
                className={`map-layer-item ${showSpeedHud ? 'enabled' : ''}`}
                onClick={() => setShowSpeedHud(!showSpeedHud)}
              >
                <div className="map-layer-item-icon speed">
                  <i className="fas fa-gauge-high"></i>
                </div>
                <div className="map-layer-item-text">
                  <div className="map-layer-item-title">
                    <span>Speed HUD</span>
                    <span className="map-layer-item-pill speed">{speedMetrics.currentSpeed} km/h</span>
                  </div>
                  <div className="map-layer-item-desc">Live speedometer & movement gauge</div>
                </div>
                <div className={`map-layer-switch ${showSpeedHud ? 'on' : ''}`}>
                  <div className="map-layer-switch-handle"></div>
                </div>
              </div>

              {/* 2. Route Steepness Toggle (Default: ON) */}
              <div
                className={`map-layer-item ${showSteepness ? 'enabled' : ''}`}
                onClick={() => setShowSteepness(!showSteepness)}
              >
                <div className="map-layer-item-icon steepness">
                  <i className="fas fa-mountain"></i>
                </div>
                <div className="map-layer-item-text">
                  <div className="map-layer-item-title">
                    <span>Route Steepness</span>
                    {steepnessSummary && (
                      <span className="map-layer-item-pill steepness">
                        {steepnessSummary.steep_segments_count + steepnessSummary.very_steep_segments_count > 0
                          ? `${steepnessSummary.steep_segments_count + steepnessSummary.very_steep_segments_count} STEEP`
                          : `${steepnessSummary.max_grade_pct}% MAX`}
                      </span>
                    )}
                  </div>
                  <div className="map-layer-item-desc">Grade elevation & steep incline warning</div>
                </div>
                <div className={`map-layer-switch ${showSteepness ? 'on' : ''}`}>
                  <div className="map-layer-switch-handle"></div>
                </div>
              </div>

              {/* 3. Route Hazards Toggle (OPTIONAL - Default: OFF) */}
              <div
                className={`map-layer-item ${showDangerZones ? 'enabled' : ''}`}
                onClick={() => setShowDangerZones(!showDangerZones)}
              >
                <div className="map-layer-item-icon hazard">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div className="map-layer-item-text">
                  <div className="map-layer-item-title">
                    <span>Route Hazards</span>
                    <span className={`map-layer-item-pill ${showDangerZones ? 'hazard' : 'muted'}`}>
                      {showDangerZones ? `${zonesOnRoute.length} ON ROUTE` : 'OPTIONAL (OFF)'}
                    </span>
                  </div>
                  <div className="map-layer-item-desc">Accident zones, floodways & security alerts</div>
                </div>
                <div className={`map-layer-switch ${showDangerZones ? 'on' : ''}`}>
                  <div className="map-layer-switch-handle"></div>
                </div>
              </div>

              {/* Sub-controls for Hazards if Hazards is turned ON */}
              {showDangerZones && (
                <div className="map-layer-suboptions">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFilterRouteOnly(!filterRouteOnly); }}
                    className="map-layer-subbtn"
                  >
                    <i className={`fas ${filterRouteOnly ? 'fa-route' : 'fa-globe-asia'}`}></i>
                    {filterRouteOnly ? 'Route Only' : 'All Mindanao'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowLegend(!showLegend); }}
                    className="map-layer-subbtn"
                  >
                    <i className="fas fa-layer-group"></i>
                    {showLegend ? 'Hide Legend' : 'Show Legend'}
                  </button>
                </div>
              )}

              {/* 4. Traveled Trail Breadcrumbs Toggle */}
              {trackingHistory && trackingHistory.length > 1 && (
                <div
                  className={`map-layer-item ${showBreadcrumbs ? 'enabled' : ''}`}
                  onClick={() => setShowBreadcrumbs(!showBreadcrumbs)}
                >
                  <div className="map-layer-item-icon trail">
                    <i className="fas fa-history"></i>
                  </div>
                  <div className="map-layer-item-text">
                    <div className="map-layer-item-title">
                      <span>Traveled Trail</span>
                      <span className="map-layer-item-pill trail">{trackingHistory.length} pings</span>
                    </div>
                    <div className="map-layer-item-desc">GPS history path recorded by vehicle</div>
                  </div>
                  <div className={`map-layer-switch ${showBreadcrumbs ? 'on' : ''}`}>
                    <div className="map-layer-switch-handle"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Hazard Legend Popover if open */}
            {showDangerZones && showLegend && (
              <div className="map-danger-legend" style={{ position: 'static', marginTop: 10, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                <div className="map-danger-legend-title">
                  <span>Hazard Categories</span>
                  <i
                    className="fas fa-times"
                    style={{ cursor: 'pointer', opacity: 0.7 }}
                    onClick={(e) => { e.stopPropagation(); setShowLegend(false); }}
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
        )}
      </div>

      {/* Floating Live Speedometer & Movement Telemetry HUD */}
      {showSpeedHud && (
        <div className={`map-speed-hud ${speedMetrics.isOverspeed ? 'overspeed-alert' : ''}`}>
          <div className="speed-hud-header">
            <div className="speed-hud-title">
              <span
                className={`speed-hud-status-dot ${speedMetrics.isMoving ? 'active' : 'idle'}`}
                style={{ background: speedMetrics.category.color }}
              ></span>
              <span>LIVE SPEED TELEMETRY</span>
            </div>
            <button
              type="button"
              className="speed-hud-close-btn"
              onClick={() => setShowSpeedHud(false)}
              title="Minimize Speedometer HUD"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="speed-hud-main">
            <div className="speed-dial-display">
              <div className="speed-number-wrap">
                <span className="speed-number" style={{ color: speedMetrics.category.color }}>
                  {speedMetrics.currentSpeedDisplay}
                </span>
                <span className="speed-unit">KM/H</span>
              </div>
              <div
                className="speed-status-pill"
                style={{
                  background: speedMetrics.category.bg,
                  color: speedMetrics.category.color,
                  border: `1px solid ${speedMetrics.category.border}`,
                }}
              >
                <i className={`fas ${speedMetrics.category.icon}`}></i>
                <span>{speedMetrics.category.shortLabel}</span>
              </div>
            </div>

            {/* Gauge progress bar showing speed out of 80 km/h fleet limit */}
            <div className="speed-gauge-bar-track" title={`Speed: ${speedMetrics.currentSpeed} km/h (Fleet Limit: 80 km/h)`}>
              <div
                className="speed-gauge-bar-fill"
                style={{
                  width: `${Math.min(100, (speedMetrics.currentSpeed / 80) * 100)}%`,
                  background: speedMetrics.category.color,
                }}
              />
            </div>
          </div>

          <div className="speed-hud-metrics-grid">
            <div className="speed-metric-box">
              <span className="speed-metric-lbl">AVG SPEED</span>
              <strong className="speed-metric-val">{speedMetrics.avgSpeed} <small>km/h</small></strong>
            </div>
            <div className="speed-metric-box">
              <span className="speed-metric-lbl">PEAK SPEED</span>
              <strong className="speed-metric-val">{speedMetrics.peakSpeed} <small>km/h</small></strong>
            </div>
            <div className="speed-metric-box">
              <span className="speed-metric-lbl">TRAVELED</span>
              <strong className="speed-metric-val">{speedMetrics.totalDistanceKm} <small>km</small></strong>
            </div>
          </div>

          {speedMetrics.isOverspeed && (
            <div className="speed-hud-overspeed-warning">
              <i className="fas fa-exclamation-triangle"></i>
              <span>Overspeed Alert! Exceeding 80 km/h safety limit.</span>
            </div>
          )}
        </div>
      )}

      {/* Floating Action Controls Bar (Bottom Right) */}
      <div className="map-view-actions">
        {driverLocation && (
          <>
            <button
              type="button"
              onClick={handleFocusDriver}
              className="map-action-btn primary"
              title="Center camera on live driver location"
            >
              <i className="fas fa-crosshairs"></i>
              Focus Driver
            </button>

            <button
              type="button"
              onClick={() => setFollowDriver(!followDriver)}
              className={`map-action-btn ${followDriver ? 'active' : ''}`}
              title={followDriver ? 'Auto-following driver location' : 'Click to enable auto-follow'}
            >
              <i className="fas fa-satellite-dish"></i>
              {followDriver ? 'Following' : 'Follow: Off'}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleFitRoute}
          className="map-action-btn"
          title="Fit full route (Pickup, Dropoff, Driver) in view"
        >
          <i className="fas fa-compress-arrows-alt"></i>
          Fit Route
        </button>
      </div>

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
          Notice: Showing regional center map. Pinned coordinates not available.
        </div>
      )}
    </div>
  );
}
