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
  const mapRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const routingRef = useRef(null);
  const activeModeRef = useRef(activeMode);

  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);

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
  }, [mapEl, onPickupChange, onDropoffChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCoords(pickup)) return;
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
    } else {
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng]).addTo(map).bindPopup('Pickup').openPopup();
    }
  }, [pickup]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCoords(dropoff)) return;
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lng]);
    } else {
      dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng]).addTo(map).bindPopup('Drop-off').openPopup();
    }
  }, [dropoff]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCoords(pickup) || !hasCoords(dropoff)) return;
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
        lineOptions: { styles: [{ color: '#c0392b', weight: 4 }] },
      })
        .on('routesfound', (e) => {
          setRouteStatus('ready');
          onDistanceChange(Math.round((e.routes[0].summary.totalDistance / 1000) * 10) / 10);
        })
        .on('routingerror', () => setRouteStatus('failed'))
        .addTo(map);
    } else {
      routingRef.current.setWaypoints(waypoints);
    }
  }, [pickup, dropoff, onDistanceChange]);

  const pickupReady = hasCoords(pickup);
  const dropoffReady = hasCoords(dropoff);

  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setActiveMode('pickup')}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: activeMode === 'pickup' ? '#2e7d32' : '#fff', color: activeMode === 'pickup' ? '#fff' : '#333', cursor: 'pointer', fontSize: 13 }}
        >
          Click map: set Pickup
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('dropoff')}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: activeMode === 'dropoff' ? '#c0392b' : '#fff', color: activeMode === 'dropoff' ? '#fff' : '#333', cursor: 'pointer', fontSize: 13 }}
        >
          Click map: set Drop-off
        </button>
      </div>
      <div ref={setMapEl} style={{ height: 320, borderRadius: 8, background: '#eee' }} />
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
