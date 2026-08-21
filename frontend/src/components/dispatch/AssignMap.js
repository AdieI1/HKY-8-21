import { useEffect, useState } from 'react';
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

  return Number.isFinite(lat) && Number.isFinite(lng)
    ? { lat, lng }
    : null;
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

  useEffect(() => {
    let cancelled = false;
    let map = null;
    let resizeTimer = null;

    setStatus('loading');
    setDistanceKm(null);

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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      (dangerPoints || []).forEach((point) => {
        L.circle([point.lat, point.lng], {
          radius: 800,
          color: '#c0392b',
          fillColor: '#e74c3c',
          fillOpacity: 0.15,
          weight: 1,
        })
          .addTo(map)
          .bindPopup(`⚠ Past ${point.type}: ${point.description || 'No description'}`);
      });

      L.Routing.control({
        waypoints: [
          L.latLng(pickup.lat, pickup.lng),
          L.latLng(dropoff.lat, dropoff.lng),
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
        lineOptions: { styles: [{ color: '#c0392b', weight: 4 }] },
        createMarker: (index, waypoint) =>
          L.marker(waypoint.latLng).bindPopup(index === 0 ? 'Pickup' : 'Drop-off'),
      })
        .on('routesfound', (event) => {
          if (cancelled) return;
          resolveDistance(event.routes[0].summary.totalDistance / 1000);
          setStatus('ready');
        })
        .on('routingerror', () => {
          if (cancelled) return;
          resolveDistance(
            haversineKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
          );
          setStatus('ready');
        })
        .addTo(map);

      resizeTimer = setTimeout(() => map?.invalidateSize(), 150);
    })();

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      map?.remove();
    };
  }, [pickupAddress, pickupLat, pickupLng, dropoffAddress, dropoffLat, dropoffLng, fallbackDistanceKm, dangerPoints, mapEl, onDistanceResolved]);

  return (
    <div>
      <div ref={setMapEl} style={{ height: 200, borderRadius: 8, background: '#eee' }} />
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
        {(dangerPoints || []).length > 0 && (
          <div style={{ marginTop: 4, color: '#c0392b' }}>
            <i className="fas fa-exclamation-triangle"></i>{' '}
            {dangerPoints.length} past incident{dangerPoints.length > 1 ? 's' : ''} reported near this route
          </div>
        )}
      </div>
    </div>
  );
}
