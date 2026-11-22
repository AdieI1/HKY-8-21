import React, { useState, useMemo } from 'react';

function getDeliveryCategory(d) {
  if (d.status === 'completed') return 'completed';
  if (
    [
      'assigned',
      'accepted',
      'arrived_pickup',
      'loading_cargo',
      'out_for_delivery',
      'in_transit',
      'arrived_dropoff',
      'unloading_cargo',
      'returning_to_hq',
    ].includes(d.status)
  ) {
    return 'in_progress';
  }
  if (['cancelled', 'rejected', 'failed'].includes(d.status) || Boolean(d.is_delayed)) {
    return 'issues';
  }
  return 'pending';
}

function getStatusBadge(status, isDelayed) {
  if (status === 'completed') {
    return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', label: 'Completed', icon: 'fas fa-check-circle' };
  }
  if (status === 'in_transit' || status === 'out_for_delivery') {
    return { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe', label: 'In Transit', icon: 'fas fa-truck' };
  }
  if (status === 'assigned' || status === 'accepted') {
    return { bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe', label: 'Dispatched', icon: 'fas fa-clipboard-check' };
  }
  if (status === 'arrived_pickup' || status === 'loading_cargo') {
    return { bg: '#fef3c7', text: '#b45309', border: '#fde68a', label: 'Loading Cargo', icon: 'fas fa-box' };
  }
  if (status === 'arrived_dropoff' || status === 'unloading_cargo') {
    return { bg: '#ecfccb', text: '#4d7c0f', border: '#d9f99d', label: 'Unloading Cargo', icon: 'fas fa-dolly' };
  }
  if (status === 'returning_to_hq') {
    return { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa', label: 'Returning to HQ', icon: 'fas fa-rotate-left' };
  }
  if (status === 'cancelled') {
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', label: 'Cancelled', icon: 'fas fa-ban' };
  }
  if (status === 'rejected') {
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', label: 'Rejected', icon: 'fas fa-times-circle' };
  }
  if (isDelayed) {
    return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5', label: 'Delayed', icon: 'fas fa-exclamation-triangle' };
  }
  return {
    bg: '#fef9c3',
    text: '#854d0e',
    border: '#fef08a',
    label: (status || 'Pending').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: 'fas fa-clock',
  };
}

function getCompletionExplanation(d) {
  if (d.status === 'completed') {
    const dateStr = d.end_time || d.completed_at || d.updated_at || d.created_at;
    const formattedDate = dateStr
      ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'recently';
    return `Delivered successfully to destination on ${formattedDate}.`;
  }
  if (d.status === 'in_transit' || d.status === 'out_for_delivery') {
    return 'Currently in transit on the road heading to the drop-off location.';
  }
  if (d.status === 'assigned' || d.status === 'accepted') {
    return 'Dispatched to driver. Vehicle is preparing for cargo pickup.';
  }
  if (d.status === 'arrived_pickup' || d.status === 'loading_cargo') {
    return 'Arrived at pickup location. Cargo loading is actively in progress.';
  }
  if (d.status === 'arrived_dropoff' || d.status === 'unloading_cargo') {
    return 'Arrived at delivery destination. Unloading cargo at customer site.';
  }
  if (d.status === 'returning_to_hq') {
    return 'Delivery completed. Driver is returning fleet unit to headquarters.';
  }
  if (d.status === 'cancelled') {
    return 'Trip was cancelled before delivery could be completed.';
  }
  if (d.status === 'rejected') {
    return 'Delivery request was rejected or unassigned.';
  }
  if (d.is_delayed) {
    return 'Shipment experienced an active transit delay or incident issue.';
  }
  return 'Pending dispatch assignment or awaiting driver route departure.';
}

function formatRoute(fromAddr, toAddr) {
  if (!fromAddr && !toAddr) return 'Local Route';
  const clean = (addr) => {
    if (!addr) return '';
    const parts = String(addr).split(',').map((s) => s.trim()).filter(Boolean);
    return parts[0] || addr;
  };
  return `${clean(fromAddr)} → ${clean(toAddr)}`;
}

export default function CompletionRateModal({
  isOpen,
  onClose,
  deliveries = [],
  periodLabel = 'All Time',
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'completed' | 'in_progress' | 'pending' | 'issues'
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const PAGE_SIZE = 8;

  // Key calculation numbers
  const totalCount = deliveries.length;
  const completedList = useMemo(() => deliveries.filter((d) => d.status === 'completed'), [deliveries]);
  const inProgressList = useMemo(
    () => deliveries.filter((d) => getDeliveryCategory(d) === 'in_progress'),
    [deliveries]
  );
  const pendingList = useMemo(
    () => deliveries.filter((d) => getDeliveryCategory(d) === 'pending'),
    [deliveries]
  );
  const issuesList = useMemo(
    () => deliveries.filter((d) => getDeliveryCategory(d) === 'issues'),
    [deliveries]
  );

  const completedCount = completedList.length;
  const inProgressCount = inProgressList.length;
  const pendingCount = pendingList.length;
  const issuesCount = issuesList.length;

  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;
  const exactPct = totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : '100.0';

  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const adminName =
    authUser.full_name ||
    authUser.name ||
    (authUser.first_name ? `${authUser.first_name} ${authUser.last_name || ''}`.trim() : '') ||
    authUser.username ||
    'System Administrator';

  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('en-PH', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Filtered deliveries list
  const filteredList = useMemo(() => {
    return deliveries.filter((d) => {
      const cat = getDeliveryCategory(d);
      if (activeTab === 'completed' && cat !== 'completed') return false;
      if (activeTab === 'in_progress' && cat !== 'in_progress') return false;
      if (activeTab === 'pending' && cat !== 'pending') return false;
      if (activeTab === 'issues' && cat !== 'issues') return false;

      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const code = `dlv${String(d.delivery_id).padStart(4, '0')}`.toLowerCase();
      const customer = (d.request?.customer?.full_name || '').toLowerCase();
      const item = (d.request?.item_name || d.request?.cargo_type || '').toLowerCase();
      const driver = (d.driver?.user?.full_name || '').toLowerCase();
      const plate = (d.vehicle?.plate_number || '').toLowerCase();
      const pickup = (d.request?.pickup_address || '').toLowerCase();
      const dropoff = (d.request?.dropoff_address || '').toLowerCase();
      const status = (d.status || '').toLowerCase();

      return (
        code.includes(q) ||
        customer.includes(q) ||
        item.includes(q) ||
        driver.includes(q) ||
        plate.includes(q) ||
        pickup.includes(q) ||
        dropoff.includes(q) ||
        status.includes(q)
      );
    });
  }, [deliveries, activeTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const pagedList = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, page]);

  if (!isOpen) return null;

  return (
    <>
      <div className="overview-modal-overlay" onClick={onClose}>
        <div
          className="overview-modal-card"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          style={{
            maxWidth: '1000px',
            width: '95vw',
            maxHeight: '92vh',
            padding: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            borderRadius: '16px',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                type="button"
                className="overview-back-btn"
                onClick={onClose}
                title="Go back"
                aria-label="Back"
                style={{ position: 'static', transform: 'none' }}
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#f3e8ff',
                  color: '#7e22ce',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '19px',
                  flexShrink: 0,
                }}
              >
                <i className="fas fa-circle-check"></i>
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Completion Rate &amp; Fulfillment Breakdown
                </h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Fulfillment analysis for <strong>{periodLabel}</strong> ({totalCount} total shipments tracked)
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              ✕
            </button>
          </div>

          {/* 5 KPI Summary Metric Cards (Separated Pending and Issues) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '10px',
              padding: '14px 24px',
              background: '#faf5ff',
              borderBottom: '1px solid #f3e8ff',
            }}
          >
            {/* Card 1: Rate */}
            <div
              style={{
                background: '#ffffff',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #e9d5ff',
              }}
            >
              <span style={{ fontSize: '10.5px', color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase' }}>
                Completion Rate
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#6b21a8', marginTop: 1 }}>
                {completionPct}%
              </div>
              <span style={{ fontSize: '10.5px', color: '#9333ea', fontWeight: 600 }}>
                {exactPct}% reliability
              </span>
            </div>

            {/* Card 2: Completed */}
            <div
              style={{
                background: '#ffffff',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #bbf7d0',
              }}
            >
              <span style={{ fontSize: '10.5px', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>
                Completed
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#166534', marginTop: 1 }}>
                {completedCount}{' '}
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>/ {totalCount}</span>
              </div>
              <span style={{ fontSize: '10.5px', color: '#16a34a' }}>Delivered on drop-off</span>
            </div>

            {/* Card 3: In Transit */}
            <div
              style={{
                background: '#ffffff',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #bfdbfe',
              }}
            >
              <span style={{ fontSize: '10.5px', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase' }}>
                In Transit
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e40af', marginTop: 1 }}>
                {inProgressCount}
              </div>
              <span style={{ fontSize: '10.5px', color: '#2563eb' }}>Currently en route</span>
            </div>

            {/* Card 4: Pending (Separated) */}
            <div
              style={{
                background: '#ffffff',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #fde68a',
              }}
            >
              <span style={{ fontSize: '10.5px', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>
                Pending Dispatch
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#92400e', marginTop: 1 }}>
                {pendingCount}
              </div>
              <span style={{ fontSize: '10.5px', color: '#d97706' }}>Awaiting unit / driver</span>
            </div>

            {/* Card 5: Issues / Cancelled (Separated) */}
            <div
              style={{
                background: '#ffffff',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #fecaca',
              }}
            >
              <span style={{ fontSize: '10.5px', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>
                Issues / Cancelled
              </span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#991b1b', marginTop: 1 }}>
                {issuesCount}
              </div>
              <span style={{ fontSize: '10.5px', color: '#ef4444' }}>Delayed or cancelled</span>
            </div>
          </div>

          {/* Filter Controls Bar with PDF Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 24px 10px',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            {/* Filter Pills (Separated Pending and Issues) */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setPage(1);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: activeTab === 'all' ? '1px solid #7e22ce' : '1px solid #cbd5e1',
                  background: activeTab === 'all' ? '#7e22ce' : '#f8fafc',
                  color: activeTab === 'all' ? '#ffffff' : '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('completed');
                  setPage(1);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: activeTab === 'completed' ? '1px solid #16a34a' : '1px solid #cbd5e1',
                  background: activeTab === 'completed' ? '#16a34a' : '#f8fafc',
                  color: activeTab === 'completed' ? '#ffffff' : '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Completed ({completedCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('in_progress');
                  setPage(1);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: activeTab === 'in_progress' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  background: activeTab === 'in_progress' ? '#2563eb' : '#f8fafc',
                  color: activeTab === 'in_progress' ? '#ffffff' : '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                In Transit ({inProgressCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('pending');
                  setPage(1);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: activeTab === 'pending' ? '1px solid #d97706' : '1px solid #cbd5e1',
                  background: activeTab === 'pending' ? '#d97706' : '#f8fafc',
                  color: activeTab === 'pending' ? '#ffffff' : '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('issues');
                  setPage(1);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: activeTab === 'issues' ? '1px solid #dc2626' : '1px solid #cbd5e1',
                  background: activeTab === 'issues' ? '#dc2626' : '#f8fafc',
                  color: activeTab === 'issues' ? '#ffffff' : '#475569',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Issues / Cancelled ({issuesCount})
              </button>
            </div>

            {/* Search & PDF Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ position: 'relative', width: '200px' }}>
                <input
                  type="text"
                  placeholder="Search trip, driver, plate..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 28px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <i
                  className="fas fa-search"
                  style={{ position: 'absolute', left: 9, top: 9, color: '#94a3b8', fontSize: 11 }}
                ></i>
              </div>

              {/* PDF Actions */}
              <button
                type="button"
                onClick={() => setShowPrintReport(true)}
                title="Generate & Save Printable PDF Audit Report"
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #fca5a5',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="fas fa-file-pdf"></i>
                <span>Export as PDF</span>
              </button>
            </div>
          </div>

          {/* Deliveries Breakdown Table */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 16px' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12px',
              }}
            >
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '9px 12px', width: '95px' }}>Trip ID</th>
                  <th style={{ padding: '9px 12px' }}>Customer &amp; Cargo</th>
                  <th style={{ padding: '9px 12px' }}>Route</th>
                  <th style={{ padding: '9px 12px' }}>Driver &amp; Vehicle</th>
                  <th style={{ padding: '9px 12px', width: '130px' }}>Status</th>
                  <th style={{ padding: '9px 12px' }}>Fulfillment Explanation</th>
                </tr>
              </thead>
              <tbody>
                {pagedList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                      <i className="fas fa-search" style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}></i>
                      No deliveries match the selected filter.
                    </td>
                  </tr>
                ) : (
                  pagedList.map((d) => {
                    const badge = getStatusBadge(d.status, d.is_delayed);
                    const explanation = getCompletionExplanation(d);
                    const isCompleted = d.status === 'completed';

                    return (
                      <tr
                        key={d.delivery_id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isCompleted ? '#ffffff' : '#faf5ff',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#7e22ce' }}>
                          DLV{String(d.delivery_id).padStart(4, '0')}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {d.request?.customer?.full_name || 'Customer'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {d.request?.item_name || d.request?.cargo_type || 'Cargo'}
                          </div>
                        </td>
                        <td style={{ padding: '9px 12px', color: '#334155' }}>
                          {formatRoute(d.request?.pickup_address, d.request?.dropoff_address)}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>
                            {d.driver?.user?.full_name || 'Unassigned Driver'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {d.vehicle
                              ? `${d.vehicle.model || d.vehicle.brand || 'Unit'} (${d.vehicle.plate_number})`
                              : 'Unassigned Vehicle'}
                          </div>
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            <i className={badge.icon} style={{ fontSize: '10px' }}></i>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: '11.5px', color: isCompleted ? '#166534' : '#475569' }}>
                          {explanation}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with Pagination */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#fafbfc',
            }}
          >
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {filteredList.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(page * PAGE_SIZE, filteredList.length)} of {filteredList.length} deliveries
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  background: page <= 1 ? '#f1f5f9' : '#ffffff',
                  color: page <= 1 ? '#94a3b8' : '#334155',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                }}
              >
                Previous
              </button>
              <span style={{ padding: '4px 8px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  background: page >= totalPages ? '#f1f5f9' : '#ffffff',
                  color: page >= totalPages ? '#94a3b8' : '#334155',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. Printable PDF Audit Report Modal
          ───────────────────────────────────────────────────────────── */}
      {showPrintReport && (
        <div className="analytics-report-overlay" style={{ zIndex: 1400 }}>
          <div className="analytics-report-modal" style={{ maxWidth: '900px' }}>
            <div className="report-modal-actions-bar">
              <div className="report-title-tag">
                <i className="fas fa-file-pdf" style={{ color: '#ef4444' }}></i>
                <span>Official Fleet Completion Rate &amp; Fulfillment Audit Report</span>
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
                  onClick={() => setShowPrintReport(false)}
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
                  <div className="report-brand-sub">Fleet Completion Rate &amp; Fulfillment Audit Report</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Mindanao Regional Operations Center • Cagayan de Oro City, Philippines
                  </div>
                </div>
                <div className="report-meta-box">
                  <div><strong>Doc Ref:</strong> REP-COMP-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}-{String(new Date().getDate()).padStart(2, '0')}</div>
                  <div><strong>Date:</strong> {currentDate}</div>
                  <div><strong>Timeframe:</strong> {periodLabel}</div>
                  <div><strong>Status:</strong> Verified Administrative Audit</div>
                </div>
              </div>

              {/* 5 KPI Summary Ribbons */}
              <div className="report-kpi-summary-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                <div className="report-kpi-item">
                  <div className="report-kpi-item-label">Completion Rate</div>
                  <div className="report-kpi-item-val" style={{ color: '#7e22ce' }}>{completionPct}%</div>
                  <div className="report-kpi-item-sub">{exactPct}% exact rate</div>
                </div>
                <div className="report-kpi-item">
                  <div className="report-kpi-item-label">Completed</div>
                  <div className="report-kpi-item-val" style={{ color: '#16a34a' }}>{completedCount}</div>
                  <div className="report-kpi-item-sub">Delivered successfully</div>
                </div>
                <div className="report-kpi-item">
                  <div className="report-kpi-item-label">In Transit</div>
                  <div className="report-kpi-item-val" style={{ color: '#2563eb' }}>{inProgressCount}</div>
                  <div className="report-kpi-item-sub">On active route</div>
                </div>
                <div className="report-kpi-item">
                  <div className="report-kpi-item-label">Pending</div>
                  <div className="report-kpi-item-val" style={{ color: '#d97706' }}>{pendingCount}</div>
                  <div className="report-kpi-item-sub">Awaiting dispatch</div>
                </div>
                <div className="report-kpi-item">
                  <div className="report-kpi-item-label">Issues / Cancelled</div>
                  <div className="report-kpi-item-val" style={{ color: '#dc2626' }}>{issuesCount}</div>
                  <div className="report-kpi-item-sub">Delayed or rejected</div>
                </div>
              </div>

              {/* Itemized Deliveries Audit Table */}
              <div className="report-section-heading">Detailed Deliveries Fulfillment Log ({deliveries.length} Records)</div>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Trip ID</th>
                    <th>Customer &amp; Cargo</th>
                    <th>Route</th>
                    <th>Driver &amp; Vehicle</th>
                    <th>Status</th>
                    <th>Fulfillment Details</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => {
                    const badge = getStatusBadge(d.status, d.is_delayed);
                    const explanation = getCompletionExplanation(d);
                    return (
                      <tr key={d.delivery_id}>
                        <td style={{ fontWeight: 700 }}>DLV{String(d.delivery_id).padStart(4, '0')}</td>
                        <td>
                          <strong>{d.request?.customer?.full_name || 'Customer'}</strong>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{d.request?.item_name || d.request?.cargo_type || 'Cargo'}</div>
                        </td>
                        <td>{formatRoute(d.request?.pickup_address, d.request?.dropoff_address)}</td>
                        <td>
                          <div>{d.driver?.user?.full_name || 'Unassigned'}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{d.vehicle?.plate_number || '—'}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: badge.text }}>{badge.label}</span>
                        </td>
                        <td style={{ fontSize: 11, color: '#475569' }}>{explanation}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Sign-off Section */}
              <div className="report-sign-off-section">
                <div className="report-sign-off-grid">
                  <div className="sign-off-box">
                    <div className="sign-off-label">Prepared By:</div>
                    <div className="sign-off-line"></div>
                    <div className="sign-off-name">{adminName}</div>
                    <div className="sign-off-role">System Administrator</div>
                    <div className="sign-off-date">Date: {currentDate}</div>
                  </div>
                  <div className="sign-off-box">
                    <div className="sign-off-label">Audited &amp; Confirmed By:</div>
                    <div className="sign-off-line"></div>
                    <div className="sign-off-name">Operations Director</div>
                    <div className="sign-off-role">HJY Logistics Fleet Management</div>
                    <div className="sign-off-date">Mindanao Regional Operations</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
