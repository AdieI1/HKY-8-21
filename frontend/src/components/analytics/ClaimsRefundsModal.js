import React, { useState, useMemo } from 'react';
import api from '../../api/api-client';

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₱ 0.00';
  return '₱ ' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ClaimsRefundsModal({
  isOpen,
  onClose,
  incidents = [],
  maintenance = [],
  grossRevenue = 0,
  onIncidentUpdated,
}) {
  const [activeTab, setActiveTab] = useState('claims'); // 'claims' | 'maintenance'
  const [searchTerm, setSearchTerm] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [maintStatusFilter, setMaintStatusFilter] = useState('all');
  const [approvingId, setApprovingId] = useState(null);
  const [localStatuses, setLocalStatuses] = useState({});

  // Filter incidents flagged or approved for customer refund
  const refundIncidents = useMemo(() => {
    return (Array.isArray(incidents) ? incidents : []).filter(
      (inc) =>
        inc.resolution_action === 'flag_refund' ||
        inc.resolution_action === 'approve_refund' ||
        inc.refund_status === 'pending_review' ||
        inc.refund_status === 'approved' ||
        Number(inc.refund_amount || 0) > 0
    );
  }, [incidents]);

  const maintenanceList = useMemo(() => {
    return Array.isArray(maintenance) ? maintenance : [];
  }, [maintenance]);

  // Filtered claims
  const filteredClaims = useMemo(() => {
    return refundIncidents.filter((inc) => {
      const customerName = inc.delivery?.request?.customer?.full_name || '';
      const reqCode = inc.delivery?.request?.request_id ? `REQ${String(inc.delivery.request.request_id).padStart(4, '0')}` : '';
      const incCode = `INC-${String(inc.incident_id).padStart(5, '0')}`;
      const searchMatch =
        !searchTerm ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reqCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incCode.toLowerCase().includes(searchTerm.toLowerCase());

      const reasonMatch =
        reasonFilter === 'all' ||
        (inc.refund_reason && inc.refund_reason.toLowerCase().includes(reasonFilter.toLowerCase()));

      return searchMatch && reasonMatch;
    });
  }, [refundIncidents, searchTerm, reasonFilter]);

  // Filtered maintenance records
  const filteredMaintenance = useMemo(() => {
    return maintenanceList.filter((m) => {
      const plate = m.vehicle?.plate_number || '';
      const model = m.vehicle?.model || '';
      const type = m.maintenance_type || '';
      const maintBy = m.maintained_by_name || m.maintainer?.full_name || '';

      const searchMatch =
        !searchTerm ||
        plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        maintBy.toLowerCase().includes(searchTerm.toLowerCase());

      const statusMatch =
        maintStatusFilter === 'all' ||
        (m.status && m.status.toLowerCase() === maintStatusFilter.toLowerCase());

      return searchMatch && statusMatch;
    });
  }, [maintenanceList, searchTerm, maintStatusFilter]);

  // Financial calculations
  const totalClaimsLosses = useMemo(() => {
    return refundIncidents.reduce((sum, inc) => sum + Number(inc.refund_amount || 0), 0);
  }, [refundIncidents]);

  const totalMaintenanceLosses = useMemo(() => {
    return maintenanceList.reduce((sum, m) => sum + Number(m.maintenance_cost || m.total_cost || 0), 0);
  }, [maintenanceList]);

  const totalLosses = useMemo(() => {
    return totalClaimsLosses + totalMaintenanceLosses;
  }, [totalClaimsLosses, totalMaintenanceLosses]);

  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const netRevenue = useMemo(() => {
    return Math.max(0, grossRevenue - totalLosses);
  }, [grossRevenue, totalLosses]);

  const handleApproveClaim = async (inc) => {
    const confirmApprove = window.confirm(
      `Approve Customer Refund & Claim?\n\nAmount: ${formatCurrency(inc.refund_amount)}\nCustomer: ${inc.delivery?.request?.customer?.full_name || 'Customer'}\nReason: ${inc.refund_reason || 'Compensation'}\n\nThis will officially authorize the payout and mark the claim as Approved & Deducted.`
    );
    if (!confirmApprove) return;

    setApprovingId(inc.incident_id);
    try {
      const res = await api.post(`/incident-reports/${inc.incident_id}/resolve`, {
        action: 'approve_refund',
        resolved_by: authUser.user_id || undefined,
      });
      setLocalStatuses((prev) => ({ ...prev, [inc.incident_id]: 'approved' }));
      if (onIncidentUpdated) {
        onIncidentUpdated(res.data?.incident || inc);
      }
      alert(`✅ Customer refund claim of ${formatCurrency(inc.refund_amount)} officially approved and recorded.`);
    } catch (err) {
      alert('Failed to approve claim: ' + (err?.response?.data?.message || err.message));
    } finally {
      setApprovingId(null);
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'claims') {
      if (filteredClaims.length === 0) return;
      const headers = ['Incident Code', 'Delivery Code', 'Customer', 'Cargo Type', 'Claim Amount (PHP)', 'Reason', 'Cargo Condition', 'Flagged By', 'Claim Status', 'Date'];
      const rows = filteredClaims.map((inc) => {
        const status = localStatuses[inc.incident_id] || inc.refund_status || 'pending_review';
        return [
          `INC-${String(inc.incident_id).padStart(5, '0')}`,
          inc.delivery?.request?.request_id ? `REQ${String(inc.delivery.request.request_id).padStart(4, '0')}` : 'N/A',
          `"${inc.delivery?.request?.customer?.full_name || 'N/A'}"`,
          `"${inc.delivery?.request?.cargo_type || 'N/A'}"`,
          inc.refund_amount || 0,
          `"${inc.refund_reason || 'Compensation Claim'}"`,
          inc.cargo_condition || 'N/A',
          `"${inc.resolver?.full_name || 'Authorized Staff'}"`,
          status,
          inc.resolved_at || inc.reported_at || 'N/A',
        ];
      });
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `incident_claims_audit_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (filteredMaintenance.length === 0) return;
      const headers = ['Maintenance ID', 'Plate Number', 'Vehicle Model', 'Service Type', 'Cost (PHP)', 'Status', 'Maintained By', 'Date', 'Notes'];
      const rows = filteredMaintenance.map((m) => [
        `MNT-${String(m.maintenance_id).padStart(4, '0')}`,
        `"${m.vehicle?.plate_number || 'N/A'}"`,
        `"${m.vehicle?.model || 'N/A'}"`,
        `"${m.maintenance_type || 'Maintenance'}"`,
        m.maintenance_cost || m.total_cost || 0,
        m.status || 'Scheduled',
        `"${m.maintained_by_name || m.maintainer?.full_name || 'Internal Mechanic'}"`,
        m.maintenance_date || 'N/A',
        `"${(m.notes || m.description || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `vehicle_maintenance_losses_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="overview-modal-overlay" onClick={onClose}>
      <div
        className="overview-modal-card"
        style={{
          maxWidth: '1200px',
          width: '94vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div
          className="overview-modal-header"
          style={{
            borderBottom: '1px solid #FEE2E2',
            padding: '16px 24px 16px 72px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            marginBottom: 0,
          }}
        >
          <button
            type="button"
            className="overview-back-btn"
            onClick={onClose}
            title="Go back"
            aria-label="Back"
            style={{ left: '20px' }}
          >
            <i className="fas fa-arrow-left"></i>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '19px',
                flexShrink: 0,
              }}
            >
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
            <div style={{ textAlign: 'left' }}>
              <h2 className="overview-modal-title" style={{ color: '#991B1B', fontSize: '18px', margin: 0, fontWeight: 800 }}>
                Incident Losses &amp; Revenue Deductions Breakdown
              </h2>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Itemized customer compensation claims, cargo damage evaluations, and fleet maintenance repair expenses
              </div>
            </div>
          </div>
        </div>

        {/* Financial KPI Summary Ribbons (4 Metrics: Gross, Claims, Maintenance, Net) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '14px',
            padding: '16px 24px',
            background: '#FFF5F5',
            borderBottom: '1px solid #FECACA',
            flexShrink: 0,
          }}
        >
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Gross Verified Revenue
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{formatCurrency(grossRevenue)}</div>
            <span style={{ fontSize: '11px', color: '#16A34A' }}>Total verified bookings</span>
          </div>

          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #FCA5A5' }}>
            <span style={{ fontSize: '11px', color: '#991B1B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Customer Claims Loss
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#DC2626', marginTop: 2 }}>{formatCurrency(totalClaimsLosses)}</div>
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              {refundIncidents.length} active {refundIncidents.length === 1 ? 'claim' : 'claims'}
            </span>
          </div>

          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #FED7AA' }}>
            <span style={{ fontSize: '11px', color: '#9A3412', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Fleet Maintenance &amp; Repairs
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#EA580C', marginTop: 2 }}>{formatCurrency(totalMaintenanceLosses)}</div>
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              {maintenanceList.length} service {maintenanceList.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
            <span style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Net Realized Revenue
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803D', marginTop: 2 }}>{formatCurrency(netRevenue)}</div>
            <span style={{ fontSize: '11px', color: '#16A34A' }}>After claims &amp; maintenance</span>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div style={{ padding: '12px 24px 0', display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('claims');
              setSearchTerm('');
            }}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              borderBottom: activeTab === 'claims' ? '3px solid #DC2626' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === 'claims' ? '#DC2626' : '#64748B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fas fa-hand-holding-usd"></i>
            Customer Compensation Claims ({refundIncidents.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('maintenance');
              setSearchTerm('');
            }}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              borderBottom: activeTab === 'maintenance' ? '3px solid #EA580C' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === 'maintenance' ? '#EA580C' : '#64748B',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fas fa-screwdriver-wrench"></i>
            Fleet Maintenance &amp; Repairs ({maintenanceList.length})
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="overview-controls-bar" style={{ padding: '14px 24px', display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <i
              className="fas fa-search"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 13 }}
            ></i>
            <input
              type="text"
              placeholder={
                activeTab === 'claims'
                  ? 'Search by customer name, delivery ID (e.g. REQ0003), or incident code...'
                  : 'Search by vehicle plate, model, service type, or mechanic...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {activeTab === 'claims' ? (
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                background: '#fff',
              }}
            >
              <option value="all">All Claim Reasons</option>
              <option value="cargo">Cargo Loss / Damage</option>
              <option value="delay">Accident / SLA Delay</option>
              <option value="courtesy">Customer Courtesy</option>
            </select>
          ) : (
            <select
              value={maintStatusFilter}
              onChange={(e) => setMaintStatusFilter(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                background: '#fff',
              }}
            >
              <option value="all">All Maintenance Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          )}

          <button
            type="button"
            className="overview-export-pill-btn"
            onClick={handleExportCSV}
            title={activeTab === 'claims' ? 'Export filtered claims to CSV' : 'Export vehicle maintenance to CSV'}
            style={{ padding: '9px 16px', fontSize: '13px', borderRadius: '8px' }}
          >
            <i className="fas fa-arrow-up-from-bracket"></i>
            <span>Export CSV</span>
          </button>
        </div>

        {/* Table Content Container */}
        <div className="overview-table-container" style={{ padding: '0 24px 24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'claims' ? (
            filteredClaims.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748B' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '38px', color: '#10B981', marginBottom: '10px', display: 'block' }}></i>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>No Claims Found</div>
                <div style={{ fontSize: '13px', marginTop: 4 }}>
                  {refundIncidents.length === 0
                    ? 'No incident reports have been flagged for customer refund or compensation.'
                    : 'No claims match your current filter query.'}
                </div>
              </div>
            ) : (
              <table className="overview-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', width: '160px', padding: '10px 14px' }}>Incident &amp; Delivery</th>
                    <th style={{ textAlign: 'left', width: '200px', padding: '10px 14px' }}>Customer &amp; Cargo</th>
                    <th style={{ textAlign: 'center', width: '140px', padding: '10px 14px' }}>Assessment</th>
                    <th style={{ textAlign: 'right', width: '150px', padding: '10px 14px' }}>Claim Amount</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px' }}>Flagged Details &amp; Notes</th>
                    <th style={{ textAlign: 'center', width: '220px', padding: '10px 14px' }}>Authorization Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((inc) => {
                    const incCode = `INC-${String(inc.incident_id).padStart(5, '0')}`;
                    const reqCode = inc.delivery?.request?.request_id ? `REQ${String(inc.delivery.request.request_id).padStart(4, '0')}` : '—';
                    const cargoCondition = inc.cargo_condition || 'total_loss';
                    const currentClaimStatus = localStatuses[inc.incident_id] || inc.refund_status || 'pending_review';
                    const isApproved = currentClaimStatus === 'approved';

                    return (
                      <tr key={inc.incident_id} style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
                        <td style={{ verticalAlign: 'middle', padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>{incCode}</div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: 2 }}>
                            Delivery: <strong style={{ color: '#2563EB' }}>{reqCode}</strong>
                          </div>
                        </td>

                        <td style={{ verticalAlign: 'middle', padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                            {inc.delivery?.request?.customer?.full_name || 'Customer'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: 2 }}>
                            {inc.delivery?.request?.cargo_type || 'Cargo'}
                          </div>
                        </td>

                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: '12px',
                              textTransform: 'uppercase',
                              background: cargoCondition === 'total_loss' ? '#FEE2E2' : cargoCondition === 'partial_damage' ? '#FEF3C7' : '#EFF6FF',
                              color: cargoCondition === 'total_loss' ? '#991B1B' : cargoCondition === 'partial_damage' ? '#92400E' : '#1D4ED8',
                              border: `1px solid ${
                                cargoCondition === 'total_loss' ? '#FCA5A5' : cargoCondition === 'partial_damage' ? '#FDE68A' : '#BFDBFE'
                              }`,
                            }}
                          >
                            {cargoCondition.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right', verticalAlign: 'middle', padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 800, color: '#DC2626', fontSize: '15px' }}>
                            {formatCurrency(inc.refund_amount)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: 2 }}>
                            Trip Fee: ₱{Number(inc.delivery?.trip_cost || 0).toLocaleString('en-PH')}
                          </div>
                        </td>

                        <td style={{ verticalAlign: 'middle', padding: '12px 14px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                            {inc.refund_reason || 'Compensation Claim'}
                          </div>
                          {inc.resolution_notes && (
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: 2, lineHeight: 1.4 }} title={inc.resolution_notes}>
                              {inc.resolution_notes}
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: 3 }}>
                            Authorized by: <strong style={{ color: '#475569' }}>{inc.resolver?.full_name || inc.resolver?.username || (isApproved && authUser.full_name) || authUser.full_name || 'Alec Zeus Jaraula'}</strong>
                          </div>
                        </td>

                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {isApproved ? (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '6px 14px',
                                borderRadius: '16px',
                                background: '#DCFCE7',
                                color: '#15803D',
                                border: '1px solid #86EFAC',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <i className="fas fa-check-circle"></i> Approved &amp; Deducted
                            </span>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '5px 10px',
                                  borderRadius: '12px',
                                  background: '#FEF2F2',
                                  color: '#991B1B',
                                  border: '1px solid #FCA5A5',
                                }}
                              >
                                Pending Review
                              </span>
                              <button
                                type="button"
                                onClick={() => handleApproveClaim(inc)}
                                disabled={approvingId === inc.incident_id}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: '#16A34A',
                                  color: '#ffffff',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                                  transition: 'background 0.2s ease',
                                }}
                                title="Officially approve this refund claim and finalize deduction"
                              >
                                {approvingId === inc.incident_id ? (
                                  <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                  <i className="fas fa-check"></i>
                                )}
                                Approve Claim
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            /* Fleet Maintenance & Repairs Table */
            filteredMaintenance.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748B' }}>
                <i className="fas fa-screwdriver-wrench" style={{ fontSize: '38px', color: '#CBD5E1', marginBottom: '10px', display: 'block' }}></i>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>No Maintenance Records Found</div>
                <div style={{ fontSize: '13px', marginTop: 4 }}>
                  {maintenanceList.length === 0
                    ? 'No vehicle maintenance or repair expenses recorded for this period.'
                    : 'No maintenance records match your current filter query.'}
                </div>
              </div>
            ) : (
              <table className="overview-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', width: '180px', padding: '10px 14px' }}>Vehicle &amp; Plate</th>
                    <th style={{ textAlign: 'left', width: '200px', padding: '10px 14px' }}>Service / Repair Type</th>
                    <th style={{ textAlign: 'center', width: '130px', padding: '10px 14px' }}>Status</th>
                    <th style={{ textAlign: 'left', width: '140px', padding: '10px 14px' }}>Date</th>
                    <th style={{ textAlign: 'right', width: '150px', padding: '10px 14px' }}>Repair Cost</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px' }}>Technician &amp; Service Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaintenance.map((m) => {
                    const cost = Number(m.maintenance_cost || m.total_cost || 0);
                    const statusStr = (m.status || 'Scheduled').toLowerCase();
                    const statusBg =
                      statusStr === 'completed'
                        ? '#DCFCE7'
                        : statusStr === 'in progress'
                        ? '#FEF3C7'
                        : '#EFF6FF';
                    const statusColor =
                      statusStr === 'completed'
                        ? '#15803D'
                        : statusStr === 'in progress'
                        ? '#92400E'
                        : '#1D4ED8';
                    const statusBorder =
                      statusStr === 'completed'
                        ? '#86EFAC'
                        : statusStr === 'in progress'
                        ? '#FDE68A'
                        : '#BFDBFE';

                    return (
                      <tr key={m.maintenance_id} style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
                        <td style={{ verticalAlign: 'middle', padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                            {m.vehicle?.plate_number || `Vehicle #${m.vehicle_id}`}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: 2 }}>
                            {m.vehicle?.model || 'Truck Unit'}
                          </div>
                        </td>

                        <td style={{ verticalAlign: 'middle', padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                            {m.maintenance_type || 'Maintenance'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: 2 }}>
                            Ref: MNT-{String(m.maintenance_id).padStart(4, '0')}
                          </div>
                        </td>

                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: '12px',
                              textTransform: 'uppercase',
                              background: statusBg,
                              color: statusColor,
                              border: `1px solid ${statusBorder}`,
                            }}
                          >
                            {m.status || 'Scheduled'}
                          </span>
                        </td>

                        <td style={{ verticalAlign: 'middle', padding: '12px 14px', whiteSpace: 'nowrap', fontSize: '13px', color: '#475569' }}>
                          {m.maintenance_date || '—'}
                        </td>

                        <td style={{ textAlign: 'right', verticalAlign: 'middle', padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 800, color: '#EA580C', fontSize: '15px' }}>
                            {formatCurrency(cost)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: 2 }}>
                            Operating Expense
                          </div>
                        </td>

                        <td style={{ verticalAlign: 'middle', padding: '12px 14px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>
                            Mechanic: <strong style={{ color: '#475569' }}>{m.maintained_by_name || m.maintainer?.full_name || 'Internal Shop'}</strong>
                          </div>
                          {(m.notes || m.description) && (
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: 2, lineHeight: 1.4 }} title={m.notes || m.description}>
                              {m.notes || m.description}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default ClaimsRefundsModal;
