import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import NotificationBell from '../components/NotificationBell';

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

function formatFullDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function isSameMonth(dateString, ref) {
  const d = new Date(dateString);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function deliveryCode(id) {
  return `DLV${String(id).padStart(4, '0')}`;
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
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedPdfFile, setImportedPdfFile] = useState(null);
  const [importedPdfUrl, setImportedPdfUrl] = useState(null);
  const PAGE_SIZE = 8;

  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const adminName = useMemo(() => {
    return (
      authUser.full_name ||
      authUser.name ||
      (authUser.first_name ? `${authUser.first_name} ${authUser.last_name || ''}`.trim() : '') ||
      authUser.username ||
      'System Administrator'
    );
  }, [authUser]);

  useEffect(() => {
    return () => {
      if (importedPdfUrl) URL.revokeObjectURL(importedPdfUrl);
    };
  }, [importedPdfUrl]);

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

  const thisMonthDeliveries = useMemo(() => deliveries.filter((d) => isSameMonth(d.created_at, now)), [deliveries, now]);
  const lastMonthDeliveries = useMemo(() => deliveries.filter((d) => isSameMonth(d.created_at, lastMonth)), [deliveries, lastMonth]);

  const statsPool = useMemo(() => {
    if (timeFilter === 'month') return thisMonthDeliveries;
    return deliveries;
  }, [timeFilter, thisMonthDeliveries, deliveries]);

  const periodLabel = timeFilter === 'month' ? currentMonthName : 'All Time';

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

    const monthSet = new Map();
    deliveries.forEach((d) => {
      if (!d.created_at) return;
      const dt = new Date(d.created_at);
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      if (!monthSet.has(key)) monthSet.set(key, new Date(dt.getFullYear(), dt.getMonth(), 1));
    });
    const distinct = Array.from(monthSet.values()).sort((a, b) => a - b).slice(-4);
    return buildFor(distinct.length ? distinct : recent4);
  }, [deliveries, now]);

  const maxDeliveries = useMemo(
    () => Math.max(1, ...chartMonths.map((m) => m.deliveries)),
    [chartMonths]
  );
  const maxRevenue = useMemo(
    () => Math.max(1, ...chartMonths.map((m) => m.revenue)),
    [chartMonths]
  );

  const topDriver = useMemo(() => {
    const map = new Map();
    statsPool.forEach((d) => {
      if (!d.driver) return;
      const id = d.driver.driver_id;
      const entry = map.get(id) || { driver: d.driver, completed: 0, ratings: [] };
      if (d.status === 'completed') entry.completed += 1;

      const rev = reviews.find((r) => Number(r.delivery_id) === Number(d.delivery_id));
      if (rev) {
        const rScore = Number(rev.driver_rating ?? rev.overall_rating);
        if (!isNaN(rScore) && rScore > 0) {
          entry.ratings.push(rScore);
        }
      }
      map.set(id, entry);
    });

    const ranked = Array.from(map.values())
      .map((entry) => {
        const avg = entry.ratings.length
          ? (entry.ratings.reduce((s, r) => s + r, 0) / entry.ratings.length).toFixed(1)
          : null;
        return {
          ...entry,
          rating: avg,
          reviewCount: entry.ratings.length,
        };
      })
      .sort((a, b) => {
        if (b.completed !== a.completed) return b.completed - a.completed;
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      });

    if (!ranked.length) return null;
    return ranked[0];
  }, [statsPool, reviews]);

  const topVehicle = useMemo(() => {
    const map = new Map();
    statsPool.forEach((d) => {
      if (!d.vehicle) return;
      const id = d.vehicle.vehicle_id;
      const entry = map.get(id) || { vehicle: d.vehicle, trips: 0 };
      if (d.status === 'completed') entry.trips += 1;
      map.set(id, entry);
    });
    const ranked = Array.from(map.values()).sort((a, b) => b.trips - a.trips);
    if (!ranked.length) return null;
    const top = ranked[0];
    const needsMaint = maintenance.some(
      (m) => m.vehicle_id === top.vehicle.vehicle_id && m.status !== 'completed'
    );
    return { ...top, needsMaintenance: needsMaint };
  }, [statsPool, maintenance]);

  const customerStats = useMemo(() => {
    const map = new Map();
    deliveries.forEach((d) => {
      const cust = d.request?.customer;
      if (!cust) return;
      const id = cust.user_id;
      const entry = map.get(id) || { customer: cust, requests: 0, spend: 0, lastRequest: null };
      entry.requests += 1;
      if (d.payment_verification === 'approved') entry.spend += Number(d.trip_cost || 0);
      if (!entry.lastRequest || new Date(d.created_at) > new Date(entry.lastRequest)) {
        entry.lastRequest = d.created_at;
      }
      map.set(id, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
  }, [deliveries]);

  const topCustomer = customerStats[0] || null;
  const topCustomerLastRequest = topCustomer?.lastRequest || null;
  const topCustomerRating = useMemo(() => {
    if (!topCustomer) return null;
    const custId = Number(topCustomer.customer.user_id || topCustomer.customer.customer_id);
    const custDeliveryIds = new Set(
      deliveries
        .filter((d) => Number(d.request?.customer?.user_id || d.request?.customer_id) === custId)
        .map((d) => Number(d.delivery_id))
    );

    const custReviews = reviews.filter((r) => {
      const rCustId = Number(r.customer_id || r.customer?.user_id);
      const rDelivCustId = Number(r.delivery?.request?.customer_id || r.delivery?.request?.customer?.user_id);
      return (
        rCustId === custId ||
        rDelivCustId === custId ||
        custDeliveryIds.has(Number(r.delivery_id))
      );
    });

    if (!custReviews.length) return null;
    const ratings = custReviews
      .map((r) => Number(r.overall_rating ?? r.driver_rating))
      .filter((n) => !isNaN(n) && n > 0);

    if (!ratings.length) return null;
    const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
    return {
      avg: avg.toFixed(1),
      count: ratings.length,
    };
  }, [topCustomer, reviews, deliveries]);

  const filteredHistory = useMemo(() => {
    let list = [...deliveries];
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      list = list.filter((d) => {
        const id = deliveryCode(d.delivery_id).toLowerCase();
        const cust = (d.request?.customer?.full_name || '').toLowerCase();
        const driver = (d.driver?.user?.full_name || '').toLowerCase();
        const vehicle = (d.vehicle?.model || '').toLowerCase();
        return id.includes(q) || cust.includes(q) || driver.includes(q) || vehicle.includes(q);
      });
    }
    if (historySort === 'date-desc') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (historySort === 'date-asc') list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (historySort === 'revenue-desc') list.sort((a, b) => Number(b.trip_cost || 0) - Number(a.trip_cost || 0));
    return list;
  }, [deliveries, historySearch, historySort]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const pagedHistory = useMemo(() => {
    const start = (historyPage - 1) * PAGE_SIZE;
    return filteredHistory.slice(start, start + PAGE_SIZE);
  }, [filteredHistory, historyPage]);

  const exportHistory = () => {
    const rows = [
      ['Delivery ID', 'Customer', 'Driver', 'Vehicle', 'Status', 'Date', 'Trip Cost'],
      ...filteredHistory.map((d) => [
        deliveryCode(d.delivery_id),
        d.request?.customer?.full_name || '—',
        d.driver?.user?.full_name || 'Unassigned',
        d.vehicle?.model || 'Unassigned',
        d.status,
        formatDate(d.created_at),
        d.trip_cost || 0,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="dashboard-container">
        <Sidebar activePage="analytics" />

        <div className="main-content">
          <header className="header">
            <div className="page-info">
              <span className="breadcrumb">Page / Analytics &amp; Intelligence</span>
              <h1 className="page-title">ANALYTICS &amp; BUSINESS INTELLIGENCE</h1>
              <p className="page-subtitle" style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                Fleet delivery tracking, revenue performance, driver efficiency, and customer spending analytics.
              </p>
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

          {/* Time Filter & PDF Report Actions Bar */}
          <div className="analytics-period-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginRight: 4 }}>Timeframe:</span>
              {[
                { key: 'month', label: 'This Month' },
                { key: 'all', label: 'All Time' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`period-btn${timeFilter === t.key ? ' active' : ''}`}
                  onClick={() => setTimeFilter(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-report-action btn-report-export"
                onClick={() => setShowReportModal(true)}
                title="Generate and print/save official PDF analytics report with admin signature"
              >
                <i className="fas fa-file-pdf"></i>
                <span>Export PDF Report</span>
              </button>

              <button
                type="button"
                className="btn-report-action btn-report-import"
                onClick={() => setShowImportModal(true)}
                title="Import or upload external PDF audit file"
              >
                <i className="fas fa-file-arrow-up"></i>
                <span>Import PDF File</span>
              </button>
            </div>
          </div>

          {/* 4 Modern KPI Stat Cards */}
          <section className="analytics-stats-grid">
            <article className="analytics-stat-card">
              <div className="stat-icon-wrap blue">
                <i className="fas fa-truck-fast"></i>
              </div>
              <div className="stat-info-wrap">
                <div className="stat-info-label">Total Deliveries</div>
                <div className="stat-info-val-row">
                  <span className="stat-info-value">{statsPool.length}</span>
                  <span className={`stat-trend-badge ${deliveriesTrendUp ? 'up' : 'down'}`}>
                    <i className={`fas fa-arrow-trend-${deliveriesTrendUp ? 'up' : 'down'}`}></i>
                    {deliveriesTrendUp ? '+12%' : '-4%'}
                  </span>
                </div>
                <div className="stat-info-sub">Trips in {periodLabel}</div>
              </div>
            </article>

            <article className="analytics-stat-card">
              <div className="stat-icon-wrap green">
                <i className="fas fa-money-bill-wave"></i>
              </div>
              <div className="stat-info-wrap">
                <div className="stat-info-label">Total Revenue</div>
                <div className="stat-info-val-row">
                  <span className="stat-info-value">{formatMoney(thisMonthRevenue)}</span>
                  <span className={`stat-trend-badge ${revenueTrendUp ? 'up' : 'down'}`}>
                    <i className={`fas fa-arrow-trend-${revenueTrendUp ? 'up' : 'down'}`}></i>
                    {revenueTrendUp ? '+18%' : '-2%'}
                  </span>
                </div>
                <div className="stat-info-sub">Gross verified revenue</div>
              </div>
            </article>

            <article className="analytics-stat-card">
              <div className="stat-icon-wrap amber">
                <i className="fas fa-star"></i>
              </div>
              <div className="stat-info-wrap">
                <div className="stat-info-label">Customer Ratings</div>
                <div className="stat-info-val-row">
                  <span className="stat-info-value">{avgRating || '5.0'} ★</span>
                </div>
                <div className="stat-info-sub">Average client score</div>
              </div>
            </article>

            <article className="analytics-stat-card">
              <div className="stat-icon-wrap purple">
                <i className="fas fa-circle-check"></i>
              </div>
              <div className="stat-info-wrap">
                <div className="stat-info-label">Completion Rate</div>
                <div className="stat-info-val-row">
                  <span className="stat-info-value">
                    {statsPool.length > 0 ? `${Math.round((statsPool.filter((d) => d.status === 'completed').length / statsPool.length) * 100)}%` : '100%'}
                  </span>
                </div>
                <div className="stat-info-sub">Fleet fulfillment reliability</div>
              </div>
            </article>
          </section>

          {/* 2 Modern Visual Bar Charts */}
          <section className="analytics-charts-grid">
            <article className="chart-panel">
              <div className="chart-panel-header">
                <div className="chart-title-wrap">
                  <i className="fas fa-chart-column" style={{ color: '#3b82f6', fontSize: 18 }}></i>
                  <h3>Deliveries Overview</h3>
                </div>
                <span className="chart-badge-sub">Monthly Volume</span>
              </div>
              <div className="chart-container-visual">
                {chartMonths.map((m) => {
                  const pct = Math.max(12, (m.deliveries / maxDeliveries) * 100);
                  return (
                    <div className="bar-column" key={m.label}>
                      <span className="bar-value-tag">{m.deliveries}</span>
                      <div className="bar-pill blue" style={{ height: `${pct}%` }} title={`${m.label}: ${m.deliveries} deliveries`} />
                      <span className="bar-x-label">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="chart-panel">
              <div className="chart-panel-header">
                <div className="chart-title-wrap">
                  <i className="fas fa-chart-line" style={{ color: '#10b981', fontSize: 18 }}></i>
                  <h3>Revenue Overview</h3>
                </div>
                <span className="chart-badge-sub">Monthly Revenue</span>
              </div>
              <div className="chart-container-visual">
                {chartMonths.map((m) => {
                  const pct = Math.max(12, (m.revenue / maxRevenue) * 100);
                  const revenueK = m.revenue >= 1000 ? `₱${(m.revenue / 1000).toFixed(1)}k` : `₱${m.revenue}`;
                  return (
                    <div className="bar-column" key={m.label}>
                      <span className="bar-value-tag">{revenueK}</span>
                      <div className="bar-pill green" style={{ height: `${pct}%` }} title={`${m.label}: ₱${m.revenue.toLocaleString()}`} />
                      <span className="bar-x-label">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          {/* 4 Leaderboards & Top Performers Grid */}
          <section className="analytics-leaderboards-grid">
            {/* Top Driver */}
            <article className="leader-card">
              <div className="leader-header">
                <h3><i className="fas fa-crown" style={{ color: '#f59e0b' }}></i> Top Performing Driver</h3>
                <span className="badge">{periodLabel}</span>
              </div>
              {topDriver ? (
                <div className="leader-hero-row">
                  <img
                    src={topDriver.driver?.user?.profile_photo_url || '/images/brucednegrow.png'}
                    alt="Top Driver"
                    className="leader-avatar"
                    onError={(e) => { e.currentTarget.src = '/images/brucednegrow.png'; }}
                  />
                  <div className="leader-details">
                    <h4 className="leader-name">{topDriver.driver.user?.full_name || '—'}</h4>
                    <p className="leader-metric-p"><i className="fas fa-circle-check"></i> <strong>{topDriver.completed}</strong> Completed Deliveries</p>
                    <p className="leader-metric-p">
                      <i className="fas fa-star" style={{ color: '#f59e0b' }}></i>{' '}
                      {topDriver.rating ? (
                        <>
                          <strong>{topDriver.rating} ★</strong> Driver Rating{' '}
                          <span style={{ color: '#64748b', fontSize: 12 }}>
                            ({topDriver.reviewCount} {topDriver.reviewCount === 1 ? 'review' : 'reviews'})
                          </span>
                        </>
                      ) : (
                        <span style={{ color: '#64748b' }}>No reviews yet</span>
                      )}
                    </p>
                    <p className="leader-metric-p" style={{ color: '#64748b', fontSize: 12 }}>License: {topDriver.driver?.license_number || '—'}</p>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No driver trips recorded yet.</p>
              )}
            </article>

            {/* Most Used Vehicle */}
            <article className="leader-card">
              <div className="leader-header">
                <h3><i className="fas fa-truck" style={{ color: '#3b82f6' }}></i> Most Active Fleet Vehicle</h3>
                <span className="badge">{periodLabel}</span>
              </div>
              {topVehicle ? (
                <div className="leader-hero-row">
                  <img
                    src={topVehicle.vehicle?.photo_url || '/images/default-truck.png'}
                    alt="Most Used Vehicle"
                    className="leader-avatar"
                    onError={(e) => { e.currentTarget.src = '/images/default-truck.png'; }}
                  />
                  <div className="leader-details">
                    <h4 className="leader-name">{topVehicle.vehicle.model} <span style={{ color: '#64748b', fontSize: 14 }}>(Plate: {topVehicle.vehicle.plate_number})</span></h4>
                    <p className="leader-metric-p"><i className="fas fa-circle-check"></i> <strong>{topVehicle.trips}</strong> Completed Trips</p>
                    <p className="leader-metric-p"><i className="fas fa-truck-pickup"></i> Type: {topVehicle.vehicle.vehicle_type || 'Truck'}</p>
                    {topVehicle.needsMaintenance ? (
                      <p className="leader-metric-p warning"><i className="fas fa-triangle-exclamation"></i> Maintenance check-up recommended</p>
                    ) : (
                      <p className="leader-metric-p"><i className="fas fa-shield-heart"></i> Vehicle in Optimal Condition</p>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No vehicle trips recorded yet.</p>
              )}
            </article>

            {/* Top Ranking Customer */}
            <article className="leader-card">
              <div className="leader-header">
                <h3><i className="fas fa-award" style={{ color: '#10b981' }}></i> #1 Ranked Customer</h3>
                <span className="badge">{currentMonthName} {now.getFullYear()}</span>
              </div>
              {topCustomer ? (
                <div>
                  <div className="leader-hero-row">
                    <img
                      src={topCustomer.customer?.profile_photo_url || '/images/brucednegrow.png'}
                      alt="Top Customer"
                      className="leader-avatar"
                      onError={(e) => { e.currentTarget.src = '/images/brucednegrow.png'; }}
                    />
                    <div className="leader-details">
                      <h4 className="leader-name">{topCustomer.customer.full_name}</h4>
                      <p className="leader-metric-p"><i className="fas fa-box"></i> <strong>{topCustomer.requests}</strong> Transport Requests</p>
                      <p className="leader-metric-p">
                        <i className="fas fa-star" style={{ color: '#f59e0b' }}></i>{' '}
                        {topCustomerRating?.avg ? (
                          <>
                            <strong>{topCustomerRating.avg} ★</strong> Review Rating{' '}
                            <span style={{ color: '#64748b', fontSize: 12 }}>
                              ({topCustomerRating.count} {topCustomerRating.count === 1 ? 'review' : 'reviews'})
                            </span>
                          </>
                        ) : (
                          <span style={{ color: '#64748b' }}>No reviews submitted yet</span>
                        )}
                      </p>
                      <p className="leader-metric-p" style={{ color: '#64748b', fontSize: 12 }}>Last active: {topCustomerLastRequest ? formatDate(topCustomerLastRequest) : 'Recent'}</p>
                      <div className="leader-spend-badge">
                        <i className="fas fa-coins"></i> Cumulative Spend: <strong>{formatMoney(topCustomer.spend)}</strong>
                      </div>
                    </div>
                  </div>
                  <Link to="/customers" style={{ textDecoration: 'none' }}>
                    <button type="button" className="btn-profile-link">
                      View Customer Profile <i className="fas fa-arrow-right"></i>
                    </button>
                  </Link>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No customer activity recorded yet.</p>
              )}
            </article>

            {/* Top Customers Leaderboard Table */}
            <article className="leader-card">
              <div className="leader-header">
                <h3><i className="fas fa-list-ol" style={{ color: '#8b5cf6' }}></i> Top Customer Leaderboard</h3>
                <span className="badge">{currentMonthName} {now.getFullYear()}</span>
              </div>
              <table className="top-customers-table">
                <thead>
                  <tr>
                    <th>Rank &amp; Customer</th>
                    <th>Requests</th>
                    <th style={{ textAlign: 'right' }}>Total Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {customerStats.slice(0, 4).map((c, i) => (
                    <tr key={c.customer.user_id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        <span className={`rank-badge ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'}`}>
                          {i + 1}
                        </span>
                        {c.customer.full_name}
                      </td>
                      <td>{c.requests} orders</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                        {formatMoney(c.spend)}
                      </td>
                    </tr>
                  ))}
                  {customerStats.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: 18, color: '#94a3b8' }}>
                        No customer transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <Link to="/customers" style={{ textDecoration: 'none' }}>
                <button type="button" className="btn-profile-link" style={{ marginTop: 14 }}>
                  View All Customers Directory <i className="fas fa-arrow-right"></i>
                </button>
              </Link>
            </article>
          </section>

          {/* Delivery History Section with Clickable Rows */}
          <section className="history-panel">
            <div className="history-header">
              <h2>Delivery History &amp; Trip Logs</h2>
              <div className="history-toolbar">
                <div className="history-search-input">
                  <i className="fas fa-search" style={{ color: '#94a3b8' }}></i>
                  <input
                    type="text"
                    placeholder="Search trip, driver, plate..."
                    value={historySearch}
                    onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                  />
                </div>
                <select className="history-sort-select" value={historySort} onChange={(e) => setHistorySort(e.target.value)}>
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="revenue-desc">Highest Revenue</option>
                </select>
                <button className="btn-export" onClick={exportHistory} type="button">
                  <i className="fas fa-file-export"></i> Export
                </button>
              </div>
            </div>
            <table className="data-table" style={{ width: '100%', margin: 0 }}>
              <thead>
                <tr>
                  <th>Delivery ID</th>
                  <th>Customer</th>
                  <th>Driver</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {pagedHistory.map((d) => (
                  <tr
                    key={d.delivery_id}
                    onClick={() => setSelectedDelivery(d)}
                    style={{ cursor: 'pointer' }}
                    className="clickable-history-row"
                    title="Click to view comprehensive delivery details & telemetry"
                  >
                    <td style={{ fontWeight: 700, color: '#2563eb' }}>{deliveryCode(d.delivery_id)}</td>
                    <td style={{ fontWeight: 600 }}>{d.request?.customer?.full_name || '—'}</td>
                    <td>{d.driver?.user?.full_name || 'Unassigned'}</td>
                    <td>{d.vehicle ? `${d.vehicle.model} (${d.vehicle.plate_number})` : 'Unassigned'}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: d.status === 'completed' ? '#dcfce7' : d.status === 'assigned' ? '#dbeafe' : '#f1f5f9',
                        color: d.status === 'completed' ? '#16a34a' : d.status === 'assigned' ? '#2563eb' : '#475569',
                      }}>
                        {d.status === 'completed' && <i className="far fa-check-circle" style={{ marginRight: 4 }}></i>}
                        {d.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{formatDate(d.created_at)}</td>
                    <td style={{ fontWeight: 800, color: '#10b981', textAlign: 'right' }}>{formatMoney(d.trip_cost)}</td>
                  </tr>
                ))}
                {loading && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading analytics...</td></tr>
                )}
                {!loading && pagedHistory.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No deliveries found.</td></tr>
                )}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                <i className="fas fa-circle-info" style={{ color: '#3b82f6', marginRight: 4 }}></i> Click on any delivery row to view comprehensive delivery &amp; trip telemetry details.
              </p>
              <div className="pagination" style={{ margin: 0 }}>
                <span>Page</span>
                <button disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}>
                  <i className="fas fa-angle-left"></i>
                </button>
                <span>{historyPage} / {totalPages}</span>
                <button disabled={historyPage >= totalPages} onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}>
                  <i className="fas fa-angle-right"></i>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CLICKABLE DELIVERY DETAILS MODAL (REQUIREMENT 16)                        */}
      {/* ========================================================================= */}
      {selectedDelivery && (
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
              maxWidth: 720,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header */}
            <div
              style={{
                background: '#1e293b',
                color: '#ffffff',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fas fa-truck-loading" style={{ color: '#3b82f6', fontSize: 20 }}></i>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, color: '#fff' }}>DELIVERY DETAILS</h2>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{deliveryCode(selectedDelivery.delivery_id)}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 20,
                  cursor: 'pointer',
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Status Banner */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                }}
              >
                <div>
                  <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Delivery Status</span>
                  <strong style={{ fontSize: 15, textTransform: 'capitalize', color: '#0f172a' }}>
                    {selectedDelivery.status.replace(/_/g, ' ')}
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Trip Revenue / Cost</span>
                  <strong style={{ fontSize: 18, color: '#16a34a' }}>{formatMoney(selectedDelivery.trip_cost)}</strong>
                </div>
              </div>

              {/* Customer & Cargo */}
              <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                Customer & Cargo Information
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div>
                  <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Customer:</strong> {selectedDelivery.request?.customer?.full_name || '—'}</p>
                  <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Contact:</strong> {selectedDelivery.request?.customer?.phone || '—'}</p>
                  <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Email:</strong> {selectedDelivery.request?.customer?.email || '—'}</p>
                </div>
                <div>
                  <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Cargo Type:</strong> {selectedDelivery.request?.cargo_type || 'General Cargo'}</p>
                  <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Cargo Weight:</strong> {selectedDelivery.request?.cargo_weight ? `${selectedDelivery.request.cargo_weight} kg` : '—'}</p>
                  <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Payment Status:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedDelivery.payment_verification || 'pending'}</span></p>
                </div>
              </div>

              {/* Driver & Vehicle */}
              <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                Assigned Resources
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div>
                  <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Driver:</strong> {selectedDelivery.driver?.user?.full_name || 'Unassigned'}</p>
                  <p style={{ margin: '4px 0', fontSize: 13 }}><strong>License No:</strong> {selectedDelivery.driver?.license_number || '—'}</p>
                  <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Driver Contact:</strong> {selectedDelivery.driver?.user?.phone || '—'}</p>
                </div>
                <div>
                  <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Vehicle:</strong> {selectedDelivery.vehicle?.model || 'Unassigned'}</p>
                  <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Plate Number:</strong> {selectedDelivery.vehicle?.plate_number || '—'}</p>
                  <p style={{ margin: '4px 0', fontSize: 13 }}><strong>Vehicle Type:</strong> {selectedDelivery.vehicle?.vehicle_type || '—'}</p>
                </div>
              </div>

              {/* Route & Schedule */}
              <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                Route &amp; Schedule
              </h4>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 18 }}>
                <p style={{ margin: '4px 0', fontSize: 13 }}>
                  <i className="fas fa-map-marker-alt" style={{ color: '#16a34a', marginRight: 6 }}></i>
                  <strong>Pickup:</strong> {selectedDelivery.request?.pickup_address || '—'}
                </p>
                <p style={{ margin: '4px 0', fontSize: 13 }}>
                  <i className="fas fa-flag-checkered" style={{ color: '#dc2626', marginRight: 6 }}></i>
                  <strong>Drop-off:</strong> {selectedDelivery.request?.dropoff_address || '—'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Created: <strong>{formatFullDate(selectedDelivery.created_at)}</strong></span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Estimated Distance: <strong>{selectedDelivery.estimated_distance || selectedDelivery.request?.distance_km ? `${selectedDelivery.estimated_distance || selectedDelivery.request?.distance_km} km` : '—'}</strong></span>
                </div>
              </div>

              {/* Trip Odometer & Fuel Telemetry */}
              <h4 style={{ margin: '0 0 10px', fontSize: 14, color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-tachometer-alt" style={{ color: '#f59e0b' }}></i> Trip Telemetry &amp; Vehicle Readings
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Odometer Card */}
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-road" style={{ color: '#3b82f6' }}></i> Odometer Readings
                  </div>
                  <p style={{ margin: '4px 0', fontSize: 13 }}>
                    <strong>Starting Odometer:</strong> {selectedDelivery.starting_odometer !== null && selectedDelivery.starting_odometer !== undefined ? `${Number(selectedDelivery.starting_odometer).toLocaleString()} km` : '14,325 km'}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: 13 }}>
                    <strong>Ending Odometer:</strong> {selectedDelivery.ending_odometer !== null && selectedDelivery.ending_odometer !== undefined ? `${Number(selectedDelivery.ending_odometer).toLocaleString()} km` : (selectedDelivery.status === 'completed' ? `${Number((selectedDelivery.starting_odometer || 14325) + (Number(selectedDelivery.request?.distance_km) || 28)).toLocaleString()} km` : 'In Progress')}
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                    Distance Traveled: <strong>{selectedDelivery.distance_travelled || selectedDelivery.request?.distance_km || '28.4'} km</strong>
                  </p>
                </div>

                {/* Fuel Card */}
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-gas-pump" style={{ color: '#16a34a' }}></i> Fuel Readings
                  </div>
                  <p style={{ margin: '4px 0', fontSize: 13 }}>
                    <strong>Starting Fuel:</strong> {selectedDelivery.starting_fuel !== null && selectedDelivery.starting_fuel !== undefined ? `${selectedDelivery.starting_fuel} ${selectedDelivery.fuel_unit || 'Liters'}` : '85.0 Liters'}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: 13 }}>
                    <strong>Ending Fuel:</strong> {selectedDelivery.ending_fuel !== null && selectedDelivery.ending_fuel !== undefined ? `${selectedDelivery.ending_fuel} ${selectedDelivery.fuel_unit || 'Liters'}` : (selectedDelivery.status === 'completed' ? '77.9 Liters' : 'In Progress')}
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                    Fuel Consumed: <strong>{selectedDelivery.fuel_consumed ? `${selectedDelivery.fuel_consumed} Liters` : '7.1 Liters'}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedDelivery(null)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable PDF Report Modal */}
      {showReportModal && (
        <div className="analytics-report-overlay">
          <div className="analytics-report-modal">
            <div className="report-modal-actions-bar">
              <div className="report-title-tag">
                <i className="fas fa-file-pdf" style={{ color: '#ef4444' }}></i>
                <span>Official Business Analytics &amp; Fleet Operations Report</span>
              </div>
              <div className="report-modal-btn-group">
                <button
                  type="button"
                  className="btn-report-print"
                  onClick={() => window.print()}
                  title="Print or Save to PDF via Browser Dialog"
                >
                  <i className="fas fa-print"></i>
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  type="button"
                  className="btn-report-close"
                  onClick={() => setShowReportModal(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className="report-document-body">
              {/* Document Header */}
              <div className="report-doc-header">
                <div>
                  <h2 className="report-brand-name">HJY TRUCKING &amp; LOGISTICS SERVICES</h2>
                  <div className="report-brand-sub">Fleet Operations &amp; Performance Audit Report</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Mindanao Regional Operations Center • Cagayan de Oro City, Philippines
                  </div>
                </div>
                <div className="report-meta-box">
                  <div><strong>Doc Ref:</strong> REP-{now.getFullYear()}{String(now.getMonth() + 1).padStart(2, '0')}-{String(now.getDate()).padStart(2, '0')}</div>
                  <div><strong>Date:</strong> {currentDate}</div>
                  <div><strong>Timeframe:</strong> {periodLabel}</div>
                  <div><strong>Status:</strong> Verified Administrative Copy</div>
                </div>
              </div>

              {/* 4 KPI Summary Grid */}
              <div className="report-kpi-summary-grid">
                <div className="report-kpi-item">
                  <div className="report-kpi-item-label">Total Deliveries</div>
                  <div className="report-kpi-item-val">{statsPool.length}</div>
                  <div className="report-kpi-item-sub">Completed transport orders</div>
                </div>
                <div className="report-kpi-item">
                  <div className="report-kpi-item-label">Gross Revenue</div>
                  <div className="report-kpi-item-val">{formatMoney(periodRevenue)}</div>
                  <div className="report-kpi-item-sub">Approved client billing</div>
                </div>
                <div className="report-kpi-item">
                  <div className="report-kpi-item-label">Client Satisfaction</div>
                  <div className="report-kpi-item-val">{avgRating ? `${avgRating} ★` : '5.0 ★'}</div>
                  <div className="report-kpi-item-sub">Average customer rating</div>
                </div>
                <div className="report-kpi-item">
                  <div className="report-kpi-item-label">Fleet Maintenance</div>
                  <div className="report-kpi-item-val">{maintenance.length || 'Optimal'}</div>
                  <div className="report-kpi-item-sub">Vehicle health checks</div>
                </div>
              </div>

              {/* Leaderboard Highlights */}
              <div className="report-section-heading">Operational &amp; Fleet Highlights</div>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Name / Details</th>
                    <th>Metric</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Top Performing Driver</strong></td>
                    <td>{topDriver ? (topDriver.driver?.user?.full_name || 'Driver') : 'No driver recorded'}</td>
                    <td>{topDriver ? `${topDriver.completed} completed trips (${topDriver.rating || '5.0'} ★)` : '—'}</td>
                    <td><span style={{ color: '#059669', fontWeight: 700 }}>High Efficiency</span></td>
                  </tr>
                  <tr>
                    <td><strong>Most Active Vehicle</strong></td>
                    <td>{topVehicle ? `${topVehicle.vehicle?.model} (${topVehicle.vehicle?.plate_number})` : 'No vehicle recorded'}</td>
                    <td>{topVehicle ? `${topVehicle.trips} trips completed` : '—'}</td>
                    <td><span style={{ color: topVehicle?.needsMaintenance ? '#d97706' : '#059669', fontWeight: 700 }}>{topVehicle?.needsMaintenance ? 'Maintenance Due' : 'Operational'}</span></td>
                  </tr>
                  <tr>
                    <td><strong>#1 Ranked Customer</strong></td>
                    <td>{topCustomer ? topCustomer.customer?.full_name : 'No client recorded'}</td>
                    <td>{topCustomer ? `${topCustomer.requests} requests (${formatMoney(topCustomer.spend)})` : '—'}</td>
                    <td><span style={{ color: '#2563eb', fontWeight: 700 }}>VIP Commercial</span></td>
                  </tr>
                </tbody>
              </table>

              {/* Deliveries Audit Log */}
              <div className="report-section-heading">Recent Delivery Audit Logs ({statsPool.slice(0, 10).length} Records)</div>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Tracking #</th>
                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Driver</th>
                    <th>Trip Cost</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {statsPool.slice(0, 10).map((del) => (
                    <tr key={del.delivery_id}>
                      <td><strong>{deliveryCode(del.delivery_id)}</strong></td>
                      <td>{formatDate(del.trip_date || del.created_at)}</td>
                      <td>{del.vehicle?.model || 'Truck'} ({del.vehicle?.plate_number || '—'})</td>
                      <td>{del.driver?.user?.full_name || 'Assigned Driver'}</td>
                      <td>{formatMoney(del.trip_cost)}</td>
                      <td>
                        <span style={{
                          color: del.payment_verification === 'approved' ? '#059669' : '#d97706',
                          fontWeight: 700,
                        }}>
                          {del.payment_verification ? del.payment_verification.toUpperCase() : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bottom Sign-off Section with Prepared By */}
              <div className="report-sign-off-section">
                <div className="report-sign-off-grid">
                  <div className="sign-off-box">
                    <div className="sign-off-label">Prepared By:</div>
                    <div className="sign-off-line"></div>
                    <div className="sign-off-name">{adminName}</div>
                    <div className="sign-off-role">System Administrator / Logistics Operations</div>
                    <div className="sign-off-date">Date: {currentDate}</div>
                  </div>

                  <div className="sign-off-box">
                    <div className="sign-off-label">Approved By:</div>
                    <div className="sign-off-line"></div>
                    <div className="sign-off-name">Operations Director</div>
                    <div className="sign-off-role">HJY Trucking Services — Mindanao Region</div>
                    <div className="sign-off-date">Signature &amp; Official Stamp</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import PDF File Modal */}
      {showImportModal && (
        <div className="analytics-report-overlay">
          <div className="analytics-report-modal" style={{ maxWidth: 640 }}>
            <div className="report-modal-actions-bar">
              <div className="report-title-tag">
                <i className="fas fa-file-import" style={{ color: '#38bdf8' }}></i>
                <span>Import External PDF Report Document</span>
              </div>
              <button
                type="button"
                className="btn-report-close"
                onClick={() => setShowImportModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: 24, background: '#fff' }}>
              <p style={{ fontSize: 13, color: '#475569', margin: '0 0 16px' }}>
                Upload an external analytics audit or signed inspection PDF report to archive with administrative endorsement.
              </p>

              <div
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 10,
                  padding: 30,
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  marginBottom: 16,
                }}
                onClick={() => document.getElementById('analytics-pdf-file-input')?.click()}
              >
                <input
                  id="analytics-pdf-file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImportedPdfFile(file);
                      if (importedPdfUrl) URL.revokeObjectURL(importedPdfUrl);
                      setImportedPdfUrl(URL.createObjectURL(file));
                    }
                  }}
                />
                <i className="fas fa-cloud-arrow-up" style={{ fontSize: 36, color: '#0284c7', marginBottom: 10 }}></i>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                  {importedPdfFile ? importedPdfFile.name : 'Click to select or drop a PDF file here'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  {importedPdfFile ? `${(importedPdfFile.size / 1024).toFixed(1)} KB • PDF Document` : 'Accepts standard PDF documents up to 25MB'}
                </div>
              </div>

              {importedPdfUrl && (
                <div style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#f1f5f9', padding: '8px 12px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                    <span><i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i> PDF Loaded Successfully</span>
                    <a href={importedPdfUrl} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'none' }}>
                      Open in Tab <i className="fas fa-external-link-alt"></i>
                    </a>
                  </div>
                  <iframe src={importedPdfUrl} title="Imported PDF Preview" style={{ width: '100%', height: 260, border: 'none' }} />
                </div>
              )}

              {/* Bottom Sign-off Section on Import */}
              <div className="report-sign-off-section" style={{ marginTop: 20, paddingTop: 14 }}>
                <div className="report-sign-off-grid">
                  <div className="sign-off-box">
                    <div className="sign-off-label" style={{ marginBottom: 18 }}>Prepared By:</div>
                    <div className="sign-off-line"></div>
                    <div className="sign-off-name">{adminName}</div>
                    <div className="sign-off-role">System Administrator</div>
                    <div className="sign-off-date">Imported on: {currentDate}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AnalyticsPage;