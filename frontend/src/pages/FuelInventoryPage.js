import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import NotificationBell from '../components/NotificationBell';

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function fuelStatus(fuel) {
  const stock = Number(fuel.current_stock);
  if (stock <= 0) return { label: 'Empty', cls: 'empty' };
  if (stock <= Number(fuel.reorder_level)) return { label: 'Low Stock', cls: 'low' };
  return { label: 'Normal', cls: 'normal' };
}

const EMPTY_RECEIVE_FORM = {
  fuel_type: '',
  supplier_name: '',
  unit_price: '',
  liters: '',
  received_date: new Date().toISOString().split('T')[0],
  unit: 'Liters',
  reorder_level: '500',
};

const EMPTY_ISSUE_FORM = {
  vehicle_id: '',
  driver_id: '',
  liters: '',
  purpose: 'Refueling Truck',
  unit_price: '',
  issue_date: new Date().toISOString().split('T')[0],
};

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
  const [historyFilterType, setHistoryFilterType] = useState('all'); // all | in | out
  const [recentTxPage, setRecentTxPage] = useState(1);
  const recentTxRowsPerPage = 5;


  // Modals
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState(null);
  const [receiveForm, setReceiveForm] = useState(EMPTY_RECEIVE_FORM);

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueTarget, setIssueTarget] = useState(null);
  const [issueForm, setIssueForm] = useState(EMPTY_ISSUE_FORM);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ supplier_name: '', unit_price: '', reorder_level: '' });

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTargetFuel, setHistoryTargetFuel] = useState(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
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
    } catch (err) {
      setLoadError('Could not load fuel inventory. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Total Inventory Value
  const totalInventoryValue = useMemo(() => {
    return fuels.reduce((acc, f) => acc + (Number(f.current_stock || 0) * Number(f.unit_price || 0)), 0);
  }, [fuels]);

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
        const d = new Date(i.issued_at || i.created_at);
        return i.transaction_type !== 'in' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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
    if (sortBy === 'value') list.sort((a, b) => (Number(b.current_stock) * Number(b.unit_price)) - (Number(a.current_stock) * Number(a.unit_price)));
    return list;
  }, [fuels, search, sortBy]);

  const filteredHistory = useMemo(() => {
    let list = [...issuances];
    if (historyTargetFuel) {
      list = list.filter((i) => i.fuel_id === historyTargetFuel.fuel_id);
    }
    if (historyFilterType !== 'all') {
      list = list.filter((i) => (i.transaction_type || 'out') === historyFilterType);
    }
    const now = new Date();
    list = list.filter((i) => {
      const d = new Date(i.issued_at || i.created_at);
      if (historyTab === 'today') return d.toDateString() === now.toDateString();
      if (historyTab === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
      }
      if (historyTab === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });

    return list.sort((a, b) => {
      const timeB = new Date(b.created_at || b.issued_at || 0).getTime();
      const timeA = new Date(a.created_at || a.issued_at || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.issuance_id || 0) - (a.issuance_id || 0);
    });
  }, [issuances, historyTargetFuel, historyFilterType, historyTab]);

  const totalRecentTxPages = Math.max(1, Math.ceil(filteredHistory.length / recentTxRowsPerPage));
  const paginatedRecentTx = useMemo(() => {
    return filteredHistory.slice((recentTxPage - 1) * recentTxRowsPerPage, recentTxPage * recentTxRowsPerPage);
  }, [filteredHistory, recentTxPage, recentTxRowsPerPage]);


  const targetPriceHistories = useMemo(() => {
    if (historyTargetFuel) {
      const list = historyTargetFuel.price_histories || historyTargetFuel.priceHistories || [];
      return [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    const allList = [];
    fuels.forEach((f) => {
      const list = f.price_histories || f.priceHistories || [];
      list.forEach((ph) => {
        allList.push({ ...ph, fuel_type: f.fuel_type });
      });
    });
    return allList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [historyTargetFuel, fuels]);

  // ----- Receive Fuel (Fuel In) -----
  const openReceiveModal = (fuel = null) => {
    setReceiveTarget(fuel);
    setReceiveForm({
      fuel_type: fuel ? fuel.fuel_type : '',
      supplier_name: fuel ? fuel.supplier_name || '' : '',
      unit_price: fuel ? fuel.unit_price : '',
      liters: '',
      received_date: new Date().toISOString().split('T')[0],
      unit: fuel ? fuel.unit || 'Liters' : 'Liters',
      reorder_level: fuel ? fuel.reorder_level : '500',
    });
    setFormError('');
    setShowReceiveModal(true);
  };

  const calculatedReceiveTotal = useMemo(() => {
    const liters = parseFloat(receiveForm.liters) || 0;
    const price = parseFloat(receiveForm.unit_price) || 0;
    return (liters * price).toFixed(2);
  }, [receiveForm.liters, receiveForm.unit_price]);

  const submitReceive = async () => {
    if (!receiveForm.liters || parseFloat(receiveForm.liters) <= 0) {
      setFormError('Please enter a valid quantity of liters to receive.');
      return;
    }
    if (!receiveTarget && !receiveForm.fuel_type) {
      setFormError('Please select or specify fuel type.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (receiveTarget) {
        await api.post(`/fuel-inventory/${receiveTarget.fuel_id}/receive`, {
          liters: parseFloat(receiveForm.liters),
          supplier_name: receiveForm.supplier_name,
          unit_price: receiveForm.unit_price ? parseFloat(receiveForm.unit_price) : undefined,
          received_date: receiveForm.received_date,
        });
      } else {
        const existing = fuels.find(
          (f) => f.fuel_type.trim().toLowerCase() === receiveForm.fuel_type.trim().toLowerCase()
        );
        if (existing) {
          await api.post(`/fuel-inventory/${existing.fuel_id}/receive`, {
            liters: parseFloat(receiveForm.liters),
            supplier_name: receiveForm.supplier_name,
            unit_price: receiveForm.unit_price ? parseFloat(receiveForm.unit_price) : undefined,
            received_date: receiveForm.received_date,
          });
        } else {
          await api.post('/fuel-inventory', {
            fuel_type: receiveForm.fuel_type,
            supplier_name: receiveForm.supplier_name,
            current_stock: parseFloat(receiveForm.liters),
            unit_price: parseFloat(receiveForm.unit_price) || 0,
            unit: receiveForm.unit || 'Liters',
            reorder_level: parseFloat(receiveForm.reorder_level) || 500,
            last_delivery_date: receiveForm.received_date,
          });
        }
      }
      setShowReceiveModal(false);
      await loadData();
      setToast({ message: `Successfully received ${receiveForm.liters} L of fuel.` });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not record fuel receiving.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ----- Issue Fuel (Fuel Out) -----
  const openIssueModal = (fuel) => {
    setIssueTarget(fuel);
    setIssueForm({
      vehicle_id: '',
      driver_id: '',
      liters: '',
      purpose: 'Vehicle Refueling',
      unit_price: fuel.unit_price,
      issue_date: new Date().toISOString().split('T')[0],
    });
    setFormError('');
    setShowIssueModal(true);
  };

  const calculatedIssueTotal = useMemo(() => {
    const liters = parseFloat(issueForm.liters) || 0;
    const price = parseFloat(issueForm.unit_price) || (issueTarget ? parseFloat(issueTarget.unit_price) : 0);
    return (liters * price).toFixed(2);
  }, [issueForm.liters, issueForm.unit_price, issueTarget]);

  const submitIssue = async () => {
    if (!issueForm.liters || parseFloat(issueForm.liters) <= 0) {
      setFormError('Please enter a valid quantity of liters to issue.');
      return;
    }
    const litersToIssue = parseFloat(issueForm.liters);
    if (issueTarget && litersToIssue > Number(issueTarget.current_stock)) {
      setFormError(`Insufficient stock! Available: ${issueTarget.current_stock} ${issueTarget.unit}, requested: ${litersToIssue}`);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      await api.post(`/fuel-inventory/${issueTarget.fuel_id}/issue`, {
        liters: litersToIssue,
        vehicle_id: issueForm.vehicle_id || null,
        driver_id: issueForm.driver_id || null,
        purpose: issueForm.purpose,
        unit_price: issueForm.unit_price ? parseFloat(issueForm.unit_price) : undefined,
        issue_date: issueForm.issue_date,
      });
      setShowIssueModal(false);
      await loadData();
      setToast({ message: `Successfully issued ${litersToIssue} L of ${issueTarget.fuel_type}.` });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      const message = err.response?.data?.message || 'Could not issue fuel.';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  // ----- Edit Fuel Info & Price -----
  const openEditModal = (fuel) => {
    setEditTarget(fuel);
    setEditForm({
      supplier_name: fuel.supplier_name || '',
      unit_price: fuel.unit_price,
      reorder_level: fuel.reorder_level,
    });
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
      setToast({ message: `Updated ${editTarget.fuel_type} details and price history recorded.` });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setFormError('Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  // ----- View Fuel History -----
  const openHistoryModal = (fuel = null) => {
    setHistoryTargetFuel(fuel);
    setHistoryTab('all');
    setHistoryFilterType('all');
    setShowHistoryModal(true);
  };

  return (
    <>
      <div className="dashboard-container">
        <Sidebar activePage="fuel-inventory" />

        <div className="main-content">
          <header className="header">
            <div className="page-info">
              <span className="breadcrumb">Page / Inventory / Fuel Inventory</span>
              <h1 className="page-title">FUEL INVENTORY MANAGEMENT</h1>
              <p className="page-subtitle">Track real-time fuel stock, pricing, receiving (Fuel In) and issuances (Fuel Out).</p>
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

          {/* Top 5 Stat Cards (Including Total Fuel Inventory Value) */}
          <section className="fuel-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, margin: '16px 0' }}>
            <article className="fuel-stat-card">
              <div className="fuel-stat-top">
                <span className="fuel-metric-icon green"><i className="fas fa-coins"></i></span>
                <strong>₱{totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <h3>Total Inventory Value</h3>
              <p>Current Stock × Price</p>
            </article>
            <article className="fuel-stat-card">
              <div className="fuel-stat-top">
                <span className="fuel-metric-icon blue"><i className="fas fa-gas-pump"></i></span>
                <strong>{stats.dieselStock.toLocaleString()} L</strong>
              </div>
              <h3>Diesel Stock</h3>
              <p>Total Available</p>
            </article>
            <article className="fuel-stat-card">
              <div className="fuel-stat-top">
                <span className="fuel-metric-icon green"><i className="fas fa-gas-pump"></i></span>
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
              <p>Tanks Below Reorder</p>
            </article>
          </section>

          {/* Fuel Inventory Table Section */}
          <div className="content-section fuel-inventory-section">
            <div className="fuel-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div className="fuel-toolbar-left" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="search-bar">
                  <i className="fas fa-search"></i>
                  <input type="text" placeholder="Search fuel..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="sort-dropdown">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                    <option value="type">Sort: Fuel Type</option>
                    <option value="stock">Sort: Current Stock</option>
                    <option value="price">Sort: Unit Price</option>
                    <option value="value">Sort: Total Value</option>
                  </select>
                </div>
              </div>
              <div className="fuel-toolbar-right" style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-history"
                  type="button"
                  onClick={() => openHistoryModal(null)}
                  style={{ background: '#334155', color: '#fff', padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                >
                  <i className="fas fa-history"></i> Full History
                </button>
                <button
                  className="btn-receive-fuel"
                  type="button"
                  onClick={() => openReceiveModal(null)}
                  style={{ background: '#16a34a', color: '#fff', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                >
                  <i className="fas fa-plus-circle"></i> Receive Fuel (Fuel In)
                </button>
              </div>
            </div>

            <div className="section-content" style={{ marginTop: 14 }}>
              <table className="data-table fuel-inventory-table">
                <thead>
                  <tr>
                    <th>Fuel Type</th>
                    <th>Supplier</th>
                    <th>Current Stock</th>
                    <th>Unit Price</th>
                    <th>Total Inventory Value</th>
                    <th>Status</th>
                    <th>Last Received</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFuels.map((fuel) => {
                    const st = fuelStatus(fuel);
                    const totalVal = (Number(fuel.current_stock) * Number(fuel.unit_price)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    return (
                      <tr key={fuel.fuel_id}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{fuel.fuel_type}</td>
                        <td>{fuel.supplier_name || '—'}</td>
                        <td>
                          <strong>{Number(fuel.current_stock).toLocaleString()}</strong> {fuel.unit}
                        </td>
                        <td>₱{Number(fuel.unit_price).toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: '#16a34a' }}>₱{totalVal}</td>
                        <td>
                          <span className={`fuel-status-badge ${st.cls}`} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                            {st.label}
                          </span>
                        </td>
                        <td>{formatDate(fuel.last_delivery_date)}</td>
                        <td className="action-cell">
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                              onClick={() => openReceiveModal(fuel)}
                              style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Fuel In
                            </button>
                            <button
                              onClick={() => openIssueModal(fuel)}
                              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Fuel Out
                            </button>
                            <button
                              onClick={() => openEditModal(fuel)}
                              style={{ background: '#475569', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Edit/Price
                            </button>
                            <button
                              onClick={() => openHistoryModal(fuel)}
                              style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              History
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {loading && (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading fuel inventory...</td></tr>
                  )}
                  {!loading && filteredFuels.length === 0 && (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24 }}>No fuel inventory records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Transactions Section */}
          <div className="content-section" style={{ marginTop: 24 }}>
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="section-title"><i className="fas fa-exchange-alt"></i> Recent Fuel Transactions (In & Out)</h3>
              <div className="history-tabs" style={{ display: 'flex', gap: 8 }}>
                {['today', 'week', 'month', 'all'].map((tab) => (
                  <button
                    key={tab}
                    className={`btn-tab ${historyTab === tab ? 'active' : ''}`}
                    onClick={() => {
                      setHistoryTab(tab);
                      setRecentTxPage(1);
                    }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      background: historyTab === tab ? '#d32f2f' : '#fff',
                      color: historyTab === tab ? '#fff' : '#334155',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  >
                    {tab === 'today' ? 'Today' : tab === 'week' ? 'Past Week' : tab === 'month' ? 'This Month' : 'All'}
                  </button>
                ))}
              </div>
            </div>
            <div className="section-content" style={{ marginTop: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Fuel Type</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Value</th>
                    <th>Vehicle / Supplier</th>
                    <th>Person Responsible</th>
                    <th>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecentTx.map((tx) => {
                    const isIn = tx.transaction_type === 'in';
                    return (
                      <tr key={tx.issuance_id}>
                        <td>{formatDateTime(tx.issued_at || tx.created_at)}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isIn ? '#dcfce7' : '#fee2e2',
                            color: isIn ? '#16a34a' : '#dc2626',
                          }}>
                            {isIn ? 'Fuel In (+)' : 'Fuel Out (-)'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{tx.fuel?.fuel_type || 'Fuel'}</td>
                        <td style={{ fontWeight: 700, color: isIn ? '#16a34a' : '#dc2626' }}>
                          {isIn ? `+${tx.liters} L` : `-${tx.liters} L`}
                        </td>
                        <td>₱{Number(tx.unit_price || tx.fuel?.unit_price || 0).toFixed(2)}</td>
                        <td style={{ fontWeight: 600 }}>
                          ₱{Number(tx.total_value || (Number(tx.liters) * Number(tx.unit_price || tx.fuel?.unit_price || 0))).toFixed(2)}
                        </td>
                        <td>
                          {isIn ? (tx.supplier_name || tx.fuel?.supplier_name || 'Supplier') : (tx.vehicle ? `${tx.vehicle.model} (${tx.vehicle.plate_number})` : 'General')}
                        </td>
                        <td>
                          {isIn ? (tx.received_by?.full_name || 'Received') : (tx.issued_by?.full_name || tx.driver?.user?.full_name || 'Issued')}
                        </td>
                        <td style={{ fontSize: 13, color: '#64748b' }}>{tx.purpose || '—'}</td>
                      </tr>
                    );
                  })}
                  {filteredHistory.length === 0 && (
                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: 20, color: '#888' }}>No fuel transactions found for this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              className="pi-table-footer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderTop: '1px solid #e2e8f0',
                background: '#fafafa',
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
                marginTop: 8,
              }}
            >
              <span className="entries-info" style={{ fontSize: 13, color: '#64748b' }}>
                Showing {filteredHistory.length === 0 ? 0 : (recentTxPage - 1) * recentTxRowsPerPage + 1} to{' '}
                {Math.min(recentTxPage * recentTxRowsPerPage, filteredHistory.length)} of {filteredHistory.length} entries
              </span>
              <div className="pi-pagination" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="pi-page-label" style={{ fontSize: 13, color: '#64748b', marginRight: 4 }}>Page</span>
                <button
                  className="btn-page"
                  type="button"
                  disabled={recentTxPage === 1}
                  onClick={() => setRecentTxPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 5,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    cursor: recentTxPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: recentTxPage === 1 ? 0.5 : 1,
                  }}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                {Array.from({ length: totalRecentTxPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn-page-num ${p === recentTxPage ? 'active' : ''}`}
                    onClick={() => setRecentTxPage(p)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: 5,
                      border: p === recentTxPage ? '1px solid #d32f2f' : '1px solid #cbd5e1',
                      background: p === recentTxPage ? '#d32f2f' : '#fff',
                      color: p === recentTxPage ? '#fff' : '#334155',
                      fontWeight: p === recentTxPage ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="btn-page"
                  type="button"
                  disabled={recentTxPage === totalRecentTxPages}
                  onClick={() => setRecentTxPage((p) => Math.min(totalRecentTxPages, p + 1))}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 5,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    cursor: recentTxPage === totalRecentTxPages ? 'not-allowed' : 'pointer',
                    opacity: recentTxPage === totalRecentTxPages ? 0.5 : 1,
                  }}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification show">
          <div className="toast-content">
            <span className="toast-message"><i className="fas fa-check-circle"></i> {toast.message}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECEIVE FUEL MODAL (FUEL IN)                                              */}
      {/* ========================================================================= */}
      {showReceiveModal && (
        <div className="modal" style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 1100, padding: 16 }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: '#16a34a', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}><i className="fas fa-arrow-circle-down"></i> RECEIVE FUEL (FUEL IN)</h2>
              <button onClick={() => setShowReceiveModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              {formError && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 14 }}>{formError}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {receiveTarget ? (
                  <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                    <h4 style={{ margin: '0 0 4px', color: '#166534' }}>Receiving to: {receiveTarget.fuel_type}</h4>
                    <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>Current Stock: {receiveTarget.current_stock} {receiveTarget.unit}</p>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Fuel Type *</label>
                    <input
                      type="text"
                      placeholder="e.g. Diesel Fuel / Unleaded Gasoline"
                      value={receiveForm.fuel_type}
                      onChange={(e) => setReceiveForm({ ...receiveForm, fuel_type: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Supplier Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Shell / Petron / Caltex"
                    value={receiveForm.supplier_name}
                    onChange={(e) => setReceiveForm({ ...receiveForm, supplier_name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Liters Received *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={receiveForm.liters}
                      onChange={(e) => setReceiveForm({ ...receiveForm, liters: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Unit Price (₱/L)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 58.50"
                      value={receiveForm.unit_price}
                      onChange={(e) => setReceiveForm({ ...receiveForm, unit_price: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Total Value Auto Calculation */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total Value of Received Fuel:</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>₱{Number(calculatedReceiveTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Date Received</label>
                  <input
                    type="date"
                    value={receiveForm.received_date}
                    onChange={(e) => setReceiveForm({ ...receiveForm, received_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-cancel" onClick={() => setShowReceiveModal(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button className="btn-save" onClick={submitReceive} disabled={saving} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Receiving...' : 'Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ISSUE FUEL MODAL (FUEL OUT)                                               */}
      {/* ========================================================================= */}
      {showIssueModal && issueTarget && (
        <div className="modal" style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 1100, padding: 16 }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: '#2563eb', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}><i className="fas fa-arrow-circle-up"></i> ISSUE FUEL (FUEL OUT)</h2>
              <button onClick={() => setShowIssueModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              {formError && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 14 }}>{formError}</div>}

              <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8, border: '1px solid #bfdbfe', marginBottom: 14 }}>
                <h4 style={{ margin: '0 0 4px', color: '#1e40af' }}>Fuel: {issueTarget.fuel_type}</h4>
                <p style={{ margin: 0, fontSize: 13, color: '#2563eb' }}>
                  Available in Tank: <strong>{Number(issueTarget.current_stock).toLocaleString()} {issueTarget.unit}</strong> · Price: <strong>₱{Number(issueTarget.unit_price).toFixed(2)}/L</strong>
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Vehicle (Optional)</label>
                    <select
                      value={issueForm.vehicle_id}
                      onChange={(e) => setIssueForm({ ...issueForm, vehicle_id: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Select Vehicle --</option>
                      {vehicles.map((v) => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>{v.model} ({v.plate_number})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Driver (Optional)</label>
                    <select
                      value={issueForm.driver_id}
                      onChange={(e) => setIssueForm({ ...issueForm, driver_id: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Select Driver --</option>
                      {drivers.map((d) => (
                        <option key={d.driver_id} value={d.driver_id}>{d.user?.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Liters to Issue *</label>
                    <input
                      type="number"
                      step="0.01"
                      max={issueTarget.current_stock}
                      placeholder={`Max: ${issueTarget.current_stock}`}
                      value={issueForm.liters}
                      onChange={(e) => setIssueForm({ ...issueForm, liters: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Date Issued</label>
                    <input
                      type="date"
                      value={issueForm.issue_date}
                      onChange={(e) => setIssueForm({ ...issueForm, issue_date: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Total Value Auto Calculation */}
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total Value of Issued Fuel:</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>₱{Number(calculatedIssueTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Purpose / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Refueling for Delivery to Malaybalay"
                    value={issueForm.purpose}
                    onChange={(e) => setIssueForm({ ...issueForm, purpose: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-cancel" onClick={() => setShowIssueModal(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button className="btn-save" onClick={submitIssue} disabled={saving} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Issuing...' : 'Confirm Issue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT FUEL DETAILS & PRICE CHANGE MODAL                                    */}
      {/* ========================================================================= */}
      {showEditModal && editTarget && (
        <div className="modal" style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 1100, padding: 16 }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: '#475569', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Edit {editTarget.fuel_type}</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              {formError && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 14 }}>{formError}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Supplier</label>
                  <input
                    type="text"
                    value={editForm.supplier_name}
                    onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Unit Price (₱/L)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.unit_price}
                    onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>Changing unit price will automatically log a Price History record.</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Reorder Alert Level (Liters)</label>
                  <input
                    type="number"
                    value={editForm.reorder_level}
                    onChange={(e) => setEditForm({ ...editForm, reorder_level: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-cancel" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button className="btn-save" onClick={submitEdit} disabled={saving} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#475569', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL FUEL HISTORY & PRICE CHANGES MODAL                                  */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="modal" style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', zIndex: 1100, padding: 16 }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: 900, maxHeight: '90vh', background: '#fff', borderRadius: 12, overflowY: 'auto' }}>
            <div className="modal-header" style={{ background: '#1e293b', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fas fa-history" style={{ color: '#f59e0b' }}></i>
                <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>
                  {historyTargetFuel ? `${historyTargetFuel.fuel_type} History & Transactions` : 'Complete Fuel Transactions History'}
                </h2>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}><i className="fas fa-times"></i></button>
            </div>

            <div className="modal-body" style={{ padding: 24 }}>
              {/* Filter controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { key: 'all', label: 'All Transactions', icon: 'fas fa-list' },
                    { key: 'in', label: 'Fuel In (Received)', icon: 'fas fa-arrow-down' },
                    { key: 'out', label: 'Fuel Out (Issued)', icon: 'fas fa-arrow-up' },
                    { key: 'price', label: `Price History (${targetPriceHistories.length})`, icon: 'fas fa-tag' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setHistoryFilterType(t.key)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: historyFilterType === t.key
                          ? (t.key === 'in' ? '#16a34a' : t.key === 'out' ? '#2563eb' : t.key === 'price' ? '#d97706' : '#0f172a')
                          : '#fff',
                        color: historyFilterType === t.key ? '#fff' : '#334155',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: historyFilterType === t.key ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      <i className={t.icon}></i> {t.label}
                    </button>
                  ))}
                </div>

                {targetPriceHistories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistoryFilterType('price')}
                    style={{
                      background: historyFilterType === 'price' ? '#fef3c7' : '#f8fafc',
                      border: '1px solid #cbd5e1',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      color: historyFilterType === 'price' ? '#b45309' : '#475569',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <i className="fas fa-history" style={{ color: '#d97706' }}></i>
                    {targetPriceHistories.length} Price Change{targetPriceHistories.length > 1 ? 's' : ''} Recorded
                  </button>
                )}
              </div>

              {/* ── CONDITIONAL VIEW: PRICE HISTORY OR TRANSACTIONS ── */}
              {historyFilterType === 'price' ? (
                <div>
                  {/* Summary Banner */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                    marginBottom: 16,
                    background: '#f8fafc',
                    padding: 14,
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Current Active Price</span>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                        ₱{Number(historyTargetFuel?.unit_price || (fuels[0]?.unit_price || 0)).toFixed(2)} / L
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Previous Price</span>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#64748b', marginTop: 2 }}>
                        {targetPriceHistories.length > 0 && targetPriceHistories[0].previous_price > 0
                          ? `₱${Number(targetPriceHistories[0].previous_price).toFixed(2)} / L`
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Last Price Update</span>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginTop: 6 }}>
                        {targetPriceHistories.length > 0
                          ? formatDateTime(targetPriceHistories[0].created_at)
                          : 'Initial Setup'}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Price Changes</span>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#d97706', marginTop: 6 }}>
                        {targetPriceHistories.length} Recorded Updates
                      </div>
                    </div>
                  </div>

                  {/* Price History Table */}
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date &amp; Time</th>
                        <th>Fuel Type</th>
                        <th>Previous Price</th>
                        <th>New Price</th>
                        <th>Price Adjustment</th>
                        <th>Changed By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {targetPriceHistories.map((ph, idx) => {
                        const prev = Number(ph.previous_price || 0);
                        const next = Number(ph.new_price || 0);
                        const diff = next - prev;
                        const isIncrease = diff > 0;
                        const isInitial = prev === 0;
                        const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : null;
                        const person = ph.changed_by_user?.full_name || ph.changedBy?.full_name || 'Admin / Staff';

                        return (
                          <tr key={ph.price_history_id || idx}>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{formatDateTime(ph.created_at)}</div>
                            </td>
                            <td style={{ fontWeight: 700, color: '#1e293b' }}>
                              {ph.fuel_type || historyTargetFuel?.fuel_type || 'Fuel'}
                            </td>
                            <td style={{ color: '#64748b', fontWeight: 600 }}>
                              {isInitial ? '— (Initial)' : `₱${prev.toFixed(2)} / L`}
                            </td>
                            <td style={{ fontWeight: 800, color: '#0f172a' }}>
                              ₱{next.toFixed(2)} / L
                            </td>
                            <td>
                              {isInitial ? (
                                <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#e0f2fe', color: '#0369a1' }}>
                                  <i className="fas fa-tag"></i> Initial Base Price
                                </span>
                              ) : (
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: isIncrease ? '#fee2e2' : '#dcfce7',
                                  color: isIncrease ? '#dc2626' : '#16a34a',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}>
                                  <i className={isIncrease ? 'fas fa-arrow-trend-up' : 'fas fa-arrow-trend-down'}></i>
                                  {isIncrease ? `+₱${diff.toFixed(2)}` : `-₱${Math.abs(diff).toFixed(2)}`}
                                  {pct ? ` (${isIncrease ? '+' : ''}${pct}%)` : ''}
                                </span>
                              )}
                            </td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155', fontWeight: 600 }}>
                                <i className="fas fa-user-circle" style={{ color: '#64748b' }}></i>
                                {person}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {targetPriceHistories.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: 28, color: '#888' }}>
                            <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                            No price changes recorded yet. Price changes are logged automatically when editing fuel unit prices or receiving fuel with new supplier rates.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Transactions Table (Fuel In / Fuel Out) */
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date &amp; Time</th>
                      <th>Type</th>
                      <th>Fuel</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total Value</th>
                      <th>Vehicle / Supplier</th>
                      <th>Person Responsible</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((tx) => {
                      const isIn = tx.transaction_type === 'in';
                      return (
                        <tr key={tx.issuance_id}>
                          <td>{formatDateTime(tx.issued_at || tx.created_at)}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              background: isIn ? '#dcfce7' : '#fee2e2',
                              color: isIn ? '#16a34a' : '#dc2626',
                            }}>
                              {isIn ? 'Fuel In' : 'Fuel Out'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{tx.fuel?.fuel_type || 'Fuel'}</td>
                          <td style={{ fontWeight: 700, color: isIn ? '#16a34a' : '#dc2626' }}>
                            {isIn ? `+${tx.liters} L` : `-${tx.liters} L`}
                          </td>
                          <td>₱{Number(tx.unit_price || tx.fuel?.unit_price || 0).toFixed(2)}</td>
                          <td style={{ fontWeight: 600 }}>
                            ₱{Number(tx.total_value || (Number(tx.liters) * Number(tx.unit_price || tx.fuel?.unit_price || 0))).toFixed(2)}
                          </td>
                          <td>
                            {isIn ? (tx.supplier_name || tx.fuel?.supplier_name || 'Supplier') : (tx.vehicle ? `${tx.vehicle.model} (${tx.vehicle.plate_number})` : 'General')}
                          </td>
                          <td>
                            {isIn ? (tx.received_by?.full_name || 'Received') : (tx.issued_by?.full_name || tx.driver?.user?.full_name || 'Issued')}
                          </td>
                          <td style={{ fontSize: 13, color: '#64748b' }}>{tx.purpose || '—'}</td>
                        </tr>
                      );
                    })}
                    {filteredHistory.length === 0 && (
                      <tr><td colSpan="9" style={{ textAlign: 'center', padding: 24, color: '#888' }}>No transactions recorded for this selection.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FuelInventoryPage;