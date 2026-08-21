import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api-client';

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function driverCode(id) {
  return `DR${String(id).padStart(3, '0')}`;
}

function availabilityLabel(driver) {
  if (driver.status === 'inactive') return 'Inactive';
  if (driver.availability_status === 'busy') return 'On Delivery';
  if (driver.availability_status === 'offline') return 'Inactive';
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
  phone: '',
  license_number: '',
  license_type: '',
  license_date_issued: '',
  license_expiry_date: '',
  authorized_by: '',
  restriction_code: '',
  health_condition: '',
  last_medical_check: '',
  prescriptions: '',
  existing_conditions: '',
  email: '',
  username: '',
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

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [changePassword, setChangePassword] = useState(false);
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
  const [incidentStatusFilter, setIncidentStatusFilter] = useState('All Status');

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
      setLoadError('Could not load driver data. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeDrivers = useMemo(() => drivers.filter((d) => d.status === 'active'), [drivers]);
  const archivedDrivers = useMemo(() => drivers.filter((d) => d.status === 'inactive'), [drivers]);

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return activeDrivers;
    const term = search.toLowerCase();
    return activeDrivers.filter((d) => {
      const haystack = `${d.user?.full_name || ''} ${d.user?.email || ''} ${d.user?.phone || ''} ${d.license_number || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [activeDrivers, search]);

  const stats = useMemo(() => {
    const available = activeDrivers.filter((d) => d.availability_status === 'available').length;
    const onDelivery = activeDrivers.filter((d) => d.availability_status === 'busy').length;
    const inactive = activeDrivers.filter((d) => d.availability_status === 'offline').length;
    return { available, onDelivery, inactive, archived: archivedDrivers.length };
  }, [activeDrivers, archivedDrivers]);

  const filteredIncidents = useMemo(() => {
    const term = incidentSearch.toLowerCase();
    return incidents.filter((inc) => {
      const driverName = inc.delivery?.driver?.user?.full_name || 'Unassigned';
      const haystack = `${driverName} ${inc.description || ''} ${inc.incident_type}`.toLowerCase();
      const inSearch = !term || haystack.includes(term);
      const inType = incidentType === 'All' || inc.incident_type === incidentType;
      const inDriver = incidentDriverFilter === 'All Drivers' || driverName === incidentDriverFilter;
      const inStatus = incidentStatusFilter === 'All Status' || inc.status === incidentStatusFilter;
      return inSearch && inType && inDriver && inStatus;
    });
  }, [incidents, incidentSearch, incidentType, incidentDriverFilter, incidentStatusFilter]);

  const incidentDriverNames = useMemo(() => {
    const names = new Set(incidents.map((i) => i.delivery?.driver?.user?.full_name).filter(Boolean));
    return Array.from(names);
  }, [incidents]);

  // ----- Add / Edit -----
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const openAddModal = () => {
    setEditingDriver(null);
    setForm(EMPTY_FORM);
    setChangePassword(false);
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (driver) => {
    setEditingDriver(driver);
    const { first_name, middle_name, last_name } = splitFullName(driver.user?.full_name);
    setForm({
      first_name,
      middle_name,
      last_name,
      birthdate: driver.birthdate || '',
      phone: driver.user?.phone || '',
      license_number: driver.license_number || '',
      license_type: driver.license_type || '',
      license_date_issued: driver.license_date_issued || '',
      license_expiry_date: driver.license_expiry_date || '',
      authorized_by: driver.authorized_by || '',
      restriction_code: driver.restriction_code || '',
      health_condition: driver.health_condition || '',
      last_medical_check: driver.last_medical_check || '',
      prescriptions: driver.prescriptions || '',
      existing_conditions: driver.existing_conditions || '',
      email: driver.user?.email || '',
      username: driver.user?.username || '',
      password: '',
      confirmPassword: '',
    });
    setChangePassword(false);
    setFormError('');
    setShowFormModal(true);
  };

  const saveDriver = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.phone) {
      setFormError('Please fill in first name, last name, email, and contact number.');
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
      const payload = {
        full_name,
        email: form.email,
        username: form.username || null,
        phone: form.phone,
        birthdate: form.birthdate || null,
        license_number: form.license_number,
        license_type: form.license_type,
        license_date_issued: form.license_date_issued || null,
        license_expiry_date: form.license_expiry_date || null,
        authorized_by: form.authorized_by,
        restriction_code: form.restriction_code,
        health_condition: form.health_condition,
        last_medical_check: form.last_medical_check || null,
        prescriptions: form.prescriptions,
        existing_conditions: form.existing_conditions,
      };
      if (wantsPasswordChange) payload.password = form.password;

      if (editingDriver) {
        await api.put(`/drivers/${editingDriver.driver_id}`, payload);
      } else {
        await api.post('/drivers', payload);
      }
      setShowFormModal(false);
      await loadData();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      setFormError(errors ? Object.values(errors)[0][0] : message || 'Could not save driver. Check the browser console/network tab for details.');
      console.error('Save driver failed:', err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  // ----- Details -----
  const openDetails = (driver) => {
    setDetailsDriver(driver);
    setShowDetailsModal(true);
  };

  // ----- Archive / Restore -----
  const openArchiveModal = (driver) => {
    setArchivingDriver(driver);
    setShowArchiveModal(true);
  };

  const confirmArchive = async () => {
    const driver = archivingDriver;
    try {
      await api.patch(`/drivers/${driver.driver_id}`, { status: 'inactive' });
      setShowArchiveModal(false);
      await loadData();
      setToast({ message: `${driver.user?.full_name || 'Driver'} archived.`, undoId: driver.driver_id });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setShowArchiveModal(false);
    }
  };

  const undoArchive = async () => {
    if (!toast?.undoId) return;
    try {
      await api.patch(`/drivers/${toast.undoId}`, { status: 'active' });
      await loadData();
    } finally {
      setToast(null);
    }
  };

  const returnDriver = async (driver) => {
    try {
      await api.patch(`/drivers/${driver.driver_id}`, { status: 'active' });
      await loadData();
    } catch (err) {
      // no-op — data reload will reflect actual state
    }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center' }}>Loading drivers...</div>;
  }

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
              <li className="active"><Link to="/drivers"><i className="fas fa-id-card"></i> Drivers</Link></li>
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
            <div className="page-info">
              <span className="breadcrumb">Page/Drivers</span>
              <h1 className="page-title">DRIVER MANAGEMENT</h1>
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

          {view !== 'incidents' && (
            <div className="driver-stats">
              <div className="stat-card"><div className="stat-badge green">{stats.available}</div><span className="stat-label">Available</span></div>
              <div className="stat-card"><div className="stat-badge blue">{stats.onDelivery}</div><span className="stat-label">On Delivery</span></div>
              <div className="stat-card"><div className="stat-badge red">{stats.inactive}</div><span className="stat-label">Inactive</span></div>
              <div className="stat-card"><div className="stat-badge orange">{stats.archived}</div><span className="stat-label">Archived</span></div>
            </div>
          )}

          {/* ---------------- Drivers list ---------------- */}
          {view === 'drivers' && (
            <div className="content-section">
              <div className="drivers-toolbar">
                <div className="toolbar-left">
                  <div className="search-bar">
                    <i className="fas fa-search"></i>
                    <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
                <div className="toolbar-right">
                  <button className="btn-incidents" onClick={() => setView('incidents')}>Incidents</button>
                  <button className="btn-archives" onClick={() => setView('archives')}>Archives</button>
                  <button className="btn-add-driver" onClick={openAddModal}><i className="fas fa-plus"></i> Add Driver</button>
                </div>
              </div>
              <div className="section-content">
                <table className="data-table drivers-table">
                  <thead>
                    <tr><th>Driver ID</th><th>Driver Name</th><th>Status</th><th>Contract Status</th><th>Contact</th><th>Health Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.map((driver) => (
                      <tr key={driver.driver_id} className="driver-row" onClick={() => openDetails(driver)}>
                        <td className="driver-id">{driverCode(driver.driver_id)}</td>
                        <td>{driver.user?.full_name || '—'}</td>
                        <td><span className={`driver-status ${availabilityClass(driver)}`}><i className="fas fa-circle"></i> {availabilityLabel(driver)}</span></td>
                        <td>{driver.contract_end ? `Valid until ${formatDate(driver.contract_end)}` : 'Not set'}</td>
                        <td>{driver.user?.phone || '—'}</td>
                        <td><span className="health-status">{driver.health_condition || '—'}</span></td>
                        <td className="action-cell">
                          <button className="btn-edit-info" onClick={(e) => { e.stopPropagation(); openEditModal(driver); }}>Edit Info</button>
                          <button className="btn-archive" onClick={(e) => { e.stopPropagation(); openArchiveModal(driver); }}>ARCHIVE</button>
                        </td>
                      </tr>
                    ))}
                    {filteredDrivers.length === 0 && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24 }}>No drivers found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------- Archives ---------------- */}
          {view === 'archives' && (
            <div className="content-section" id="archivesSection">
              <div className="drivers-toolbar">
                <h3 className="section-title">Archived Drivers</h3>
                <button className="btn-return" onClick={() => setView('drivers')}><span>Return</span><i className="fa fa-reply"></i></button>
              </div>
              <div className="section-content">
                <table className="data-table drivers-table">
                  <thead><tr><th>Driver ID</th><th>Name</th><th>Contact</th><th>Action</th></tr></thead>
                  <tbody>
                    {archivedDrivers.map((driver) => (
                      <tr key={driver.driver_id} className="driver-row">
                        <td>{driverCode(driver.driver_id)}</td>
                        <td>{driver.user?.full_name || '—'}</td>
                        <td>{driver.user?.phone || '—'}</td>
                        <td className="action-cell">
                          <button className="btn-return-driver" onClick={() => returnDriver(driver)}>Return</button>
                        </td>
                      </tr>
                    ))}
                    {archivedDrivers.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24 }}>No archived drivers.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------- Incidents ---------------- */}
          {view === 'incidents' && (
            <div className="content-section" id="incidentsSection">
              <div className="drivers-toolbar">
                <h3 className="section-title">Incidents</h3>
                <button className="btn-return" onClick={() => setView('drivers')}><span>Return</span><i className="fa fa-reply"></i></button>
              </div>
              <div className="incidents-controls" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '12px 0' }}>
                <div className="search-bar">
                  <i className="fas fa-search"></i>
                  <input type="text" placeholder="Search" value={incidentSearch} onChange={(e) => setIncidentSearch(e.target.value)} />
                </div>
                <div className="incident-tabs">
                  {['All', 'accident', 'delay', 'damage', 'lost_item', 'other'].map((t) => (
                    <button
                      key={t}
                      className={`incident-tab${incidentType === t ? ' active' : ''}`}
                      onClick={() => setIncidentType(t)}
                    >
                      {t === 'All' ? 'All' : t.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <select value={incidentDriverFilter} onChange={(e) => setIncidentDriverFilter(e.target.value)}>
                  <option>All Drivers</option>
                  {incidentDriverNames.map((name) => <option key={name}>{name}</option>)}
                </select>
                <select value={incidentStatusFilter} onChange={(e) => setIncidentStatusFilter(e.target.value)}>
                  <option>All Status</option>
                  <option value="pending">Pending</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <p className="incident-count">Showing {filteredIncidents.length} of {incidents.length}.</p>
              <div className="section-content">
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Driver</th><th>Type</th><th>Severity</th><th>Description</th><th>Status</th></tr></thead>
                  <tbody>
                    {filteredIncidents.map((inc) => (
                      <tr key={inc.incident_id}>
                        <td>{formatDate(inc.reported_at)}</td>
                        <td>{inc.delivery?.driver?.user?.full_name || 'Unassigned'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{inc.incident_type.replace('_', ' ')}</td>
                        <td style={{ textTransform: 'capitalize' }}>{inc.severity}</td>
                        <td>{inc.description || '—'}</td>
                        <td style={{ textTransform: 'capitalize' }}>{inc.status}</td>
                      </tr>
                    ))}
                    {filteredIncidents.length === 0 && (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>No incidents match these filters.</td></tr>
                    )}
                  </tbody>
                </table>
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

      {/* Driver details */}
      {showDetailsModal && detailsDriver && (
        <div className="modal" id="driverDetailsModal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{detailsDriver.user?.full_name}</h2>
              <button className="btn-cancel" onClick={() => setShowDetailsModal(false)}>Close</button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <p><strong>Driver ID:</strong> {driverCode(detailsDriver.driver_id)}</p>
              <p><strong>Phone:</strong> {detailsDriver.user?.phone || '—'}</p>
              <p><strong>Email:</strong> {detailsDriver.user?.email || '—'}</p>
              <p><strong>Status:</strong> {availabilityLabel(detailsDriver)}</p>

              <h4>Personal Information</h4>
              <p><strong>Birthdate:</strong> {formatDate(detailsDriver.birthdate)}</p>
              <p><strong>Nationality:</strong> {detailsDriver.nationality || '—'}</p>

              <h4>License Information</h4>
              <p><strong>License No:</strong> {detailsDriver.license_number || '—'}</p>
              <p><strong>License Type:</strong> {detailsDriver.license_type || '—'}</p>
              <p><strong>Restriction Code:</strong> {detailsDriver.restriction_code || 'None'}</p>
              <p><strong>Date Issued:</strong> {formatDate(detailsDriver.license_date_issued)}</p>
              <p><strong>Expiry Date:</strong> {formatDate(detailsDriver.license_expiry_date)}</p>
              <p><strong>Authorized By:</strong> {detailsDriver.authorized_by || '—'}</p>

              <h4>Health Information</h4>
              <p><strong>Condition:</strong> {detailsDriver.health_condition || '—'}</p>
              <p><strong>Last Medical Check:</strong> {formatDate(detailsDriver.last_medical_check)}</p>
              <p><strong>Prescriptions:</strong> {detailsDriver.prescriptions || 'N/A'}</p>
              <p><strong>Existing Conditions:</strong> {detailsDriver.existing_conditions || 'N/A'}</p>

              <h4>Employment</h4>
              <p><strong>Date Hired:</strong> {formatDate(detailsDriver.date_hired)}</p>
              <p><strong>Hired By:</strong> {detailsDriver.hired_by || '—'}</p>
              <p><strong>Contract:</strong> {formatDate(detailsDriver.contract_start)} – {formatDate(detailsDriver.contract_end)}</p>

              <p style={{ color: '#888', marginTop: 16, fontSize: 13 }}>
                Performance ratings and offense history aren't tracked yet — see the Incidents tab for reported incidents involving this driver.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit driver */}
      {showFormModal && (
        <div
          className="modal driver-form-modal"
          style={{
            display: 'flex',
            position: 'fixed',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
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
              borderRadius: 10,
            }}
          >
            <div className="modal-header driver-form-header" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <h2><i className="fas fa-user-circle"></i> {editingDriver ? 'EDIT DRIVER' : 'ADD NEW DRIVER'}</h2>
              <button className="modal-close" onClick={() => setShowFormModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body driver-form-body" style={{ padding: 20 }}>
              {formError && <div className="form-error" style={{ color: '#d32f2f', marginBottom: 12 }}>{formError}</div>}
              <form className="edit-form" onSubmit={(e) => e.preventDefault()}>
                <div
                  className="driver-form-columns"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}
                >
                  {/* Personal Information */}
                  <div className="form-card">
                    <h4 className="form-section-title">Personal Information</h4>
                    <div className="form-group">
                      <label>First Name</label>
                      <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Middle Name</label>
                      <input type="text" value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Birthdate</label>
                      <input type="date" value={form.birthdate || ''} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Contact Number</label>
                      <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                  </div>

                  {/* License Information */}
                  <div className="form-card">
                    <h4 className="form-section-title">License Information</h4>
                    <div className="form-group">
                      <label>License Number</label>
                      <input type="text" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>License Type</label>
                      <input type="text" value={form.license_type} onChange={(e) => setForm({ ...form, license_type: e.target.value })} />
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
                      <label>Authorized By</label>
                      <input type="text" value={form.authorized_by} onChange={(e) => setForm({ ...form, authorized_by: e.target.value })} />
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
                      <label>Health Condition</label>
                      <input type="text" value={form.health_condition} onChange={(e) => setForm({ ...form, health_condition: e.target.value })} />
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

                <div className="driver-form-columns" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 20, marginTop: 20 }}>
                  {/* Account Information */}
                  <div className="form-card">
                    <h4 className="form-section-title">Account Information</h4>
                    <div className="form-row-inline" style={{ display: 'flex', gap: 10 }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Email</label>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ flex: 1, position: 'relative' }}>
                        <label>Password{!editingDriver && <span className="required">*</span>}</label>
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
                    </div>
                    <div className="form-row-inline" style={{ display: 'flex', gap: 10 }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Username</label>
                        <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ flex: 1, position: 'relative' }}>
                        <label>Confirm Password{!editingDriver && <span className="required">*</span>}</label>
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
                      <label className="checkbox-label">
                        <input type="checkbox" checked={changePassword} onChange={(e) => setChangePassword(e.target.checked)} />
                        <span>Change password</span>
                      </label>
                    )}
                  </div>

                  {/* Profile Picture (UI only — no backend file storage wired yet) */}
                  <div className="form-card">
                    <h4 className="form-section-title">Profile Picture</h4>
                    <div
                      className="upload-box"
                      style={{
                        border: '2px dashed #ccc',
                        borderRadius: 8,
                        padding: 24,
                        textAlign: 'center',
                        color: '#888',
                      }}
                    >
                      <i className="fas fa-cloud-upload-alt" style={{ fontSize: 28 }}></i>
                      <p style={{ margin: '8px 0 0' }}>Upload Driver Photo</p>
                      <p style={{ fontSize: 12, margin: 0 }}>JPG, PNG (Max 10mb)</p>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowFormModal(false)}>Cancel</button>
              <button className="btn-save" onClick={saveDriver} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DriversPage;