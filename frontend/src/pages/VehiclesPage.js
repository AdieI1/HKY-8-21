import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import NotificationBell from '../components/NotificationBell';

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

const SERVICE_TYPES = [
  'Preventive Maintenance',
  'Corrective Maintenance',
  'Predictive Maintenance',
  'Emergency Maintenance',
  'Routine Maintenance',
  'Major Maintenance',
  'Inspection',
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
  brand: '',
  plate_number: '',
  color: '',
  vehicle_type: '10-Wheeler Truck',
  fuel_type: 'diesel',
  capacity: '',
  mileage: '',
  odometer_reading: '',
  registration_valid_from: '',
  registration_valid_until: '',
  status: 'available',
  condition: 'Good',
  last_maintenance_date: '',
  next_maintenance_date: '',
};

function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const [view, setView] = useState('list'); // 'list' | 'archives'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('vehicle-id');

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleDetailsData, setVehicleDetailsData] = useState(null);

  // Add / Edit vehicle
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState(null);
  const vehicleFileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Schedule Maintenance Modal (Matches Reference Image)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingVehicle, setSchedulingVehicle] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    maintenance_date: new Date().toISOString().split('T')[0],
    maintenance_type: 'Preventive Maintenance',
    maintenance_cost: '',
    maintained_by_name: '',
    notes: '',
    part_id: '',
    quantity_used: '',
    status: 'Scheduled',
  });
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  // Decommission / Restore
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
      const [vehiclesRes, deliveriesRes, partsRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/deliveries'),
        api.get('/spare-parts'),
      ]);
      setVehicles(vehiclesRes.data);
      setDeliveries(deliveriesRes.data);
      setSpareParts(partsRes.data);
    } catch (err) {
      setLoadError('Could not load vehicle data. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      list = list.filter((v) => `${v.model || ''} ${v.plate_number || ''} ${v.brand || ''}`.toLowerCase().includes(term));
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

  // Load detailed vehicle info with maintenances
  const openVehicleDetails = async (vehicle) => {
    setSelectedVehicle(vehicle);
    try {
      const res = await api.get(`/vehicles/${vehicle.vehicle_id}`);
      setVehicleDetailsData(res.data);
    } catch (err) {
      setVehicleDetailsData(vehicle);
    }
  };

  // ----- Add / Edit -----
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Image size exceeds 5MB.');
        return;
      }
      setVehiclePhotoFile(file);
      setVehiclePhotoPreview(URL.createObjectURL(file));
      setFormError('');
    }
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    setForm(EMPTY_FORM);
    setVehiclePhotoFile(null);
    setVehiclePhotoPreview(null);
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      model: vehicle.model || '',
      brand: vehicle.brand || '',
      plate_number: vehicle.plate_number || '',
      color: vehicle.color || '',
      vehicle_type: vehicle.vehicle_type || '10-Wheeler Truck',
      fuel_type: vehicle.fuel_type || 'diesel',
      capacity: vehicle.capacity || '',
      mileage: vehicle.mileage || '',
      odometer_reading: vehicle.odometer_reading || '',
      registration_valid_from: vehicle.registration_valid_from || '',
      registration_valid_until: vehicle.registration_valid_until || '',
      status: vehicle.status || 'available',
      condition: vehicle.condition || 'Good',
      last_maintenance_date: vehicle.last_maintenance_date || '',
      next_maintenance_date: vehicle.next_maintenance_date || '',
    });
    setVehiclePhotoFile(null);
    setVehiclePhotoPreview(vehicle.photo_url || null);
    setFormError('');
    setShowFormModal(true);
  };

  const saveVehicle = async () => {
    if (!form.model || !form.plate_number || !form.color || !form.vehicle_type || !form.fuel_type) {
      setFormError('Please fill in all required fields (Model, Plate Number, Color, Type, Fuel Type).');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const formData = new FormData();
      formData.append('model', form.model);
      if (form.brand) formData.append('brand', form.brand);
      formData.append('plate_number', form.plate_number);
      formData.append('color', form.color);
      formData.append('vehicle_type', form.vehicle_type);
      formData.append('fuel_type', form.fuel_type);
      if (form.capacity) formData.append('capacity', form.capacity);
      if (form.mileage) formData.append('mileage', form.mileage);
      if (form.odometer_reading) formData.append('odometer_reading', form.odometer_reading);
      if (form.registration_valid_from) formData.append('registration_valid_from', form.registration_valid_from);
      if (form.registration_valid_until) formData.append('registration_valid_until', form.registration_valid_until);
      if (form.status) formData.append('status', form.status);
      if (form.condition) formData.append('condition', form.condition);
      if (form.last_maintenance_date) formData.append('last_maintenance_date', form.last_maintenance_date);
      if (form.next_maintenance_date) formData.append('next_maintenance_date', form.next_maintenance_date);

      if (vehiclePhotoFile) {
        formData.append('photo', vehiclePhotoFile);
      }

      if (editingVehicle) {
        await api.post(`/vehicles/${editingVehicle.vehicle_id}?_method=PUT`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/vehicles', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
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

  // ----- Schedule Maintenance Modal (Matches Reference Image) -----
  const openScheduleMaintenanceModal = (vehicle, e) => {
    e?.stopPropagation();
    setSchedulingVehicle(vehicle);
    setScheduleForm({
      maintenance_date: new Date().toISOString().split('T')[0],
      maintenance_type: 'Preventive Maintenance',
      maintenance_cost: '',
      maintained_by_name: '',
      notes: '',
      part_id: '',
      quantity_used: '',
      status: 'Scheduled',
    });
    setScheduleError('');
    setShowScheduleModal(true);
  };

  const selectedPart = useMemo(() => {
    if (!scheduleForm.part_id) return null;
    return spareParts.find((p) => String(p.part_id) === String(scheduleForm.part_id)) || null;
  }, [scheduleForm.part_id, spareParts]);

  const handleScheduleMaintenance = async () => {
    if (!scheduleForm.maintenance_date || !scheduleForm.maintenance_type) {
      setScheduleError('Please select schedule date and service type.');
      return;
    }

    if (scheduleForm.part_id && scheduleForm.quantity_used) {
      const qty = parseInt(scheduleForm.quantity_used, 10);
      if (selectedPart && qty > selectedPart.quantity_in_stock) {
        setScheduleError(`Insufficient stock for ${selectedPart.part_name}. Available: ${selectedPart.quantity_in_stock} ${selectedPart.unit || 'pcs'}.`);
        return;
      }
    }

    setScheduling(true);
    setScheduleError('');
    try {
      await api.post('/vehicle-maintenance', {
        vehicle_id: schedulingVehicle.vehicle_id,
        maintenance_type: scheduleForm.maintenance_type,
        maintenance_date: scheduleForm.maintenance_date,
        maintenance_cost: scheduleForm.maintenance_cost ? parseFloat(scheduleForm.maintenance_cost) : 0,
        maintained_by_name: scheduleForm.maintained_by_name,
        notes: scheduleForm.notes,
        status: scheduleForm.status,
        part_id: scheduleForm.part_id || null,
        quantity_used: scheduleForm.quantity_used ? parseInt(scheduleForm.quantity_used, 10) : null,
      });

      setShowScheduleModal(false);
      await loadData();
      if (selectedVehicle && selectedVehicle.vehicle_id === schedulingVehicle.vehicle_id) {
        await openVehicleDetails(schedulingVehicle);
      }
      setToast({ message: `Maintenance scheduled for ${schedulingVehicle.model} (${vehicleCode(schedulingVehicle.vehicle_id)}).` });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to schedule maintenance.';
      setScheduleError(msg);
    } finally {
      setScheduling(false);
    }
  };

  // ----- Decommission / Restore -----
  const openDecommissionModal = (vehicle, e) => {
    e?.stopPropagation();
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
      console.error('Failed to restore vehicle:', err);
    }
  };

  return (
    <>
      <div className="dashboard-container">
        <Sidebar activePage="vehicles" />

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
              <NotificationBell />
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
                    <input type="text" placeholder="Search vehicles..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                    <tr>
                      <th>Vehicle</th>
                      <th>Vehicle ID</th>
                      <th>Plate Number</th>
                      <th>Status</th>
                      <th>Condition</th>
                      <th>Last Maintenance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.map((vehicle) => (
                      <tr key={vehicle.vehicle_id} className="vehicle-row" onClick={() => openVehicleDetails(vehicle)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img
                              src={vehicle.photo_url || '/images/default-truck.png'}
                              alt={vehicle.model}
                              style={{ width: 36, height: 30, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0', flexShrink: 0 }}
                              onError={(e) => { e.currentTarget.src = '/images/default-truck.png'; }}
                            />
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{vehicle.model || vehicle.brand || '—'}</span>
                          </div>
                        </td>
                        <td className="vehicle-id" style={{ fontWeight: 600, fontSize: 13 }}>{vehicleCode(vehicle.vehicle_id)}</td>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{vehicle.plate_number}</td>
                        <td><span className={`vehicle-status ${statusClass(vehicle.status)}`} style={{ fontSize: 12 }}><i className="fas fa-circle"></i> {statusLabel(vehicle.status)}</span></td>
                        <td style={{ fontSize: 13 }}>{vehicle.condition || '—'}</td>
                        <td style={{ fontSize: 13 }}>{formatDate(vehicle.last_maintenance_date)}</td>
                        <td className="action-cell" onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap' }}>
                            <button
                              className="btn-action-schedule"
                              onClick={(e) => openScheduleMaintenanceModal(vehicle, e)}
                              title="Schedule Maintenance"
                              style={{
                                background: '#f97316',
                                color: '#fff',
                                border: 'none',
                                padding: '5px 8px',
                                borderRadius: 5,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <i className="fas fa-tools"></i> Schedule
                            </button>
                            <button
                              className="btn-danger btn-decommission"
                              onClick={(e) => openDecommissionModal(vehicle, e)}
                              title="Decommission Vehicle"
                              style={{
                                background: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                padding: '5px 8px',
                                borderRadius: 5,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Decommission
                            </button>
                            <button
                              className="btn-edit"
                              onClick={(e) => { e.stopPropagation(); openEditModal(vehicle); }}
                              title="Edit Vehicle Information"
                              style={{
                                background: '#475569',
                                color: '#fff',
                                border: 'none',
                                padding: '5px 8px',
                                borderRadius: 5,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Edit
                            </button>
                          </div>
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
                <p className="vehicles-table-hint" style={{ marginTop: 8, color: '#888', fontSize: 13 }}>
                  <i className="fas fa-info-circle"></i> Click any Vehicle row to view full Vehicle Specifications & Maintenance History.
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
                <thead><tr><th>Vehicle</th><th>Vehicle ID</th><th>Condition</th><th>Action</th></tr></thead>
                <tbody>
                  {archivedVehicles.map((vehicle) => (
                    <tr key={vehicle.vehicle_id}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={vehicle.photo_url || '/images/default-truck.png'}
                          alt=""
                          style={{ width: 36, height: 32, objectFit: 'cover', borderRadius: 4 }}
                          onError={(e) => { e.currentTarget.src = '/images/default-truck.png'; }}
                        />
                        <span>{vehicle.model || '—'}</span>
                      </td>
                      <td>{vehicleCode(vehicle.vehicle_id)}</td>
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

      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification show">
          <div className="toast-content">
            <span className="toast-message"><i className="fas fa-check-circle"></i> {toast.message}</span>
            {toast.undoId && <button className="btn-undo" onClick={undoDecommission}><i className="fa fa-undo"></i> Undo</button>}
          </div>
        </div>
      )}

      {/* Decommission confirmation */}
      {showDecommissionModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content" style={{ maxWidth: 450, borderRadius: 10 }}>
            <div className="modal-body" style={{ padding: 24 }}>
              <h3 style={{ color: '#dc2626', margin: '0 0 12px' }}>Decommission Vehicle</h3>
              <p>Are you sure you want to decommission <strong>{decommissioningVehicle?.model}</strong> ({vehicleCode(decommissioningVehicle?.vehicle_id)})?</p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 24px' }}>
              <button className="btn-cancel" onClick={() => setShowDecommissionModal(false)}>Cancel</button>
              <button className="btn-save" style={{ background: '#dc2626' }} onClick={confirmDecommission}>Decommission</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCHEDULE MAINTENANCE MODAL (MATCHING REFERENCE PHOTO EXACTLY)            */}
      {/* ========================================================================= */}
      {showScheduleModal && schedulingVehicle && (
        <div
          className="modal"
          style={{
            display: 'flex',
            position: 'fixed',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            zIndex: 1100,
            padding: 16,
          }}
        >
          <div
            className="modal-content"
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#ffffff',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            {/* Red banner header */}
            <div
              style={{
                background: '#d32f2f',
                color: '#ffffff',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px' }}>
                SCHEDULE MAINTENANCE
              </h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Vehicle card matching reference photo */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 14,
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  marginBottom: 20,
                }}
              >
                <img
                  src={schedulingVehicle.photo_url || '/images/default-truck.png'}
                  alt={schedulingVehicle.model}
                  style={{
                    width: 70,
                    height: 52,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                  }}
                  onError={(e) => { e.currentTarget.src = '/images/default-truck.png'; }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                      {schedulingVehicle.model || 'FUSO FJ 2823R'}
                    </h3>
                    <span
                      style={{
                        background: schedulingVehicle.status === 'available' ? '#dcfce7' : '#dbeafe',
                        color: schedulingVehicle.status === 'available' ? '#16a34a' : '#2563eb',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '2px 10px',
                        borderRadius: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      ● {statusLabel(schedulingVehicle.status)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 13, color: '#64748b' }}>
                    <span>{vehicleCode(schedulingVehicle.vehicle_id)}</span>
                    <span>Plate Number: <strong>{schedulingVehicle.plate_number}</strong></span>
                  </div>
                </div>
              </div>

              {scheduleError && (
                <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                  {scheduleError}
                </div>
              )}

              {/* Maintenance Details section */}
              <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: '#0f172a', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                MAINTENANCE DETAILS
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Schedule Date */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Schedule Date:
                  </label>
                  <input
                    type="date"
                    value={scheduleForm.maintenance_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, maintenance_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Select Service Type (7 Required types) */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Select Service Type:
                  </label>
                  <select
                    value={scheduleForm.maintenance_type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, maintenance_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      background: '#fff',
                    }}
                  >
                    {SERVICE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Maintenance Cost */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Maintenance Cost:
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter Cost"
                    value={scheduleForm.maintenance_cost}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, maintenance_cost: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Maintained By */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Maintained By:
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Maintenance Provider"
                    value={scheduleForm.maintained_by_name}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, maintained_by_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Parts Used Selection (Skipped/Optional if Inspection) */}
                {scheduleForm.maintenance_type !== 'Inspection' ? (
                  <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                      Parts Required / Used (Optional):
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                      <select
                        value={scheduleForm.part_id}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, part_id: e.target.value, quantity_used: e.target.value ? (scheduleForm.quantity_used || '1') : '' })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          background: '#fff',
                        }}
                      >
                        <option value="">-- None / No Parts --</option>
                        {spareParts.map((p) => (
                          <option key={p.part_id} value={p.part_id}>
                            {p.part_name} ({p.quantity_in_stock} {p.unit || 'pcs'} in stock)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        disabled={!scheduleForm.part_id}
                        value={scheduleForm.quantity_used}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, quantity_used: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    {selectedPart && (
                      <p style={{ margin: '6px 0 0', fontSize: 11, color: selectedPart.quantity_in_stock <= 0 ? '#ef4444' : '#16a34a' }}>
                        Current available stock: <strong>{selectedPart.quantity_in_stock} {selectedPart.unit || 'pcs'}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: '4px 0', fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                    <i className="fas fa-info-circle"></i> Inspection does not require spare parts deduction.
                  </p>
                )}

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Notes / Description:
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Enter additional details or issues found..."
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={handleScheduleMaintenance}
                  disabled={scheduling}
                  style={{
                    width: '100%',
                    background: '#d32f2f',
                    color: '#ffffff',
                    padding: '12px 16px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)',
                  }}
                >
                  {scheduling ? 'Scheduling...' : 'Schedule Maintenance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VEHICLE DETAILS MODAL (FULL SPECS, DRIVER, MAINTENANCE & PARTS HISTORY)   */}
      {/* ========================================================================= */}
      {selectedVehicle && !showFormModal && !showScheduleModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            padding: 16,
          }}
          onClick={() => setSelectedVehicle(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '1080px',
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: 12,
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: '#1e293b',
                color: '#ffffff',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fas fa-truck" style={{ fontSize: 20, color: '#f59e0b' }}></i>
                <h2 style={{ margin: 0, color: '#ffffff', fontSize: 18, fontWeight: 800, letterSpacing: '0.5px' }}>
                  VEHICLE SPECIFICATIONS &amp; HISTORY
                </h2>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 22,
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body Container */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Top 3-Card Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {/* Card 1: Vehicle Identity & Action Buttons */}
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                      <img
                        src={selectedVehicle.photo_url || '/images/default-truck.png'}
                        alt={selectedVehicle.model}
                        style={{ width: 70, height: 52, objectFit: 'cover', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', flexShrink: 0 }}
                        onError={(e) => { e.currentTarget.src = '/images/default-truck.png'; }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {selectedVehicle.model}
                          </h3>
                          <span className={`vehicle-status ${statusClass(selectedVehicle.status)}`} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            ● {statusLabel(selectedVehicle.status)}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
                          <strong>{vehicleCode(selectedVehicle.vehicle_id)}</strong> · Plate: <strong>{selectedVehicle.plate_number}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3 Uniform Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={(e) => openScheduleMaintenanceModal(selectedVehicle, e)}
                      style={{
                        width: '100%',
                        height: '36px',
                        background: '#f97316',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        boxSizing: 'border-box',
                      }}
                    >
                      <i className="fas fa-tools"></i> Schedule Maintenance
                    </button>
                    <button
                      onClick={() => { const v = selectedVehicle; setSelectedVehicle(null); openEditModal(v); }}
                      style={{
                        width: '100%',
                        height: '36px',
                        background: '#475569',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        boxSizing: 'border-box',
                      }}
                    >
                      <i className="fas fa-edit"></i> Edit Info
                    </button>
                    <button
                      onClick={(e) => openDecommissionModal(selectedVehicle, e)}
                      style={{
                        width: '100%',
                        height: '36px',
                        background: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        boxSizing: 'border-box',
                      }}
                    >
                      <i className="fas fa-ban"></i> Decommission
                    </button>
                  </div>
                </div>

                {/* Card 2: Vehicle Specs */}
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#1e293b', fontSize: 14, fontWeight: 700, borderBottom: '1px solid #cbd5e1', paddingBottom: 6 }}>
                    Vehicle Specs
                  </h4>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Vehicle Type:</strong> {selectedVehicle.vehicle_type || '—'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Fuel Type:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedVehicle.fuel_type || 'diesel'}</span></p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Load Capacity:</strong> {selectedVehicle.capacity ? `${selectedVehicle.capacity} kg` : '—'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Color:</strong> {selectedVehicle.color || '—'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Condition:</strong> {selectedVehicle.condition || 'Good'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Registration Valid:</strong> {formatDate(selectedVehicle.registration_valid_from)} to {formatDate(selectedVehicle.registration_valid_until)}</p>
                </div>

                {/* Card 3: Assigned Driver & Usage */}
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#1e293b', fontSize: 14, fontWeight: 700, borderBottom: '1px solid #cbd5e1', paddingBottom: 6 }}>
                    Assigned Driver &amp; Usage
                  </h4>
                  {(() => {
                    const driver = assignedDriverFor(selectedVehicle.vehicle_id);
                    if (!driver) {
                      return <p style={{ color: '#64748b', fontSize: 13, margin: '6px 0' }}>No driver assigned to an active delivery right now.</p>;
                    }
                    return (
                      <>
                        <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Driver Name:</strong> {driver.user?.full_name || '—'}</p>
                        <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Contact:</strong> {driver.user?.phone || '—'}</p>
                        <p style={{ margin: '6px 0', fontSize: 13 }}><strong>License No:</strong> {driver.license_number || '—'}</p>
                      </>
                    );
                  })()}
                  {(() => {
                    const todayIso = new Date().toISOString().split('T')[0];
                    const maintenancesList = vehicleDetailsData?.maintenances || selectedVehicle?.maintenances || [];
                    
                    // Future scheduled maintenance (strictly in the future: > today)
                    const futureScheduled = maintenancesList.find((m) => (m.status === 'Scheduled' || m.status === 'In Progress') && m.maintenance_date > todayIso);
                    const nextDate = (selectedVehicle.next_maintenance_date && selectedVehicle.next_maintenance_date > todayIso)
                      ? selectedVehicle.next_maintenance_date
                      : (futureScheduled ? futureScheduled.maintenance_date : null);

                    // Past maintenance (completed OR any maintenance whose date <= today)
                    const pastMaintenances = maintenancesList.filter((m) => m.status === 'Completed' || (m.maintenance_date && m.maintenance_date <= todayIso));
                    const latestPastM = pastMaintenances[0];
                    const lastDate = latestPastM?.maintenance_date 
                      || (selectedVehicle.last_maintenance_date && selectedVehicle.last_maintenance_date <= todayIso ? selectedVehicle.last_maintenance_date : null)
                      || (selectedVehicle.next_maintenance_date && selectedVehicle.next_maintenance_date <= todayIso ? selectedVehicle.next_maintenance_date : null);

                    return (
                      <>
                        <p style={{ margin: '10px 0 6px', fontSize: 13, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                          <strong>Last Maintenance:</strong> {lastDate ? formatDate(lastDate) : '—'}
                        </p>
                        <p style={{ margin: '6px 0', fontSize: 13 }}>
                          <strong>Next Maintenance:</strong> {nextDate ? (
                            <span style={{ color: '#d97706', fontWeight: 700 }}>
                              {formatDate(nextDate)} {futureScheduled ? `(${futureScheduled.status})` : ''}
                            </span>
                          ) : '—'}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Maintenance History Table Section */}
              <div>
                <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-history" style={{ color: '#d32f2f' }}></i> Maintenance History &amp; Parts Used
                </h4>
                <div style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 14px', fontSize: 13, color: '#c53030', fontWeight: 700 }}>Date</th>
                        <th style={{ padding: '12px 14px', fontSize: 13, color: '#c53030', fontWeight: 700 }}>Service Type</th>
                        <th style={{ padding: '12px 14px', fontSize: 13, color: '#c53030', fontWeight: 700 }}>Cost</th>
                        <th style={{ padding: '12px 14px', fontSize: 13, color: '#c53030', fontWeight: 700 }}>Provider / Maintained By</th>
                        <th style={{ padding: '12px 14px', fontSize: 13, color: '#c53030', fontWeight: 700 }}>Parts Used</th>
                        <th style={{ padding: '12px 14px', fontSize: 13, color: '#c53030', fontWeight: 700, textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const todayIso = new Date().toISOString().split('T')[0];
                        const list = vehicleDetailsData?.maintenances || [];
                        return list.map((m) => {
                          const isPast = m.maintenance_date <= todayIso;
                          const displayStatus = m.status === 'Completed' ? 'Completed' : (isPast ? 'Completed' : (m.status || 'Scheduled'));
                          const isCompleted = displayStatus === 'Completed';

                          return (
                            <tr key={m.maintenance_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>{formatDate(m.maintenance_date)}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{m.maintenance_type}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>₱{Number(m.maintenance_cost || m.total_cost || 0).toLocaleString()}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>{m.maintained_by_name || m.maintainer?.full_name || 'Internal / Provider'}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>
                                {m.parts_usages && m.parts_usages.length > 0 ? (
                                  m.parts_usages.map((pu, i) => (
                                    <span key={i} style={{ display: 'block', fontSize: 12 }}>
                                      {pu.part?.part_name} ({pu.quantity_used} {pu.part?.unit || 'pcs'})
                                    </span>
                                  ))
                                ) : m.part ? (
                                  <span style={{ fontSize: 12 }}>{m.part.part_name}</span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: 12 }}>None</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                <span style={{
                                  padding: '3px 10px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: isCompleted ? '#dcfce7' : '#fef3c7',
                                  color: isCompleted ? '#16a34a' : '#d97706',
                                }}>
                                  {displayStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                      {(!vehicleDetailsData?.maintenances || vehicleDetailsData.maintenances.length === 0) && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13 }}>
                            No maintenance records found for this vehicle.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT VEHICLE MODAL (WITH PHOTO UPLOAD)                              */}
      {/* ========================================================================= */}
      {showFormModal && (
        <div
          className="modal"
          style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 1000, padding: 20 }}
        >
          <div className="modal-content" style={{ width: '100%', maxWidth: 750, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 2, background: '#d32f2f', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
              <button className="modal-close" onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              {formError && <div className="form-error" style={{ color: '#d32f2f', background: '#fee2e2', padding: '10px 14px', borderRadius: 6, marginBottom: 16 }}>{formError}</div>}
              <form className="edit-form" onSubmit={(e) => e.preventDefault()}>
                <h4 className="form-section-title"><i className="fas fa-file-alt"></i> Vehicle Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Vehicle Model<span className="required" style={{ color: 'red' }}>*</span></label>
                    <input type="text" placeholder="e.g. FUSO FJ 2823R" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Brand / Make</label>
                    <input type="text" placeholder="e.g. Mitsubishi / Isuzu" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Plate Number<span className="required" style={{ color: 'red' }}>*</span></label>
                    <input type="text" placeholder="e.g. ABC - 1234" value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Color<span className="required" style={{ color: 'red' }}>*</span></label>
                    <input type="text" placeholder="e.g. White / Blue" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Vehicle Type<span className="required" style={{ color: 'red' }}>*</span></label>
                    <select value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}>
                      <option value="10-Wheeler Truck">10-Wheeler Truck</option>
                      <option value="6-Wheeler Truck">6-Wheeler Truck</option>
                      <option value="4-Wheeler Closed Van">4-Wheeler Closed Van</option>
                      <option value="Trailer Truck">Trailer Truck</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Fuel Type<span className="required" style={{ color: 'red' }}>*</span></label>
                    <select value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>
                      <option value="diesel">Diesel</option>
                      <option value="gasoline">Gasoline</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <h4 className="form-section-title"><i className="fas fa-truck"></i> Specifications & Photo</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                  <div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Load Capacity (kg)</label>
                        <input type="number" min="0" placeholder="e.g. 15000" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Mileage (km)</label>
                        <input type="number" min="0" placeholder="e.g. 45000" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
                      </div>
                    </div>
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
                    </div>
                  </div>

                  {/* Vehicle Photo Upload */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Vehicle Photo
                    </label>
                    <input
                      type="file"
                      ref={vehicleFileInputRef}
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      style={{ display: 'none' }}
                      onChange={handlePhotoSelect}
                    />
                    <div
                      onClick={() => vehicleFileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: 8,
                        padding: 14,
                        textAlign: 'center',
                        color: '#64748b',
                        cursor: 'pointer',
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 120,
                      }}
                    >
                      {vehiclePhotoPreview ? (
                        <div>
                          <img
                            src={vehiclePhotoPreview}
                            alt="Vehicle Preview"
                            style={{ width: '100%', maxHeight: 90, objectFit: 'contain', borderRadius: 4 }}
                          />
                          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#2563eb', fontWeight: 600 }}>Click to change</p>
                        </div>
                      ) : (
                        <>
                          <i className="fas fa-camera" style={{ fontSize: 24, color: '#94a3b8' }}></i>
                          <p style={{ margin: '6px 0 2px', fontSize: 12, fontWeight: 600, color: '#334155' }}>Upload Photo</p>
                          <p style={{ fontSize: 11, margin: 0, color: '#94a3b8' }}>Max 5MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <h4 className="form-section-title"><i className="fas fa-calendar-check"></i> Registration & Maintenance Dates</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Registration Valid From</label>
                    <input type="date" value={form.registration_valid_from || ''} onChange={(e) => setForm({ ...form, registration_valid_from: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Registration Valid Until</label>
                    <input type="date" value={form.registration_valid_until || ''} onChange={(e) => setForm({ ...form, registration_valid_until: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Last Maintenance Date</label>
                    <input type="date" value={form.last_maintenance_date || ''} onChange={(e) => setForm({ ...form, last_maintenance_date: e.target.value })} />
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn-cancel" onClick={() => setShowFormModal(false)} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button className="btn-save" onClick={saveVehicle} disabled={saving} style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: '#d32f2f', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VehiclesPage;