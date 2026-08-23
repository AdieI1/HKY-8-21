import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import api from '../api/api-client';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

async function geocode(address) {
  if (!address) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (err) {
    return null;
  }
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch (err) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

function hasCoords(point) {
  return !!point && point.lat != null && point.lng != null;
}

/**
 * Click-to-pin map: click once to drop the Pickup pin, again to drop the
 * Drop-off pin. Once both exist, draws a real OSRM road route between them
 * and reports the driving distance. Addresses can also be typed and
 * located explicitly via the "Locate" button next to each field.
 */
function PinRouteMap({ pickup, dropoff, onPickupChange, onDropoffChange, onDistanceChange }) {
  const [mapEl, setMapEl] = useState(null);
  const [activeMode, setActiveMode] = useState('pickup');
  const [routeStatus, setRouteStatus] = useState('idle');
  const mapRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const routingRef = useRef(null);
  const activeModeRef = useRef(activeMode);

  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  useEffect(() => {
    if (!mapEl || mapRef.current) return;
    const map = L.map(mapEl).setView([8.4542, 124.6319], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapEl]);

  // Keep pickup marker in sync — only once real coordinates exist
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCoords(pickup)) return;
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
    } else {
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng]).addTo(map).bindPopup('Pickup').openPopup();
    }
  }, [pickup]);

  // Keep drop-off marker in sync — only once real coordinates exist
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasCoords(dropoff)) return;
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lng]);
    } else {
      dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng]).addTo(map).bindPopup('Drop-off').openPopup();
    }
  }, [dropoff]);

  // Route once both pins have real coordinates
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, dropoff]);

  const pickupReady = hasCoords(pickup);
  const dropoffReady = hasCoords(dropoff);

  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
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
          }}
        >
          Click map: set Pickup
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('dropoff')}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #ccc',
            background: activeMode === 'dropoff' ? '#c0392b' : '#fff',
            color: activeMode === 'dropoff' ? '#fff' : '#333',
            cursor: 'pointer',
            fontSize: 13,
          }}
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

const OVERDUE_DAYS = 2;

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatMoney(amount) {
  return '₱' + Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

function requestCode(id, short) {
  return `${short ? 'RQ' : 'REQ'}${String(id).padStart(4, '0')}`;
}

function isOverdue(request) {
  if (request.status !== 'pending') return false;
  const created = new Date(request.created_at);
  const daysOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
  return daysOld >= OVERDUE_DAYS;
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  item_name: '',
  cargo_type: 'Construction',
  fragility: 'low',
  weight: '',
  pickup: {
    address: '',
    lat: null,
    lng: null,
  },
  dropoff: {
    address: '',
    lat: null,
    lng: null,
  },
  distance_km: '',
  total_price: '',
  payment_term: 'downpayment',
  payment_method: 'bank_transfer',
};

function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [view, setView] = useState('active');

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approving, setApproving] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApprovedModal, setShowApprovedModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [locating, setLocating] = useState('');

  const toggleProfileMenu = () => setProfileMenuOpen((v) => !v);

  useEffect(() => {
    const update = () => {
      setCurrentDate(
        new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
      );
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('/delivery-requests');
      setRequests(res.data);
    } catch (err) {
      setLoadError('Could not load requests. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeRequests = useMemo(() => requests.filter((r) => r.status !== 'draft'), [requests]);
  const draftRequests = useMemo(() => requests.filter((r) => r.status === 'draft'), [requests]);

  const stats = useMemo(() => {
    const pending = activeRequests.filter((r) => r.status === 'pending').length;
    const overdue = activeRequests.filter(isOverdue).length;
    const approved = activeRequests.filter((r) => r.status === 'approved').length;
    return { pending, overdue, approved };
  }, [activeRequests]);

  const overdueList = useMemo(() => activeRequests.filter(isOverdue), [activeRequests]);

  const shownRequests = view === 'drafts' ? draftRequests : activeRequests;

  const openDetails = (request) => setSelectedRequest(request);
  const closeDetails = () => setSelectedRequest(null);

  const approveRequest = async () => {
    if (!selectedRequest) return;
    setApproving(true);
    try {
      await api.post(`/delivery-requests/${selectedRequest.request_id}/approve`);
      setSelectedRequest(null);
      setShowApprovedModal(true);
      await loadData();
    } catch (err) {
      console.error('Approve failed:', err.response?.data || err);
    } finally {
      setApproving(false);
    }
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowCreateModal(true);
  };

  const locateAddress = async (which) => {
    const address = which === 'pickup' ? form.pickup?.address : form.dropoff?.address;
    if (!address) return;
    setLocating(which);
    const coords = await geocode(address);
    setLocating('');
    if (!coords) {
      setFormError(`Couldn't find "${address}" on the map. Try a more specific address, or click the map directly.`);
      return;
    }
    const point = { ...coords, address };
    if (which === 'pickup') setForm((prev) => ({ ...prev, pickup: point }));
    else setForm((prev) => ({ ...prev, dropoff: point }));
  };

  const submitRequest = async (asDraft) => {
    if (!form.first_name || !form.last_name || !form.phone || !form.email || !form.password) {
      setFormError('Please fill in all required customer fields.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('/delivery-requests/create-with-customer', {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        email: form.email,
        username: form.username || null,
        password: form.password,
        item_name: form.item_name || null,
        cargo_type: form.cargo_type,
        fragility: form.fragility,
        weight: form.weight || null,
        pickup_address: form.pickup?.address || null,
        pickup_lat: form.pickup?.lat ?? null,
        pickup_lng: form.pickup?.lng ?? null,
        dropoff_address: form.dropoff?.address || null,
        dropoff_lat: form.dropoff?.lat ?? null,
        dropoff_lng: form.dropoff?.lng ?? null,
        distance_km: form.distance_km || null,
        total_price: form.total_price || null,
        payment_term: form.payment_term,
        payment_method: form.payment_method,
        is_draft: asDraft,
      });
      setShowCreateModal(false);
      await loadData();
    } catch (err) {
      console.error('Create request failed — full error:', err);
      console.error('Response data:', err.response?.data);
      if (!err.response) {
        setFormError('Network error — could not reach the backend. Is php artisan serve running, and is CORS configured for your frontend URL?');
      } else {
        const errors = err.response.data?.errors;
        const message = err.response.data?.message;
        setFormError(
          errors
            ? Object.values(errors)[0][0]
            : message || `Server returned ${err.response.status}. Check the browser console/network tab for details.`
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const undraftRequest = async (request) => {
    try {
      await api.put(`/delivery-requests/${request.request_id}`, { status: 'pending' });
      await loadData();
    } catch (err) {
      console.error('Undraft failed:', err.response?.data || err);
    }
  };

  return (
    <>
      <div className="dashboard-container">
        <div className="sidebar">
          <div className="logo">
            <img src="images/HJY LOGO 2 1.png" alt="HJY Trucking Services Logo" />
          </div>
          <nav className="navigation">
            <ul>
              <li><Link to="/overview"><i className="fas fa-chart-pie"></i> Overview</Link></li>
              <li className="active"><Link to="/requests"><i className="fas fa-clipboard-list"></i> Requests Management</Link></li>
              <li><Link to="/dispatch"><i className="fas fa-route"></i> Dispatch Management</Link></li>
              <li><Link to="/delivery"><i className="fas fa-truck-loading"></i> Delivery Monitoring</Link></li>
              <li><Link to="/drivers"><i className="fas fa-id-card"></i> Drivers</Link></li>
              <li><Link to="/vehicles"><i className="fas fa-truck"></i> Vehicles</Link></li>
              <li className="nav-group">
                <span className="nav-group-label"><i className="fas fa-boxes"></i> Inventory</span>
                <ul className="nav-submenu">
                  <li><Link to="/fuel-inventory"><i className="fas fa-gas-pump"></i> Fuel Inventory</Link></li>
                  <li><Link to="/parts-inventory"><i className="fas fa-tools"></i> Parts Inventory</Link></li>
                </ul>
              </li>
              <li><Link to="/analytics"><i className="fas fa-chart-bar"></i> Analytics</Link></li>
              <li><Link to="/customers"><i className="fas fa-users"></i> Customers</Link></li>
            </ul>
          </nav>
          <div className="user-profile" onClick={toggleProfileMenu}>
            <img src="images/brucednegrow.png" alt="Admin" className="user-avatar" />
            <div className="user-info">
              <span className="user-name">{JSON.parse(localStorage.getItem('auth_user') || '{}').full_name || 'Admin'}</span>
              <span className="user-role">Admin <span className="status-online"></span></span>
            </div>
            {profileMenuOpen && (
              <div className="profile-dropdown" onClick={(e) => e.stopPropagation()}>
                <Link to="/profile" className="dropdown-item">
                  <i className="fas fa-user"></i><span>Profile</span><i className="fas fa-chevron-right dropdown-arrow"></i>
                </Link>
                <Link to="/settings" className="dropdown-item">
                  <i className="fas fa-cog"></i><span>Settings</span><i className="fas fa-chevron-right dropdown-arrow"></i>
                </Link>
              </div>
            )}
          </div>
          <div className="logout">
            <Link to="/" onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); }}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </Link>
          </div>
        </div>

        <div className="main-content">
          <header className="header">
            <div className="page-info">
              <span className="breadcrumb">Page/Requests</span>
              <h1 className="page-title">REQUESTS MANAGEMENT</h1>
            </div>
            <div className="header-actions">
              <div className="date-picker">
                <span>{currentDate}</span>
                <i className="far fa-calendar-alt"></i>
              </div>
              <div className="notification">
                <div className="bell-container"><div className="bell"></div></div>
              </div>
            </div>
          </header>

          {loadError && <div className="form-error" style={{ margin: '16px 0', color: '#d32f2f' }}>{loadError}</div>}

          <div className="content-row">
            <div className="left-column">
              <div className="request-stats">
                <div className="stat-card stat-pending">
                  <div className="stat-header"><i className="fas fa-exclamation-triangle"></i><span className="stat-label">Pending Requests:</span></div>
                  <span className="stat-number">{stats.pending}</span>
                </div>
                <div className="stat-card stat-overdue">
                  <div className="stat-header"><i className="fas fa-exclamation-triangle"></i><span className="stat-label">Overdue:</span></div>
                  <span className="stat-number">{stats.overdue}</span>
                </div>
                <div className="stat-card stat-approved">
                  <div className="stat-header"><i className="fas fa-check-circle"></i><span className="stat-label">Approved:</span></div>
                  <span className="stat-number">{stats.approved}</span>
                </div>
              </div>

              <div className="content-section delivery-requests">
                <div className="section-header">
                  <h3 className="section-title">{view === 'drafts' ? 'Draft Requests' : 'Delivery Requests'}</h3>
                  <div className="section-controls">
                    <button className="btn-drafts" onClick={() => setView(view === 'drafts' ? 'active' : 'drafts')}>
                      {view === 'drafts' ? 'Back to Requests' : `Drafts (${draftRequests.length})`}
                    </button>
                    <button className="btn-create-request" onClick={openCreateModal}><i className="fas fa-plus"></i> Create request</button>
                  </div>
                </div>
                <div className="section-content">
                  <table className="data-table">
                    <thead>
                      <tr><th>Request ID</th><th>Customer</th><th>Status</th><th>Date</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {shownRequests.map((r) => {
                        const overdue = isOverdue(r);
                        return (
                          <tr key={r.request_id}>
                            <td className="request-id">
                              {overdue && <i className="fas fa-exclamation-triangle status-icon"></i>} {requestCode(r.request_id)}
                            </td>
                            <td>{r.customer?.full_name || '—'}</td>
                            <td>
                              <span className={`status-badge status-${overdue ? 'overdue' : r.status}`}>
                                {overdue ? 'Overdue' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                              </span>
                            </td>
                            <td>{formatDate(r.created_at)}</td>
                            <td style={{ display: 'flex', gap: 6 }}>
                              <button className="btn-details" onClick={() => openDetails(r)}>Details</button>
                              {view === 'drafts' && (
                                <button className="btn-approve" onClick={() => undraftRequest(r)}>Undraft</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {loading && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading requests...</td></tr>
                      )}
                      {!loading && shownRequests.length === 0 && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24 }}>No requests found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <div className="admin-info">
                    <span><i className="fas fa-info-circle"></i> Click details to expand Request Information.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="right-column">
              <div className="content-section activity-logs">
                <div className="section-header">
                  <h3 className="section-title"><i className="fas fa-exclamation-circle"></i> Activity Logs</h3>
                </div>
                <div className="section-content">
                  {overdueList.slice(0, 5).map((r) => (
                    <div className="log-entry log-overdue" key={r.request_id}>
                      <i className="fas fa-exclamation-triangle"></i>
                      <div className="log-content">
                        <span className="log-title">{requestCode(r.request_id)} Overdue!</span>
                        <span className="log-time">{formatDate(r.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {overdueList.length === 0 && (
                    <div className="log-entry"><span className="log-content">No overdue requests right now.</span></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedRequest && (
        <div
          className="modal request-modal"
          style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: 20 }}
        >
          <div className="modal-content request-modal-content" style={{ width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10 }}>
            <div className="request-modal-header">
              <h2>DELIVERY REQUEST DETAILS</h2>
              <button className="btn-close" onClick={closeDetails}>&times;</button>
            </div>
            <div className="request-modal-body" style={{ padding: 20 }}>
              <div className="request-info-grid">
                <div className="request-left">
                  <div className="request-info-item">
                    <span className="request-label">Request ID:</span>
                    <span className="request-value">{requestCode(selectedRequest.request_id, true)}</span>
                  </div>
                  <div className="request-info-item">
                    <span className="request-label">Customer Name:</span>
                    <span className="request-value">{selectedRequest.customer?.full_name || '—'}</span>
                  </div>
                  <div className="receipt-section">
                    <span className="receipt-label">Receipt:</span>
                    <div className="receipt-image" style={{ color: '#888', fontSize: 13, padding: 12, border: '1px dashed #ccc', borderRadius: 6 }}>
                      No receipt uploaded — file storage isn't wired up yet.
                    </div>
                  </div>
                </div>
                <div className="request-right">
                  <div className="request-info-item"><span className="request-label">Contact Number:</span><span className="request-value">{selectedRequest.customer?.phone || '—'}</span></div>
                  <div className="request-info-item"><span className="request-label">Date requested:</span><span className="request-value">{formatDate(selectedRequest.created_at)}</span></div>
                  <div className="request-info-item"><span className="request-label">Item name:</span><span className="request-value">{selectedRequest.item_name || '—'}</span></div>
                  <div className="request-info-item"><span className="request-label">Cargo type:</span><span className="request-value">{selectedRequest.cargo_type || '—'}</span></div>
                  <div className="request-info-item">
                    <span className="request-label">Cargo Fragility:</span>
                    <span className={`request-value${selectedRequest.fragility === 'high' ? ' fragile' : ''}`}>
                      {selectedRequest.fragility ? selectedRequest.fragility.charAt(0).toUpperCase() + selectedRequest.fragility.slice(1) : '—'}
                      {selectedRequest.fragility === 'high' && <i className="fas fa-exclamation-triangle" style={{ marginLeft: 6 }}></i>}
                    </span>
                  </div>
                  <div className="request-info-item"><span className="request-label">Cargo Weight:</span><span className="request-value">{selectedRequest.weight ? `${selectedRequest.weight} kilograms` : '—'}</span></div>
                  <div className="request-info-item"><span className="request-label">Pickup location:</span><span className="request-value">{selectedRequest.pickup_address || '—'}</span></div>
                  <div className="request-info-item"><span className="request-label">Drop off location:</span><span className="request-value">{selectedRequest.dropoff_address || '—'}</span></div>
                  <div className="request-info-item"><span className="request-label">Distance:</span><span className="request-value">{selectedRequest.distance_km ? `${selectedRequest.distance_km} kilometers` : '—'}</span></div>
                  <div className="request-info-item"><span className="request-label">Total Price:</span><span className="request-value price">{formatMoney(selectedRequest.total_price)}</span></div>
                  {selectedRequest.payment_term === 'downpayment' ? (
                    <>
                      <div className="request-info-item"><span className="request-label">Downpayment (50%):</span><span className="request-value price">{formatMoney((selectedRequest.total_price || 0) / 2)}</span></div>
                      <div className="request-info-item"><span className="request-label">Remaining Balance:</span><span className="request-value price">{formatMoney((selectedRequest.total_price || 0) / 2)}</span></div>
                    </>
                  ) : (
                    <div className="request-info-item"><span className="request-label">Payment Term:</span><span className="request-value">Full Payment</span></div>
                  )}
                  <div className="request-info-item">
                    <span className="request-label">Payment Method:</span>
                    <span className="request-value">{selectedRequest.payment_method === 'cash' ? 'Pay in Cash' : 'Pay through Bank Transfer'}</span>
                  </div>
                </div>
              </div>
              <div className="request-actions">
                {selectedRequest.status === 'pending' || isOverdue(selectedRequest) ? (
                  <button className="btn-approve" onClick={approveRequest} disabled={approving}>
                    {approving ? 'Approving...' : 'Approve'}
                  </button>
                ) : (
                  <span style={{ color: '#888', textTransform: 'capitalize' }}>Status: {selectedRequest.status}</span>
                )}
                <button className="btn-cancel-request" onClick={closeDetails}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showApprovedModal && (
        <div
          className="modal approved-modal"
          style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
        >
          <div className="modal-content approved-modal-content" style={{ background: '#fff', borderRadius: 10, padding: 32, maxWidth: 420, textAlign: 'center' }}>
            <h2 className="approved-title">DELIVERY APPROVED!</h2>
            <div className="approved-icon">
              <img src="images/trucknisiya.png" alt="Delivery Truck" className="truck-icon-img" />
            </div>
            <p className="approved-message">Delivery is approved and will be sent to the dispatch management window</p>
            <button className="btn-return-menu" onClick={() => setShowApprovedModal(false)}>Return to menu</button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div
          className="modal create-request-modal"
          style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: 20 }}
        >
          <div className="modal-content create-request-modal-content" style={{ width: '100%', maxWidth: 950, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10 }}>
            <div className="create-request-header" style={{ position: 'sticky', top: 0 }}>
              <div className="create-request-title">
                <i className="fas fa-cube"></i>
                <h2>Create Delivery Request & Customer Setup</h2>
              </div>
              <button className="btn-return" onClick={() => setShowCreateModal(false)}>
                Return <i className="fas fa-reply"></i>
              </button>
            </div>
            <div className="create-request-body" style={{ padding: 20 }}>
              {formError && <div className="form-error" style={{ color: '#d32f2f', marginBottom: 12 }}>{formError}</div>}

              <div className="form-section">
                <h3 className="section-title-form">Customer Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name<span className="required">*</span></label>
                    <input type="text" className="form-input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Contact Number<span className="required">*</span></label>
                    <input type="text" className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Last Name<span className="required">*</span></label>
                    <input type="text" className="form-input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title-form">Account Setup</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address<span className="required">*</span></label>
                    <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input type="text" className="form-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group password-group">
                    <label>Password<span className="required">*</span></label>
                    <div className="password-input-wrapper" style={{ position: 'relative' }}>
                      <input type={showPassword ? 'text' : 'password'} className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                      <button type="button" className="btn-toggle-password" onClick={() => setShowPassword((p) => !p)} style={{ position: 'absolute', right: 10, top: 8 }}>
                        <i className={`fas ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                      </button>
                    </div>
                  </div>
                  <div className="form-group password-group">
                    <label>Confirm Password<span className="required">*</span></label>
                    <input type={showPassword ? 'text' : 'password'} className="form-input" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="form-row two-column">
                <div className="form-section half-width">
                  <h3 className="section-title-form">Cargo Information:</h3>
                  <div className="form-group">
                    <label>Item Name:</label>
                    <input type="text" className="form-input" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Cargo Type:</label>
                    <select className="form-select" value={form.cargo_type} onChange={(e) => setForm({ ...form, cargo_type: e.target.value })}>
                      <option>Construction</option>
                      <option>Electronics</option>
                      <option>Furniture</option>
                      <option>Food</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Cargo Fragility:</label>
                    <select className="form-select" value={form.fragility} onChange={(e) => setForm({ ...form, fragility: e.target.value })}>
                      <option value="low">Standard</option>
                      <option value="medium">Fragile</option>
                      <option value="high">Extremely Fragile</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Cargo Weight (kg):</label>
                    <input type="number" className="form-input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
                  </div>

                  <h3 className="section-title-form">Delivery Location:</h3>
                  <div className="form-group location-group">
                    <label>Pick-up Location</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Port Area, Cagayan de Oro City"
                        value={form.pickup?.address || ''}
                        onChange={(e) => setForm({ ...form, pickup: { ...(form.pickup || {}), address: e.target.value } })}
                      />
                      <button type="button" onClick={() => locateAddress('pickup')} disabled={locating === 'pickup'} style={{ padding: '0 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
                        {locating === 'pickup' ? '...' : 'Locate'}
                      </button>
                    </div>
                  </div>
                  <div className="form-group location-group">
                    <label>Drop-off Location</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Malaybalay City, Bukidnon"
                        value={form.dropoff?.address || ''}
                        onChange={(e) => setForm({ ...form, dropoff: { ...(form.dropoff || {}), address: e.target.value } })}
                      />
                      <button type="button" onClick={() => locateAddress('dropoff')} disabled={locating === 'dropoff'} style={{ padding: '0 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
                        {locating === 'dropoff' ? '...' : 'Locate'}
                      </button>
                    </div>
                  </div>

                  <PinRouteMap
                    pickup={form.pickup}
                    dropoff={form.dropoff}
                    onPickupChange={(point) => setForm((prev) => ({ ...prev, pickup: point }))}
                    onDropoffChange={(point) => setForm((prev) => ({ ...prev, dropoff: point }))}
                    onDistanceChange={(km) => setForm((prev) => ({ ...prev, distance_km: km }))}
                  />

                  <div className="form-group">
                    <label>Distance (km)</label>
                    <input type="number" className="form-input" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} />
                  </div>
                </div>

                <div className="form-section half-width">
                  <h3 className="section-title-form">Pricing:</h3>
                  <div className="form-group">
                    <label>Total Price (₱)</label>
                    <input type="number" className="form-input" value={form.total_price} onChange={(e) => setForm({ ...form, total_price: e.target.value })} />
                  </div>

                  <h3 className="section-title-form">Payment Terms:</h3>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input type="radio" name="paymentTerm" checked={form.payment_term === 'downpayment'} onChange={() => setForm({ ...form, payment_term: 'downpayment' })} />
                      <span className="radio-text">Pay Down-payment (50%)</span>
                    </label>
                    <label className="radio-label">
                      <input type="radio" name="paymentTerm" checked={form.payment_term === 'full'} onChange={() => setForm({ ...form, payment_term: 'full' })} />
                      <span className="radio-text">Pay Full-payment</span>
                    </label>
                  </div>

                  <h3 className="section-title-form">Payment Methods:</h3>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input type="radio" name="paymentMethod" checked={form.payment_method === 'bank_transfer'} onChange={() => setForm({ ...form, payment_method: 'bank_transfer' })} />
                      <span className="radio-text">Pay Through Bank Transfer</span>
                    </label>
                    <label className="radio-label">
                      <input type="radio" name="paymentMethod" checked={form.payment_method === 'cash'} onChange={() => setForm({ ...form, payment_method: 'cash' })} />
                      <span className="radio-text">Pay in Cash</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn-save-drafts" onClick={() => submitRequest(true)} disabled={saving}>Save to Drafts</button>
                <button className="btn-confirm-request" onClick={() => submitRequest(false)} disabled={saving}>
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RequestsPage;