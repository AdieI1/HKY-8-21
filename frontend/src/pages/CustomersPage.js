import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api-client';

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function formatMoney(amount) {
  return '₱' + Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

function customerCode(id) {
  return `CMR${String(id).padStart(3, '0')}`;
}

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('az');
  const [showBlacklistedOnly, setShowBlacklistedOnly] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { customer, nextStatus }
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
      const [usersRes, deliveriesRes] = await Promise.all([api.get('/users'), api.get('/deliveries')]);
      const onlyCustomers = usersRes.data.filter((u) => u.role?.role_name?.toLowerCase().includes('customer'));
      setCustomers(onlyCustomers);
      setDeliveries(deliveriesRes.data);
    } catch (err) {
      setLoadError('Could not load customer data. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Spend is computed from real deliveries tied to this customer's requests,
  // counting only payments that were actually verified — not stored/faked.
  const spendFor = useCallback(
    (customerId) =>
      deliveries
        .filter((d) => d.request?.customer_id === customerId && d.payment_verification === 'approved')
        .reduce((sum, d) => sum + Number(d.trip_cost || 0), 0),
    [deliveries]
  );

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === 'active').length;
    const blacklisted = customers.filter((c) => c.status === 'blocked').length;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newThisWeek = customers.filter((c) => new Date(c.created_at) >= oneWeekAgo).length;
    return {
      total,
      active,
      blacklisted,
      newThisWeek,
      activePct: total ? ((active / total) * 100).toFixed(1) : '0.0',
      blacklistedPct: total ? ((blacklisted / total) * 100).toFixed(1) : '0.0',
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let list = [...customers];
    if (showBlacklistedOnly) {
      list = list.filter((c) => c.status === 'blocked');
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((c) => `${c.full_name} ${c.phone || ''} ${c.email}`.toLowerCase().includes(term));
    }
    if (sortBy === 'az') {
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (sortBy === 'spend') {
      list.sort((a, b) => spendFor(b.user_id) - spendFor(a.user_id));
    } else if (sortBy === 'date') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'id') {
      list.sort((a, b) => a.user_id - b.user_id);
    }
    return list;
  }, [customers, search, sortBy, showBlacklistedOnly, spendFor]);

  const openConfirm = (customer) => {
    const nextStatus = customer.status === 'blocked' ? 'active' : 'blocked';
    setConfirmAction({ customer, nextStatus });
    setShowConfirmModal(true);
  };

  const confirmToggleStatus = async () => {
    const { customer, nextStatus } = confirmAction;
    try {
      await api.patch(`/users/${customer.user_id}`, { status: nextStatus });
      setShowConfirmModal(false);
      await loadData();
      setToast({
        message: `${customer.full_name} ${nextStatus === 'blocked' ? 'blacklisted' : 'restored'}.`,
        undoId: customer.user_id,
        undoStatus: customer.status,
      });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setShowConfirmModal(false);
    }
  };

  const undoToggle = async () => {
    if (!toast?.undoId) return;
    try {
      await api.patch(`/users/${toast.undoId}`, { status: toast.undoStatus });
      await loadData();
    } finally {
      setToast(null);
    }
  };

  const exportCsv = () => {
    const rows = [['Customer ID', 'Name', 'Contact Number', 'Date Joined', 'Cumulative Spend', 'Status']];
    filteredCustomers.forEach((c) => {
      rows.push([
        customerCode(c.user_id),
        c.full_name,
        c.phone || '',
        formatDate(c.created_at),
        spendFor(c.user_id),
        c.status,
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
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
              <li><Link to="/vehicles"><i className="fas fa-truck"></i> Vehicles</Link></li>
              <li className="nav-group">
                <span className="nav-group-label"><i className="fas fa-boxes"></i> Inventory</span>
                <ul className="nav-submenu">
                  <li><Link to="/fuel-inventory"><i className="fas fa-gas-pump"></i> Fuel Inventory</Link></li>
                  <li><Link to="/parts-inventory"><i className="fas fa-tools"></i> Parts Inventory</Link></li>
                </ul>
              </li>
              <li><Link to="/analytics"><i className="fas fa-chart-bar"></i> Analytics</Link></li>
              <li className="active"><Link to="/customers"><i className="fas fa-users"></i> Customers</Link></li>
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
              <span className="breadcrumb">Page/Customers</span>
              <h1 className="page-title">CUSTOMERS</h1>
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

          <section className="stats-grid">
            <article className="stat-card">
              <div className="stat-top">
                <span className="metric-icon blue"><i className="fas fa-users"></i></span>
                <h2>{stats.total}</h2>
              </div>
              <h3>Total Customers</h3>
              <p className="trend up">+{stats.newThisWeek} this week</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="metric-icon green"><i className="fas fa-user-check"></i></span>
                <h2>{stats.active}</h2>
              </div>
              <h3>Active Customers</h3>
              <p className="trend up">{stats.activePct}% active customers</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="metric-icon red"><i className="fas fa-user-slash"></i></span>
                <h2>{stats.blacklisted}</h2>
              </div>
              <h3>Blacklisted Customers</h3>
              <p className="trend down">{stats.blacklistedPct}% blacklisted</p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="metric-icon lime"><i className="fas fa-user-plus"></i></span>
                <h2>{stats.newThisWeek}</h2>
              </div>
              <h3>New Customers</h3>
              <p className="trend up">+{stats.newThisWeek} this week</p>
            </article>
          </section>

          <section className="table-panel">
            <div className="table-toolbar">
              <div className="search-box">
                <i className="fas fa-search"></i>
                <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="table-actions">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-btn">
                  <option value="az">A-Z</option>
                  <option value="spend">Cumulative Spend</option>
                  <option value="date">Date Joined</option>
                  <option value="id">Customer ID</option>
                </select>
                <button
                  className={`blacklist-btn${showBlacklistedOnly ? ' active' : ''}`}
                  onClick={() => setShowBlacklistedOnly((v) => !v)}
                >
                  {showBlacklistedOnly ? 'Show All' : 'Blacklisted'}
                </button>
                <button className="export-btn" onClick={exportCsv}><i className="fas fa-upload"></i> Export</button>
              </div>
            </div>

            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>Contact Num</th>
                  <th>Date Joined</th>
                  <th>Cumulative Spend</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.user_id}>
                    <td>{customerCode(c.user_id)}</td>
                    <td>{c.full_name}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{formatDate(c.created_at)}</td>
                    <td className="amount">{formatMoney(spendFor(c.user_id))}</td>
                    <td>
                      <span className={`status-pill${c.status === 'blocked' ? ' blocked' : ''}`}>
                        <i className="fas fa-circle"></i> {c.status === 'blocked' ? 'Blacklisted' : c.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className={c.status === 'blocked' ? 'btn-edit' : 'btn-danger'} onClick={() => openConfirm(c)}>
                        {c.status === 'blocked' ? 'Restore' : 'Blacklist'}
                      </button>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading customers...</td></tr>
                )}
                {!loading && filteredCustomers.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24 }}>No customers found.</td></tr>
                )}
              </tbody>
            </table>

            <div className="table-footer">
              <p>Showing {filteredCustomers.length} of {customers.length} customers.</p>
            </div>
          </section>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-notification show">
          <div className="toast-content">
            <span className="toast-message"><i className="fas fa-check-circle"></i> {toast.message}</span>
            <button className="btn-undo" onClick={undoToggle}><i className="fa fa-undo"></i> Undo</button>
          </div>
        </div>
      )}

      {/* Blacklist / restore confirmation */}
      {showConfirmModal && confirmAction && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-body" style={{ padding: 24 }}>
              <h3>{confirmAction.nextStatus === 'blocked' ? 'Blacklist Customer' : 'Restore Customer'}</h3>
              <p>
                Are you sure you want to {confirmAction.nextStatus === 'blocked' ? 'blacklist' : 'restore'}{' '}
                <strong>{confirmAction.customer.full_name}</strong>?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button className="btn-save" onClick={confirmToggleStatus}>
                {confirmAction.nextStatus === 'blocked' ? 'Blacklist' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CustomersPage;