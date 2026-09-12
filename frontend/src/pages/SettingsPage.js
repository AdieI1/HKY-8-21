import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';
import api from '../api/api-client';

export default function SettingsPage() {
  const [currentDate, setCurrentDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'March 1, 2026 12:30 PM';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }) + ' ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
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

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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

  return (
    <div className={`dashboard-container settings-container ${themeOn ? 'dark-theme' : ''}`}>
      <Sidebar activePage="settings" />

      <main className="settings-main">
        {/* Header */}
        <header className="settings-header">
          <div>
            <span className="settings-breadcrumb">Page/Settings</span>
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

        {/* Main Grid */}
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
      </main>
    </div>
  );
}
