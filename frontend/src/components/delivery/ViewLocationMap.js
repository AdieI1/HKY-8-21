import { useState, useEffect } from 'react';
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

async function geocode(address) {
  if (!address) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`);
    const data = await res.json();
    return data.length ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
  } catch {
    return null;
  }
}

export default function ViewLocationMap({ pickupAddress, dropoffAddress, driverLocation, onEtaChange }) {
  const [mapEl, setMapEl] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    let map = null;
    let resizeTimer = null;
    setStatus('loading');

    (async () => {
      const [pickup, dropoff] = await Promise.all([geocode(pickupAddress), geocode(dropoffAddress)]);
      const routeStart = driverLocation || pickup;
      if (cancelled || !routeStart || !dropoff || !mapEl) {
        setStatus('failed');
        return;
      }

      mapEl.innerHTML = '';
      map = L.map(mapEl);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      L.Routing.control({
        waypoints: [L.latLng(routeStart.lat, routeStart.lng), L.latLng(dropoff.lat, dropoff.lng)],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
        lineOptions: { styles: [{ color: '#c0392b', weight: 4 }] },
        createMarker: (i, wp) =>
          L.marker(wp.latLng).bindPopup(i === 0 && driverLocation ? 'Driver Location' : i === 0 ? 'Pickup' : 'Drop-off'),
      })
        .on('routesfound', (e) => {
          if (cancelled) return;
          setStatus('ready');
          const totalSeconds = e.routes[0].summary.totalTime;
          const hrs = Math.floor(totalSeconds / 3600);
          const mins = Math.round((totalSeconds % 3600) / 60);
          onEtaChange(hrs > 0 ? `${hrs}hr${hrs > 1 ? 's' : ''} ${mins}mins` : `${mins}mins`);
        })
        .on('routingerror', () => {
          if (!cancelled) setStatus('failed');
        })
        .addTo(map);

      resizeTimer = setTimeout(() => map?.invalidateSize(), 150);
    })();

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      map?.remove();
    };
  }, [pickupAddress, dropoffAddress, driverLocation, mapEl, onEtaChange]);

  return (
    <div className="map-area" style={{ position: 'relative', height: '100%' }}>
      <div ref={setMapEl} style={{ height: '100%', width: '100%' }} />
      {status === 'failed' && (
        <div style={{ position: 'absolute', top: 12, left: 12, background: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 13, color: '#888' }}>
          Couldn't load the route for this address.
        </div>
      )}
    </div>
  );
}
