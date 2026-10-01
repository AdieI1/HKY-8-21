import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import NotificationBell from '../components/NotificationBell';
import Pagination from '../components/Pagination';
import TableSkeleton from '../components/TableSkeleton';
import {
  validatePlateNumber,
  validateDateSequence,
  validatePositiveNumber,
} from '../utils/validation';

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
  // Insurance Information (Screenshot 2)
  insurance_provider: '',
  insurance_policy_number: '',
  insurance_coverage_type: 'Comprehensive',
  insurance_valid_from: '',
  insurance_valid_until: '',
  // Registration Info (Screenshot 2)
  or_number: '',
  cr_number: '',
  registration_date: '',
  expiration_date: '',
  // Emission Information
  emission_date: '',
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

  // Document requirement files (Screenshot 2)
  const [orFile, setOrFile] = useState(null);
  const [crFile, setCrFile] = useState(null);
  const [insuranceFile, setInsuranceFile] = useState(null);
  const [emissionFile, setEmissionFile] = useState(null);

  const orFileInputRef = useRef(null);
  const crFileInputRef = useRef(null);
  const insuranceFileInputRef = useRef(null);
  const emissionFileInputRef = useRef(null);

  // Document Viewer / Missing File Modal
  const [docModal, setDocModal] = useState(null);

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

  // Pagination states
  const PAGE_SIZE = 10;
  const [vehiclePage, setVehiclePage] = useState(1);
  const [archivePage, setArchivePage] = useState(1);
  const [maintenancePage, setMaintenancePage] = useState(1);

  useEffect(() => {
    setVehiclePage(1);
  }, [search, statusFilter, conditionFilter, sortBy]);

  const totalVehiclePages = Math.ceil(filteredVehicles.length / PAGE_SIZE) || 1;
  const paginatedVehicles = useMemo(() => {
    const start = (vehiclePage - 1) * PAGE_SIZE;
    return filteredVehicles.slice(start, start + PAGE_SIZE);
  }, [filteredVehicles, vehiclePage]);

  const totalArchivePages = Math.ceil(archivedVehicles.length / PAGE_SIZE) || 1;
  const paginatedArchivedVehicles = useMemo(() => {
    const start = (archivePage - 1) * PAGE_SIZE;
    return archivedVehicles.slice(start, start + PAGE_SIZE);
  }, [archivedVehicles, archivePage]);

  // Load detailed vehicle info with maintenances
  const openVehicleDetails = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setMaintenancePage(1);
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
        setFormError('Image size exceeds 5MB limit.');
        return;
      }
      setVehiclePhotoFile(file);
      setVehiclePhotoPreview(URL.createObjectURL(file));
      setFormError('');
    }
  };

  const handleDocFileSelect = (file, docType) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFormError('Document file size exceeds 10MB limit.');
      return;
    }
    if (docType === 'or') setOrFile(file);
    if (docType === 'cr') setCrFile(file);
    if (docType === 'insurance') setInsuranceFile(file);
    if (docType === 'emission') setEmissionFile(file);
    setFormError('');
  };

  const handleViewDocFile = (title, url, vehicle = null) => {
    const targetVehicle = vehicle || vehicleDetailsData || selectedVehicle;
    setDocModal({
      isOpen: true,
      title,
      url: url || null,
      vehicle: targetVehicle,
    });
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    setForm(EMPTY_FORM);
    setVehiclePhotoFile(null);
    setVehiclePhotoPreview(null);
    setOrFile(null);
    setCrFile(null);
    setInsuranceFile(null);
    setEmissionFile(null);
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
      // Insurance
      insurance_provider: vehicle.insurance_provider || '',
      insurance_policy_number: vehicle.insurance_policy_number || '',
      insurance_coverage_type: vehicle.insurance_coverage_type || 'Comprehensive',
      insurance_valid_from: vehicle.insurance_valid_from || '',
      insurance_valid_until: vehicle.insurance_valid_until || '',
      // Registration Info
      or_number: vehicle.or_number || '',
      cr_number: vehicle.cr_number || '',
      registration_date: vehicle.registration_date || '',
      expiration_date: vehicle.expiration_date || '',
      // Emission
      emission_date: vehicle.emission_date || '',
    });
    setVehiclePhotoFile(null);
    setVehiclePhotoPreview(vehicle.photo_url || null);
    setOrFile(null);
    setCrFile(null);
    setInsuranceFile(null);
    setEmissionFile(null);
    setFormError('');
    setShowFormModal(true);
  };

  const saveVehicle = async () => {
    if (!form.model || !form.plate_number || !form.color || !form.vehicle_type || !form.fuel_type) {
      setFormError('Please fill in all required fields (Model, Plate Number, Color, Type, Fuel Type).');
      return;
    }
    if (!validatePlateNumber(form.plate_number)) {
      setFormError('Please enter a valid Philippine plate number (e.g. ABC 1234 or ABC 123).');
      return;
    }
    if (!validateDateSequence(form.registration_valid_from, form.registration_valid_until)) {
      setFormError('Registration expiry date must be on or after the issue date.');
      return;
    }
    if (form.insurance_valid_from && form.insurance_valid_until && !validateDateSequence(form.insurance_valid_from, form.insurance_valid_until)) {
      setFormError('Insurance valid until date must be on or after valid from date.');
      return;
    }
    if (form.registration_date && form.expiration_date && !validateDateSequence(form.registration_date, form.expiration_date)) {
      setFormError('Registration expiration date must be on or after registration date.');
      return;
    }
    if (!validateDateSequence(form.last_maintenance_date, form.next_maintenance_date)) {
      setFormError('Next maintenance date must be on or after the last maintenance date.');
      return;
    }
    if (!validatePositiveNumber(form.capacity)) {
      setFormError('Capacity must be a positive number.');
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

      // Insurance fields
      if (form.insurance_provider) formData.append('insurance_provider', form.insurance_provider);
      if (form.insurance_policy_number) formData.append('insurance_policy_number', form.insurance_policy_number);
      if (form.insurance_coverage_type) formData.append('insurance_coverage_type', form.insurance_coverage_type);
      if (form.insurance_valid_from) formData.append('insurance_valid_from', form.insurance_valid_from);
      if (form.insurance_valid_until) formData.append('insurance_valid_until', form.insurance_valid_until);

      // Registration fields
      if (form.or_number) formData.append('or_number', form.or_number);
      if (form.cr_number) formData.append('cr_number', form.cr_number);
      if (form.registration_date) formData.append('registration_date', form.registration_date);
      if (form.expiration_date) formData.append('expiration_date', form.expiration_date);

      // Emission date
      if (form.emission_date) formData.append('emission_date', form.emission_date);

      // Document Files
      if (vehiclePhotoFile) formData.append('photo', vehiclePhotoFile);
      if (orFile) formData.append('official_receipt_file', orFile);
      if (crFile) formData.append('certificate_of_registration_file', crFile);
      if (insuranceFile) formData.append('insurance_policy_file', insuranceFile);
      if (emissionFile) formData.append('emission_certificate_file', emissionFile);

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
      if (selectedVehicle && editingVehicle && selectedVehicle.vehicle_id === editingVehicle.vehicle_id) {
        await openVehicleDetails(editingVehicle);
      }
      setToast({ message: editingVehicle ? `Vehicle ${form.model} updated successfully.` : `Vehicle ${form.model} added successfully.` });
      setTimeout(() => setToast(null), 5000);
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
    const today = new Date().toISOString().split('T')[0];
    const defaultCompletion = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setSchedulingVehicle(vehicle);
    setScheduleForm({
      maintenance_date: today,
      next_maintenance_date: defaultCompletion,
      maintenance_type: vehicle.status === 'broken' ? 'Emergency Maintenance' : 'Preventive Maintenance',
      maintenance_cost: '',
      maintained_by_name: '',
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
        next_maintenance_date: scheduleForm.next_maintenance_date || null,
        maintenance_cost: scheduleForm.maintenance_cost ? parseFloat(scheduleForm.maintenance_cost) : 0,
        maintained_by_name: scheduleForm.maintained_by_name,
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
                    {loading ? (
                      <TableSkeleton rows={5} columns={7} />
                    ) : paginatedVehicles.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24 }}>No vehicles found.</td></tr>
                    ) : (
                      paginatedVehicles.map((vehicle) => (
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
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span className={`vehicle-status ${statusClass(vehicle.status)}`} style={{ fontSize: 12 }}>
                                <i className="fas fa-circle"></i> {statusLabel(vehicle.status)}
                              </span>
                              {vehicle.status === 'broken' && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: '#991b1b',
                                    background: '#fee2e2',
                                    border: '1px solid #fca5a5',
                                    padding: '3px 6px',
                                    borderRadius: 4,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    whiteSpace: 'nowrap',
                                    width: 'fit-content',
                                  }}
                                  title="Vehicle disabled due to an incident/accident. Please schedule maintenance immediately."
                                >
                                  <i className="fas fa-triangle-exclamation"></i> Accident Reported — Schedule Maintenance ASAP
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: 13 }}>{vehicle.condition || '—'}</td>
                          <td style={{ fontSize: 13 }}>{formatDate(vehicle.last_maintenance_date)}</td>
                          <td className="action-cell" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const isAvailable = vehicle.status === 'available';
                              const isBroken = vehicle.status === 'broken';
                              const isInUse = vehicle.status === 'in_use';
                              const isMaintenance = vehicle.status === 'maintenance';
                              const canSchedule = isAvailable || isBroken;
                              const canDecommission = isAvailable;
                              const canEdit = isAvailable;

                              return (
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap' }}>
                                  <button
                                    className="btn-action-schedule"
                                    onClick={(e) => canSchedule && openScheduleMaintenanceModal(vehicle, e)}
                                    disabled={!canSchedule}
                                    title={
                                      isInUse
                                        ? 'Cannot schedule maintenance: vehicle is currently active in a delivery trip.'
                                        : isMaintenance
                                        ? 'Vehicle is already under active maintenance.'
                                        : isBroken
                                        ? 'Schedule urgent repair for broken vehicle'
                                        : 'Schedule Maintenance'
                                    }
                                    style={{
                                      background: !canSchedule ? '#cbd5e1' : (isBroken ? '#dc2626' : '#f97316'),
                                      color: !canSchedule ? '#64748b' : '#fff',
                                      border: 'none',
                                      padding: '5px 8px',
                                      borderRadius: 5,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: !canSchedule ? 'not-allowed' : 'pointer',
                                      opacity: !canSchedule ? 0.55 : 1,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 3,
                                      whiteSpace: 'nowrap',
                                      boxShadow: isBroken ? '0 0 8px rgba(220, 38, 38, 0.4)' : 'none',
                                    }}
                                  >
                                    <i className={isBroken ? 'fas fa-wrench' : 'fas fa-tools'}></i>
                                    {isBroken ? 'Schedule Repair' : 'Schedule'}
                                  </button>
                                  <button
                                    className="btn-danger btn-decommission"
                                    onClick={(e) => canDecommission && openDecommissionModal(vehicle, e)}
                                    disabled={!canDecommission}
                                    title={
                                      isInUse
                                        ? 'Cannot decommission vehicle: currently in use on a trip.'
                                        : !isAvailable
                                        ? 'Only available vehicles can be decommissioned.'
                                        : 'Decommission Vehicle'
                                    }
                                    style={{
                                      background: !canDecommission ? '#fca5a5' : '#ef4444',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '5px 8px',
                                      borderRadius: 5,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: !canDecommission ? 'not-allowed' : 'pointer',
                                      opacity: !canDecommission ? 0.45 : 1,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Decommission
                                  </button>
                                  <button
                                    className="btn-edit"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (canEdit) openEditModal(vehicle);
                                    }}
                                    disabled={!canEdit}
                                    title={
                                      isInUse
                                        ? 'Cannot edit specifications: vehicle is currently active on a trip.'
                                        : !isAvailable
                                        ? 'Vehicle must be available to edit specifications.'
                                        : 'Edit Vehicle Information'
                                    }
                                    style={{
                                      background: !canEdit ? '#94a3b8' : '#475569',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '5px 8px',
                                      borderRadius: 5,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: !canEdit ? 'not-allowed' : 'pointer',
                                      opacity: !canEdit ? 0.45 : 1,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Edit
                                  </button>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <Pagination
                  currentPage={vehiclePage}
                  totalPages={totalVehiclePages}
                  totalItems={filteredVehicles.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setVehiclePage}
                  showAlways={true}
                />
                <p className="vehicles-table-hint" style={{ marginTop: 10, color: '#dc2626', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-info-circle" style={{ color: '#dc2626' }}></i> Click any Vehicle row to view full Vehicle Specifications &amp; Maintenance History.
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
                  {loading ? (
                    <TableSkeleton rows={4} columns={4} />
                  ) : paginatedArchivedVehicles.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24 }}>No archived vehicles yet.</td></tr>
                  ) : (
                    paginatedArchivedVehicles.map((vehicle) => (
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
                    ))
                  )}
                </tbody>
              </table>
              <Pagination
                currentPage={archivePage}
                totalPages={totalArchivePages}
                totalItems={archivedVehicles.length}
                pageSize={PAGE_SIZE}
                onPageChange={setArchivePage}
                showAlways={true}
              />
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
                {/* Schedule & Expected Completion Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Expected Completion Date:
                    </label>
                    <input
                      type="date"
                      min={scheduleForm.maintenance_date}
                      value={scheduleForm.next_maintenance_date || ''}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, next_maintenance_date: e.target.value })}
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
                </div>
                <div style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-clock" style={{ color: '#2563eb' }}></i>
                  <span><strong>Automated Return:</strong> The vehicle automatically returns to <strong>Available</strong> status and emits an alert once the completion date is reached.</span>
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
                    External Maintenance Provider / Shop:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Isuzu Motors / HJY Machine Shop"
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
                  {(() => {
                    const isAvailable = selectedVehicle.status === 'available';
                    const isBroken = selectedVehicle.status === 'broken';
                    const isInUse = selectedVehicle.status === 'in_use';
                    const isMaintenance = selectedVehicle.status === 'maintenance';
                    const canSchedule = isAvailable || isBroken;
                    const canDecommission = isAvailable;
                    const canEdit = isAvailable;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        <button
                          onClick={(e) => canSchedule && openScheduleMaintenanceModal(selectedVehicle, e)}
                          disabled={!canSchedule}
                          title={
                            isInUse
                              ? 'Cannot schedule maintenance: vehicle is currently active in a delivery trip.'
                              : isMaintenance
                              ? 'Vehicle is already under active maintenance.'
                              : isBroken
                              ? 'Schedule urgent repair for broken vehicle'
                              : 'Schedule Maintenance'
                          }
                          style={{
                            width: '100%',
                            height: '36px',
                            background: !canSchedule ? '#cbd5e1' : (isBroken ? '#dc2626' : '#f97316'),
                            color: !canSchedule ? '#64748b' : '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: !canSchedule ? 'not-allowed' : 'pointer',
                            opacity: !canSchedule ? 0.55 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            boxSizing: 'border-box',
                            boxShadow: isBroken ? '0 0 8px rgba(220, 38, 38, 0.4)' : 'none',
                          }}
                        >
                          <i className={isBroken ? 'fas fa-wrench' : 'fas fa-tools'}></i>{' '}
                          {isBroken ? 'Schedule Repair (Broken)' : 'Schedule Maintenance'}
                        </button>
                        <button
                          onClick={() => {
                            if (!canEdit) return;
                            const v = selectedVehicle;
                            setSelectedVehicle(null);
                            openEditModal(v);
                          }}
                          disabled={!canEdit}
                          title={
                            isInUse
                              ? 'Cannot edit vehicle info while vehicle is in use.'
                              : isMaintenance
                              ? 'Cannot edit vehicle info while under maintenance.'
                              : !isAvailable
                              ? 'Vehicle cannot be edited in current status.'
                              : 'Edit Vehicle Info'
                          }
                          style={{
                            width: '100%',
                            height: '36px',
                            background: !canEdit ? '#cbd5e1' : '#475569',
                            color: !canEdit ? '#64748b' : '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: !canEdit ? 'not-allowed' : 'pointer',
                            opacity: !canEdit ? 0.55 : 1,
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
                          onClick={(e) => canDecommission && openDecommissionModal(selectedVehicle, e)}
                          disabled={!canDecommission}
                          title={
                            isInUse
                              ? 'Cannot decommission vehicle while active in delivery.'
                              : isMaintenance
                              ? 'Cannot decommission vehicle while under maintenance.'
                              : isBroken
                              ? 'Vehicle must be repaired or inspected before decommissioning.'
                              : !isAvailable
                              ? 'Vehicle cannot be decommissioned in current status.'
                              : 'Decommission Vehicle'
                          }
                          style={{
                            width: '100%',
                            height: '36px',
                            background: !canDecommission ? '#cbd5e1' : '#ef4444',
                            color: !canDecommission ? '#64748b' : '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: !canDecommission ? 'not-allowed' : 'pointer',
                            opacity: !canDecommission ? 0.55 : 1,
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
                    );
                  })()}
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

              {/* Three Cards Matching Screenshot 2: Insurance Information | Registration Info | Documents */}
              {(() => {
                const dv = vehicleDetailsData || selectedVehicle;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    {/* Card 1: Insurance Information */}
                    <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 14px', color: '#c53030', fontSize: 16, fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                          Insurance Information
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Provider</span>
                            <span style={{ color: '#64748b' }}>{dv.insurance_provider || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Policy Number</span>
                            <span style={{ color: '#64748b' }}>{dv.insurance_policy_number || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Coverage Type</span>
                            <span style={{ color: '#64748b' }}>{dv.insurance_coverage_type || 'Comprehensive'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Valid From</span>
                            <span style={{ color: '#64748b' }}>{formatDate(dv.insurance_valid_from)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Valid Until</span>
                            <span style={{ color: '#64748b' }}>{formatDate(dv.insurance_valid_until)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewDocFile('Insurance Policy', dv.insurance_policy_url, dv)}
                        style={{
                          marginTop: 18,
                          width: '100%',
                          padding: '9px 16px',
                          border: '1.5px solid #dc2626',
                          borderRadius: 8,
                          background: '#fff',
                          color: '#dc2626',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          transition: 'all 0.2s',
                        }}
                      >
                        <i className="far fa-file-alt"></i> View Document
                      </button>
                    </div>

                    {/* Card 2: Registration Info */}
                    <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 14px', color: '#c53030', fontSize: 16, fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                          Registration Info
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>OR Number</span>
                            <span style={{ color: '#64748b' }}>{dv.or_number || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>CR Number</span>
                            <span style={{ color: '#64748b' }}>{dv.cr_number || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Registration Date</span>
                            <span style={{ color: '#64748b' }}>{formatDate(dv.registration_date || dv.registration_valid_from)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Expiration Date</span>
                            <span style={{ color: '#64748b' }}>{formatDate(dv.expiration_date || dv.registration_valid_until)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewDocFile('Official Receipt & Registration (OR/CR)', dv.official_receipt_url || dv.certificate_of_registration_url, dv)}
                        style={{
                          marginTop: 18,
                          width: '100%',
                          padding: '9px 16px',
                          border: '1.5px solid #dc2626',
                          borderRadius: 8,
                          background: '#fff',
                          color: '#dc2626',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          transition: 'all 0.2s',
                        }}
                      >
                        <i className="far fa-file-alt"></i> View OR/CR
                      </button>
                    </div>

                    {/* Card 3: Documents */}
                    <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 14px', color: '#c53030', fontSize: 16, fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                          Documents
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Official Receipt (OR)</span>
                            {dv.official_receipt_url ? (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Official Receipt (OR)', dv.official_receipt_url, dv)}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                View File
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Official Receipt (OR)', null, dv)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Not Uploaded
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Certification of Registration(CR)</span>
                            {dv.certificate_of_registration_url ? (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Certificate of Registration (CR)', dv.certificate_of_registration_url, dv)}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                View File
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Certificate of Registration (CR)', null, dv)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Not Uploaded
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Insurance Policy</span>
                            {dv.insurance_policy_url ? (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Insurance Policy', dv.insurance_policy_url, dv)}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                View File
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Insurance Policy', null, dv)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Not Uploaded
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>
                              Emission Date {dv.emission_date ? `(${formatDate(dv.emission_date)})` : ''}
                            </span>
                            {dv.emission_certificate_url ? (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Emission Certificate', dv.emission_certificate_url, dv)}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                View File
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Emission Certificate', null, dv)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Not Uploaded
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                        const startIndex = (maintenancePage - 1) * 5;
                        const pageItems = list.slice(startIndex, startIndex + 5);
                        return pageItems.map((m) => {
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
                <Pagination
                  currentPage={maintenancePage}
                  totalPages={Math.ceil((vehicleDetailsData?.maintenances?.length || 0) / 5) || 1}
                  totalItems={vehicleDetailsData?.maintenances?.length || 0}
                  pageSize={5}
                  onPageChange={setMaintenancePage}
                  showAlways={true}
                />
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
          style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', zIndex: 1000, padding: 20 }}
        >
          <div className="modal-content" style={{ width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            {/* Modal Header */}
            <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
              <div>
                <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-truck-moving"></i> {editingVehicle ? 'Edit Vehicle Details' : 'Add New Vehicle'}
                </h2>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, display: 'block' }}>
                  Fleet Vehicle Registration, Insurance &amp; Compliance Documents
                </span>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowFormModal(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ padding: '24px 28px' }}>
              {formError && (
                <div style={{ color: '#991b1b', background: '#fee2e2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-exclamation-circle" style={{ fontSize: 16, color: '#dc2626' }}></i>
                  <span>{formError}</span>
                </div>
              )}

              <form className="edit-form" onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Section 1: Basic Vehicle Information */}
                <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 14px', color: '#b91c1c', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <i className="fas fa-file-alt"></i> Vehicle Information
                  </h4>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Vehicle Model <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. FUSO FJ 2823R"
                        value={form.model}
                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Brand / Make</label>
                      <input
                        type="text"
                        placeholder="e.g. Mitsubishi / Isuzu / Hino"
                        value={form.brand}
                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Plate Number <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. ABC 1234"
                        value={form.plate_number}
                        onChange={(e) => setForm({ ...form, plate_number: e.target.value.toUpperCase() })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Color <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. White / Blue"
                        value={form.color}
                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Vehicle Type <span style={{ color: '#dc2626' }}>*</span></label>
                      <select
                        value={form.vehicle_type}
                        onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      >
                        <option value="10-Wheeler Truck">10-Wheeler Truck</option>
                        <option value="6-Wheeler Truck">6-Wheeler Truck</option>
                        <option value="4-Wheeler Closed Van">4-Wheeler Closed Van</option>
                        <option value="Trailer Truck">Trailer Truck</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Fuel Type <span style={{ color: '#dc2626' }}>*</span></label>
                      <select
                        value={form.fuel_type}
                        onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      >
                        <option value="diesel">Diesel</option>
                        <option value="gasoline">Gasoline</option>
                        <option value="electric">Electric</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Specifications & Photo */}
                <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 14px', color: '#b91c1c', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <i className="fas fa-truck"></i> Specifications &amp; Vehicle Photo
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 18 }}>
                    <div>
                      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Load Capacity (kg)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 15000"
                            value={form.capacity}
                            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                            style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Mileage (km)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 45000"
                            value={form.mileage}
                            onChange={(e) => setForm({ ...form, mileage: e.target.value })}
                            style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                          />
                        </div>
                      </div>
                      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Status</label>
                          <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                          >
                            <option value="available">Available</option>
                            <option value="in_use">In Use</option>
                            <option value="maintenance">Under Maintenance</option>
                            <option value="broken">Broken</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Condition</label>
                          <input
                            type="text"
                            placeholder="Good / Need Repair"
                            value={form.condition}
                            onChange={(e) => setForm({ ...form, condition: e.target.value })}
                            style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Photo Upload */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
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
                          background: '#fff',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 125,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#b91c1c'; e.currentTarget.style.background = '#fef2f2'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#fff'; }}
                      >
                        {vehiclePhotoPreview ? (
                          <div style={{ width: '100%' }}>
                            <img
                              src={vehiclePhotoPreview}
                              alt="Vehicle Preview"
                              style={{ width: '100%', maxHeight: 90, objectFit: 'contain', borderRadius: 6 }}
                              onError={(e) => { e.currentTarget.src = '/images/default-truck.png'; }}
                            />
                            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Click to change photo</p>
                          </div>
                        ) : (
                          <>
                            <i className="fas fa-camera" style={{ fontSize: 26, color: '#94a3b8', marginBottom: 6 }}></i>
                            <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: '#334155' }}>Upload Photo</p>
                            <p style={{ fontSize: 11, margin: 0, color: '#94a3b8' }}>Max 5MB (JPG, PNG)</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Insurance Information (Screenshot 2) */}
                <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 14px', color: '#b91c1c', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <i className="fas fa-shield-alt"></i> Insurance Information
                  </h4>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Provider</label>
                      <input
                        type="text"
                        placeholder="e.g. Malayan Insurance / Pioneer"
                        value={form.insurance_provider}
                        onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Policy Number</label>
                      <input
                        type="text"
                        placeholder="e.g. POL-8921-X"
                        value={form.insurance_policy_number}
                        onChange={(e) => setForm({ ...form, insurance_policy_number: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Coverage Type</label>
                      <select
                        value={form.insurance_coverage_type}
                        onChange={(e) => setForm({ ...form, insurance_coverage_type: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      >
                        <option value="Comprehensive">Comprehensive</option>
                        <option value="Third-Party Liability (TPL)">Third-Party Liability (TPL)</option>
                        <option value="Acts of Nature">Acts of Nature</option>
                        <option value="Collision & Damage">Collision &amp; Damage</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Valid From</label>
                      <input
                        type="date"
                        value={form.insurance_valid_from || ''}
                        onChange={(e) => setForm({ ...form, insurance_valid_from: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Valid Until</label>
                      <input
                        type="date"
                        value={form.insurance_valid_until || ''}
                        onChange={(e) => setForm({ ...form, insurance_valid_until: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Registration Info (Screenshot 2) */}
                <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 14px', color: '#b91c1c', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <i className="fas fa-id-card"></i> Registration Info
                  </h4>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>OR Number (Official Receipt)</label>
                      <input
                        type="text"
                        placeholder="e.g. OR-8912401"
                        value={form.or_number}
                        onChange={(e) => setForm({ ...form, or_number: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>CR Number (Certificate of Registration)</label>
                      <input
                        type="text"
                        placeholder="e.g. CR-1928401"
                        value={form.cr_number}
                        onChange={(e) => setForm({ ...form, cr_number: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Registration Date</label>
                      <input
                        type="date"
                        value={form.registration_date || form.registration_valid_from || ''}
                        onChange={(e) => setForm({ ...form, registration_date: e.target.value, registration_valid_from: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Expiration Date</label>
                      <input
                        type="date"
                        value={form.expiration_date || form.registration_valid_until || ''}
                        onChange={(e) => setForm({ ...form, expiration_date: e.target.value, registration_valid_until: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Last Maintenance Date</label>
                      <input
                        type="date"
                        value={form.last_maintenance_date || ''}
                        onChange={(e) => setForm({ ...form, last_maintenance_date: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Documents Requirements & File Uploads (Screenshot 2) */}
                <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <h4 style={{ margin: 0, color: '#b91c1c', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-folder-open"></i> Documents &amp; Requirements
                    </h4>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Upload PDF, JPG, PNG (Max 10MB each)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    {/* Document 1: Official Receipt (OR) */}
                    <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-receipt" style={{ color: '#b91c1c' }}></i> Official Receipt (OR)
                        </span>
                        {editingVehicle?.official_receipt_url && !orFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile('Official Receipt', editingVehicle.official_receipt_url, editingVehicle)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={orFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'or')}
                      />
                      {orFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {orFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setOrFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => orFileInputRef.current?.click()}
                          style={{ width: '100%', padding: '10px 12px', border: '1.5px dashed #cbd5e1', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: '#94a3b8' }}></i>
                          {editingVehicle?.official_receipt_url ? 'Replace OR File' : 'Upload OR File'}
                        </button>
                      )}
                    </div>

                    {/* Document 2: Certificate of Registration (CR) */}
                    <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-certificate" style={{ color: '#b91c1c' }}></i> Certification of Registration (CR)
                        </span>
                        {editingVehicle?.certificate_of_registration_url && !crFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile('Certificate of Registration', editingVehicle.certificate_of_registration_url, editingVehicle)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={crFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'cr')}
                      />
                      {crFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {crFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCrFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => crFileInputRef.current?.click()}
                          style={{ width: '100%', padding: '10px 12px', border: '1.5px dashed #cbd5e1', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: '#94a3b8' }}></i>
                          {editingVehicle?.certificate_of_registration_url ? 'Replace CR File' : 'Upload CR File'}
                        </button>
                      )}
                    </div>

                    {/* Document 3: Insurance Policy */}
                    <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-shield-alt" style={{ color: '#b91c1c' }}></i> Insurance Policy
                        </span>
                        {editingVehicle?.insurance_policy_url && !insuranceFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile('Insurance Policy', editingVehicle.insurance_policy_url, editingVehicle)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={insuranceFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'insurance')}
                      />
                      {insuranceFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {insuranceFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setInsuranceFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => insuranceFileInputRef.current?.click()}
                          style={{ width: '100%', padding: '10px 12px', border: '1.5px dashed #cbd5e1', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: '#94a3b8' }}></i>
                          {editingVehicle?.insurance_policy_url ? 'Replace Policy File' : 'Upload Insurance Policy'}
                        </button>
                      )}
                    </div>

                    {/* Document 4: Emission Certificate & Date */}
                    <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-smog" style={{ color: '#b91c1c' }}></i> Emission Certificate
                        </span>
                        {editingVehicle?.emission_certificate_url && !emissionFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile('Emission Certificate', editingVehicle.emission_certificate_url, editingVehicle)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <input
                          type="date"
                          value={form.emission_date || ''}
                          onChange={(e) => setForm({ ...form, emission_date: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff' }}
                          title="Emission Test Date"
                        />
                      </div>
                      <input
                        type="file"
                        ref={emissionFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'emission')}
                      />
                      {emissionFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {emissionFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEmissionFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => emissionFileInputRef.current?.click()}
                          style={{ width: '100%', padding: '10px 12px', border: '1.5px dashed #cbd5e1', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: '#94a3b8' }}></i>
                          {editingVehicle?.emission_certificate_url ? 'Replace Emission File' : 'Upload Emission File'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer (with clean visible Cancel button - NO invisible white box) */}
            <div className="modal-footer" style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>*</span> Required fleet information
              </span>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveVehicle}
                  disabled={saving}
                  style={{
                    padding: '9px 26px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#d32f2f',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 2px 8px rgba(211, 47, 47, 0.35)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = '#b71c1c'; }}
                  onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = '#d32f2f'; }}
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Saving Vehicle...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i> {editingVehicle ? 'Update Vehicle' : 'Save Vehicle'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Document Viewer & Missing Document Modal (Replaces browser alert) */}
      {docModal && docModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 20,
          }}
          onClick={() => setDocModal(null)}
        >
          {!docModal.url ? (
            /* Missing Document Modal */
            <div
              style={{
                background: '#ffffff',
                borderRadius: 16,
                width: '100%',
                maxWidth: 460,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden',
                textAlign: 'center',
                padding: '32px 28px 26px',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setDocModal(null)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: 14,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                title="Close"
              >
                <i className="fas fa-times"></i>
              </button>

              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: '#fee2e2',
                  border: '2px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                  color: '#dc2626',
                  fontSize: 28,
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.15)',
                }}
              >
                <i className="fas fa-file-invoice"></i>
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                No Document Attached
              </h3>

              <p style={{ margin: '0 0 18px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                No document has been uploaded for <strong style={{ color: '#0f172a' }}>{docModal.title}</strong> yet.
              </p>

              {docModal.vehicle && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '12px 16px',
                    marginBottom: 22,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    <i className="fas fa-truck"></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {docModal.vehicle.model || 'Vehicle'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Plate: <span style={{ fontWeight: 600, color: '#334155' }}>{docModal.vehicle.plate_number || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setDocModal(null)}
                  style={{
                    flex: 1,
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const v = docModal.vehicle;
                    setDocModal(null);
                    if (v) {
                      openEditModal(v);
                    }
                  }}
                  style={{
                    flex: 1.3,
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#d32f2f',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 2px 8px rgba(211, 47, 47, 0.35)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#b71c1c'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#d32f2f'; }}
                >
                  <i className="fas fa-cloud-upload-alt"></i> Upload Now
                </button>
              </div>
            </div>
          ) : (
            /* Document Previewer Modal */
            <div
              style={{
                background: '#ffffff',
                borderRadius: 16,
                width: '100%',
                maxWidth: 900,
                height: '85vh',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: '#fee2e2',
                      color: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    <i className="fas fa-file-alt"></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                      {docModal.title}
                    </h3>
                    {docModal.vehicle && (
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {docModal.vehicle.model} • Plate: {docModal.vehicle.plate_number}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <a
                    href={docModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#334155',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                  >
                    <i className="fas fa-external-link-alt"></i> Open Full
                  </a>
                  <button
                    type="button"
                    onClick={() => setDocModal(null)}
                    style={{
                      background: '#e2e8f0',
                      border: 'none',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#475569',
                      fontSize: 14,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#cbd5e1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                    title="Close"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>

              {/* Body: Embedded PDF or Image */}
              <div
                style={{
                  flex: 1,
                  background: '#0f172a',
                  overflow: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 12,
                }}
              >
                {docModal.url.toLowerCase().includes('.pdf') ? (
                  <iframe
                    src={docModal.url}
                    title={docModal.title}
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#ffffff' }}
                  />
                ) : (
                  <img
                    src={docModal.url}
                    alt={docModal.title}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }}
                  />
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '12px 24px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <a
                  href={docModal.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                >
                  <i className="fas fa-download"></i> Download File
                </a>
                <button
                  type="button"
                  onClick={() => setDocModal(null)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#d32f2f',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#b71c1c'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#d32f2f'; }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default VehiclesPage;