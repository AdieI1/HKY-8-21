import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import NotificationBell from '../components/NotificationBell';
import Pagination from '../components/Pagination';
import TableSkeleton from '../components/TableSkeleton';
import PrintableIncidentModal from '../components/driver/PrintableIncidentModal';
import {
  validatePhoneNumber,
  formatPhoneInput,
  validateLicenseNumber,
  formatLicenseInput,
  validateDateSequence,
  validatePositiveNumber,
} from '../utils/validation';

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function formatDateTime(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function driverCode(id) {
  return `DR${String(id).padStart(3, '0')}`;
}

function availabilityLabel(driver) {
  if (driver.status === 'inactive') return 'Inactive';
  if (driver.availability_status === 'offline') return 'Inactive';
  const hasActiveDelivery = Array.isArray(driver.deliveries) && driver.deliveries.some(
    (d) => d.status !== 'completed' && d.status !== 'rejected'
  );
  if (driver.availability_status === 'busy' && hasActiveDelivery) return 'On Delivery';
  return 'Available';
}

function availabilityClass(driver) {
  const label = availabilityLabel(driver);
  if (label === 'On Delivery') return 'on-delivery';
  if (label === 'Inactive') return 'inactive';
  return 'available';
}

const EMPTY_FORM = {
  first_name: '',
  middle_name: '',
  last_name: '',
  birthdate: '',
  nationality: 'Filipino',
  phone: '',
  license_number: '',
  license_type: 'Professional',
  license_date_issued: '',
  license_expiry_date: '',
  authorized_by: '',
  restriction_code: '',
  health_condition: 'Fit to Work',
  last_medical_check: '',
  prescriptions: '',
  existing_conditions: '',
  date_hired: '',
  experience_years: '',
  hired_by: '',
  contract_start: '',
  contract_end: '',
  clearance_type: 'NBI Clearance',
  clearance_date: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function splitFullName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', middle_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], middle_name: '', last_name: '' };
  if (parts.length === 2) return { first_name: parts[0], middle_name: '', last_name: parts[1] };
  return { first_name: parts[0], middle_name: parts.slice(1, -1).join(' '), last_name: parts[parts.length - 1] };
}

function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const [view, setView] = useState('drivers'); // 'drivers' | 'archives' | 'incidents'
  const [search, setSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all'); // 'all' | 'available' | 'busy' | 'inactive' | 'resigned'
  const [sortBy, setSortBy] = useState('id_asc'); // 'name_asc' | 'name_desc' | 'id_asc' | 'id_desc' | 'status_hierarchy' | 'contract_soonest' | 'contract_longest'

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [changePassword, setChangePassword] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Driver Documents state & refs
  const [licenseFile, setLicenseFile] = useState(null);
  const [medicalCertFile, setMedicalCertFile] = useState(null);
  const [clearanceFile, setClearanceFile] = useState(null);

  const licenseFileInputRef = useRef(null);
  const medicalCertFileInputRef = useRef(null);
  const clearanceFileInputRef = useRef(null);

  // Document Viewer / Missing File Modal
  const [docModal, setDocModal] = useState(null);

  const handleDocFileSelect = (file, docType) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFormError('Document file size exceeds 10MB limit.');
      return;
    }
    if (docType === 'license') setLicenseFile(file);
    if (docType === 'medical') setMedicalCertFile(file);
    if (docType === 'clearance') setClearanceFile(file);
    setFormError('');
  };

  const handleViewDocFile = (title, url, driver = null) => {
    const targetDriver = driver || detailsDriver || editingDriver;
    setDocModal({
      isOpen: true,
      title,
      url: url || null,
      driver: targetDriver,
    });
  };

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsDriver, setDetailsDriver] = useState(null);

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archivingDriver, setArchivingDriver] = useState(null);
  const [toast, setToast] = useState(null);

  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentType, setIncidentType] = useState('All');
  const [incidentDriverFilter, setIncidentDriverFilter] = useState('All Drivers');
  const [selectedPrintIncident, setSelectedPrintIncident] = useState(null);

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
      const [driversRes, incidentsRes] = await Promise.all([
        api.get('/drivers'),
        api.get('/incident-reports'),
      ]);
      setDrivers(driversRes.data);
      setIncidents(incidentsRes.data);
    } catch (err) {
      setLoadError('Could not load drivers. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeDrivers = useMemo(() => drivers.filter((d) => d.status === 'active'), [drivers]);
  const archivedDrivers = useMemo(() => drivers.filter((d) => d.status === 'inactive'), [drivers]);

  const kpiCounts = useMemo(() => {
    let available = 0;
    let onDelivery = 0;
    let inactive = 0;
    let resigned = archivedDrivers.length;

    activeDrivers.forEach((d) => {
      const lbl = availabilityLabel(d);
      if (lbl === 'Available') available++;
      else if (lbl === 'On Delivery') onDelivery++;
      else inactive++;
    });

    return { available, onDelivery, inactive, resigned };
  }, [activeDrivers, archivedDrivers]);

  const handleKpiClick = (statusKey) => {
    if (statusKey === 'resigned') {
      if (view === 'archives') {
        setView('drivers');
        setActiveStatusFilter('all');
      } else {
        setView('archives');
        setActiveStatusFilter('resigned');
      }
      return;
    }

    if (view !== 'drivers') {
      setView('drivers');
    }
    setActiveStatusFilter((prev) => (prev === statusKey ? 'all' : statusKey));
  };

  const filteredDrivers = useMemo(() => {
    let list = [...activeDrivers];

    if (activeStatusFilter === 'available') {
      list = list.filter((d) => availabilityLabel(d) === 'Available');
    } else if (activeStatusFilter === 'busy') {
      list = list.filter((d) => availabilityLabel(d) === 'On Delivery');
    } else if (activeStatusFilter === 'inactive') {
      list = list.filter((d) => availabilityLabel(d) === 'Inactive');
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((d) => {
        const name = d.user?.full_name || '';
        const idStr = driverCode(d.driver_id).toLowerCase();
        const license = d.license_number || '';
        const phone = d.user?.phone || '';
        const email = d.user?.email || '';
        return `${name} ${idStr} ${license} ${phone} ${email}`.toLowerCase().includes(term);
      });
    }

    if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.user?.full_name || '').localeCompare(b.user?.full_name || '', undefined, { sensitivity: 'base' }));
    } else if (sortBy === 'name_desc') {
      list.sort((a, b) => (b.user?.full_name || '').localeCompare(a.user?.full_name || '', undefined, { sensitivity: 'base' }));
    } else if (sortBy === 'id_asc') {
      list.sort((a, b) => (Number(a.driver_id) || 0) - (Number(b.driver_id) || 0));
    } else if (sortBy === 'id_desc') {
      list.sort((a, b) => (Number(b.driver_id) || 0) - (Number(a.driver_id) || 0));
    } else if (sortBy === 'status_hierarchy') {
      const rank = (d) => {
        const lbl = availabilityLabel(d);
        if (lbl === 'Available') return 1;
        if (lbl === 'On Delivery') return 2;
        if (lbl === 'Inactive') return 3;
        return 4;
      };
      list.sort((a, b) => rank(a) - rank(b));
    } else if (sortBy === 'contract_soonest') {
      list.sort((a, b) => {
        const timeA = a.contract_end ? new Date(a.contract_end).getTime() : Infinity;
        const timeB = b.contract_end ? new Date(b.contract_end).getTime() : Infinity;
        return timeA - timeB;
      });
    } else if (sortBy === 'contract_longest') {
      list.sort((a, b) => {
        const timeA = a.contract_end ? new Date(a.contract_end).getTime() : -Infinity;
        const timeB = b.contract_end ? new Date(b.contract_end).getTime() : -Infinity;
        return timeB - timeA;
      });
    }

    return list;
  }, [activeDrivers, activeStatusFilter, search, sortBy]);

  const filteredIncidents = useMemo(() => {
    const term = incidentSearch.toLowerCase().trim();
    return incidents.filter((inc) => {
      const driverName = inc.delivery?.driver?.user?.full_name || 'Unassigned';
      const customerName = inc.delivery?.request?.customer?.full_name || '';
      const reqCode = inc.delivery?.request?.request_id ? `REQ${String(inc.delivery.request.request_id).padStart(4, '0')}` : '';
      const haystack = `${driverName} ${customerName} ${reqCode} ${inc.description || ''} ${inc.location_address || ''} ${inc.incident_type}`.toLowerCase();
      const inSearch = !term || haystack.includes(term);

      let inType = true;
      if (incidentType !== 'All') {
        const iType = (inc.incident_type || '').toLowerCase();
        const fType = incidentType.toLowerCase();
        if (fType === 'lost item') {
          inType = iType === 'lost_item' || iType === 'lost item';
        } else if (fType === 'damage') {
          inType = iType === 'damage' || iType === 'cargo_damage';
        } else if (fType === 'delay') {
          inType = iType === 'delay' || iType === 'road_issue';
        } else if (fType === 'breakdown') {
          inType =
            iType === 'vehicle_breakdown' ||
            iType === 'breakdown' ||
            iType === 'vehicle_problem' ||
            iType === 'flat_tire';
        } else {
          inType = iType === fType || iType.replace(/_/g, ' ') === fType;
        }
      }

      const inDriver = incidentDriverFilter === 'All Drivers' || driverName === incidentDriverFilter;
      return inSearch && inType && inDriver;
    });
  }, [incidents, incidentSearch, incidentType, incidentDriverFilter]);

  const incidentDriverNames = useMemo(() => {
    const names = new Set(incidents.map((i) => i.delivery?.driver?.user?.full_name).filter(Boolean));
    return Array.from(names);
  }, [incidents]);

  // Pagination states
  const PAGE_SIZE = 10;
  const [driverPage, setDriverPage] = useState(1);
  const [archivePage, setArchivePage] = useState(1);
  const [incidentPage, setIncidentPage] = useState(1);

  useEffect(() => {
    setDriverPage(1);
  }, [search, activeStatusFilter, sortBy]);

  useEffect(() => {
    setIncidentPage(1);
  }, [incidentSearch, incidentType, incidentDriverFilter]);

  const totalDriverPages = Math.ceil(filteredDrivers.length / PAGE_SIZE) || 1;
  const paginatedDrivers = useMemo(() => {
    const start = (driverPage - 1) * PAGE_SIZE;
    return filteredDrivers.slice(start, start + PAGE_SIZE);
  }, [filteredDrivers, driverPage]);

  const totalArchivePages = Math.ceil(archivedDrivers.length / PAGE_SIZE) || 1;
  const paginatedArchivedDrivers = useMemo(() => {
    const start = (archivePage - 1) * PAGE_SIZE;
    return archivedDrivers.slice(start, start + PAGE_SIZE);
  }, [archivedDrivers, archivePage]);

  const totalIncidentPages = Math.ceil(filteredIncidents.length / PAGE_SIZE) || 1;
  const paginatedIncidents = useMemo(() => {
    const start = (incidentPage - 1) * PAGE_SIZE;
    return filteredIncidents.slice(start, start + PAGE_SIZE);
  }, [filteredIncidents, incidentPage]);

  // ----- Add / Edit -----
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Image size exceeds 5MB limit.');
        return;
      }
      setProfilePhotoFile(file);
      setProfilePhotoPreview(URL.createObjectURL(file));
      setFormError('');
    }
  };

  const openAddModal = () => {
    const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const defaultAuthorizedBy = authUser?.full_name || 'Administrator';
    setEditingDriver(null);
    setForm({
      ...EMPTY_FORM,
      authorized_by: defaultAuthorizedBy,
    });
    setChangePassword(false);
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
    setLicenseFile(null);
    setMedicalCertFile(null);
    setClearanceFile(null);
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (driver) => {
    const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
    const defaultAuthorizedBy = authUser?.full_name || 'Administrator';
    setEditingDriver(driver);
    const { first_name, middle_name, last_name } = splitFullName(driver.user?.full_name);
    setForm({
      first_name,
      middle_name,
      last_name,
      birthdate: driver.birthdate || '',
      nationality: driver.nationality || 'Filipino',
      phone: driver.user?.phone || '',
      license_number: driver.license_number || '',
      license_type: driver.license_type || 'Professional',
      license_date_issued: driver.license_date_issued || '',
      license_expiry_date: driver.license_expiry_date || '',
      authorized_by: driver.authorized_by || defaultAuthorizedBy,
      restriction_code: driver.restriction_code || '',
      health_condition: driver.health_condition || 'Fit to Work',
      last_medical_check: driver.last_medical_check || '',
      prescriptions: driver.prescriptions || '',
      existing_conditions: driver.existing_conditions || '',
      date_hired: driver.date_hired || '',
      experience_years: driver.experience_years != null ? driver.experience_years : '',
      hired_by: driver.hired_by || '',
      contract_start: driver.contract_start || '',
      contract_end: driver.contract_end || '',
      clearance_type: driver.clearance_type || 'NBI Clearance',
      clearance_date: driver.clearance_date || '',
      email: driver.user?.email || '',
      password: '',
      confirmPassword: '',
    });
    setChangePassword(false);
    setProfilePhotoFile(null);
    setProfilePhotoPreview(driver.user?.profile_photo_url || '/images/brucednegrow.png');
    setLicenseFile(null);
    setMedicalCertFile(null);
    setClearanceFile(null);
    setFormError('');
    setShowFormModal(true);
  };

  const saveDriver = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.phone) {
      setFormError('Please fill in first name, last name, email, and contact number.');
      return;
    }
    if (!validatePhoneNumber(form.phone)) {
      setFormError('Contact number must start with "09" and be exactly 11 digits (e.g. 09123456789).');
      return;
    }
    if (form.license_number && !validateLicenseNumber(form.license_number)) {
      setFormError('License number must follow Philippine LTO format (e.g. D01-23-456789).');
      return;
    }
    if (!validateDateSequence(form.license_date_issued, form.license_expiry_date)) {
      setFormError('License expiry date must be on or after the issue date.');
      return;
    }
    if (!validateDateSequence(form.contract_start, form.contract_end)) {
      setFormError('Contract end date must be on or after the contract start date.');
      return;
    }
    if (!validatePositiveNumber(form.experience_years)) {
      setFormError('Years of experience cannot be negative.');
      return;
    }
    if (!editingDriver && !form.password) {
      setFormError('Password is required for a new driver.');
      return;
    }
    const wantsPasswordChange = !editingDriver || changePassword;
    if (wantsPasswordChange && form.password !== form.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const full_name = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ');
      const formData = new FormData();
      formData.append('full_name', full_name);
      formData.append('email', form.email);
      formData.append('phone', form.phone);
      if (form.birthdate) formData.append('birthdate', form.birthdate);
      if (form.nationality) formData.append('nationality', form.nationality);
      if (form.license_number) formData.append('license_number', form.license_number);
      if (form.license_type) formData.append('license_type', form.license_type);
      if (form.license_date_issued) formData.append('license_date_issued', form.license_date_issued);
      if (form.license_expiry_date) formData.append('license_expiry_date', form.license_expiry_date);
      if (form.authorized_by) formData.append('authorized_by', form.authorized_by);
      if (form.restriction_code) formData.append('restriction_code', form.restriction_code);
      if (form.health_condition) formData.append('health_condition', form.health_condition);
      if (form.last_medical_check) formData.append('last_medical_check', form.last_medical_check);
      if (form.prescriptions) formData.append('prescriptions', form.prescriptions);
      if (form.existing_conditions) formData.append('existing_conditions', form.existing_conditions);
      if (form.date_hired) formData.append('date_hired', form.date_hired);
      if (form.experience_years !== '' && form.experience_years != null) formData.append('experience_years', form.experience_years);
      if (form.hired_by) formData.append('hired_by', form.hired_by);
      if (form.contract_start) formData.append('contract_start', form.contract_start);
      if (form.contract_end) formData.append('contract_end', form.contract_end);
      if (form.clearance_type) formData.append('clearance_type', form.clearance_type);
      if (form.clearance_date) formData.append('clearance_date', form.clearance_date);
      if (wantsPasswordChange && form.password) formData.append('password', form.password);

      if (profilePhotoFile) {
        formData.append('profile_photo', profilePhotoFile);
      }
      if (licenseFile) {
        formData.append('license_file', licenseFile);
      }
      if (medicalCertFile) {
        formData.append('medical_certificate_file', medicalCertFile);
      }
      if (clearanceFile) {
        formData.append('clearance_file', clearanceFile);
      }

      if (editingDriver) {
        await api.post(`/drivers/${editingDriver.driver_id}?_method=PUT`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/drivers', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setShowFormModal(false);
      await loadData();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      setFormError(errors ? Object.values(errors)[0][0] : message || 'Could not save driver.');
      console.error('Save driver failed:', err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  const openDetails = (driver) => {
    setDetailsDriver(driver);
    setShowDetailsModal(true);
  };

  const openArchiveModal = (driver) => {
    setArchivingDriver(driver);
    setShowArchiveModal(true);
  };

  const confirmArchive = async () => {
    if (!archivingDriver) return;
    try {
      await api.put(`/drivers/${archivingDriver.driver_id}`, { status: 'inactive' });
      setShowArchiveModal(false);
      await loadData();
      setToast({ message: `${archivingDriver.user?.full_name} archived.`, undoDriverId: archivingDriver.driver_id });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setShowArchiveModal(false);
    }
  };

  const returnDriver = async (driver) => {
    try {
      await api.put(`/drivers/${driver.driver_id}`, { status: 'active' });
      await loadData();
    } catch (err) {
      console.error('Failed to restore driver:', err);
    }
  };

  const undoArchive = async () => {
    if (!toast?.undoDriverId) return;
    try {
      await api.put(`/drivers/${toast.undoDriverId}`, { status: 'active' });
      await loadData();
    } finally {
      setToast(null);
    }
  };

  return (
    <>
      <div className="dashboard-container">
        <Sidebar activePage="drivers" />

        <div className="main-content">
          <header className="header">
            <div className="page-info">
              <span className="breadcrumb">Page/Drivers</span>
              <h1 className="page-title">DRIVER MANAGEMENT</h1>
            </div>
            <div className="header-actions">
              <div className="date-picker">
                <span>{currentDate}</span>
                <i className="far fa-calendar-alt"></i>
              </div>
              <NotificationBell />
            </div>
          </header>

          {loadError && (
            <div className="form-error" style={{ margin: '16px 0', color: '#d32f2f' }}>
              {loadError}
            </div>
          )}

          {/* KPI Cards Row (Figma Design) */}
          <div className="driver-stats">
            <div
              className={`stat-card${activeStatusFilter === 'available' ? ' active active-available' : ''}`}
              onClick={() => handleKpiClick('available')}
              title="Click to filter Available drivers"
            >
              <div className="stat-badge green">{kpiCounts.available}</div>
              <span className="stat-label">Available</span>
            </div>

            <div
              className={`stat-card${activeStatusFilter === 'busy' ? ' active active-busy' : ''}`}
              onClick={() => handleKpiClick('busy')}
              title="Click to filter On Delivery drivers"
            >
              <div className="stat-badge blue">{kpiCounts.onDelivery}</div>
              <span className="stat-label">On Delivery</span>
            </div>

            <div
              className={`stat-card${activeStatusFilter === 'inactive' ? ' active active-inactive' : ''}`}
              onClick={() => handleKpiClick('inactive')}
              title="Click to filter Inactive drivers"
            >
              <div className="stat-badge red">{kpiCounts.inactive}</div>
              <span className="stat-label">Inactive</span>
            </div>

            <div
              className={`stat-card${view === 'archives' || activeStatusFilter === 'resigned' ? ' active active-resigned' : ''}`}
              onClick={() => handleKpiClick('resigned')}
              title="Click to view Resigned / Archived drivers"
            >
              <div className="stat-badge orange">{kpiCounts.resigned}</div>
              <span className="stat-label">Resigned</span>
            </div>
          </div>

          {/* ---------------- Drivers list ---------------- */}
          {view === 'drivers' && (
            <div className="content-section">
              <div className="drivers-toolbar">
                <div className="toolbar-left">
                  <div className="search-bar">
                    <i className="fas fa-search"></i>
                    <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="sort-wrapper">
                    <span className="sort-label">Sort by</span>
                    <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="name_asc">A – Z (Driver Name)</option>
                      <option value="name_desc">Z – A (Driver Name)</option>
                      <option value="id_asc">ID (DR001 →)</option>
                      <option value="id_desc">ID (DR999 →)</option>
                      <option value="status_hierarchy">Status (Available → On Delivery → Inactive)</option>
                      <option value="contract_soonest">Contract (Expiring Soonest)</option>
                      <option value="contract_longest">Contract (Longest Remaining)</option>
                    </select>
                  </div>
                </div>
                <div className="toolbar-right">
                  <button className="btn-incidents" onClick={() => setView('incidents')}>Incidents</button>
                  <button className="btn-archives" onClick={() => { setView('archives'); setActiveStatusFilter('resigned'); }}>Archives</button>
                  <button className="btn-add-driver" onClick={openAddModal}><i className="fas fa-plus"></i> Add Driver</button>
                </div>
              </div>
              <div className="section-content">
                <table className="data-table drivers-table">
                  <thead>
                    <tr>
                      <th>Driver ID</th>
                      <th>Driver Name</th>
                      <th>Status</th>
                      <th>Contract Status</th>
                      <th>Contact Num</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={5} columns={6} hasAvatar={true} />
                    ) : paginatedDrivers.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>No drivers found.</td></tr>
                    ) : (
                      paginatedDrivers.map((driver) => (
                        <tr key={driver.driver_id} className="driver-row" onClick={() => openDetails(driver)}>
                          <td className="driver-id">{driverCode(driver.driver_id)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={driver.user?.profile_photo_url || '/images/brucednegrow.png'}
                                alt={driver.user?.full_name || 'Driver'}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1px solid #e2e8f0',
                                }}
                                onError={(e) => { e.currentTarget.src = '/images/brucednegrow.png'; }}
                              />
                              <span style={{ fontWeight: 600 }}>{driver.user?.full_name || '—'}</span>
                            </div>
                          </td>
                          <td><span className={`driver-status ${availabilityClass(driver)}`}><i className="fas fa-circle"></i> {availabilityLabel(driver)}</span></td>
                          <td>{driver.contract_end ? `Valid until ${formatDate(driver.contract_end)}` : 'Not set'}</td>
                          <td>{driver.user?.phone || '—'}</td>
                          <td className="action-cell">
                            <button className="btn-edit-info" onClick={(e) => { e.stopPropagation(); openEditModal(driver); }}>Edit</button>
                            <button className="btn-archive" onClick={(e) => { e.stopPropagation(); openArchiveModal(driver); }}>ARCHIVE</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <Pagination
                  currentPage={driverPage}
                  totalPages={totalDriverPages}
                  totalItems={filteredDrivers.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setDriverPage}
                  showAlways={true}
                />
              </div>
            </div>
          )}

          {/* ---------------- Archives ---------------- */}
          {view === 'archives' && (
            <div className="content-section" id="archivesSection">
              <div className="drivers-toolbar">
                <h3 className="section-title">Archived Drivers</h3>
                <button className="btn-return" onClick={() => { setView('drivers'); setActiveStatusFilter('all'); }}><span>Return</span><i className="fa fa-reply"></i></button>
              </div>
              <div className="section-content">
                <table className="data-table drivers-table">
                  <thead><tr><th>Driver</th><th>Driver ID</th><th>Contact</th><th>Action</th></tr></thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={4} columns={4} hasAvatar={true} />
                    ) : paginatedArchivedDrivers.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24 }}>No archived drivers.</td></tr>
                    ) : (
                      paginatedArchivedDrivers.map((driver) => (
                        <tr key={driver.driver_id} className="driver-row">
                          <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={driver.user?.profile_photo_url || '/images/brucednegrow.png'}
                              alt=""
                              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.src = '/images/brucednegrow.png'; }}
                            />
                            <span>{driver.user?.full_name || '—'}</span>
                          </td>
                          <td>{driverCode(driver.driver_id)}</td>
                          <td>{driver.user?.phone || '—'}</td>
                          <td className="action-cell">
                            <button className="btn-return-driver" onClick={() => returnDriver(driver)}>Restore</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <Pagination
                  currentPage={archivePage}
                  totalPages={totalArchivePages}
                  totalItems={archivedDrivers.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setArchivePage}
                  showAlways={true}
                />
              </div>
            </div>
          )}

          {/* ---------------- Incidents ---------------- */}
          {view === 'incidents' && (
            <div className="content-section" id="incidentsSection">
              <div className="drivers-toolbar">
                <h3 className="section-title">Incident Reports & Investigation</h3>
                <button className="btn-return" onClick={() => setView('drivers')}>
                  <span>Return</span>
                  <i className="fa fa-reply"></i>
                </button>
              </div>

              <div className="incidents-controls" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '14px 0', alignItems: 'center' }}>
                <div className="search-bar">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Search incident, driver, customer..."
                    value={incidentSearch}
                    onChange={(e) => setIncidentSearch(e.target.value)}
                  />
                </div>

                {/* Pill filters matching user image */}
                <div className="incident-tabs">
                  {['All', 'accident', 'delay', 'damage', 'lost item', 'other'].map((t) => (
                    <button
                      key={t}
                      className={`incident-tab${incidentType === t ? ' active' : ''}`}
                      onClick={() => setIncidentType(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
                  <select
                    className="sort-select"
                    value={incidentDriverFilter}
                    onChange={(e) => setIncidentDriverFilter(e.target.value)}
                  >
                    <option>All Drivers</option>
                    {incidentDriverNames.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="incident-count">Showing {filteredIncidents.length} of {incidents.length} reports.</p>

              <div className="section-content">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Incident #</th>
                      <th>Date &amp; Time Incident Took Place</th>
                      <th>Driver</th>
                      <th>Request / Route</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Location &amp; Details</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={5} columns={8} />
                    ) : paginatedIncidents.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: 28, color: '#6B7280' }}>
                          No incidents match these filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedIncidents.map((inc) => {
                        const req = inc.delivery?.request;
                        const reqId = req?.request_id ? `REQ${String(req.request_id).padStart(4, '0')}` : '—';
                        const incCode = `INC-${String(inc.incident_id).padStart(5, '0')}`;
                        return (
                          <tr key={inc.incident_id}>
                            <td>
                              <span style={{ fontWeight: 700, color: '#DC2626' }}>{incCode}</span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>
                                {formatDateTime(inc.reported_at)}
                              </div>
                            </td>
                            <td>
                              <strong>{inc.delivery?.driver?.user?.full_name || 'Unassigned'}</strong>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontWeight: 600, color: '#1F2937' }}>{reqId}</span>
                                <span style={{ fontSize: 12, color: '#6B7280' }}>{req?.customer?.full_name || '—'}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#DC2626' }}>
                                {(inc.incident_type || 'Other').replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td>
                              <span className={`cell-badge severity-${inc.severity || 'medium'}`}>
                                {(inc.severity || 'medium').toUpperCase()}
                              </span>
                            </td>
                            <td style={{ maxWidth: 220 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1F2937' }}>
                                {inc.location_address || 'Along route'}
                              </div>
                              <div style={{ fontSize: 11.5, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {inc.description || '—'}
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-print-incident"
                                onClick={() => setSelectedPrintIncident(inc)}
                                title="View Incident Details & Operational Actions"
                              >
                                <i className="fas fa-eye"></i>
                                <span>View Details</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <Pagination
                  currentPage={incidentPage}
                  totalPages={totalIncidentPages}
                  totalItems={filteredIncidents.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setIncidentPage}
                  showAlways={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-notification show">
          <div className="toast-content">
            <span className="toast-message"><i className="fas fa-check-circle"></i> {toast.message}</span>
            <button className="btn-undo" onClick={undoArchive}><i className="fa fa-undo"></i> Undo</button>
          </div>
        </div>
      )}

      {/* Archive confirmation */}
      {showArchiveModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-body" style={{ padding: 24 }}>
              <h3>Archive Driver</h3>
              <p>Are you sure you want to archive <strong>{archivingDriver?.user?.full_name}</strong>?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowArchiveModal(false)}>Cancel</button>
              <button className="btn-save" onClick={confirmArchive}>Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* Driver details modal (Figma Design Redesign) */}
      {showDetailsModal && detailsDriver && (() => {
        const parsedName = splitFullName(detailsDriver.user?.full_name);
        const driverDeliveries = detailsDriver.deliveries || [];
        const completedTrips = driverDeliveries.filter((d) => (d.status || '').toLowerCase() === 'delivered').length;
        const acceptedAssignments = driverDeliveries.length;
        const declinedAssignments = 0;

        const driverIncidents = incidents.filter(
          (inc) =>
            inc.delivery?.driver_id === detailsDriver.driver_id ||
            inc.delivery?.driver?.driver_id === detailsDriver.driver_id ||
            inc.delivery?.driver?.user?.full_name === detailsDriver.user?.full_name
        );
        const overspeedingCount = driverIncidents.filter((i) => (i.incident_type || '').toLowerCase().includes('speed')).length;
        const lateArrivalCount = driverIncidents.filter(
          (i) => (i.incident_type || '').toLowerCase().includes('delay') || (i.incident_type || '').toLowerCase().includes('late')
        ).length;
        const trafficViolationsCount = driverIncidents.filter(
          (i) => (i.incident_type || '').toLowerCase().includes('traffic') || (i.incident_type || '').toLowerCase().includes('violation')
        ).length;
        const accidentsCount = driverIncidents.filter((i) => (i.incident_type || '').toLowerCase().includes('accident')).length;
        const totalOffenses = overspeedingCount + lateArrivalCount + trafficViolationsCount + accidentsCount;

        const statusLabel = availabilityLabel(detailsDriver);
        const statusClass = availabilityClass(detailsDriver);
        const statusDotColor = statusClass === 'on-delivery' ? '#2563eb' : statusClass === 'available' ? '#16a34a' : '#94a3b8';

        return (
          <div className="driver-info-modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="driver-info-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="driver-info-header">
                <h2 className="driver-info-title">DRIVER INFORMATION</h2>
                <button
                  type="button"
                  className="driver-info-close-btn"
                  onClick={() => setShowDetailsModal(false)}
                  aria-label="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="driver-info-body">
                {/* Left Profile Card */}
                <div className="driver-profile-card">
                  <div className="driver-profile-photo-wrapper">
                    <img
                      src={detailsDriver.user?.profile_photo_url || '/images/brucednegrow.png'}
                      alt={detailsDriver.user?.full_name || 'Driver'}
                      className="driver-profile-photo"
                      onError={(e) => {
                        e.currentTarget.src = '/images/brucednegrow.png';
                      }}
                    />
                  </div>

                  <h3 className="driver-profile-name">{detailsDriver.user?.full_name || '—'}</h3>
                  <div className="driver-profile-id">{driverCode(detailsDriver.driver_id)}</div>

                  <div className="driver-profile-rating">
                    <div className="rating-stars">
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                    </div>
                    <span className="rating-score">5</span>
                    <span className="rating-reviews">(12 Reviews)</span>
                  </div>

                  <div className="driver-profile-meta-list">
                    <div className="driver-profile-meta-item">
                      <i className="fas fa-phone-alt meta-icon"></i>
                      <div className="driver-profile-meta-content">
                        <span className="meta-label">Contact Number</span>
                        <span className="meta-value">{detailsDriver.user?.phone || '—'}</span>
                      </div>
                    </div>

                    <div className="driver-profile-meta-item">
                      <i className="fas fa-file-contract meta-icon"></i>
                      <div className="driver-profile-meta-content">
                        <span className="meta-label">Contract Info</span>
                        <span className="meta-value">Valid from: {formatDate(detailsDriver.contract_start)}</span>
                        <span className="meta-value">Valid until: {formatDate(detailsDriver.contract_end)}</span>
                      </div>
                    </div>

                    <div className="driver-profile-meta-item">
                      <i className="fas fa-circle meta-icon-dot" style={{ color: statusDotColor }}></i>
                      <div className="driver-profile-meta-content">
                        <span className="meta-label">Status</span>
                        <span className={`meta-status-text ${statusClass}`}>{statusLabel}</span>
                      </div>
                    </div>

                    <div className="driver-profile-meta-item">
                      <i className="far fa-calendar-alt meta-icon"></i>
                      <div className="driver-profile-meta-content">
                        <span className="meta-label">Date Hired</span>
                        <span className="meta-value">{formatDate(detailsDriver.date_hired)}</span>
                      </div>
                    </div>

                    <div className="driver-profile-meta-item">
                      <i className="fas fa-user-tie meta-icon"></i>
                      <div className="driver-profile-meta-content">
                        <span className="meta-label">Hired by</span>
                        <span className="meta-value">{detailsDriver.hired_by || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="driver-btn-edit-info"
                    onClick={() => {
                      setShowDetailsModal(false);
                      openEditModal(detailsDriver);
                    }}
                  >
                    <i className="far fa-edit"></i> Edit Information
                  </button>
                </div>

                {/* Right Cards Grid */}
                <div className="driver-info-grid-container">
                  <div className="driver-info-grid-row-top">
                    {/* Personal Information */}
                    <div className="driver-info-card">
                      <h4 className="driver-info-card-title">Personal Information</h4>
                      <div className="driver-info-kv-list">
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">First Name</span>
                          <span className="driver-info-kv-val">{parsedName.first_name || '—'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Middle Name</span>
                          <span className="driver-info-kv-val">{parsedName.middle_name || '—'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Last Name</span>
                          <span className="driver-info-kv-val">{parsedName.last_name || '—'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Birthdate</span>
                          <span className="driver-info-kv-val">{formatDate(detailsDriver.birthdate)}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Nationality</span>
                          <span className="driver-info-kv-val">{detailsDriver.nationality || 'Filipino'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Health Information */}
                    <div className="driver-info-card">
                      <h4 className="driver-info-card-title">Health Information</h4>
                      <div className="driver-info-kv-list">
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Health Condition</span>
                          <span className="driver-info-kv-val">{detailsDriver.health_condition || 'Fit to work'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Last Medical Check</span>
                          <span className="driver-info-kv-val">{formatDate(detailsDriver.last_medical_check)}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Prescriptions</span>
                          <span className="driver-info-kv-val">{detailsDriver.prescriptions || 'N/A'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Existing Conditions</span>
                          <span className="driver-info-kv-val">{detailsDriver.existing_conditions || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* License Information */}
                    <div className="driver-info-card">
                      <h4 className="driver-info-card-title">License Information</h4>
                      <div className="driver-info-kv-list">
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">License Number</span>
                          <span className="driver-info-kv-val">{detailsDriver.license_number || '—'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">License Type</span>
                          <span className="driver-info-kv-val">
                            {detailsDriver.license_type
                              ? `${detailsDriver.license_type}${
                                  detailsDriver.license_type.toLowerCase().includes('permit') ||
                                  detailsDriver.license_type.toLowerCase().includes('license')
                                    ? ''
                                    : ' License'
                                }`
                              : 'Drivers License'}
                          </span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Restriction Code</span>
                          <span className="driver-info-kv-val">{detailsDriver.restriction_code || 'None'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Date Issued</span>
                          <span className="driver-info-kv-val">{formatDate(detailsDriver.license_date_issued)}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Expiry Date</span>
                          <span className="driver-info-kv-val">{formatDate(detailsDriver.license_expiry_date)}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Authorized by</span>
                          <span className="driver-info-kv-val">{detailsDriver.authorized_by || 'LTO Region 10'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="driver-info-grid-row-bottom" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    {/* Driver Performance */}
                    <div className="driver-info-card">
                      <h4 className="driver-info-card-title">Driver Performance</h4>
                      <div className="driver-info-kv-list">
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Completed Trips</span>
                          <span className="driver-info-kv-val">{completedTrips}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Declined Assignments</span>
                          <span className="driver-info-kv-val">{declinedAssignments}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Accepted Assignments</span>
                          <span className="driver-info-kv-val">{acceptedAssignments}</span>
                        </div>
                      </div>
                    </div>

                    {/* History of Offenses */}
                    <div className="driver-info-card">
                      <h4 className="driver-info-card-title">History of Offenses</h4>
                      <div className="driver-info-kv-list">
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Overspeeding</span>
                          <span className="driver-info-kv-val">{overspeedingCount}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Late Arrival</span>
                          <span className="driver-info-kv-val">{lateArrivalCount}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Traffic Violations</span>
                          <span className="driver-info-kv-val">{trafficViolationsCount}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Accidents Involved</span>
                          <span className="driver-info-kv-val">{accidentsCount}</span>
                        </div>
                      </div>

                      {totalOffenses === 0 ? (
                        <div className="driver-record-badge good-record">Good Driver Record</div>
                      ) : (
                        <div className="driver-record-badge flagged-record">
                          {totalOffenses} Recorded Offense{totalOffenses > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* Documents & Clearances */}
                    <div className="driver-info-card">
                      <h4 className="driver-info-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fas fa-folder-open" style={{ color: '#d32f2f' }}></i> Documents &amp; Clearances
                      </h4>
                      <div className="driver-info-kv-list" style={{ gap: 12 }}>
                        {/* 1. Driver's License Copy */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="driver-info-kv-key">License Copy</span>
                          {detailsDriver.license_file_url ? (
                            <button
                              type="button"
                              onClick={() => handleViewDocFile("Driver's License Copy", detailsDriver.license_file_url, detailsDriver)}
                              style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              View File
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleViewDocFile("Driver's License Copy", null, detailsDriver)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Not Uploaded
                            </button>
                          )}
                        </div>

                        {/* 2. Medical / Fit-to-Work Certificate */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="driver-info-kv-key">Medical Certificate</span>
                          {detailsDriver.medical_certificate_file_url ? (
                            <button
                              type="button"
                              onClick={() => handleViewDocFile('Medical Fit-to-Work Certificate', detailsDriver.medical_certificate_file_url, detailsDriver)}
                              style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              View File
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleViewDocFile('Medical Fit-to-Work Certificate', null, detailsDriver)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Not Uploaded
                            </button>
                          )}
                        </div>

                        {/* 3. NBI / Police Clearance */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="driver-info-kv-key">{detailsDriver.clearance_type || 'NBI Clearance'}</span>
                            {detailsDriver.clearance_date && (
                              <span style={{ fontSize: 11, color: '#64748b' }}>Date: {formatDate(detailsDriver.clearance_date)}</span>
                            )}
                          </div>
                          {detailsDriver.clearance_file_url ? (
                            <button
                              type="button"
                              onClick={() => handleViewDocFile(detailsDriver.clearance_type || 'Security Clearance', detailsDriver.clearance_file_url, detailsDriver)}
                              style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              View File
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleViewDocFile(detailsDriver.clearance_type || 'Security Clearance', null, detailsDriver)}
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
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add / Edit driver modal */}
      {showFormModal && (
        <div
          className="modal driver-form-modal"
          style={{
            display: 'flex',
            position: 'fixed',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            className="modal-content driver-form-content"
            style={{
              width: '100%',
              maxWidth: 950,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div className="modal-header driver-form-header" style={{ position: 'sticky', top: 0, zIndex: 2, background: '#d32f2f', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}><i className="fas fa-user-circle"></i> {editingDriver ? 'EDIT DRIVER' : 'ADD NEW DRIVER'}</h2>
              <button className="modal-close" onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body driver-form-body" style={{ padding: 24 }}>
              {formError && <div className="form-error" style={{ color: '#d32f2f', background: '#fee2e2', padding: '10px 14px', borderRadius: 6, marginBottom: 16 }}>{formError}</div>}
              <form className="edit-form" onSubmit={(e) => e.preventDefault()}>
                <div
                  className="driver-form-columns"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}
                >
                  {/* Personal Information */}
                  <div className="form-card">
                    <h4 className="form-section-title">Personal Information</h4>
                    <div className="form-group">
                      <label>First Name <span className="required" style={{ color: 'red' }}>*</span></label>
                      <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Middle Name</label>
                      <input type="text" value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Last Name <span className="required" style={{ color: 'red' }}>*</span></label>
                      <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Birthdate</label>
                      <input type="date" value={form.birthdate || ''} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Nationality</label>
                      <input
                        type="text"
                        value={form.nationality || ''}
                        placeholder="e.g. Filipino"
                        onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Contact Number <span className="required" style={{ color: 'red' }}>*</span></label>
                      <input
                        type="text"
                        value={form.phone}
                        maxLength={11}
                        placeholder="09XXXXXXXXX"
                        onChange={(e) => setForm({ ...form, phone: formatPhoneInput(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* License Information */}
                  <div className="form-card">
                    <h4 className="form-section-title">License Information</h4>
                    <div className="form-group">
                      <label>License Number</label>
                      <input
                        type="text"
                        value={form.license_number}
                        maxLength={13}
                        placeholder="e.g. D01-23-456789"
                        onChange={(e) => setForm({ ...form, license_number: formatLicenseInput(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label>License Type</label>
                      <select
                        value={form.license_type}
                        onChange={(e) => setForm({ ...form, license_type: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                      >
                        <option value="Professional">Professional (Prof)</option>
                        <option value="Non-Professional">Non-Professional (Non-Prof)</option>
                        <option value="Student Permit">Student Permit</option>
                      </select>
                    </div>
                    <div className="form-row-inline" style={{ display: 'flex', gap: 10 }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Date issued</label>
                        <input type="date" value={form.license_date_issued || ''} onChange={(e) => setForm({ ...form, license_date_issued: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Date expiry</label>
                        <input type="date" value={form.license_expiry_date || ''} onChange={(e) => setForm({ ...form, license_expiry_date: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        Authorized By
                        {editingDriver && (
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 'normal', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <i className="fas fa-lock" style={{ fontSize: 10 }}></i> Immutable Audit Field
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={form.authorized_by || ''}
                        disabled={Boolean(editingDriver)}
                        readOnly={Boolean(editingDriver)}
                        style={editingDriver ? { backgroundColor: '#f1f5f9', color: '#475569', cursor: 'not-allowed' } : {}}
                        placeholder="Auto-detected authorized user"
                        onChange={(e) => setForm({ ...form, authorized_by: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Restriction code (if any)</label>
                      <input type="text" value={form.restriction_code} onChange={(e) => setForm({ ...form, restriction_code: e.target.value })} />
                    </div>
                  </div>

                  {/* Health Information */}
                  <div className="form-card">
                    <h4 className="form-section-title">Health Information</h4>
                    <div className="form-group">
                      <label>Condition / Health Status</label>
                      <select
                        value={form.health_condition}
                        onChange={(e) => setForm({ ...form, health_condition: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                      >
                        <option value="Fit to Work">Fit to Work</option>
                        <option value="1 - None / Normal">1 - None / Normal</option>
                        <option value="2 - Drive with Corrective Lenses">2 - Drive with Corrective Lenses</option>
                        <option value="3 - Special Equipment for Upper Limbs">3 - Special Equipment for Upper Limbs</option>
                        <option value="4 - Special Equipment for Lower Limbs">4 - Special Equipment for Lower Limbs</option>
                        <option value="5 - Daylight Driving Only">5 - Daylight Driving Only</option>
                        <option value="Under Observation">Under Observation</option>
                        <option value="Medical Leave">Medical Leave</option>
                        <option value="Unfit to Work">Unfit to Work</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Last Medical Check</label>
                      <input type="date" value={form.last_medical_check || ''} onChange={(e) => setForm({ ...form, last_medical_check: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Prescriptions</label>
                      <textarea placeholder="Enter prescription (optional)" value={form.prescriptions} onChange={(e) => setForm({ ...form, prescriptions: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Existing Conditions</label>
                      <textarea placeholder="Enter conditions (optional)" value={form.existing_conditions} onChange={(e) => setForm({ ...form, existing_conditions: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Employment & Contract Information */}
                <div className="form-card" style={{ marginTop: 20 }}>
                  <h4 className="form-section-title">Employment &amp; Contract Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 14 }}>
                    <div className="form-group">
                      <label>Date Hired</label>
                      <input
                        type="date"
                        value={form.date_hired || ''}
                        onChange={(e) => setForm({ ...form, date_hired: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Years of Experience</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        placeholder="e.g. 5"
                        value={form.experience_years ?? ''}
                        onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        Hired By
                        {editingDriver && (
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 'normal', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <i className="fas fa-lock" style={{ fontSize: 10 }}></i> Immutable
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HR / Manager"
                        value={form.hired_by || ''}
                        disabled={Boolean(editingDriver)}
                        readOnly={Boolean(editingDriver)}
                        style={editingDriver ? { backgroundColor: '#f1f5f9', color: '#475569', cursor: 'not-allowed' } : {}}
                        onChange={(e) => setForm({ ...form, hired_by: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Contract Start Date</label>
                      <input
                        type="date"
                        value={form.contract_start || ''}
                        onChange={(e) => setForm({ ...form, contract_start: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Contract End Date</label>
                      <input
                        type="date"
                        value={form.contract_end || ''}
                        onChange={(e) => setForm({ ...form, contract_end: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Driver Documents (Permits & Clearances) */}
                <div className="form-card" style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 className="form-section-title" style={{ margin: 0 }}>
                      <i className="fas fa-folder-open" style={{ color: '#d32f2f', marginRight: 8 }}></i>
                      Driver Documents (Permits &amp; Clearances)
                    </h4>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Accepted formats: JPG, PNG, WEBP, PDF (Max 10MB per file)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                    {/* Document 1: Driver's License Copy */}
                    <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-id-card" style={{ color: '#b91c1c' }}></i> Driver's License Copy
                        </span>
                        {editingDriver?.license_file_url && !licenseFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile("Driver's License Copy", editingDriver.license_file_url, editingDriver)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={licenseFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'license')}
                      />
                      {licenseFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {licenseFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLicenseFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => licenseFileInputRef.current?.click()}
                          style={{ width: '100%', padding: '10px 12px', border: '1.5px dashed #cbd5e1', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: '#94a3b8' }}></i>
                          {editingDriver?.license_file_url ? 'Replace License File' : 'Upload License File'}
                        </button>
                      )}
                    </div>

                    {/* Document 2: Medical / Fit-to-Work Certificate */}
                    <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-heartbeat" style={{ color: '#b91c1c' }}></i> Medical Certificate
                        </span>
                        {editingDriver?.medical_certificate_file_url && !medicalCertFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile('Medical Fit-to-Work Certificate', editingDriver.medical_certificate_file_url, editingDriver)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={medicalCertFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'medical')}
                      />
                      {medicalCertFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {medicalCertFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setMedicalCertFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => medicalCertFileInputRef.current?.click()}
                          style={{ width: '100%', padding: '10px 12px', border: '1.5px dashed #cbd5e1', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: '#94a3b8' }}></i>
                          {editingDriver?.medical_certificate_file_url ? 'Replace Medical File' : 'Upload Medical Cert'}
                        </button>
                      )}
                    </div>

                    {/* Document 3: NBI / Police Clearance */}
                    <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-shield-alt" style={{ color: '#b91c1c' }}></i> Security Clearance
                        </span>
                        {editingDriver?.clearance_file_url && !clearanceFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile(editingDriver.clearance_type || 'Security Clearance', editingDriver.clearance_file_url, editingDriver)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 6, marginBottom: 8 }}>
                        <select
                          value={form.clearance_type || 'NBI Clearance'}
                          onChange={(e) => setForm({ ...form, clearance_type: e.target.value })}
                          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11, background: '#fff' }}
                        >
                          <option value="NBI Clearance">NBI Clearance</option>
                          <option value="Police Clearance">Police Clearance</option>
                          <option value="Barangay Clearance">Barangay Clearance</option>
                        </select>
                        <input
                          type="date"
                          value={form.clearance_date || ''}
                          onChange={(e) => setForm({ ...form, clearance_date: e.target.value })}
                          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11, background: '#fff' }}
                          title="Clearance Issue Date"
                        />
                      </div>
                      <input
                        type="file"
                        ref={clearanceFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'clearance')}
                      />
                      {clearanceFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {clearanceFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setClearanceFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => clearanceFileInputRef.current?.click()}
                          style={{ width: '100%', padding: '10px 12px', border: '1.5px dashed #cbd5e1', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: '#94a3b8' }}></i>
                          {editingDriver?.clearance_file_url ? 'Replace Clearance File' : 'Upload Clearance'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="driver-form-columns" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20, marginTop: 20 }}>
                  {/* Account Information */}
                  <div className="form-card">
                    <h4 className="form-section-title">Account Information</h4>
                    <div className="form-group">
                      <label>Email <span className="required" style={{ color: 'red' }}>*</span></label>
                      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="form-row-inline" style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <div className="form-group" style={{ flex: 1, position: 'relative' }}>
                        <label>Password{!editingDriver && <span className="required" style={{ color: 'red' }}>*</span>}</label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          disabled={editingDriver && !changePassword}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                        <i
                          className={`fa-solid ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}
                          onClick={() => setShowPassword((p) => !p)}
                          style={{ position: 'absolute', right: 12, top: 38, cursor: 'pointer' }}
                        ></i>
                      </div>
                      <div className="form-group" style={{ flex: 1, position: 'relative' }}>
                        <label>Confirm Password{!editingDriver && <span className="required" style={{ color: 'red' }}>*</span>}</label>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={form.confirmPassword}
                          disabled={editingDriver && !changePassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        />
                        <i
                          className={`fa-solid ${showConfirmPassword ? 'fa-eye' : 'fa-eye-slash'}`}
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          style={{ position: 'absolute', right: 12, top: 38, cursor: 'pointer' }}
                        ></i>
                      </div>
                    </div>
                    {editingDriver && (
                      <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <input type="checkbox" checked={changePassword} onChange={(e) => setChangePassword(e.target.checked)} />
                        <span>Change password</span>
                      </label>
                    )}
                  </div>

                  {/* Profile Picture with live upload */}
                  <div className="form-card">
                    <h4 className="form-section-title">Profile Picture</h4>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      style={{ display: 'none' }}
                      onChange={handlePhotoSelect}
                    />
                    <div
                      className="upload-box"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: 10,
                        padding: 20,
                        textAlign: 'center',
                        color: '#64748b',
                        cursor: 'pointer',
                        background: '#f8fafc',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {profilePhotoPreview ? (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={profilePhotoPreview}
                            alt="Preview"
                            style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                            onError={(e) => { e.currentTarget.src = '/images/brucednegrow.png'; }}
                          />
                          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#2563eb', fontWeight: 600 }}>Click to change</p>
                        </div>
                      ) : (
                        <>
                          <i className="fas fa-cloud-upload-alt" style={{ fontSize: 32, color: '#94a3b8' }}></i>
                          <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#334155' }}>Upload Driver Photo</p>
                          <p style={{ fontSize: 12, margin: 0, color: '#94a3b8' }}>JPG, PNG or WEBP (Max 5MB)</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn-cancel" onClick={() => setShowFormModal(false)} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button className="btn-save" onClick={saveDriver} disabled={saving} style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: '#d32f2f', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Printable Incident Report Modal */}
      {selectedPrintIncident && (
        <PrintableIncidentModal
          incident={selectedPrintIncident}
          onClose={() => setSelectedPrintIncident(null)}
        />
      )}

      {/* Custom Document Viewer & Missing Document Modal */}
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

              {docModal.driver && (
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
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    <i className="fas fa-user"></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {docModal.driver.user?.full_name || 'Driver'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      License: <span style={{ fontWeight: 600, color: '#334155' }}>{docModal.driver.license_number || 'N/A'}</span>
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
                    const d = docModal.driver;
                    setDocModal(null);
                    setShowDetailsModal(false);
                    if (d) {
                      openEditModal(d);
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
                    {docModal.driver && (
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        Driver: {docModal.driver.user?.full_name || 'Driver'} • License: {docModal.driver.license_number || 'N/A'}
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

export default DriversPage;