import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Mindanao geographical boundaries (South: Sarangani ~5.3°N, North: Surigao ~10.25°N, West: Zamboanga ~121.5°E, East: Mati ~126.75°E)
export const MINDANAO_BOUNDS = [
  [5.30, 121.50], // South-West
  [10.25, 126.75], // North-East
];

export function isWithinMindanao(lat, lng) {
  if (lat == null || lng == null) return false;
  const nLat = Number(lat);
  const nLng = Number(lng);
  return (
    Number.isFinite(nLat) &&
    Number.isFinite(nLng) &&
    nLat >= 5.30 &&
    nLat <= 10.25 &&
    nLng >= 121.50 &&
    nLng <= 126.75
  );
}

export async function geocode(address) {
  if (!address) return null;
  try {
    // Restrict query to Mindanao bounding box and country PH
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ph&viewbox=121.50,10.25,126.75,5.30&bounded=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && Array.isArray(data) && data.length > 0) {
      for (const item of data) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (isWithinMindanao(lat, lng)) {
          return { lat, lng };
        }
      }
    }

    // Fallback search appending Mindanao, Philippines
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ph&q=${encodeURIComponent(address + ', Mindanao, Philippines')}`;
    const fbRes = await fetch(fallbackUrl);
    const fbData = await fbRes.json();
    if (fbData && Array.isArray(fbData) && fbData.length > 0) {
      for (const item of fbData) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (isWithinMindanao(lat, lng)) {
          return { lat, lng };
        }
      }
    }

    return null;
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
  return !!point && point.lat != null && point.lng != null && isWithinMindanao(point.lat, point.lng);
}

export default function PinRouteMap({ pickup, dropoff, onPickupChange, onDropoffChange, onDistanceChange }) {
  const [mapEl, setMapEl] = useState(null);
  const [activeMode, setActiveMode] = useState('pickup');
  const [routeStatus, setRouteStatus] = useState('idle');
  const [mindanaoError, setMindanaoError] = useState('');

  const mapRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const routingRef = useRef(null);
  const activeModeRef = useRef(activeMode);
  const onDistanceChangeRef = useRef(onDistanceChange);
  const prevRouteKeyRef = useRef('');
  const lastReportedDistanceRef = useRef(null);

  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);
  useEffect(() => { onDistanceChangeRef.current = onDistanceChange; }, [onDistanceChange]);

  useEffect(() => {
    if (!mapEl || mapRef.current) return;
    const map = L.map(mapEl, {
      maxBounds: MINDANAO_BOUNDS,
      maxBoundsViscosity: 1.0,
      minZoom: 7,
    }).setView([8.4542, 124.6319], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      if (!isWithinMindanao(lat, lng)) {
        setMindanaoError('Location outside Mindanao! HJY Logistics operates exclusively within the Mindanao region.');
        return;
      }
      setMindanaoError('');
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
        })
        .on('routingerror', () => {
          setRouteStatus('failed');
        })
        .addTo(map);

      try {
        const container = routingRef.current.getContainer();
        if (container) {
          container.style.display = 'none';
          container.style.visibility = 'hidden';
        }
      } catch (_) {}
    } else {
      routingRef.current.setWaypoints(waypoints);
    }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  const pickupReady = hasCoords(pickup);
  const dropoffReady = hasCoords(dropoff);

  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveMode('pickup')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: activeMode === 'pickup' ? '1px solid #166534' : '1px solid #cbd5e1',
              background: activeMode === 'pickup' ? '#2e7d32' : '#fff',
              color: activeMode === 'pickup' ? '#fff' : '#334155',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: activeMode === 'pickup' ? '0 1px 3px rgba(46,125,50,0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fas fa-box"></i>
            Click map: Set Pickup
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('dropoff')}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: activeMode === 'dropoff' ? '1px solid #7f1d1d' : '1px solid #cbd5e1',
              background: activeMode === 'dropoff' ? '#9E1E21' : '#fff',
              color: activeMode === 'dropoff' ? '#fff' : '#334155',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: activeMode === 'dropoff' ? '0 1px 3px rgba(158,30,33,0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <i className="fas fa-flag-checkered"></i>
            Click map: Set Drop-off
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className="mindanao-lock-badge" title="HJY Logistics serves the Mindanao archipelago only">
            <i className="fas fa-lock"></i> Mindanao Region Only
          </span>
          {mindanaoError && (
            <span style={{ color: '#dc2626', background: '#fee2e2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
              <i className="fas fa-ban" style={{ marginRight: 4 }}></i>{mindanaoError}
            </span>
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
    </div>
  );
}
