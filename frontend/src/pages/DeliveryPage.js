import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api-client';
import ViewLocationMap from '../components/delivery/ViewLocationMap';

const STATUS_STEPS = [
  { key: 'assigned', label: 'Dispatched' },
  { key: 'accepted', label: 'In Transit' },
  { key: 'arrived_pickup', label: 'Arrived at Pickup' },
  { key: 'loading_cargo', label: 'Loading Cargo' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'arrived_dropoff', label: 'Arrived at Drop-off' },
  { key: 'unloading_cargo', label: 'Unloading Cargo' },
  { key: 'returning_to_hq', label: 'Returning to HQ' },
  { key: 'completed', label: 'Completed' },
];

function statusLabel(status) {
  const step = STATUS_STEPS.find((s) => s.key === status);
  return step ? step.label : status === 'rejected' ? 'Rejected' : status;
}

function statusBadgeClass(status) {
  if (status === 'returning_to_hq') return 'returning';
  if (status === 'completed') return 'completed';
  if (status === 'assigned') return 'dispatched';
  if (status === 'rejected') return 'delayed';
  return 'in-transit';
}

function formatRelativeTime(dateString) {
  if (!dateString) return '—';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatTime(dateString) {
  return dateString ? new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
}

function deliveryCode(id) {
  return `DLV${String(id).padStart(4, '0')}`;
}

function DeliveryPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    const update = () => setCurrentDate(new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('/deliveries');
      setDeliveries(res.data);
    } catch {
      setLoadError('Could not load deliveries. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/deliveries');
        setDeliveries(res.data);
      } catch (err) {
        console.error('Delivery monitoring refresh failed:', err);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedDelivery) return;
    const fresh = deliveries.find((d) => d.delivery_id === selectedDelivery.delivery_id);
    if (fresh) setSelectedDelivery(fresh);
  }, [deliveries, selectedDelivery]);

  const stats = useMemo(() => {
    const active = deliveries.filter((d) => !['completed', 'rejected'].includes(d.status)).length;
    const inTransit = deliveries.filter((d) => ['accepted', 'arrived_pickup', 'loading_cargo', 'out_for_delivery', 'arrived_dropoff', 'unloading_cargo'].includes(d.status)).length;
    const returning = deliveries.filter((d) => d.status === 'returning_to_hq').length;
    const dispatched = deliveries.filter((d) => d.status === 'assigned').length;
    const delayed = deliveries.filter((d) => {
      if (d.status !== 'assigned' || !d.start_time) return false;
      return (Date.now() - new Date(d.start_time).getTime()) / 3600000 >= 3;
    }).length;
    const completed = deliveries.filter((d) => d.status === 'completed').length;
    return { active, inTransit, returning, dispatched, delayed, completed };
  }, [deliveries]);

  const filteredDeliveries = useMemo(() => {
    let list = [...deliveries];
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((d) => {
        const haystack = `${d.request?.customer?.full_name || ''} ${d.driver?.user?.full_name || ''} ${d.vehicle?.model || ''} ${d.vehicle?.plate_number || ''}`.toLowerCase();
        return haystack.includes(term);
      });
    }
    if (sortBy === 'recent') list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    if (sortBy === 'oldest') list.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
    return list;
  }, [deliveries, search, sortBy]);

  const openDeliveryPanel = (delivery) => setSelectedDelivery(delivery);
  const closeDeliveryPanel = () => setSelectedDelivery(null);
  const openMapModal = () => { setEta(null); setShowMapModal(true); };
  const closeMapModal = () => setShowMapModal(false);

  const currentStepIndex = selectedDelivery ? STATUS_STEPS.findIndex((s) => s.key === selectedDelivery.status) : -1;

  const latestDriverLocation = useMemo(() => {
    const tracking = selectedDelivery?.tracking || [];
    const locations = tracking.filter((entry) => entry.latitude != null && entry.longitude != null);
    const latest = locations[locations.length - 1];
    return latest ? { lat: Number(latest.latitude), lng: Number(latest.longitude), timestamp: latest.timestamp } : null;
  }, [selectedDelivery]);

  const timeForStep = (stepKey) => {
    if (!selectedDelivery) return '';
    const entry = (selectedDelivery.tracking || []).find((t) => t.status_update === stepKey);
    return entry ? formatTime(entry.timestamp) : '';
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Loading deliveries...</div>;

  return (
    <>
      <div className="dashboard-container">
        <div className="sidebar">
          <div className="logo"><img src="images/HJY LOGO 2 1.png" alt="HJY Trucking Services Logo" /></div>
          <nav className="navigation">
            <ul>
              <li><Link to="/overview"><i className="fas fa-chart-pie"></i> Overview</Link></li>
              <li><Link to="/requests"><i className="fas fa-clipboard-list"></i> Requests Management</Link></li>
              <li><Link to="/dispatch"><i className="fas fa-route"></i> Dispatch Management</Link></li>
              <li className="active"><Link to="/delivery"><i className="fas fa-truck-loading"></i> Delivery Monitoring</Link></li>
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
          <div className="user-profile">
            <img src="images/brucednegrow.png" alt="Admin" className="user-avatar" />
            <div className="user-info">
              <span className="user-name">{JSON.parse(localStorage.getItem('auth_user') || '{}').full_name || 'Admin'}</span>
              <span className="user-role">Admin <span className="status-online"></span></span>
            </div>
          </div>
          <div className="logout">
            <Link to="/" onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); }}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </Link>
          </div>
        </div>

        <div className="main-content">
          <header className="header">
            <div className="page-info"><span className="breadcrumb">Page/Delivery Monitoring</span><h1 className="page-title">DELIVERY MONITORING</h1></div>
            <div className="header-actions">
              <div className="date-picker"><span>{currentDate}</span><i className="far fa-calendar-alt"></i></div>
              <div className="notification"><div className="bell-container"><div className="bell"></div></div></div>
            </div>
          </header>

          {loadError && <div className="form-error" style={{ margin: '16px 0', color: '#d32f2f' }}>{loadError}</div>}

          <div className="monitoring-stats">
            <div className="stat-card"><div className="stat-badge green">{stats.active}</div><span className="stat-label">Active Deliveries</span></div>
            <div className="stat-card"><div className="stat-badge blue">{stats.inTransit}</div><span className="stat-label">In Transit</span></div>
            <div className="stat-card"><div className="stat-badge orange">{stats.returning}</div><span className="stat-label">Returning to HQ</span></div>
            <div className="stat-card"><div className="stat-badge purple">{stats.dispatched}</div><span className="stat-label">Dispatched</span></div>
            <div className="stat-card"><div className="stat-badge red">{stats.delayed}</div><span className="stat-label">Delayed</span></div>
            <div className="stat-card"><div className="stat-badge green-dark">{stats.completed}</div><span className="stat-label">Completed</span></div>
          </div>

          <div className="content-section">
            <div className="section-header">
              <h3 className="section-title">All Deliveries</h3>
              <div className="section-controls">
                <div className="search-bar"><i className="fas fa-search"></i><input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="sort-dropdown">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ border: 'none', background: 'transparent' }}>
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="section-content">
              <table className="data-table monitoring-table">
                <thead>
                  <tr><th>Delivery ID</th><th>Customer</th><th>Driver</th><th>Vehicle</th><th>Last Update</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {filteredDeliveries.map((d) => (
                    <tr className="delivery-row" key={d.delivery_id} onClick={() => openDeliveryPanel(d)}>
                      <td className="delivery-id">{deliveryCode(d.delivery_id)}</td>
                      <td>{d.request?.customer?.full_name || '—'}</td>
                      <td>{d.driver?.user?.full_name || 'Unassigned'}</td>
                      <td>{d.vehicle ? `${d.vehicle.model} – ${d.vehicle.plate_number}` : 'Unassigned'}</td>
                      <td>{formatRelativeTime(d.updated_at)}</td>
                      <td>
                        <span className={`status-badge-monitor ${statusBadgeClass(d.status)}`} onClick={(e) => { e.stopPropagation(); openDeliveryPanel(d); }}>
                          {statusLabel(d.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredDeliveries.length === 0 && (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>No deliveries found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="delivery-footer">
              <div className="delivery-info">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>Select a Delivery Row to expand <strong>Delivery details</strong>.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Details Panel */}
      <div className={`delivery-panel${selectedDelivery ? ' active' : ''}`}>
        {selectedDelivery && (
          <>
            <div className="delivery-panel-header">
              <span><i className="fas fa-truck"></i> Delivery Details</span>
              <i className="fas fa-arrow-left" onClick={closeDeliveryPanel}></i>
            </div>
            <div className="delivery-panel-content">
              <div className="panel-delivery-id">{deliveryCode(selectedDelivery.delivery_id)}</div>
              <div className="panel-customer-name">{selectedDelivery.request?.customer?.full_name || '—'}</div>
              <div className="panel-distance">Distance: {selectedDelivery.request?.distance_km ? `${selectedDelivery.request.distance_km} Kilometers` : '—'}</div>
              <div className="panel-status-row">
                <span className="panel-status-label">Status:</span>
                <span className={`panel-status-badge ${statusBadgeClass(selectedDelivery.status)}`}>{statusLabel(selectedDelivery.status)}</span>
              </div>

              <div className="panel-divider"></div>

              <div className="panel-detail"><span className="panel-detail-label">Contact Number:</span><span className="panel-detail-value">{selectedDelivery.request?.customer?.phone || '—'}</span></div>
              <div className="panel-detail"><span className="panel-detail-label">Driver:</span><span className="panel-detail-value">{selectedDelivery.driver?.user?.full_name ? `${selectedDelivery.driver.user.full_name} (DR${String(selectedDelivery.driver.driver_id).padStart(3, '0')})` : 'Unassigned'}</span></div>
              <div className="panel-detail"><span className="panel-detail-label">Vehicle:</span><span className="panel-detail-value">{selectedDelivery.vehicle ? `${selectedDelivery.vehicle.model} – ${selectedDelivery.vehicle.plate_number}` : 'Unassigned'}</span></div>
              <div className="panel-detail"><span className="panel-detail-label">Pickup:</span><span className="panel-detail-value">{selectedDelivery.request?.pickup_address || '—'}</span></div>
              <div className="panel-detail"><span className="panel-detail-label">Drop-Off:</span><span className="panel-detail-value">{selectedDelivery.request?.dropoff_address || '—'}</span></div>

              <div className="panel-divider"></div>

              <div className="panel-timeline-title">DELIVERY TIMELINE</div>
              <div className="panel-timeline-subtitle">Last Updated {formatTime(selectedDelivery.updated_at)}</div>
              <div className="panel-timeline">
                {STATUS_STEPS.map((step, i) => {
                  const state = i < currentStepIndex ? 'completed' : i === currentStepIndex ? 'active' : '';
                  const time = timeForStep(step.key);
                  return (
                    <div className={`timeline-item ${state}`} key={step.key}>
                      <div className="timeline-marker">{state === 'completed' && <i className="fas fa-check"></i>}</div>
                      <div className="timeline-text">{step.label}</div>
                      {state === 'active' ? (
                        <div className="timeline-meta"><span className="timeline-tag">Current</span><span className="timeline-time">{time}</span></div>
                      ) : (
                        <div className="timeline-time">{time}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button className="btn-view-location" onClick={openMapModal}>
                <i className="fas fa-map-marker-alt"></i> View Location
              </button>
            </div>
          </>
        )}
      </div>
      {selectedDelivery && <div className="panel-overlay active" onClick={closeDeliveryPanel}></div>}

      {/* Map View Modal */}
      {showMapModal && selectedDelivery && (
        <>
          <div className="map-modal-overlay active" onClick={closeMapModal}></div>
          <div className="map-modal active">
            <div className="map-modal-header">
              <div className="map-header-info">
                <div className="map-header-id">{deliveryCode(selectedDelivery.delivery_id)}</div>
                <div className="map-header-name">{selectedDelivery.request?.customer?.full_name}</div>
              </div>
              <button className="map-back-btn" onClick={closeMapModal}><i className="fas fa-arrow-left"></i></button>
            </div>
            <div className="map-modal-body">
              <div className="map-info-card">
                <div className="map-section">
                  <div className="map-section-title"><i className="fas fa-truck"></i> Delivery Details</div>
                  <div className="map-detail-row"><span className="map-detail-label">Status:</span><span className={`map-status-badge ${statusBadgeClass(selectedDelivery.status)}`}>{statusLabel(selectedDelivery.status)}</span></div>
                  <div className="map-detail-row"><span className="map-detail-label">Vehicle:</span><span className="map-detail-value">{selectedDelivery.vehicle ? `${selectedDelivery.vehicle.model} – ${selectedDelivery.vehicle.plate_number}` : 'Unassigned'}</span></div>
                  <div className="map-detail-row"><span className="map-detail-label">Distance:</span><span className="map-detail-value">{selectedDelivery.request?.distance_km ? `${selectedDelivery.request.distance_km} kilometers` : '—'}</span></div>
                  <div className="map-detail-row"><span className="map-detail-label">ETA:</span><span className="map-detail-value">{eta || 'Calculating...'}</span></div>
                </div>
                <div className="map-section">
                  <div className="map-section-title"><i className="fas fa-map-marker-alt"></i> Location</div>
                  <div className="map-location-row"><span className="map-location-label">Pick-up:</span><span className="map-location-value">{selectedDelivery.request?.pickup_address || '—'}</span></div>
                  <div className="map-location-row"><span className="map-location-label">Drop-off:</span><span className="map-location-value">{selectedDelivery.request?.dropoff_address || '—'}</span></div>
                </div>
                <div className="map-section">
                  <div className="map-section-title"><i className="fas fa-user"></i> Driver Info</div>
                  {selectedDelivery.driver?.user ? (
                    <div className="map-driver-card">
                      <img src="images/brucednegrow.png" alt="Driver" className="map-driver-avatar" />
                      <div className="map-driver-info">
                        <div className="map-driver-name">{selectedDelivery.driver.user.full_name}</div>
                        <div className="map-driver-contact">Contact Number: {selectedDelivery.driver.user.phone || '—'}</div>
                        <div className="map-driver-lastseen" style={{ color: '#888' }}>
                          {latestDriverLocation ? `Live GPS updated ${formatRelativeTime(latestDriverLocation.timestamp)}` : 'Waiting for the driver app to share its location.'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#888' }}>No driver assigned.</p>
                  )}
                </div>
              </div>
              <ViewLocationMap
                pickupAddress={selectedDelivery.request?.pickup_address}
                dropoffAddress={selectedDelivery.request?.dropoff_address}
                driverLocation={latestDriverLocation}
                onEtaChange={setEta}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default DeliveryPage;