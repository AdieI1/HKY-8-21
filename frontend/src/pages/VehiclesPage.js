import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api-client';

const ACTIVE_DELIVERY_STATUSES = [
  'assigned',
  'accepted',
  'arrived_pickup',
  'loading_cargo',
  'out_for_delivery',
  'arrived_dropoff',
  'unloading_cargo',
  'returning_to_hq',
];

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function vehicleCode(id) {
  return `VCL${String(id).padStart(3, '0')}`;
}

function statusLabel(status) {
  const map = {
    available: 'Available',
    in_use: 'In Use',
    maintenance: 'Under Maintenance',
    broken: 'Broken',
    decommissioned: 'Decommissioned',
  };
  return map[status] || status;
}

function statusClass(status) {
  const map = { available: 'available', in_use: 'in-use', maintenance: 'maintenance', broken: 'broken', decommissioned: 'decommissioned' };
  return map[status] || '';
}

const EMPTY_FORM = {
  model: '',
  plate_number: '',
  color: '',
  vehicle_type: '10-Wheeler Truck',
  fuel_type: 'diesel',
  capacity: '',
  registration_valid_from: '',
  registration_valid_until: '',
  status: 'available',
  condition: 'Good',
  last_maintenance_date: '',
};

function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const [view, setView] = useState('list'); // 'list' | 'archives'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('vehicle-id');

  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [showDecommissionModal, setShowDecommissionModal] = useState(false);
  const [decommissioningVehicle, setDecommissioningVehicle] = useState(null);
  const [toast, setToast] = useState(null);

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
      const [vehiclesRes, deliveriesRes] = await Promise.all([api.get('/vehicles'), api.get('/deliveries')]);
      setVehicles(vehiclesRes.data);
      setDeliveries(deliveriesRes.data);
    } catch (err) {
      setLoadError('Could not load vehicle data. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derive the driver currently assigned to a vehicle from its most recent
  // active (non-completed) delivery — there's no permanent vehicle-driver
  // link in the schema, assignment happens per-delivery via dispatch.
  const assignedDriverFor = useCallback(
    (vehicleId) => {
      const active = deliveries
        .filter((d) => d.vehicle_id === vehicleId && ACTIVE_DELIVERY_STATUSES.includes(d.status) && d.driver)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return active[0]?.driver || null;
    },
    [deliveries]
  );

  const listedVehicles = useMemo(() => vehicles.filter((v) => v.status !== 'decommissioned'), [vehicles]);
  const archivedVehicles = useMemo(() => vehicles.filter((v) => v.status === 'decommissioned'), [vehicles]);

  const stats = useMemo(
    () => ({
      available: listedVehicles.filter((v) => v.status === 'available').length,
      inUse: listedVehicles.filter((v) => v.status === 'in_use').length,
      maintenance: listedVehicles.filter((v) => v.status === 'maintenance').length,
      broken: listedVehicles.filter((v) => v.status === 'broken').length,
    }),
    [listedVehicles]
  );

  const filteredVehicles = useMemo(() => {
    let list = [...listedVehicles];
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((v) => `${v.model || ''} ${v.plate_number || ''}`.toLowerCase().includes(term));
    }
    if (statusFilter !== 'all') {
      list = list.filter((v) => v.status === statusFilter);
    }
    if (conditionFilter !== 'all') {
      list = list.filter((v) => (v.condition || '').toLowerCase() === conditionFilter);
    }
    if (sortBy === 'vehicle-id') {
      list.sort((a, b) => a.vehicle_id - b.vehicle_id);
    } else if (sortBy === 'status') {
      list.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
    }
    return list;
  }, [listedVehicles, search, statusFilter, conditionFilter, sortBy]);

  // ----- Add / Edit -----
  const openAddModal = () => {
    setEditingVehicle(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      model: vehicle.model || '',
      plate_number: vehicle.plate_number || '',
      color: vehicle.color || '',
      vehicle_type: vehicle.vehicle_type || '10-Wheeler Truck',
      fuel_type: vehicle.fuel_type || 'diesel',
      capacity: vehicle.capacity || '',
      registration_valid_from: vehicle.registration_valid_from || '',
      registration_valid_until: vehicle.registration_valid_until || '',
      status: vehicle.status || 'available',
      condition: vehicle.condition || 'Good',
      last_maintenance_date: vehicle.last_maintenance_date || '',
    });
    setFormError('');
    setShowFormModal(true);
  };

  const saveVehicle = async () => {
    if (!form.model || !form.plate_number || !form.color || !form.vehicle_type || !form.fuel_type || !form.capacity) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, capacity: form.capacity };
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.vehicle_id}`, payload);
      } else {
        await api.post('/vehicles', payload);
      }
      setShowFormModal(false);
      await loadData();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      setFormError(errors ? Object.values(errors)[0][0] : message || 'Could not save vehicle.');
      console.error('Save vehicle failed:', err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  // ----- Decommission / Restore -----
  const openDecommissionModal = (vehicle) => {
    setDecommissioningVehicle(vehicle);
    setShowDecommissionModal(true);
  };

  const confirmDecommission = async () => {
    const vehicle = decommissioningVehicle;
    try {
      await api.patch(`/vehicles/${vehicle.vehicle_id}`, { status: 'decommissioned' });
      setShowDecommissionModal(false);
      setSelectedVehicle(null);
      await loadData();
      setToast({ message: `${vehicle.model} (${vehicleCode(vehicle.vehicle_id)}) decommissioned.`, undoId: vehicle.vehicle_id });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setShowDecommissionModal(false);
    }
  };

  const undoDecommission = async () => {
    if (!toast?.undoId) return;
    try {
      await api.patch(`/vehicles/${toast.undoId}`, { status: 'available' });
      await loadData();
    } finally {
      setToast(null);
    }
  };

  const restoreVehicle = async (vehicle) => {
    try {
      await api.patch(`/vehicles/${vehicle.vehicle_id}`, { status: 'available' });
      await loadData();
    } catch (err) {
      // reload will reflect actual state either way
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
              <li><Link to="/requests"><i className="fas fa-clipboard-list"></i> Requests Management</Link></li>
              <li><Link to="/dispatch"><i className="fas fa-route"></i> Dispatch Management</Link></li>
              <li><Link to="/delivery"><i className="fas fa-truck-loading"></i> Delivery Monitoring</Link></li>
              <li><Link to="/drivers"><i className="fas fa-id-card"></i> Drivers</Link></li>
              <li className="active"><Link to="/vehicles"><i className="fas fa-truck"></i> Vehicles</Link></li>
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
            <div className="page-info">
              <span className="breadcrumb">Page/Vehicles</span>
              <h1 className="page-title">VEHICLE MANAGEMENT</h1>
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

          {view === 'list' && (
            <div className="vehicle-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div className="stat-card"><div className="vehicle-stat-badge green">{stats.available}</div><span className="vehicle-stat-label">Available<br /><small>Ready for Dispatch</small></span></div>
              <div className="stat-card"><div className="vehicle-stat-badge blue">{stats.inUse}</div><span className="vehicle-stat-label">In Use</span></div>
              <div className="stat-card"><div className="vehicle-stat-badge orange">{stats.maintenance}</div><span className="vehicle-stat-label">Under Maintenance</span></div>
              <div className="stat-card"><div className="vehicle-stat-badge red">{stats.broken}</div><span className="vehicle-stat-label">Broken<br /><small>Out of Service</small></span></div>
            </div>
          )}

          {view === 'list' ? (
            <div className="content-section vehicles-section">
              <div className="vehicles-toolbar" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, margin: '16px 0' }}>
                <div className="vehicles-toolbar-left" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div className="search-bar">
                    <i className="fas fa-search"></i>
                    <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="vehicles-filter">
                    <span>Sort by</span>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="vehicle-id">Vehicle ID</option>
                      <option value="status">Status</option>
                    </select>
                  </div>
                  <div className="vehicles-filter">
                    <span>Filter by</span>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="all">All Status</option>
                      <option value="available">Available</option>
                      <option value="in_use">In Use</option>
                      <option value="maintenance">Under Maintenance</option>
                      <option value="broken">Broken</option>
                    </select>
                  </div>
                  <div className="vehicles-filter">
                    <span>Condition</span>
                    <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)}>
                      <option value="all">All</option>
                      <option value="good">Good</option>
                      <option value="need repair">Need Repair</option>
                      <option value="irreparable">Irreparable</option>
                    </select>
                  </div>
                </div>
                <div className="vehicles-toolbar-right" style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-archives" onClick={() => setView('archives')}>Archives</button>
                  <button className="btn-add-vehicle" onClick={openAddModal}><i className="fas fa-plus"></i> Add Vehicle</button>
                </div>
              </div>

              <div className="section-content vehicles-table-wrap">
                <table className="data-table vehicles-table">
                  <thead>
                    <tr><th>Vehicle ID</th><th>Model/Name</th><th>Status</th><th>Condition</th><th>Last Maintenance</th><th>Next Maintenance</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.map((vehicle) => (
                      <tr key={vehicle.vehicle_id} className="vehicle-row" onClick={() => setSelectedVehicle(vehicle)}>
                        <td className="vehicle-id">{vehicleCode(vehicle.vehicle_id)}</td>
                        <td className="vehicle-model">{vehicle.model || vehicle.brand || '—'}</td>
                        <td><span className={`vehicle-status ${statusClass(vehicle.status)}`}><i className="fas fa-circle"></i> {statusLabel(vehicle.status)}</span></td>
                        <td>{vehicle.condition || '—'}</td>
                        <td>{formatDate(vehicle.last_maintenance_date)}</td>
                        <td>{formatDate(vehicle.next_maintenance_date)}</td>
                        <td className="action-cell">
                          <button className="btn-edit" onClick={(e) => { e.stopPropagation(); openEditModal(vehicle); }}>Edit info</button>
                          <button className="btn-danger btn-decommission" onClick={(e) => { e.stopPropagation(); openDecommissionModal(vehicle); }}>Decommission</button>
                        </td>
                      </tr>
                    ))}
                    {loading && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading vehicles...</td></tr>
                    )}
                    {!loading && filteredVehicles.length === 0 && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24 }}>No vehicles found.</td></tr>
                    )}
                  </tbody>
                </table>
                <p className="vehicles-table-hint" style={{ marginTop: 8, color: '#888' }}>
                  <i className="fas fa-info-circle"></i> Select a Vehicle row to view Vehicle details.
                </p>
              </div>
            </div>
          ) : (
            <div className="content-section vehicles-section">
              <div className="vehicles-toolbar" style={{ display: 'flex', justifyContent: 'space-between', margin: '16px 0' }}>
                <h2 className="vehicle-archives-title">Vehicle Archives</h2>
                <button className="btn-return-vehicles" onClick={() => setView('list')}>Return <i className="fas fa-reply"></i></button>
              </div>
              <table className="data-table vehicles-table">
                <thead><tr><th>Vehicle ID</th><th>Model/Name</th><th>Condition</th><th>Action</th></tr></thead>
                <tbody>
                  {archivedVehicles.map((vehicle) => (
                    <tr key={vehicle.vehicle_id}>
                      <td>{vehicleCode(vehicle.vehicle_id)}</td>
                      <td>{vehicle.model || '—'}</td>
                      <td>{vehicle.condition || '—'}</td>
                      <td><button className="btn-edit" onClick={() => restoreVehicle(vehicle)}>Restore</button></td>
                    </tr>
                  ))}
                  {archivedVehicles.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24 }}>No archived vehicles yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-notification show">
          <div className="toast-content">
            <span className="toast-message"><i className="fas fa-check-circle"></i> {toast.message}</span>
            <button className="btn-undo" onClick={undoDecommission}><i className="fa fa-undo"></i> Undo</button>
          </div>
        </div>
      )}

      {/* Decommission confirmation */}
      {showDecommissionModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-body" style={{ padding: 24 }}>
              <h3>Decommission Vehicle</h3>
              <p>Are you sure you want to decommission <strong>{decommissioningVehicle?.model}</strong> ({vehicleCode(decommissioningVehicle?.vehicle_id)})?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowDecommissionModal(false)}>Cancel</button>
              <button className="btn-save" onClick={confirmDecommission}>Decommission</button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle details */}
      {selectedVehicle && !showFormModal && (
        <div className="modal driver-details-modal driver-info-modal" style={{ display: 'block' }}>
          <div className="driver-info-content" style={{ maxWidth: 700, margin: '40px auto', background: '#fff', borderRadius: 10, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="driver-info-header">
              <h2 className="driver-info-title">VEHICLE INFORMATION</h2>
              <button className="driver-info-close" onClick={() => setSelectedVehicle(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="driver-info-body" style={{ padding: 20 }}>
              <h3>{selectedVehicle.model}</h3>
              <p>{vehicleCode(selectedVehicle.vehicle_id)} · {selectedVehicle.plate_number}</p>
              <p><strong>Color:</strong> {selectedVehicle.color || '—'}</p>
              <p><strong>Type:</strong> {selectedVehicle.vehicle_type || '—'} · <strong>Fuel:</strong> {selectedVehicle.fuel_type || '—'}</p>
              <p><strong>Load Capacity:</strong> {selectedVehicle.capacity ? `${selectedVehicle.capacity} kg` : '—'}</p>
              <p><strong>Status:</strong> {statusLabel(selectedVehicle.status)} · <strong>Condition:</strong> {selectedVehicle.condition || '—'}</p>
              <p><strong>Registration:</strong> {formatDate(selectedVehicle.registration_valid_from)} – {formatDate(selectedVehicle.registration_valid_until)}</p>
              <p><strong>Last Maintenance:</strong> {formatDate(selectedVehicle.last_maintenance_date)} · <strong>Next:</strong> {formatDate(selectedVehicle.next_maintenance_date)}</p>

              <h4 style={{ marginTop: 20 }}>Currently Assigned Driver</h4>
              {(() => {
                const driver = assignedDriverFor(selectedVehicle.vehicle_id);
                if (!driver) {
                  return <p style={{ color: '#888' }}>No driver currently assigned — this vehicle has no active delivery right now.</p>;
                }
                return (
                  <>
                    <p><strong>Name:</strong> {driver.user?.full_name || '—'}</p>
                    <p><strong>Contact:</strong> {driver.user?.phone || '—'}</p>
                    <p><strong>License No:</strong> {driver.license_number || '—'}</p>
                    <p style={{ color: '#888', fontSize: 13 }}>Full driver profile is available on the Drivers page.</p>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit vehicle */}
      {showFormModal && (
        <div
          className="modal"
          style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: 20 }}
        >
          <div className="modal-content" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10 }}>
            <div className="modal-header" style={{ position: 'sticky', top: 0 }}>
              <h2>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button className="modal-close" onClick={() => setShowFormModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              {formError && <div className="form-error" style={{ color: '#d32f2f', marginBottom: 12 }}>{formError}</div>}
              <form className="edit-form" onSubmit={(e) => e.preventDefault()}>
                <h4 className="form-section-title"><i className="fas fa-file-alt"></i> Vehicle Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vehicle Model<span className="required">*</span></label>
                    <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Plate Number<span className="required">*</span></label>
                    <input type="text" value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Color<span className="required">*</span></label>
                    <input type="text" placeholder="e.g. Blue | #244172" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                  </div>
                </div>

                <h4 className="form-section-title"><i className="fas fa-truck"></i> Vehicle Specifications</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vehicle Type<span className="required">*</span></label>
                    <select value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}>
                      <option value="10-Wheeler Truck">10-Wheeler Truck</option>
                      <option value="6-Wheeler Truck">6-Wheeler Truck</option>
                      <option value="Trailer Truck">Trailer Truck</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fuel Type<span className="required">*</span></label>
                    <select value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>
                      <option value="diesel">Diesel</option>
                      <option value="gasoline">Gasoline</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Load Capacity (kg)<span className="required">*</span></label>
                    <input type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                  </div>
                </div>

                <h4 className="form-section-title"><i className="fas fa-clipboard-list"></i> Vehicle Document</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Registration Valid From</label>
                    <input type="date" value={form.registration_valid_from || ''} onChange={(e) => setForm({ ...form, registration_valid_from: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Registration Valid Until</label>
                    <input type="date" value={form.registration_valid_until || ''} onChange={(e) => setForm({ ...form, registration_valid_until: e.target.value })} />
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#888' }}>
                  Registration document upload isn't wired to storage yet — only the validity dates are saved.
                </p>

                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="available">Available</option>
                      <option value="in_use">In Use</option>
                      <option value="maintenance">Under Maintenance</option>
                      <option value="broken">Broken</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Condition</label>
                    <input type="text" placeholder="Good / Need Repair / Irreparable" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Last Maintenance</label>
                    <input type="date" value={form.last_maintenance_date || ''} onChange={(e) => setForm({ ...form, last_maintenance_date: e.target.value })} />
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowFormModal(false)}>Cancel</button>
              <button className="btn-save" onClick={saveVehicle} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VehiclesPage;