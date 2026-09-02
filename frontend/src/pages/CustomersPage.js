import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import NotificationBell from '../components/NotificationBell';

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

function CustomerDetailModal({ customer, spend, deliveries, onClose, onEdit, onToggleBlacklist }) {
  if (!customer) return null;
  const customerDeliveries = (deliveries || []).filter(
    (d) => (d.request?.customer_id === customer.user_id || d.request?.customer?.user_id === customer.user_id)
  );
  const completedDeliveries = customerDeliveries.filter((d) => d.status === 'completed');
  const isBlocked = customer.status === 'blocked';

  return (
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
          maxWidth: 780,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#1e293b',
            color: '#ffffff',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src={customer.profile_photo_url || '/images/brucednegrow.png'}
              alt={customer.full_name}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.2)',
                background: '#334155',
              }}
              onError={(e) => { e.currentTarget.src = '/images/brucednegrow.png'; }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>{customer.full_name}</h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: isBlocked ? '#fee2e2' : '#dcfce7',
                    color: isBlocked ? '#dc2626' : '#16a34a',
                  }}
                >
                  {isBlocked ? 'Blacklisted' : 'Active Customer'}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Customer Code: <strong style={{ color: '#60a5fa' }}>{customerCode(customer.user_id)}</strong> • Registered {formatDate(customer.created_at)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Quick Metrics (3 Cards) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block' }}>
                Cumulative Spend
              </span>
              <strong style={{ fontSize: 20, color: '#16a34a', display: 'block', marginTop: 4 }}>
                {formatMoney(spend)}
              </strong>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Verified payments</span>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block' }}>
                Total Bookings
              </span>
              <strong style={{ fontSize: 20, color: '#2563eb', display: 'block', marginTop: 4 }}>
                {customerDeliveries.length} Requests
              </strong>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>All time bookings</span>
            </div>

            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block' }}>
                Completed Deliveries
              </span>
              <strong style={{ fontSize: 20, color: '#0f172a', display: 'block', marginTop: 4 }}>
                {completedDeliveries.length} Trips
              </strong>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Successfully fulfilled</span>
            </div>
          </div>

          {/* Customer Personal & Contact Profile */}
          <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
            <i className="fas fa-id-card" style={{ color: '#3b82f6', marginRight: 6 }}></i> Contact &amp; Profile Details
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div>
              <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Full Name:</strong> {customer.full_name}</p>
              <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Email:</strong> {customer.email || '—'}</p>
              <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Contact Number:</strong> {customer.phone || '—'}</p>
            </div>
            <div>
              <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Gender:</strong> {customer.gender || 'Not specified'}</p>
              <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Date of Birth:</strong> {customer.date_of_birth ? formatDate(customer.date_of_birth) : 'Not specified'}</p>
              <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Account Status:</strong> <span style={{ textTransform: 'capitalize', fontWeight: 700, color: isBlocked ? '#dc2626' : '#16a34a' }}>{customer.status}</span></p>
            </div>
          </div>

          {/* Delivery & Transport History Table */}
          <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><i className="fas fa-truck" style={{ color: '#10b981', marginRight: 6 }}></i> Delivery &amp; Transport History</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{customerDeliveries.length} Records</span>
          </h4>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px' }}>Trip ID</th>
                  <th style={{ padding: '8px 12px' }}>Route (Pickup → Dropoff)</th>
                  <th style={{ padding: '8px 12px' }}>Driver / Vehicle</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {customerDeliveries.map((d) => (
                  <tr key={d.delivery_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#2563eb' }}>{`DLV${String(d.delivery_id).padStart(4, '0')}`}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${d.request?.pickup_address} → ${d.request?.dropoff_address}`}>
                        {d.request?.pickup_address?.split(',')[0]} → {d.request?.dropoff_address?.split(',')[0]}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {d.driver?.user?.full_name || 'Unassigned'} • {d.vehicle?.model || '—'}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: d.status === 'completed' ? '#dcfce7' : d.status === 'assigned' ? '#dbeafe' : '#f1f5f9',
                        color: d.status === 'completed' ? '#16a34a' : d.status === 'assigned' ? '#2563eb' : '#475569',
                      }}>
                        {d.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      {formatMoney(d.trip_cost)}
                    </td>
                  </tr>
                ))}
                {customerDeliveries.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                      No delivery requests recorded for this customer yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { onClose(); onEdit(customer); }}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#1e293b',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fas fa-user-edit"></i> Edit Info
            </button>
            <button
              onClick={() => { onClose(); onToggleBlacklist(customer); }}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: isBlocked ? '#16a34a' : '#dc2626',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className={isBlocked ? 'fas fa-user-check' : 'fas fa-user-slash'}></i>
              {isBlocked ? 'Restore Customer' : 'Blacklist Customer'}
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
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
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Blacklist / restore confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { customer, nextStatus }
  const [toast, setToast] = useState(null);

  // Edit Customer Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    status: 'active',
    gender: '',
    date_of_birth: '',
  });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [editError, setEditError] = useState('');

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

  const spendFor = useCallback(
    (customerId) =>
      deliveries
        .filter((d) => (d.request?.customer_id === customerId || d.request?.customer?.user_id === customerId) && d.payment_verification === 'approved')
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
  }, [customers, showBlacklistedOnly, search, sortBy, spendFor]);

  const openConfirm = (customer) => {
    const nextStatus = customer.status === 'blocked' ? 'active' : 'blocked';
    setConfirmAction({ customer, nextStatus });
    setShowConfirmModal(true);
  };

  const confirmToggleStatus = async () => {
    if (!confirmAction) return;
    const { customer, nextStatus } = confirmAction;
    try {
      await api.put(`/users/${customer.user_id}`, { status: nextStatus });
      setCustomers((prev) => prev.map((c) => (c.user_id === customer.user_id ? { ...c, status: nextStatus } : c)));
      setShowConfirmModal(false);
      const actionName = nextStatus === 'blocked' ? 'blacklisted' : 'restored';
      setToast({
        message: `${customer.full_name} has been ${actionName}.`,
        undoId: customer.user_id,
        prevStatus: customer.status,
      });
      setTimeout(() => setToast(null), 5000);
    } catch {
      alert('Could not update customer status.');
    }
  };

  const undoToggle = async () => {
    if (!toast || !toast.undoId) return;
    try {
      await api.put(`/users/${toast.undoId}`, { status: toast.prevStatus });
      setCustomers((prev) =>
        prev.map((c) => (c.user_id === toast.undoId ? { ...c, status: toast.prevStatus } : c))
      );
      setToast(null);
    } catch {
      alert('Could not undo action.');
    }
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setEditForm({
      full_name: customer.full_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      status: customer.status || 'active',
      gender: customer.gender || '',
      date_of_birth: customer.date_of_birth || '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setSavingCustomer(true);
    setEditError('');
    try {
      const res = await api.put(`/users/${editingCustomer.user_id}`, editForm);
      setCustomers((prev) =>
        prev.map((c) => (c.user_id === editingCustomer.user_id ? { ...c, ...res.data.user || res.data } : c))
      );
      if (selectedCustomer && selectedCustomer.user_id === editingCustomer.user_id) {
        setSelectedCustomer((prev) => ({ ...prev, ...res.data.user || res.data }));
      }
      setShowEditModal(false);
      setToast({ message: `Customer information for ${editForm.full_name} updated successfully.` });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update customer.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const exportCsv = () => {
    const headers = ['Customer ID', 'Name', 'Phone', 'Email', 'Date Joined', 'Cumulative Spend (PHP)', 'Status'];
    const rows = [headers];
    filteredCustomers.forEach((c) => {
      rows.push([
        customerCode(c.user_id),
        c.full_name,
        c.phone || '',
        c.email || '',
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
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          spend={spendFor(selectedCustomer.user_id)}
          deliveries={deliveries}
          onClose={() => setSelectedCustomer(null)}
          onEdit={openEditModal}
          onToggleBlacklist={openConfirm}
        />
      )}

      <div className="dashboard-container">
        <Sidebar activePage="customers" />

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
              <NotificationBell />
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
                <input type="text" placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <th>Email</th>
                  <th>Date Joined</th>
                  <th>Cumulative Spend</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.user_id}
                    className="clickable-customer-row"
                    onClick={() => setSelectedCustomer(c)}
                    title="Click to view full customer details & trip history"
                  >
                    <td style={{ fontWeight: 700, color: '#3b82f6' }}>{customerCode(c.user_id)}</td>
                    <td style={{ fontWeight: 600 }}>{c.full_name}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td>{formatDate(c.created_at)}</td>
                    <td className="amount">{formatMoney(spendFor(c.user_id))}</td>
                    <td>
                      <span className={`status-pill${c.status === 'blocked' ? ' blocked' : ''}`}>
                        <i className="fas fa-circle"></i> {c.status === 'blocked' ? 'Blacklisted' : c.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          className="btn-edit"
                          onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}
                          style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                        >
                          View
                        </button>
                        <button
                          className="btn-edit"
                          onClick={(e) => { e.stopPropagation(); openEditModal(c); }}
                          style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700 }}
                        >
                          Edit Info
                        </button>
                        <button
                          className={c.status === 'blocked' ? 'btn-edit' : 'btn-danger'}
                          onClick={(e) => { e.stopPropagation(); openConfirm(c); }}
                          style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700 }}
                        >
                          {c.status === 'blocked' ? 'Restore' : 'Blacklist'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading customers...</td></tr>
                )}
                {!loading && filteredCustomers.length === 0 && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24 }}>No customers found.</td></tr>
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
            {toast.undoId && <button className="btn-undo" onClick={undoToggle}><i className="fa fa-undo"></i> Undo</button>}
          </div>
        </div>
      )}

      {/* Blacklist / restore confirmation */}
      {showConfirmModal && confirmAction && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content" style={{ maxWidth: 450, borderRadius: 10 }}>
            <div className="modal-body" style={{ padding: 24 }}>
              <h3>{confirmAction.nextStatus === 'blocked' ? 'Blacklist Customer' : 'Restore Customer'}</h3>
              <p>
                Are you sure you want to {confirmAction.nextStatus === 'blocked' ? 'blacklist' : 'restore'}{' '}
                <strong>{confirmAction.customer.full_name}</strong>?
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 24px' }}>
              <button className="btn-cancel" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button className="btn-save" onClick={confirmToggleStatus}>
                {confirmAction.nextStatus === 'blocked' ? 'Blacklist' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT CUSTOMER INFO MODAL (REQUIREMENT 18)                                 */}
      {/* ========================================================================= */}
      {showEditModal && editingCustomer && (
        <div
          className="modal"
          style={{
            display: 'flex',
            position: 'fixed',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1100,
            padding: 16,
          }}
        >
          <div
            className="modal-content"
            style={{
              width: '100%',
              maxWidth: 500,
              background: '#ffffff',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                background: '#1e293b',
                color: '#fff',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}><i className="fas fa-user-edit"></i> EDIT CUSTOMER INFO</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}><i className="fas fa-times"></i></button>
            </div>

            <form onSubmit={handleSaveCustomer} style={{ padding: 24 }}>
              {editError && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{editError}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blocked">Blocked / Blacklisted</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Gender
                    </label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Optional --</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  style={{ padding: '8px 22px', borderRadius: 6, border: 'none', background: '#d32f2f', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  {savingCustomer ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default CustomersPage;