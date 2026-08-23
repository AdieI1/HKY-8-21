import { useState, useEffect, useCallback, Fragment } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api-client';

const ACTIVE_STATUSES = [
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

function formatDateTime(dateString) {
  if (!dateString) return { time: '—', date: '—' };
  const d = new Date(dateString);
  if (isNaN(d)) return { time: '—', date: '—' };
  return {
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    date: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
  };
}

function formatMoney(amount) {
  return '₱' + Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

function statusLabel(status) {
  return (status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusClass(status) {
  if (status === 'completed') return 'completed';
  if (status === 'returning_to_hq') return 'returning';
  if (status === 'rejected') return 'overdue';
  if (ACTIVE_STATUSES.includes(status)) return 'pending';
  return 'pending';
}

function OverviewPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminRoleId, setAdminRoleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const [deliveriesView, setDeliveriesView] = useState('recent');
  const [logsView, setLogsView] = useState('recent');
  const [accountsView, setAccountsView] = useState('active');
  const [expandedDeliveryId, setExpandedDeliveryId] = useState(null);
  const [expandedAdminId, setExpandedAdminId] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [addForm, setAddForm] = useState({ full_name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    changePassword: false,
    password: '',
    confirmPassword: '',
  });

  // Live clock for the header date
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
      const [deliveriesRes, logsRes, usersRes, rolesRes] = await Promise.all([
        api.get('/deliveries'),
        api.get('/system-logs'),
        api.get('/users'),
        api.get('/roles'),
      ]);

      setDeliveries(deliveriesRes.data);
      setSystemLogs(logsRes.data);

      const adminRole = rolesRes.data.find((r) => r.role_name?.toLowerCase().includes('admin'));
      setAdminRoleId(adminRole ? adminRole.role_id : null);

      const admins = usersRes.data.filter((u) => u.role?.role_name?.toLowerCase().includes('admin'));
      setAdminUsers(admins);
    } catch (err) {
      setLoadError('Could not load dashboard data. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ----- Derived stats -----
  const totalDeliveries = deliveries.length;
  const activeDeliveries = deliveries.filter((d) => ACTIVE_STATUSES.includes(d.status)).length;
  const totalRevenue = deliveries
    .filter((d) => d.payment_verification === 'approved')
    .reduce((sum, d) => sum + Number(d.trip_cost || 0), 0);

  const activeAdmins = adminUsers.filter((u) => u.status === 'active');
  const deactivatedAdmins = adminUsers.filter((u) => u.status !== 'active');

  const recentDeliveries = [...deliveries]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const recentLogs = [...systemLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

  // ----- Handlers -----
  const toggleDelivery = (id) => setExpandedDeliveryId((prev) => (prev === id ? null : id));
  const toggleAdminProfile = (id) => setExpandedAdminId((prev) => (prev === id ? null : id));

  const openAddModal = () => {
    setAddForm({ full_name: '', email: '', phone: '', password: '', confirmPassword: '' });
    setFormError('');
    setShowAddModal(true);
  };

  const saveNewAdmin = async () => {
    const { full_name, email, phone, password, confirmPassword } = addForm;
    if (!full_name || !email || !phone || !password || !confirmPassword) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('/users', { role_id: adminRoleId, full_name, email, phone, password, status: 'active' });
      setShowAddModal(false);
      await loadData();
    } catch (err) {
      const errors = err.response?.data?.errors;
      setFormError(errors ? Object.values(errors)[0][0] : 'Could not add admin.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setEditForm({
      full_name: admin.full_name,
      email: admin.email,
      phone: admin.phone || '',
      changePassword: false,
      password: '',
      confirmPassword: '',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const saveAdminChanges = async () => {
    if (editForm.changePassword && (!editForm.password || editForm.password !== editForm.confirmPassword)) {
      setFormError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { full_name: editForm.full_name, email: editForm.email, phone: editForm.phone };
      if (editForm.changePassword) payload.password = editForm.password;
      await api.put(`/users/${selectedAdmin.user_id}`, payload);
      setShowEditModal(false);
      await loadData();
    } catch (err) {
      const errors = err.response?.data?.errors;
      setFormError(errors ? Object.values(errors)[0][0] : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const openDeactivateModal = (admin) => {
    setSelectedAdmin(admin);
    setShowDeactivateModal(true);
  };

  const confirmDeactivate = async () => {
    const admin = selectedAdmin;
    try {
      await api.patch(`/users/${admin.user_id}`, { status: 'inactive' });
      setShowDeactivateModal(false);
      await loadData();
      setToast({ message: `${admin.full_name} deactivated.`, undoId: admin.user_id });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setShowDeactivateModal(false);
    }
  };

  const undoDeactivate = async () => {
    if (!toast?.undoId) return;
    try {
      await api.patch(`/users/${toast.undoId}`, { status: 'active' });
      await loadData();
    } finally {
      setToast(null);
    }
  };

  const openRestoreModal = (admin) => {
    setSelectedAdmin(admin);
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    try {
      await api.patch(`/users/${selectedAdmin.user_id}`, { status: 'active' });
      setShowRestoreModal(false);
      await loadData();
    } catch (err) {
      setShowRestoreModal(false);
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
              <li className="active"><Link to="/overview"><i className="fas fa-chart-pie"></i> Overview</Link></li>
              <li><Link to="/requests"><i className="fas fa-clipboard-list"></i> Requests Management</Link></li>
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
          <div className="user-profile">
            <img src="images/brucednegrow.png" alt="Admin" className="user-avatar" />
            <div className="user-info">
              <span className="user-name">{JSON.parse(localStorage.getItem('auth_user') || '{}').full_name || 'Admin'}</span>
              <span className="user-role">Admin <span className="status-online"></span></span>
            </div>
          </div>
          <div className="logout">
            <Link
              to="/"
              onClick={() => {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
              }}
            >
              <i className="fas fa-sign-out-alt"></i> Logout
            </Link>
          </div>
        </div>

        <div className="main-content">
          <header className="header">
            <div className="page-info">
              <span className="breadcrumb">Page/Overview</span>
              <h1 className="page-title">OVERVIEW</h1>
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

          {loadError && (
            <div className="form-error" style={{ margin: '16px 0', color: '#d32f2f' }}>
              {loadError}
            </div>
          )}

          <div className="dashboard-cards">
            <div className="card">
              <div className="card-header"><i className="fas fa-box"></i><span className="card-title">Total Deliveries</span></div>
              <div className="card-content">
                <span className="card-number red">{totalDeliveries}</span>
                <span className="card-subtitle">All-time deliveries.</span>
              </div>
            </div>
            <div className="card card-blue">
              <div className="card-header"><i className="fas fa-truck"></i><span className="card-title">Active Deliveries</span></div>
              <div className="card-content">
                <span className="card-number blue">{activeDeliveries}</span>
                <span className="card-subtitle">Currently in progress.</span>
              </div>
            </div>
            <div className="card card-green">
              <div className="card-header"><i className="fas fa-money-bill-wave"></i><span className="card-title">Total Revenue</span></div>
              <div className="card-content">
                <span className="card-number green">{formatMoney(totalRevenue)}</span>
                <span className="card-subtitle">From verified payments.</span>
              </div>
            </div>
            <div className="card card-blue-light">
              <div className="card-header"><i className="fas fa-user-shield"></i><span className="card-title">Total Admins</span></div>
              <div className="card-content">
                <span className="card-number blue-light">{adminUsers.length}</span>
                <span className="card-subtitle">{activeAdmins.length} Active - {deactivatedAdmins.length} deactivated</span>
              </div>
            </div>
          </div>

          <div className="content-sections">
            <div className="content-row">
              {/* ---------------- Deliveries ---------------- */}
              {deliveriesView === 'recent' ? (
                <div className="content-section recent-deliveries">
                  <div className="section-header">
                    <h3 className="section-title"><i className="fas fa-box"></i> Recent Deliveries</h3>
                    <div className="section-controls">
                      <a href="#" className="view-all" onClick={(e) => { e.preventDefault(); setDeliveriesView('all'); }}>View all</a>
                    </div>
                  </div>
                  <div className="section-content">
                    <table className="data-table">
                      <thead>
                        <tr><th>Delivery ID</th><th>Customer</th><th>Status</th><th>Date</th></tr>
                      </thead>
                      <tbody>
                        {recentDeliveries.map((d) => (
                          <tr key={d.delivery_id}>
                            <td>DLV{String(d.delivery_id).padStart(4, '0')}</td>
                            <td>{d.request?.customer?.full_name || '—'}</td>
                            <td><span className={`status ${statusClass(d.status)}`}>{statusLabel(d.status)}</span></td>
                            <td>{formatDate(d.created_at)}</td>
                          </tr>
                        ))}
                        {loading && (
                          <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading overview...</td></tr>
                        )}
                        {!loading && recentDeliveries.length === 0 && (
                          <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24 }}>No deliveries yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="content-section all-deliveries">
                  <div className="section-header">
                    <h3 className="section-title"><i className="fas fa-box"></i> RECENT DELIVERIES</h3>
                    <button className="btn-return" onClick={() => setDeliveriesView('recent')}>
                      <span>Return</span><i className="fa fa-reply"></i>
                    </button>
                  </div>
                  <div className="section-content">
                    <table className="data-table deliveries-table">
                      <thead>
                        <tr><th>Delivery ID</th><th>Customer</th><th>Status</th><th>Date</th><th>Contact Number</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {deliveries.map((d) => {
                          const id = `DLV${String(d.delivery_id).padStart(4, '0')}`;
                          const isOpen = expandedDeliveryId === d.delivery_id;
                          return (
                            <Fragment key={d.delivery_id}>
                              <tr className="delivery-row" onClick={() => toggleDelivery(d.delivery_id)}>
                                <td>{id}</td>
                                <td>{d.request?.customer?.full_name || '—'}</td>
                                <td><span className={`status ${statusClass(d.status)}`}>{statusLabel(d.status)}</span></td>
                                <td>{formatDate(d.created_at)}</td>
                                <td>{d.request?.customer?.phone || '—'}</td>
                                <td>
                                  <button
                                    className="btn-expand"
                                    onClick={(e) => { e.stopPropagation(); toggleDelivery(d.delivery_id); }}
                                  >
                                    {isOpen ? 'Collapse' : 'Expand'}
                                  </button>
                                </td>
                              </tr>
                              {isOpen && (
                                <tr className="delivery-details-row">
                                  <td colSpan="6">
                                    <div className="delivery-details-panel">
                                      <div className="delivery-info-grid">
                                        <div className="delivery-locations">
                                          <div className="location-item">
                                            <i className="fas fa-map-marker-alt"></i>
                                            <div className="location-info">
                                              <span className="location-label">Pick-up Location:</span>
                                              <span className="location-value">{d.request?.pickup_address || '—'}</span>
                                            </div>
                                          </div>
                                          <div className="location-item">
                                            <i className="fas fa-map-marker-alt"></i>
                                            <div className="location-info">
                                              <span className="location-label">Drop-off Location:</span>
                                              <span className="location-value">{d.request?.dropoff_address || '—'}</span>
                                            </div>
                                          </div>
                                          <div className="distance-info">
                                            <span className="distance-label">Distance:</span>
                                            <span className="distance-value">
                                              {d.request?.distance_km ? `${d.request.distance_km} kilometers` : '—'}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="delivery-meta">
                                          <div className="meta-item">
                                            <span className="meta-label">Driver:</span>
                                            <span className="meta-value">{d.driver?.user?.full_name || 'Unassigned'}</span>
                                          </div>
                                          <div className="meta-item">
                                            <span className="meta-label">Vehicle Used:</span>
                                            <span className="meta-value">
                                              {d.vehicle
                                                ? `${d.vehicle.brand || ''} ${d.vehicle.model || ''} - ${d.vehicle.plate_number}`.trim()
                                                : 'Unassigned'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                        {deliveries.length === 0 && (
                          <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>No deliveries yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- System Logs ---------------- */}
              {logsView === 'recent' ? (
                <div className="content-section system-logs">
                  <div className="section-header">
                    <h3 className="section-title"><i className="fas fa-cog"></i> System Logs</h3>
                    <a href="#" className="view-all" onClick={(e) => { e.preventDefault(); setLogsView('all'); }}>View all</a>
                  </div>
                  <div className="section-content">
                    {recentLogs.map((log) => {
                      const { time } = formatDateTime(log.timestamp);
                      return (
                        <div className="log-entry" key={log.log_id}>
                          <span className="log-time">{time}</span>
                          <span className="log-message">{log.user ? `${log.user.full_name}: ` : ''}{log.action}</span>
                        </div>
                      );
                    })}
                    {recentLogs.length === 0 && <div className="log-entry">No activity yet.</div>}
                  </div>
                </div>
              ) : (
                <div className="content-section all-system-logs">
                  <div className="section-header">
                    <h3 className="section-title"><i className="fas fa-cog"></i> SYSTEM LOGS</h3>
                    <button className="btn-return" onClick={() => setLogsView('recent')}>
                      <span>Return</span><i className="fa fa-reply"></i>
                    </button>
                  </div>
                  <div className="section-content">
                    <table className="data-table logs-table">
                      <thead>
                        <tr><th>Time</th><th>Date</th><th>Description</th><th>Subject</th></tr>
                      </thead>
                      <tbody>
                        {systemLogs.map((log) => {
                          const { time, date } = formatDateTime(log.timestamp);
                          return (
                            <tr key={log.log_id}>
                              <td>{time}</td>
                              <td>{date}</td>
                              <td>{log.action}</td>
                              <td>{log.user?.full_name || 'System'}</td>
                            </tr>
                          );
                        })}
                        {systemLogs.length === 0 && (
                          <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24 }}>No log entries yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- Admin Accounts ---------------- */}
              {accountsView === 'active' ? (
                <div className="content-section admin-accounts">
                  <div className="section-header">
                    <h3 className="section-title"><i className="fas fa-user-cog"></i> Admin Accounts</h3>
                    <div className="section-controls">
                      <button className="btn-view-inactive" onClick={() => setAccountsView('deactivated')}>View Inactive</button>
                      <button className="btn-add-admin" onClick={openAddModal}><i className="fas fa-plus"></i> Add Admin</button>
                    </div>
                  </div>
                  <div className="section-content">
                    <table className="data-table admin-table">
                      <thead>
                        <tr><th>Admin ID</th><th>Name</th><th>Email</th><th>Status</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {activeAdmins.map((admin) => {
                          const adminId = `ADM${String(admin.user_id).padStart(4, '0')}`;
                          const isOpen = expandedAdminId === admin.user_id;
                          return (
                            <Fragment key={admin.user_id}>
                              <tr className="admin-row" onClick={() => toggleAdminProfile(admin.user_id)}>
                                <td><img src="images/caret-arrow-down.png" className={`caret-arrow${isOpen ? ' arrow-up' : ''}`} alt="" /> {adminId}</td>
                                <td>{admin.full_name}</td>
                                <td>{admin.email}</td>
                                <td><span className="status-badge active"><i className="fas fa-circle"></i> Active</span></td>
                                <td className="action-cell">
                                  <button className="btn-edit" type="button" onClick={(e) => { e.stopPropagation(); openEditModal(admin); }}>
                                    <i className="fas fa-pen"></i> Edit
                                  </button>
                                  <button className="btn-deactivate" type="button" onClick={(e) => { e.stopPropagation(); openDeactivateModal(admin); }}>
                                    Deactivate
                                  </button>
                                </td>
                              </tr>
                              {isOpen && (
                                <tr className="admin-profile-row">
                                  <td colSpan="5">
                                    <div className="admin-profile-panel">
                                      <div className="profile-header"><h4><i className="fas fa-user-cog"></i> Admin Profile:</h4></div>
                                      <div className="profile-content">
                                        <div className="profile-details">
                                          <div className="profile-item"><i className="fas fa-user"></i><span className="label">Full Name:</span><span className="value">{admin.full_name}</span></div>
                                          <div className="profile-item"><i className="fas fa-envelope"></i><span className="label">Email Address:</span><span className="value">{admin.email}</span></div>
                                          <div className="profile-item"><i className="fas fa-phone"></i><span className="label">Phone Number:</span><span className="value">{admin.phone || 'N/A'}</span></div>
                                          <div className="profile-item"><i className="fas fa-calendar"></i><span className="label">Date Created:</span><span className="value">{formatDate(admin.created_at)}</span></div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                        {activeAdmins.length === 0 && (
                          <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24 }}>No active admins.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="content-section deactivated-accounts">
                  <div className="section-header">
                    <h3 className="section-title"><i className="fas fa-user-cog"></i> Deactivated Admin Accounts</h3>
                    <button className="btn-return" onClick={() => setAccountsView('active')}>
                      <span>Return</span><i className="fa fa-reply"></i>
                    </button>
                  </div>
                  <div className="section-content">
                    <table className="data-table admin-table">
                      <thead>
                        <tr><th>Admin ID</th><th>Name</th><th>Email</th><th>Status</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {deactivatedAdmins.map((admin) => (
                          <tr key={admin.user_id} className="admin-row">
                            <td>ADM{String(admin.user_id).padStart(4, '0')}</td>
                            <td>{admin.full_name}</td>
                            <td>{admin.email}</td>
                            <td><span className="status-badge inactive"><i className="fas fa-circle"></i> Inactive</span></td>
                            <td className="action-cell">
                              <button className="btn-restore" type="button" onClick={() => openRestoreModal(admin)}>
                                <i className="fas fa-undo"></i> Restore
                              </button>
                            </td>
                          </tr>
                        ))}
                        {deactivatedAdmins.length === 0 && (
                          <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24 }}>No deactivated accounts.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-notification show">
          <div className="toast-content">
            <span className="toast-message"><i className="fas fa-check-circle"></i> {toast.message}</span>
            <button className="btn-undo" onClick={undoDeactivate}><i className="fa fa-undo"></i> Undo</button>
          </div>
        </div>
      )}

      {/* Deactivate confirmation */}
      {showDeactivateModal && (
        <div className="modal deactivate-modal" style={{ display: 'block' }}>
          <div className="modal-content deactivate-content">
            <div className="deactivate-body">
              <div className="deactivate-header">
                <div className="deactivate-icon"><i className="fas fa-trash-alt"></i></div>
                <h3>Deactivate Admin Account</h3>
              </div>
              <p>Are you sure you want to deactivate admin <span className="admin-name-highlight">{selectedAdmin?.full_name}</span>? The account will be moved to Inactive Accounts.</p>
              <div className="deactivate-actions">
                <button className="btn-cancel-deactivate" onClick={() => setShowDeactivateModal(false)}>Cancel</button>
                <button className="btn-confirm-deactivate" onClick={confirmDeactivate}>Deactivate</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore confirmation */}
      {showRestoreModal && (
        <div className="modal restore-modal" style={{ display: 'block' }}>
          <div className="modal-content restore-content">
            <div className="restore-body">
              <div className="restore-header"><div className="restore-icon"><i className="fas fa-user-check"></i></div><h3>Restore Admin Account</h3></div>
              <p>Are you sure you want to restore admin <span className="admin-name-highlight">{selectedAdmin?.full_name}</span>? The account will be moved back to Active Accounts.</p>
              <div className="restore-actions">
                <button className="btn-cancel-restore" onClick={() => setShowRestoreModal(false)}>Cancel</button>
                <button className="btn-confirm-restore" onClick={confirmRestore}>Restore</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit admin */}
      {showEditModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-header"><h2>Edit Admin Information</h2></div>
            <div className="modal-body">
              {formError && <div className="form-error" style={{ color: '#d32f2f', marginBottom: 12 }}>{formError}</div>}
              <form className="edit-form" onSubmit={(e) => e.preventDefault()}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name<span className="required">*</span></label>
                    <input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address<span className="required">*</span></label>
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number<span className="required">*</span></label>
                    <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                </div>
                <div className="password-section">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={editForm.changePassword} onChange={(e) => setEditForm({ ...editForm, changePassword: e.target.checked })} />
                    <span>Change password</span>
                  </label>
                  {editForm.changePassword && (
                    <div className="password-fields show">
                      <div className="form-row">
                        <div className="form-group password-group">
                          <label>New password</label>
                          <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                        </div>
                        <div className="form-group password-group">
                          <label>Confirm password</label>
                          <input type="password" value={editForm.confirmPassword} onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="password-hint">Leave unchecked to keep the current password.</p>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-save" onClick={saveAdminChanges} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add admin */}
      {showAddModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-header"><h2>Add new Admin</h2></div>
            <div className="modal-body">
              {formError && <div className="form-error" style={{ color: '#d32f2f', marginBottom: 12 }}>{formError}</div>}
              <form className="edit-form" onSubmit={(e) => e.preventDefault()}>
                <h4 className="form-section-title">Account Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name<span className="required">*</span></label>
                    <input type="text" value={addForm.full_name} onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address<span className="required">*</span></label>
                    <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number<span className="required">*</span></label>
                    <input type="text" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
                  </div>
                </div>
                <h4 className="form-section-title">Security</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>New password<span className="required">*</span></label>
                    <input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Confirm password<span className="required">*</span></label>
                    <input type="password" value={addForm.confirmPassword} onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })} />
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-save" onClick={saveNewAdmin} disabled={saving}>{saving ? 'Adding...' : 'Add Admin'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default OverviewPage;