import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api-client';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMoney(amount) {
  return '₱' + Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function isSameMonth(dateString, ref) {
  const d = new Date(dateString);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function AnalyticsPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const [historySearch, setHistorySearch] = useState('');
  const [historySort, setHistorySort] = useState('date-desc');
  const [historyPage, setHistoryPage] = useState(1);
  const PAGE_SIZE = 8;

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
    const endpoints = [
      { key: 'deliveries', url: '/deliveries', setter: setDeliveries },
      { key: 'reviews', url: '/reviews', setter: setReviews },
      { key: 'vehicle-maintenance', url: '/vehicle-maintenance', setter: setMaintenance },
    ];

    const results = await Promise.allSettled(endpoints.map((e) => api.get(e.url)));

    const failures = [];
    results.forEach((result, i) => {
      const { key, setter } = endpoints[i];
      if (result.status === 'fulfilled') {
        setter(result.value.data);
      } else {
        const status = result.reason?.response?.status;
        const message = result.reason?.response?.data?.message || result.reason.message;
        failures.push(`${key} (${status || 'network error'}): ${message}`);
        console.error(`Analytics: failed to load ${key}`, result.reason?.response?.data || result.reason);
      }
    });

    if (failures.length) {
      setLoadError(`Could not load: ${failures.join(' | ')}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const now = useMemo(() => new Date(), []);
  const currentMonthName = MONTH_NAMES[now.getMonth()];

  const lastMonth = useMemo(() => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, [now]);

  // ----- This-month stats, with an all-time fallback when there's -----
  // ----- nothing recorded for the current calendar month yet -----
  const thisMonthDeliveries = useMemo(() => deliveries.filter((d) => isSameMonth(d.created_at, now)), [deliveries, now]);
  const lastMonthDeliveries = useMemo(() => deliveries.filter((d) => isSameMonth(d.created_at, lastMonth)), [deliveries, lastMonth]);

  const usingAllTime = thisMonthDeliveries.length === 0 && deliveries.length > 0;
  const statsPool = usingAllTime ? deliveries : thisMonthDeliveries;
  const periodLabel = usingAllTime ? 'All Time' : currentMonthName;

  const periodRevenue = useMemo(
    () => statsPool.filter((d) => d.payment_verification === 'approved').reduce((s, d) => s + Number(d.trip_cost || 0), 0),
    [statsPool]
  );
  const thisMonthRevenue = periodRevenue;
  const lastMonthRevenue = useMemo(
    () => lastMonthDeliveries.filter((d) => d.payment_verification === 'approved').reduce((s, d) => s + Number(d.trip_cost || 0), 0),
    [lastMonthDeliveries]
  );

  const reviewsPool = useMemo(() => {
    const monthReviews = reviews.filter((r) => isSameMonth(r.created_at, now));
    return monthReviews.length ? monthReviews : reviews;
  }, [reviews, now]);
  const avgRating = useMemo(() => {
    if (!reviewsPool.length) return null;
    return (reviewsPool.reduce((s, r) => s + Number(r.overall_rating || 0), 0) / reviewsPool.length).toFixed(1);
  }, [reviewsPool]);

  const deliveriesTrendUp = thisMonthDeliveries.length >= lastMonthDeliveries.length;
  const revenueTrendUp = thisMonthRevenue >= lastMonthRevenue;

  // ----- Monthly chart data -----
  // Defaults to the last 4 calendar months; if none of those have any
  // deliveries (all real data is older), falls back to the 4 most recent
  // months that actually have records, so the chart isn't just empty bars.
  const chartMonths = useMemo(() => {
    const buildFor = (months) =>
      months.map((d) => {
        const inMonth = deliveries.filter((del) => isSameMonth(del.created_at, d));
        const revenue = inMonth
          .filter((del) => del.payment_verification === 'approved')
          .reduce((s, del) => s + Number(del.trip_cost || 0), 0);
        return { label: MONTH_NAMES[d.getMonth()], deliveries: inMonth.length, revenue };
      });

    const recent4 = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      recent4.push(d);
    }
    const recentResult = buildFor(recent4);
    if (recentResult.some((m) => m.deliveries > 0) || deliveries.length === 0) {
      return recentResult;
    }

    // Fall back to the 4 most recent distinct months that actually appear
    // in the data.
    const monthSet = new Map();
    deliveries.forEach((d) => {
      const dt = new Date(d.created_at);
      if (isNaN(dt)) return;
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      if (!monthSet.has(key)) monthSet.set(key, new Date(dt.getFullYear(), dt.getMonth(), 1));
    });
    const sortedMonths = Array.from(monthSet.values()).sort((a, b) => a - b).slice(-4);
    return sortedMonths.length ? buildFor(sortedMonths) : recentResult;
  }, [deliveries, now]);

  const maxDeliveries = Math.max(1, ...chartMonths.map((m) => m.deliveries));
  const maxRevenue = Math.max(1, ...chartMonths.map((m) => m.revenue));

  // ----- Top driver (by completed deliveries, this month or all-time fallback) -----
  const topDriver = useMemo(() => {
    const counts = {};
    statsPool
      .filter((d) => d.status === 'completed' && d.driver)
      .forEach((d) => {
        const key = d.driver.driver_id;
        if (!counts[key]) counts[key] = { driver: d.driver, completed: 0 };
        counts[key].completed += 1;
      });
    const ranked = Object.values(counts).sort((a, b) => b.completed - a.completed);
    if (!ranked.length) return null;
    const top = ranked[0];
    const driverReviews = reviews.filter((r) => {
      const delivery = deliveries.find((d) => d.delivery_id === r.delivery_id);
      return delivery?.driver?.driver_id === top.driver.driver_id;
    });
    const rating = driverReviews.length
      ? (driverReviews.reduce((s, r) => s + Number(r.driver_rating || 0), 0) / driverReviews.length).toFixed(1)
      : null;
    return { ...top, rating };
  }, [statsPool, reviews, deliveries]);

  // ----- Most used vehicle (by trip count, this month or all-time fallback) -----
  const topVehicle = useMemo(() => {
    const counts = {};
    statsPool
      .filter((d) => d.vehicle)
      .forEach((d) => {
        const key = d.vehicle.vehicle_id;
        if (!counts[key]) counts[key] = { vehicle: d.vehicle, trips: 0 };
        counts[key].trips += 1;
      });
    const ranked = Object.values(counts).sort((a, b) => b.trips - a.trips);
    if (!ranked.length) return null;
    const top = ranked[0];
    const needsMaintenance = maintenance.some(
      (m) => m.vehicle_id === top.vehicle.vehicle_id && ['pending', 'ongoing'].includes(m.status)
    );
    return { ...top, needsMaintenance };
  }, [statsPool, maintenance]);

  // ----- Customer rankings -----
  const customerStats = useMemo(() => {
    const stats = {};
    deliveries.forEach((d) => {
      const customer = d.request?.customer;
      if (!customer) return;
      if (!stats[customer.user_id]) stats[customer.user_id] = { customer, requests: 0, spend: 0 };
      stats[customer.user_id].requests += 1;
      if (d.payment_verification === 'approved') stats[customer.user_id].spend += Number(d.trip_cost || 0);
    });
    return Object.values(stats).sort((a, b) => b.spend - a.spend);
  }, [deliveries]);

  const topCustomer = customerStats[0] || null;
  const topCustomerRating = useMemo(() => {
    if (!topCustomer) return null;
    const custReviews = reviews.filter((r) => r.customer_id === topCustomer.customer.user_id);
    if (!custReviews.length) return null;
    return (custReviews.reduce((s, r) => s + Number(r.overall_rating || 0), 0) / custReviews.length).toFixed(1);
  }, [topCustomer, reviews]);
  const topCustomerLastRequest = useMemo(() => {
    if (!topCustomer) return null;
    const theirDeliveries = deliveries
      .filter((d) => d.request?.customer?.user_id === topCustomer.customer.user_id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return theirDeliveries[0]?.created_at || null;
  }, [topCustomer, deliveries]);

  // ----- Delivery history -----
  const filteredHistory = useMemo(() => {
    let list = [...deliveries];
    if (historySearch.trim()) {
      const term = historySearch.toLowerCase();
      list = list.filter((d) => {
        const haystack = `${d.request?.customer?.full_name || ''} ${d.driver?.user?.full_name || ''} ${d.vehicle?.model || ''}`.toLowerCase();
        return haystack.includes(term);
      });
    }
    if (historySort === 'date-desc') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (historySort === 'date-asc') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (historySort === 'revenue-desc') list.sort((a, b) => Number(b.trip_cost || 0) - Number(a.trip_cost || 0));
    return list;
  }, [deliveries, historySearch, historySort]);

  const pagedHistory = filteredHistory.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));

  const exportHistory = () => {
    const rows = [['Delivery ID', 'Customer', 'Driver', 'Vehicle', 'Status', 'Date', 'Revenue']];
    filteredHistory.forEach((d) => {
      rows.push([
        `DLV${String(d.delivery_id).padStart(4, '0')}`,
        d.request?.customer?.full_name || '',
        d.driver?.user?.full_name || 'Unassigned',
        d.vehicle?.model || 'Unassigned',
        d.status,
        formatDate(d.created_at),
        d.trip_cost || 0,
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'delivery_history.csv';
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
              <li className="active"><Link to="/analytics"><i className="fas fa-chart-bar"></i> Analytics</Link></li>
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
              <span className="breadcrumb">Page/Analytics</span>
              <h1 className="page-title">ANALYTICS</h1>
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
              <div className="stat-head">
                <div className="icon blue"><i className="fas fa-truck"></i></div>
                <div><h3>Total Deliveries</h3><p>({periodLabel})</p></div>
              </div>
              <div className="stat-main">
                <strong>{statsPool.length}</strong>
                <span className={`trend ${deliveriesTrendUp ? 'up' : 'down'}`}>
                  <i className={`fas fa-arrow-trend-${deliveriesTrendUp ? 'up' : 'down'}`}></i>
                </span>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-head">
                <div className="icon green"><i className="fas fa-money-bill-wave"></i></div>
                <div><h3>Total Revenue</h3><p>({periodLabel})</p></div>
              </div>
              <div className="stat-main">
                <strong>{formatMoney(thisMonthRevenue)}</strong>
                <span className={`trend ${revenueTrendUp ? 'up' : 'down'}`}>
                  <i className={`fas fa-arrow-trend-${revenueTrendUp ? 'up' : 'down'}`}></i>
                </span>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-head">
                <div className="icon orange"><i className="fas fa-star"></i></div>
                <div><h3>Customer Ratings</h3><p>({periodLabel})</p></div>
              </div>
              <div className="stat-main">
                <strong>{avgRating || '—'}</strong>
              </div>
            </article>
          </section>

          <section className="charts-grid">
            <article className="panel">
              <div className="panel-head">
                <h2>Deliveries Overview</h2>
                <select disabled><option>Monthly</option></select>
              </div>
              <div className="chart-bars">
                {chartMonths.map((m) => (
                  <div className="bar-wrap" key={m.label}>
                    <span className="bar blue" style={{ height: `${(m.deliveries / maxDeliveries) * 100}%` }}></span>
                    <small>{m.label}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <h2>Revenue Overview</h2>
                <select disabled><option>Monthly</option></select>
              </div>
              <div className="chart-bars">
                {chartMonths.map((m) => (
                  <div className="bar-wrap" key={m.label}>
                    <span className="bar green" style={{ height: `${(m.revenue / maxRevenue) * 100}%` }}></span>
                    <small>{m.label}</small>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="cards-grid">
            <article className="panel profile-card">
              <div className="panel-head compact">
                <h2><i className="fas fa-crown"></i> Top Driver</h2>
                <span className="badge">{periodLabel}</span>
              </div>
              {topDriver ? (
                <div className="profile-row">
                  <img src="images/topdrive.jpg" alt="Top Driver" />
                  <div>
                    <h3>{topDriver.driver.user?.full_name || '—'}</h3>
                    <p><i className="fas fa-check"></i> {topDriver.completed} Completed Deliveries</p>
                    <p><i className="fas fa-star"></i> {topDriver.rating ? `${topDriver.rating} Stars User review` : 'No reviews yet'}</p>
                  </div>
                </div>
              ) : (
                <p style={{ padding: 16, color: '#888' }}>No completed deliveries this month yet.</p>
              )}
            </article>

            <article className="panel vehicle-card">
              <div className="panel-head compact">
                <h2>Most Used Vehicle</h2>
                <span className="badge">{periodLabel}</span>
              </div>
              {topVehicle ? (
                <div className="vehicle-row">
                  <img src="images/fuso.jpg" alt="Most Used Vehicle" />
                  <div>
                    <h3>{topVehicle.vehicle.model} <span>(VCL{String(topVehicle.vehicle.vehicle_id).padStart(3, '0')})</span></h3>
                    <p><i className="fas fa-check"></i> Most active vehicle</p>
                    <p><i className="fas fa-check"></i> {topVehicle.trips} Completed trips</p>
                    {topVehicle.needsMaintenance && (
                      <p className="warn"><i className="fas fa-exclamation-triangle"></i> Needs maintenance check-up</p>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ padding: 16, color: '#888' }}>No trips recorded this month yet.</p>
              )}
            </article>
          </section>

          <section className="cards-grid">
            <article className="panel ranking-card">
              <div className="panel-head compact">
                <h2><i className="fas fa-crown"></i> Top Ranking Customer</h2>
                <span className="badge">{currentMonthName} {now.getFullYear()}</span>
              </div>
              {topCustomer ? (
                <div className="profile-row">
                  <img src="images/activecustomer.jpg" alt="Top Customer" />
                  <div>
                    <h4>#1 Customer</h4>
                    <h3>{topCustomer.customer.full_name}</h3>
                    <p><i className="fas fa-check"></i> {topCustomer.requests} Transport Requests</p>
                    <p><i className="fas fa-star"></i> {topCustomerRating ? `${topCustomerRating} Customer rating` : 'No reviews yet'}</p>
                    <div className="spend-pill">
                      <span>Cumulative Spend</span>
                      <strong>{formatMoney(topCustomer.spend)}</strong>
                    </div>
                    <p className="muted"><i className="far fa-clock"></i> Recent request: {formatDate(topCustomerLastRequest)}</p>
                    <Link to="/customers"><button>View Customer Profile <i className="fas fa-angle-right"></i></button></Link>
                  </div>
                </div>
              ) : (
                <p style={{ padding: 16, color: '#888' }}>No customer activity yet.</p>
              )}
            </article>

            <article className="panel top-customers-card">
              <div className="panel-head compact">
                <h2><i className="fas fa-medal"></i> Top Customers</h2>
                <span className="badge">{currentMonthName} {now.getFullYear()}</span>
              </div>
              <table className="simple-table">
                <thead><tr><th>Name</th><th>Requests</th><th>Cumulative Spend</th></tr></thead>
                <tbody>
                  {customerStats.slice(0, 5).map((c, i) => (
                    <tr key={c.customer.user_id}>
                      <td><span className="rank">{i + 1}</span> {c.customer.full_name}</td>
                      <td>{c.requests}</td>
                      <td>{formatMoney(c.spend)}</td>
                    </tr>
                  ))}
                  {customerStats.length === 0 && (
                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: 16 }}>No data yet.</td></tr>
                  )}
                </tbody>
              </table>
              <Link to="/customers"><button className="full-width">View all Customers <i className="fas fa-angle-right"></i></button></Link>
            </article>
          </section>

          <section className="panel history-card">
            <div className="panel-head">
              <h2>Delivery History</h2>
              <div className="table-actions">
                <div className="search-box">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Search"
                    value={historySearch}
                    onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                  />
                </div>
                <select className="ghost-btn" value={historySort} onChange={(e) => setHistorySort(e.target.value)}>
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="revenue-desc">Highest Revenue</option>
                </select>
                <button className="ghost-btn" onClick={exportHistory}><i className="fas fa-upload"></i> Export</button>
              </div>
            </div>
            <table className="history-table">
              <thead>
                <tr><th>Delivery ID</th><th>Customer</th><th>Driver</th><th>Vehicle</th><th>Status</th><th>Date</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                {pagedHistory.map((d) => (
                  <tr key={d.delivery_id}>
                    <td>DLV{String(d.delivery_id).padStart(4, '0')}</td>
                    <td>{d.request?.customer?.full_name || '—'}</td>
                    <td>{d.driver?.user?.full_name || 'Unassigned'}</td>
                    <td>{d.vehicle?.model || 'Unassigned'}</td>
                    <td className={d.status === 'completed' ? 'done' : ''}>
                      {d.status === 'completed' && <i className="far fa-check-circle"></i>} {d.status.replace(/_/g, ' ')}
                    </td>
                    <td>{formatDate(d.created_at)}</td>
                    <td>{formatMoney(d.trip_cost)}</td>
                  </tr>
                ))}
                {loading && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading analytics...</td></tr>
                )}
                {!loading && pagedHistory.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24 }}>No deliveries found.</td></tr>
                )}
              </tbody>
            </table>
            <div className="pagination">
              <span>Page</span>
              <button disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}>
                <i className="fas fa-angle-left"></i>
              </button>
              <span>{historyPage} / {totalPages}</span>
              <button disabled={historyPage >= totalPages} onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}>
                <i className="fas fa-angle-right"></i>
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default AnalyticsPage;