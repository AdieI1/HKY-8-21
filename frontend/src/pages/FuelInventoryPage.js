import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api-client';

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fuelStatus(fuel) {
  const stock = Number(fuel.current_stock);
  if (stock <= 0) return { label: 'Empty', cls: 'empty' };
  if (stock <= Number(fuel.reorder_level)) return { label: 'Low Stock', cls: 'low' };
  return { label: 'Normal', cls: 'normal' };
}

const EMPTY_RECEIVE_FORM = { fuel_type: '', supplier_name: '', unit_price: '', liters: '', unit: 'Liters', reorder_level: '' };
const EMPTY_ISSUE_FORM = { vehicle_id: '', driver_id: '', liters: '', purpose: '' };

function FuelInventoryPage() {
  const [fuels, setFuels] = useState([]);
  const [issuances, setIssuances] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('type');
  const [historyTab, setHistoryTab] = useState('month');
  const [chartFuelType, setChartFuelType] = useState('');

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState(null);
  const [receiveForm, setReceiveForm] = useState(EMPTY_RECEIVE_FORM);

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueTarget, setIssueTarget] = useState(null);
  const [issueForm, setIssueForm] = useState(EMPTY_ISSUE_FORM);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ supplier_name: '', unit_price: '', reorder_level: '' });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

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
      const [fuelsRes, issuancesRes, vehiclesRes, driversRes] = await Promise.all([
        api.get('/fuel-inventory'),
        api.get('/fuel-issuances'),
        api.get('/vehicles'),
        api.get('/drivers'),
      ]);
      setFuels(fuelsRes.data);
      setIssuances(issuancesRes.data);
      setVehicles(vehiclesRes.data);
      setDrivers(driversRes.data);
      setChartFuelType((prev) => prev || (fuelsRes.data[0]?.fuel_type || ''));
    } catch (err) {
      setLoadError('Could not load fuel inventory. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const findStock = (typeMatch) =>
      fuels.filter((f) => f.fuel_type.toLowerCase().includes(typeMatch)).reduce((s, f) => s + Number(f.current_stock), 0);

    const dieselStock =
      findStock('diesel') -
      fuels.filter((f) => f.fuel_type.toLowerCase().includes('premium')).reduce((s, f) => s + Number(f.current_stock), 0);
    const gasolineStock = findStock('gasoline');

    const now = new Date();
    const issuedThisMonth = issuances
      .filter((i) => {
        const d = new Date(i.issued_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, i) => s + Number(i.liters), 0);

    const lowStockCount = fuels.filter((f) => fuelStatus(f).cls !== 'normal').length;

    return { dieselStock, gasolineStock, issuedThisMonth, lowStockCount };
  }, [fuels, issuances]);

  const filteredFuels = useMemo(() => {
    let list = [...fuels];
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((f) => `${f.fuel_type} ${f.supplier_name || ''}`.toLowerCase().includes(term));
    }
    if (sortBy === 'type') list.sort((a, b) => a.fuel_type.localeCompare(b.fuel_type));
    if (sortBy === 'stock') list.sort((a, b) => Number(b.current_stock) - Number(a.current_stock));
    if (sortBy === 'price') list.sort((a, b) => Number(b.unit_price) - Number(a.unit_price));
    return list;
  }, [fuels, search, sortBy]);

  const filteredHistory = useMemo(() => {
    if (historyTab === 'all') return issuances;
    const now = new Date();
    return issuances.filter((i) => {
      const d = new Date(i.issued_at);
      if (historyTab === 'today') return d.toDateString() === now.toDateString();
      if (historyTab === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
      }
      if (historyTab === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [issuances, historyTab]);

  const chartData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const totals = new Array(daysInMonth).fill(0);
    issuances
      .filter((i) => i.fuel?.fuel_type === chartFuelType)
      .forEach((i) => {
        const d = new Date(i.issued_at);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          totals[d.getDate() - 1] += Number(i.liters);
        }
      });
    return totals;
  }, [issuances, chartFuelType]);

  const chartPoints = useMemo(() => {
    const max = Math.max(1, ...chartData);
    const width = 450;
    const height = 160;
    const stepX = width / (chartData.length - 1 || 1);
    return chartData.map((v, i) => `${40 + i * stepX},${180 - (v / max) * height}`).join(' ');
  }, [chartData]);

  const openReceiveModal = (fuel) => {
    setReceiveTarget(fuel || null);
    setReceiveForm(
      fuel
        ? { fuel_type: fuel.fuel_type, supplier_name: fuel.supplier_name || '', unit_price: fuel.unit_price, liters: '', unit: fuel.unit, reorder_level: fuel.reorder_level }
        : EMPTY_RECEIVE_FORM
    );
    setFormError('');
    setShowReceiveModal(true);
  };

  const submitReceive = async () => {
    if (!receiveForm.fuel_type || !receiveForm.liters) {
      setFormError('Fuel type and liters received are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (receiveTarget) {
        await api.post(`/fuel-inventory/${receiveTarget.fuel_id}/receive`, {
          liters: receiveForm.liters,
          supplier_name: receiveForm.supplier_name,
          unit_price: receiveForm.unit_price,
        });
      } else {
        await api.post('/fuel-inventory', {
          fuel_type: receiveForm.fuel_type,
          supplier_name: receiveForm.supplier_name,
          current_stock: receiveForm.liters,
          unit: receiveForm.unit,
          unit_price: receiveForm.unit_price,
          reorder_level: receiveForm.reorder_level || 500,
          last_delivery_date: new Date().toISOString().slice(0, 10),
        });
      }
      setShowReceiveModal(false);
      await loadData();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      setFormError(errors ? Object.values(errors)[0][0] : message || 'Could not save.');
      console.error(err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  const openIssueModal = (fuel) => {
    setIssueTarget(fuel);
    setIssueForm(EMPTY_ISSUE_FORM);
    setFormError('');
    setShowIssueModal(true);
  };

  const submitIssue = async () => {
    if (!issueForm.liters) {
      setFormError('Liters is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post(`/fuel-inventory/${issueTarget.fuel_id}/issue`, issueForm);
      setShowIssueModal(false);
      await loadData();
    } catch (err) {
      const message = err.response?.data?.message;
      setFormError(message || 'Could not issue fuel.');
      console.error(err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (fuel) => {
    setEditTarget(fuel);
    setEditForm({ supplier_name: fuel.supplier_name || '', unit_price: fuel.unit_price, reorder_level: fuel.reorder_level });
    setFormError('');
    setShowEditModal(true);
  };

  const submitEdit = async () => {
    setSaving(true);
    setFormError('');
    try {
      await api.put(`/fuel-inventory/${editTarget.fuel_id}`, editForm);
      setShowEditModal(false);
      await loadData();
    } catch (err) {
      setFormError('Could not save changes.');
      console.error(err.response?.data || err);
    } finally {
      setSaving(false);
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
              <li><Link to="/vehicles"><i className="fas fa-truck"></i> Vehicles</Link></li>
              <li className="nav-group expanded active">
                <span className="nav-group-label"><i className="fas fa-boxes"></i> Inventory</span>
                <ul className="nav-submenu">
                  <li className="active"><Link to="/fuel-inventory"><i className="fas fa-gas-pump"></i> Fuel Inventory</Link></li>
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
              <span className="breadcrumb">Page / Inventory / Fuel Inventory</span>
              <h1 className="page-title">FUEL INVENTORY MANAGEMENT</h1>
              <p className="page-subtitle">Manage fuel stock, deliveries and issuances.</p>
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

          <section className="fuel-stats-grid">
            <article className="fuel-stat-card">
              <div className="fuel-stat-top">
                <span className="fuel-metric-icon green"><i className="fas fa-gas-pump"></i></span>
                <strong>{stats.dieselStock.toLocaleString()} L</strong>
              </div>
              <h3>Diesel Stock</h3>
              <p>Total Available</p>
            </article>
            <article className="fuel-stat-card">
              <div className="fuel-stat-top">
                <span className="fuel-metric-icon blue"><i className="fas fa-gas-pump"></i></span>
                <strong>{stats.gasolineStock.toLocaleString()} L</strong>
              </div>
              <h3>Gasoline Stock</h3>
              <p>Total Available</p>
            </article>
            <article className="fuel-stat-card">
              <div className="fuel-stat-top">
                <span className="fuel-metric-icon orange"><i className="fas fa-tint"></i></span>
                <strong>{stats.issuedThisMonth.toLocaleString()} L</strong>
              </div>
              <h3>Fuel Issued</h3>
              <p>This Month</p>
            </article>
            <article className="fuel-stat-card">
              <div className="fuel-stat-top">
                <span className="fuel-metric-icon red"><i className="fas fa-exclamation-triangle"></i></span>
                <strong>{stats.lowStockCount}</strong>
              </div>
              <h3>Low Stock Alert</h3>
              <p>Fuel Type</p>
            </article>
          </section>

          <div className="content-section fuel-inventory-section">
            <div className="fuel-toolbar">
              <div className="fuel-toolbar-left">
                <div className="search-bar">
                  <i className="fas fa-search"></i>
                  <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="sort-dropdown">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ border: 'none', background: 'transparent' }}>
                    <option value="type">Sort: Fuel Type</option>
                    <option value="stock">Sort: Current Stock</option>
                    <option value="price">Sort: Unit Price</option>
                  </select>
                </div>
              </div>
              <div className="fuel-toolbar-right">
                <button className="btn-receive-fuel" type="button" onClick={() => openReceiveModal(null)}>
                  <i className="fas fa-plus"></i> Receive Fuel
                </button>
              </div>
            </div>

            <div className="section-content">
              <table className="data-table fuel-inventory-table">
                <thead>
                  <tr>
                    <th>Fuel Type</th>
                    <th>Supplier</th>
                    <th>Current Stock</th>
                    <th>Unit</th>
                    <th>Unit Price (₱)</th>
                    <th>Last Delivery</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFuels.map((fuel) => {
                    const status = fuelStatus(fuel);
                    return (
                      <tr className="fuel-row" key={fuel.fuel_id}>
                        <td className="fuel-type">{fuel.fuel_type}</td>
                        <td>{fuel.supplier_name || '—'}</td>
                        <td>{Number(fuel.current_stock).toLocaleString()}</td>
                        <td>{fuel.unit}</td>
                        <td>₱{Number(fuel.unit_price).toFixed(2)}</td>
                        <td>{formatDate(fuel.last_delivery_date)}</td>
                        <td><span className={`fuel-status ${status.cls}`}><i className="fas fa-circle"></i> {status.label}</span></td>
                        <td className="action-cell">
                          <button className="btn-edit" type="button" onClick={() => openEditModal(fuel)}>Edit</button>
                          <button className="btn-view" type="button" onClick={() => openReceiveModal(fuel)}>Receive</button>
                          <button className="btn-view" type="button" onClick={() => openIssueModal(fuel)}>Issue</button>
                        </td>
                      </tr>
                    );
                  })}
                  {loading && (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading fuel inventory...</td></tr>
                  )}
                  {!loading && filteredFuels.length === 0 && (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24 }}>No fuel types yet — click "Receive Fuel" to add one.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="fuel-table-footer">
              <span className="entries-info">{filteredFuels.length} of {fuels.length} entries</span>
            </div>
          </div>

          <div className="fuel-bottom-grid">
            <section className="content-section fuel-history-panel">
              <div className="panel-header">
                <h2 className="section-title">Fuel Issuance History</h2>
                <div className="history-tabs">
                  {[['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['all', 'All']].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`history-tab${historyTab === key ? ' active' : ''}`}
                      onClick={() => setHistoryTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="section-content">
                <table className="data-table issuance-table">
                  <thead>
                    <tr>
                      <th>Date Issued</th>
                      <th>Fuel Type</th>
                      <th>Vehicle</th>
                      <th>Driver</th>
                      <th>Liters</th>
                      <th>Purpose</th>
                      <th>Issued By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.slice(0, 10).map((i) => (
                      <tr key={i.issuance_id}>
                        <td>{formatDate(i.issued_at)}</td>
                        <td>{i.fuel?.fuel_type || '—'}</td>
                        <td>{i.vehicle ? i.vehicle.plate_number : '—'}</td>
                        <td>{i.driver?.user?.full_name || '—'}</td>
                        <td>{Number(i.liters).toLocaleString()}</td>
                        <td>{i.purpose || '—'}</td>
                        <td>{i.issued_by_user?.full_name || i.issuedBy?.full_name || '—'}</td>
                      </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24 }}>No issuances in this range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="content-section fuel-chart-panel">
              <div className="panel-header">
                <h2 className="section-title">Monthly Fuel Usage</h2>
                <select className="fuel-type-select" value={chartFuelType} onChange={(e) => setChartFuelType(e.target.value)}>
                  {fuels.map((f) => (
                    <option key={f.fuel_id} value={f.fuel_type}>{f.fuel_type}</option>
                  ))}
                </select>
              </div>
              <div className="fuel-chart-wrap">
                <svg className="fuel-usage-chart" viewBox="0 0 520 220" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="fuelChartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <line x1="40" y1="20" x2="40" y2="180" stroke="#e5e7eb" strokeWidth="1" />
                  <line x1="40" y1="180" x2="500" y2="180" stroke="#e5e7eb" strokeWidth="1" />
                  {chartData.length > 0 && (
                    <>
                      <path d={`M${chartPoints} 490,180 40,180 Z`} fill="url(#fuelChartGradient)" />
                      <polyline points={chartPoints} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    </>
                  )}
                </svg>
                {chartData.length > 0 && chartData.every((v) => v === 0) && (
                  <p style={{ textAlign: 'center', color: '#888', fontSize: 13, marginTop: -20 }}>
                    No usage recorded for {chartFuelType} this month yet.
                  </p>
                )}
              </div>
              <Link to="/analytics" className="panel-link">View full analytics <i className="fas fa-angle-right"></i></Link>
            </section>
          </div>
        </div>
      </div>

      {showReceiveModal && (
        <div className="modal" style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: 20 }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 10 }}>
            <div className="modal-header"><h2>{receiveTarget ? `Receive ${receiveTarget.fuel_type}` : 'Receive New Fuel Type'}</h2></div>
            <div className="modal-body" style={{ padding: 20 }}>
              {formError && <div className="form-error" style={{ color: '#d32f2f', marginBottom: 12 }}>{formError}</div>}
              {!receiveTarget && (
                <div className="form-group">
                  <label>Fuel Type<span className="required">*</span></label>
                  <input type="text" className="form-input" placeholder="e.g. Diesel, Gasoline, Premium Diesel" value={receiveForm.fuel_type} onChange={(e) => setReceiveForm({ ...receiveForm, fuel_type: e.target.value })} />
                </div>
              )}
              <div className="form-group">
                <label>Liters Received<span className="required">*</span></label>
                <input type="number" className="form-input" value={receiveForm.liters} onChange={(e) => setReceiveForm({ ...receiveForm, liters: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Supplier</label>
                <input type="text" className="form-input" value={receiveForm.supplier_name} onChange={(e) => setReceiveForm({ ...receiveForm, supplier_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Unit Price (₱)</label>
                <input type="number" className="form-input" value={receiveForm.unit_price} onChange={(e) => setReceiveForm({ ...receiveForm, unit_price: e.target.value })} />
              </div>
              {!receiveTarget && (
                <div className="form-group">
                  <label>Reorder Level</label>
                  <input type="number" className="form-input" value={receiveForm.reorder_level} onChange={(e) => setReceiveForm({ ...receiveForm, reorder_level: e.target.value })} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowReceiveModal(false)}>Cancel</button>
              <button className="btn-save" onClick={submitReceive} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {showIssueModal && issueTarget && (
        <div className="modal" style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: 20 }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 10 }}>
            <div className="modal-header"><h2>Issue {issueTarget.fuel_type}</h2></div>
            <div className="modal-body" style={{ padding: 20 }}>
              {formError && <div className="form-error" style={{ color: '#d32f2f', marginBottom: 12 }}>{formError}</div>}
              <p style={{ fontSize: 13, color: '#888' }}>Available: {Number(issueTarget.current_stock).toLocaleString()} {issueTarget.unit}</p>
              <div className="form-group">
                <label>Liters<span className="required">*</span></label>
                <input type="number" className="form-input" value={issueForm.liters} onChange={(e) => setIssueForm({ ...issueForm, liters: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Vehicle</label>
                <select className="form-select" value={issueForm.vehicle_id} onChange={(e) => setIssueForm({ ...issueForm, vehicle_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {vehicles.map((v) => <option key={v.vehicle_id} value={v.vehicle_id}>{v.model} ({v.plate_number})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Driver</label>
                <select className="form-select" value={issueForm.driver_id} onChange={(e) => setIssueForm({ ...issueForm, driver_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {drivers.map((d) => <option key={d.driver_id} value={d.driver_id}>{d.user?.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Purpose</label>
                <input type="text" className="form-input" placeholder="e.g. Delivery Trip" value={issueForm.purpose} onChange={(e) => setIssueForm({ ...issueForm, purpose: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowIssueModal(false)}>Cancel</button>
              <button className="btn-save" onClick={submitIssue} disabled={saving}>{saving ? 'Issuing...' : 'Issue Fuel'}</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editTarget && (
        <div className="modal" style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: 20 }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 10 }}>
            <div className="modal-header"><h2>Edit {editTarget.fuel_type}</h2></div>
            <div className="modal-body" style={{ padding: 20 }}>
              {formError && <div className="form-error" style={{ color: '#d32f2f', marginBottom: 12 }}>{formError}</div>}
              <div className="form-group">
                <label>Supplier</label>
                <input type="text" className="form-input" value={editForm.supplier_name} onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Unit Price (₱)</label>
                <input type="number" className="form-input" value={editForm.unit_price} onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Reorder Level</label>
                <input type="number" className="form-input" value={editForm.reorder_level} onChange={(e) => setEditForm({ ...editForm, reorder_level: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-save" onClick={submitEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FuelInventoryPage;