import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';
import api from '../api/api-client';

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Active Tab State ('pricing' | 'bugs')
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'bugs' ? 'bugs' : 'pricing';
  });

  // Pricing Form State
  const [baseLaborFee, setBaseLaborFee] = useState(800);
  const [distanceRate, setDistanceRate] = useState(80);
  const [weightRate, setWeightRate] = useState(1);

  // Costing Preview Sample State
  const [previewDistance, setPreviewDistance] = useState(10);
  const [previewWeight, setPreviewWeight] = useState(20000);

  // System Overview State
  const [lastUpdatedOn, setLastUpdatedOn] = useState('');
  const [lastUpdatedBy, setLastUpdatedBy] = useState(null);
  const [systemVersion, setSystemVersion] = useState('V.1.00');

  // Bug Reports State
  const [bugReports, setBugReports] = useState([]);
  const [loadingBugs, setLoadingBugs] = useState(false);
  const [bugSearch, setBugSearch] = useState('');
  const [appFilter, setAppFilter] = useState('all'); // 'all', 'driver-app', 'staff-app', 'customer-app'
  const [selectedBug, setSelectedBug] = useState(null);
  const [deletingBugId, setDeletingBugId] = useState(null);

  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const themeOn = localStorage.getItem('pref_theme') === 'dark';

  useEffect(() => {
    const update = () =>
      setCurrentDate(
        new Date().toLocaleDateString('en-PH', {
          weekday: 'short',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  // Sync tab with URL search parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'bugs' && activeTab !== 'bugs') {
      setActiveTab('bugs');
    } else if (tabParam === 'pricing' && activeTab !== 'pricing') {
      setActiveTab('pricing');
    }
  }, [location.search, activeTab]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate(`?${params.toString()}`, { replace: true });
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'March 1, 2026 12:30 PM';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return (
      d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' ' +
      d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    );
  };

  const formatReportDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return (
      d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' ' +
      d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    );
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/system-settings');
      if (res.data) {
        setBaseLaborFee(res.data.base_labor_fee ?? 800);
        setDistanceRate(res.data.distance_rate ?? 80);
        setWeightRate(res.data.weight_rate ?? 1);
        setSystemVersion(res.data.system_version || 'V.1.00');
        setLastUpdatedOn(res.data.updated_at || '');
        setLastUpdatedBy(res.data.updated_by_user || null);
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBugReports = useCallback(async () => {
    setLoadingBugs(true);
    try {
      const res = await api.get('/bug-reports', { skipCache: true });
      if (Array.isArray(res.data)) {
        setBugReports(res.data);
      }
    } catch (err) {
      console.error('Failed to load bug reports:', err);
    } finally {
      setLoadingBugs(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadBugReports();
  }, [loadSettings, loadBugReports]);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        base_labor_fee: parseFloat(baseLaborFee) || 0,
        distance_rate: parseFloat(distanceRate) || 0,
        weight_rate: parseFloat(weightRate) || 0,
      };

      const res = await api.put('/system-settings', payload);
      setSuccessMsg('Pricing configurations updated successfully!');
      if (res.data) {
        setBaseLaborFee(res.data.base_labor_fee ?? payload.base_labor_fee);
        setDistanceRate(res.data.distance_rate ?? payload.distance_rate);
        setWeightRate(res.data.weight_rate ?? payload.weight_rate);
        setLastUpdatedOn(res.data.updated_at || new Date().toISOString());
        setLastUpdatedBy(res.data.updated_by_user || authUser);
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save pricing configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/system-settings/reset');
      setBaseLaborFee(res.data?.base_labor_fee ?? 800);
      setDistanceRate(res.data?.distance_rate ?? 80);
      setWeightRate(res.data?.weight_rate ?? 1);
      setLastUpdatedOn(res.data?.updated_at || new Date().toISOString());
      setLastUpdatedBy(res.data?.updated_by_user || authUser);
      setSuccessMsg('Pricing configurations reset to default (₱800 labor, ₱80/km, ₱1/kg).');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to reset pricing configurations.');
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteBug = async (reportId) => {
    if (!window.confirm('Are you sure you want to dismiss and delete this bug report?')) {
      return;
    }
    setDeletingBugId(reportId);
    try {
      await api.delete(`/bug-reports/${reportId}`);
      setBugReports((prev) => prev.filter((r) => r.report_id !== reportId));
      if (selectedBug && selectedBug.report_id === reportId) {
        setSelectedBug(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete bug report.');
    } finally {
      setDeletingBugId(null);
    }
  };

  // Filtered Bug Reports
  const filteredBugs = useMemo(() => {
    return bugReports.filter((report) => {
      // App Filter
      if (appFilter !== 'all') {
        const source = (report.app_source || '').toLowerCase();
        if (appFilter === 'driver-app' && !source.includes('driver')) return false;
        if (appFilter === 'staff-app' && !source.includes('staff')) return false;
        if (appFilter === 'customer-app' && !source.includes('customer')) return false;
      }

      // Search Query
      if (bugSearch.trim()) {
        const q = bugSearch.toLowerCase().trim();
        const ticket = (report.ticket_number || '').toLowerCase();
        const reporter = (report.reporter_name || '').toLowerCase();
        const role = (report.reporter_role || '').toLowerCase();
        const cat = (report.category || '').toLowerCase();
        const desc = (report.description || '').toLowerCase();
        const source = (report.app_source || '').toLowerCase();
        return (
          ticket.includes(q) ||
          reporter.includes(q) ||
          role.includes(q) ||
          cat.includes(q) ||
          desc.includes(q) ||
          source.includes(q)
        );
      }

      return true;
    });
  }, [bugReports, appFilter, bugSearch]);

  // Live Costing Preview Calculations
  const calcLabor = Number(baseLaborFee) || 0;
  const calcDistanceDist = Number(previewDistance) || 0;
  const calcDistanceCost = calcDistanceDist * (Number(distanceRate) || 0);
  const calcWeightAmount = Number(previewWeight) || 0;
  const calcWeightCost = calcWeightAmount * (Number(weightRate) || 0);
  const calcTotalEstimated = calcLabor + calcDistanceCost + calcWeightCost;

  // Updater Info Formatting
  const getUpdaterDisplay = () => {
    if (lastUpdatedBy) {
      const code = lastUpdatedBy.user_id ? `(ADM${String(lastUpdatedBy.user_id).padStart(4, '0')})` : '';
      return `${lastUpdatedBy.full_name || 'Admin'} ${code}`.trim();
    }

    if (authUser?.full_name) {
      const code = authUser.user_id ? `(ADM${String(authUser.user_id).padStart(4, '0')})` : '';
      return `${authUser.full_name} ${code}`.trim();
    }
    return 'Bruce Wayne (ADM0002)';
  };

  const getUpdaterAvatar = () => {
    return lastUpdatedBy?.profile_photo_url || authUser?.profile_photo_url || '/images/brucednegrow.png';
  };

  const getRoleBadge = (roleStr) => {
    const role = (roleStr || 'user').toLowerCase();
    if (role.includes('driver')) {
      return (
        <span className="report-role-badge role-driver">
          <i className="fas fa-truck-moving"></i> Driver
        </span>
      );
    }
    if (role.includes('inspector') || role.includes('staff')) {
      return (
        <span className="report-role-badge role-staff">
          <i className="fas fa-clipboard-check"></i> Inspector / Staff
        </span>
      );
    }
    if (role.includes('customer')) {
      return (
        <span className="report-role-badge role-customer">
          <i className="fas fa-user"></i> Customer
        </span>
      );
    }
    return (
      <span className="report-role-badge role-default">
        <i className="fas fa-user-circle"></i> {roleStr || 'User'}
      </span>
    );
  };

  const getAppSourceBadge = (sourceStr) => {
    const src = (sourceStr || '').toLowerCase();
    if (src.includes('driver')) {
      return (
        <span className="report-source-badge source-driver">
          <i className="fas fa-truck"></i> driver-app
        </span>
      );
    }
    if (src.includes('staff')) {
      return (
        <span className="report-source-badge source-staff">
          <i className="fas fa-clipboard-list"></i> staff-app
        </span>
      );
    }
    if (src.includes('customer')) {
      return (
        <span className="report-source-badge source-customer">
          <i className="fas fa-mobile-alt"></i> customer-app
        </span>
      );
    }
    return (
      <span className="report-source-badge source-general">
        <i className="fas fa-laptop-code"></i> {sourceStr || 'mobile-app'}
      </span>
    );
  };

  return (
    <div className={`dashboard-container settings-container ${themeOn ? 'dark-theme' : ''}`}>
      <Sidebar activePage="settings" />

      <main className="settings-main">
        {/* Header */}
        <header className="settings-header">
          <div>
            <span className="settings-breadcrumb">Page / Settings</span>
            <h1 className="settings-page-title">System Settings</h1>
          </div>
          <div className="settings-header-actions">
            <div className="settings-date-badge">
              <span>{currentDate || 'Fri, 29 March 2026'}</span>
              <i className="far fa-calendar-alt"></i>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Tab Switcher Pills */}
        <div className="settings-nav-tabs">
          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => switchTab('pricing')}
          >
            <i className="fas fa-sliders-h"></i>
            <span>General & Pricing</span>
          </button>
          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'bugs' ? 'active' : ''}`}
            onClick={() => switchTab('bugs')}
          >
            <i className="fas fa-bug"></i>
            <span>Bug & Feedback Reports</span>
            {bugReports.length > 0 && (
              <span className="settings-nav-badge">{bugReports.length}</span>
            )}
          </button>
        </div>

        {/* Feedback Alerts */}
        {successMsg && (
          <div className="settings-alert settings-alert-success">
            <i className="fas fa-check-circle"></i>
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="settings-alert settings-alert-error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: General & Pricing Configurations */}
        {activeTab === 'pricing' && (
          <div className="settings-grid">
            {/* Top Row: Left (Pricing Configurations) and Right (Costing Preview) */}
            <div className="settings-top-row">
              {/* Left Card: Pricing Configurations */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <i className="fas fa-tag settings-header-icon red"></i>
                  <div>
                    <h2 className="settings-card-title">Pricing Configurations</h2>
                    <p className="settings-card-subtitle">
                      Configure the prices and the cost of the company's Services.
                    </p>
                  </div>
                </div>

                <div className="pricing-config-list">
                  {/* 1. Base Labor Fee */}
                  <div className="pricing-config-item">
                    <div className="pricing-item-left">
                      <div className="pricing-icon-wrapper green">
                        <i className="fas fa-user-check"></i>
                      </div>
                      <div className="pricing-item-info">
                        <span className="pricing-item-title">Base Labor Fee</span>
                        <span className="pricing-item-desc">Base Charge per Delivery.</span>
                      </div>
                    </div>
                    <div className="pricing-item-input-wrap">
                      <div className="currency-input-pill">
                        <span className="currency-symbol">₱</span>
                        <input
                          type="number"
                          className="rate-input"
                          value={baseLaborFee}
                          onChange={(e) => setBaseLaborFee(e.target.value)}
                          min="0"
                          step="1"
                          disabled={loading || saving}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Distance Rate */}
                  <div className="pricing-config-item">
                    <div className="pricing-item-left">
                      <div className="pricing-icon-wrapper red">
                        <i className="fas fa-map-marker-alt"></i>
                      </div>
                      <div className="pricing-item-info">
                        <span className="pricing-item-title">Distance Rate</span>
                        <span className="pricing-item-desc">Charge per 1 kilometer Traveled.</span>
                      </div>
                    </div>
                    <div className="pricing-item-input-wrap">
                      <div className="currency-input-pill">
                        <span className="currency-symbol">₱</span>
                        <input
                          type="number"
                          className="rate-input"
                          value={distanceRate}
                          onChange={(e) => setDistanceRate(e.target.value)}
                          min="0"
                          step="1"
                          disabled={loading || saving}
                        />
                      </div>
                      <span className="rate-unit">per km</span>
                    </div>
                  </div>

                  {/* 3. Weight Rate */}
                  <div className="pricing-config-item">
                    <div className="pricing-item-left">
                      <div className="pricing-icon-wrapper orange">
                        <i className="fas fa-weight-hanging"></i>
                      </div>
                      <div className="pricing-item-info">
                        <span className="pricing-item-title">Weight Rate</span>
                        <span className="pricing-item-desc">Charge based per 1 kilogram of Cargo weight.</span>
                      </div>
                    </div>
                    <div className="pricing-item-input-wrap">
                      <div className="currency-input-pill">
                        <span className="currency-symbol">₱</span>
                        <input
                          type="number"
                          className="rate-input"
                          value={weightRate}
                          onChange={(e) => setWeightRate(e.target.value)}
                          min="0"
                          step="0.1"
                          disabled={loading || saving}
                        />
                      </div>
                      <span className="rate-unit">per kg</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pricing-actions-row">
                  <button
                    type="button"
                    className="btn-reset-default"
                    onClick={handleReset}
                    disabled={loading || saving || resetting}
                  >
                    <i className={`fas fa-sync-alt ${resetting ? 'fa-spin' : ''}`}></i>
                    <span>{resetting ? 'Resetting...' : 'Reset to Default'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-save-settings"
                    onClick={handleSave}
                    disabled={loading || saving}
                  >
                    <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>

              {/* Right Card: Costing Preview */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <i className="fas fa-calculator settings-header-icon green"></i>
                  <div>
                    <h2 className="settings-card-title">Costing Preview</h2>
                    <p className="settings-card-subtitle">
                      Configure the prices and the cost of the company's Services.
                    </p>
                  </div>
                </div>

                <span className="costing-sample-badge">Sample Calculation</span>

                <div className="costing-rows-list">
                  {/* Labor Fee Line */}
                  <div className="costing-row">
                    <span className="costing-row-label">Labor Fee:</span>
                    <span className="costing-row-val">₱ {calcLabor.toLocaleString('en-PH')}</span>
                  </div>

                  {/* Distance Line */}
                  <div className="costing-row">
                    <div className="costing-row-label">
                      <span>Distance(km):</span>
                      <span className="costing-param-input">
                        <input
                          type="number"
                          value={previewDistance}
                          onChange={(e) => setPreviewDistance(e.target.value)}
                          min="0"
                        />
                      </span>
                    </div>
                    <span className="costing-row-val">₱ {calcDistanceCost.toLocaleString('en-PH')}</span>
                  </div>

                  {/* Weight Line */}
                  <div className="costing-row">
                    <div className="costing-row-label">
                      <span>Weight(kg):</span>
                      <span className="costing-param-input">
                        <input
                          type="number"
                          value={previewWeight}
                          onChange={(e) => setPreviewWeight(e.target.value)}
                          min="0"
                        />
                      </span>
                    </div>
                    <span className="costing-row-val">₱ {calcWeightCost.toLocaleString('en-PH')}</span>
                  </div>
                </div>

                <div className="costing-divider"></div>

                {/* Total Estimated Cost */}
                <div className="costing-total-row">
                  <span className="costing-total-label">Total Estimated Cost:</span>
                  <span className="costing-total-value">
                    ₱ {calcTotalEstimated.toLocaleString('en-PH')}
                  </span>
                </div>

                {/* Note callout */}
                <div className="costing-note-box">
                  <i className="fas fa-info-circle"></i>
                  <p className="costing-note-text">
                    <strong>Note:</strong> This is an estimate price only the Final price may vary based on actual delivery details.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Row: System Overview Card */}
            <div className="settings-card">
              <div className="settings-card-header" style={{ marginBottom: 16 }}>
                <i className="fas fa-desktop settings-header-icon purple"></i>
                <div>
                  <h2 className="settings-card-title">System Overview</h2>
                  <p className="settings-card-subtitle">
                    Configure general system behavior and operational preferences.
                  </p>
                </div>
              </div>

              <div className="overview-columns-grid">
                {/* Metric 1: Last Updated On */}
                <div className="overview-metric-item">
                  <div className="overview-metric-icon green">
                    <i className="far fa-calendar-alt"></i>
                  </div>
                  <div className="overview-metric-info">
                    <span className="overview-metric-label">Last Updated On</span>
                    <span className="overview-metric-value">{formatTimestamp(lastUpdatedOn)}</span>
                  </div>
                </div>

                {/* Metric 2: Last Updated By */}
                <div className="overview-metric-item">
                  <div className="overview-metric-icon avatar">
                    <img src={getUpdaterAvatar()} alt="Updater Avatar" />
                  </div>
                  <div className="overview-metric-info">
                    <span className="overview-metric-label">Last Updated By</span>
                    <span className="overview-metric-value">{getUpdaterDisplay()}</span>
                  </div>
                </div>

                {/* Metric 3: System Version */}
                <div className="overview-metric-item">
                  <div className="overview-metric-icon purple">
                    <i className="fas fa-microchip"></i>
                  </div>
                  <div className="overview-metric-info">
                    <span className="overview-metric-label">System Version</span>
                    <span className="overview-metric-value">{systemVersion}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Bug & Feedback Reports (White & Red Theme, View-Only, No Status Column) */}
        {activeTab === 'bugs' && (
          <div className="bug-reports-section">
            {/* Control Bar Card */}
            <div className="settings-card bug-controls-card">
              <div className="bug-header-top-row">
                <div className="bug-header-text">
                  <div className="bug-header-title-wrap">
                    <i className="fas fa-bug settings-header-icon red"></i>
                    <div>
                      <h2 className="settings-card-title">Bug Reports & App Feedback</h2>
                      <p className="settings-card-subtitle">
                        Real-time technical issue reports submitted by Drivers, Inspectors/Staff, and Customers from their mobile applications.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bug-header-actions">
                  <button
                    type="button"
                    className="btn-refresh-bugs"
                    onClick={loadBugReports}
                    disabled={loadingBugs}
                    title="Refresh reports"
                  >
                    <i className={`fas fa-sync-alt ${loadingBugs ? 'fa-spin' : ''}`}></i>
                    <span>Refresh</span>
                  </button>
                  <div className="bug-total-counter">
                    <span className="counter-num">{filteredBugs.length}</span>
                    <span className="counter-label">{filteredBugs.length === 1 ? 'Report' : 'Reports'}</span>
                  </div>
                </div>
              </div>

              {/* Filters & Search Row */}
              <div className="bug-filters-row">
                {/* App Source Filters */}
                <div className="bug-app-filter-pills">
                  <button
                    type="button"
                    className={`bug-filter-pill ${appFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setAppFilter('all')}
                  >
                    All Apps ({bugReports.length})
                  </button>
                  <button
                    type="button"
                    className={`bug-filter-pill ${appFilter === 'driver-app' ? 'active' : ''}`}
                    onClick={() => setAppFilter('driver-app')}
                  >
                    <i className="fas fa-truck"></i> Driver App
                  </button>
                  <button
                    type="button"
                    className={`bug-filter-pill ${appFilter === 'staff-app' ? 'active' : ''}`}
                    onClick={() => setAppFilter('staff-app')}
                  >
                    <i className="fas fa-clipboard-list"></i> Staff App
                  </button>
                  <button
                    type="button"
                    className={`bug-filter-pill ${appFilter === 'customer-app' ? 'active' : ''}`}
                    onClick={() => setAppFilter('customer-app')}
                  >
                    <i className="fas fa-mobile-alt"></i> Customer App
                  </button>
                </div>

                {/* Search Box */}
                <div className="bug-search-box">
                  <i className="fas fa-search bug-search-icon"></i>
                  <input
                    type="text"
                    className="bug-search-input"
                    placeholder="Search by ticket, reporter, category, keyword..."
                    value={bugSearch}
                    onChange={(e) => setBugSearch(e.target.value)}
                  />
                  {bugSearch && (
                    <button
                      type="button"
                      className="bug-search-clear"
                      onClick={() => setBugSearch('')}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bug Reports Data Table Card */}
            <div className="settings-card bug-table-card">
              <div className="bug-table-container">
                <table className="bug-reports-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Ticket ID</th>
                      <th style={{ width: '220px' }}>Reporter</th>
                      <th style={{ width: '150px' }}>App Source</th>
                      <th style={{ width: '190px' }}>Category</th>
                      <th>Description</th>
                      <th style={{ width: '180px' }}>Date & Time</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingBugs ? (
                      <tr>
                        <td colSpan="7" className="bug-table-empty">
                          <i className="fas fa-spinner fa-spin bug-empty-icon red"></i>
                          <p>Loading bug reports from mobile apps...</p>
                        </td>
                      </tr>
                    ) : filteredBugs.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="bug-table-empty">
                          <i className="fas fa-check-circle bug-empty-icon green"></i>
                          <h4>No Bug Reports Found</h4>
                          <p>
                            {bugSearch || appFilter !== 'all'
                              ? 'No reports match your current filter criteria.'
                              : 'All clear! No issues reported from driver, staff, or customer mobile apps.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredBugs.map((bug) => (
                        <tr key={bug.report_id || bug.ticket_number} className="bug-table-row">
                          {/* 1. Ticket ID */}
                          <td>
                            <span className="report-ticket-tag">
                              {bug.ticket_number || `TCKT-${String(bug.report_id).padStart(3, '0')}`}
                            </span>
                          </td>

                          {/* 2. Reporter with Role */}
                          <td>
                            <div className="reporter-cell">
                              <span className="reporter-name" title={bug.reporter_name || 'Anonymous User'}>
                                {bug.reporter_name || 'Anonymous User'}
                              </span>
                              {getRoleBadge(bug.reporter_role)}
                            </div>
                          </td>

                          {/* 3. App Source */}
                          <td>{getAppSourceBadge(bug.app_source)}</td>

                          {/* 4. Category */}
                          <td>
                            <span className="report-category-pill" title={bug.category}>
                              {bug.category || 'General Issue'}
                            </span>
                          </td>

                          {/* 5. Description */}
                          <td>
                            <div className="report-desc-snippet" title={bug.description}>
                              {bug.description}
                            </div>
                          </td>

                          {/* 6. Date & Time */}
                          <td>
                            <div className="report-date-text">
                              <i className="far fa-clock"></i>
                              <span>{formatReportDate(bug.created_at)}</span>
                            </div>
                          </td>

                          {/* 7. View Button */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn-view-bug"
                              onClick={() => setSelectedBug(bug)}
                              title="View full report details"
                            >
                              <i className="fas fa-eye"></i>
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* View Bug Details Modal (Clean, Light-mode, White & Red Details) */}
        {selectedBug && (
          <div className="bug-modal-overlay" onClick={() => setSelectedBug(null)}>
            <div className="bug-modal-card" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="bug-modal-header">
                <div className="bug-modal-header-title">
                  <span className="bug-modal-ticket-badge">
                    {selectedBug.ticket_number || `TCKT-${String(selectedBug.report_id).padStart(3, '0')}`}
                  </span>
                  <div>
                    <h3>Bug Report Details</h3>
                    <p className="bug-modal-subtitle">
                      Reported via {selectedBug.app_source || 'Mobile Application'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="bug-modal-close-btn"
                  onClick={() => setSelectedBug(null)}
                  aria-label="Close modal"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Modal Body */}
              <div className="bug-modal-body">
                {/* 4-Item Information Grid */}
                <div className="bug-modal-info-grid">
                  <div className="bug-modal-info-item">
                    <span className="bug-modal-label">Reporter Name & Role</span>
                    <div className="bug-modal-reporter-val">
                      <strong className="reporter-name-modal">
                        {selectedBug.reporter_name || 'Anonymous User'}
                      </strong>
                      {getRoleBadge(selectedBug.reporter_role)}
                    </div>
                  </div>

                  <div className="bug-modal-info-item">
                    <span className="bug-modal-label">Source Application</span>
                    <div style={{ marginTop: 4 }}>
                      {getAppSourceBadge(selectedBug.app_source)}
                    </div>
                  </div>

                  <div className="bug-modal-info-item">
                    <span className="bug-modal-label">Issue Category</span>
                    <div style={{ marginTop: 4 }}>
                      <span className="report-category-pill">
                        {selectedBug.category || 'General Issue'}
                      </span>
                    </div>
                  </div>

                  <div className="bug-modal-info-item">
                    <span className="bug-modal-label">Reported Timestamp</span>
                    <span className="bug-modal-date-val">
                      <i className="far fa-calendar-alt"></i>
                      {formatReportDate(selectedBug.created_at)}
                    </span>
                  </div>
                </div>

                {/* Device Environment info if available */}
                {selectedBug.device_info && (
                  <div className="bug-modal-device-box">
                    <div className="device-icon-wrap">
                      <i className="fas fa-mobile-alt"></i>
                    </div>
                    <div className="device-info-content">
                      <span className="bug-modal-device-label">Client Device & Environment</span>
                      <p className="bug-modal-device-text">{selectedBug.device_info}</p>
                    </div>
                  </div>
                )}

                {/* Full Description Card */}
                <div className="bug-modal-desc-box">
                  <span className="bug-modal-desc-label">
                    <i className="fas fa-align-left"></i> Full Issue Description
                  </span>
                  <div className="bug-modal-desc-content">
                    {selectedBug.description}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bug-modal-footer">
                <button
                  type="button"
                  className="btn-delete-report"
                  onClick={() => handleDeleteBug(selectedBug.report_id)}
                  disabled={deletingBugId === selectedBug.report_id}
                >
                  <i className={`fas ${deletingBugId === selectedBug.report_id ? 'fa-spinner fa-spin' : 'fa-trash-alt'}`}></i>
                  <span>{deletingBugId === selectedBug.report_id ? 'Deleting...' : 'Dismiss / Delete Report'}</span>
                </button>
                <button
                  type="button"
                  className="btn-close-modal"
                  onClick={() => setSelectedBug(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
