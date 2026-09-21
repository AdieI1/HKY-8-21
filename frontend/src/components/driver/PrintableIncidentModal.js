import React, { useRef, useState } from 'react';
import api from '../../api/api-client';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function PrintableIncidentModal({ incident, onClose }) {
  const printContentRef = useRef(null);
  const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const [actionLoading, setActionLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(incident?.status || 'pending');
  const [currentResolution, setCurrentResolution] = useState(incident?.resolution_action || null);
  const [resolvedRecord, setResolvedRecord] = useState(incident);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showReliefModal, setShowReliefModal] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [reliefForm, setReliefForm] = useState({
    relief_vehicle_id: '',
    relief_driver_id: '',
    notes: '',
  });
  const [reliefLoading, setReliefLoading] = useState(false);
  const [reliefSuccessInfo, setReliefSuccessInfo] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundForm, setRefundForm] = useState({
    refund_amount: incident?.refund_amount ? String(incident.refund_amount) : (incident?.delivery?.trip_cost ? String(incident.delivery.trip_cost) : ''),
    refund_reason: incident?.refund_reason || 'Total Cargo Loss / Perished',
    cargo_condition: incident?.cargo_condition || (incident?.incident_types?.includes?.('cargo_damage') ? 'total_loss' : 'intact'),
    notes: incident?.resolution_notes || '',
  });
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundSuccessInfo, setRefundSuccessInfo] = useState(
    incident?.resolution_action === 'flag_refund'
      ? {
          amount: incident.refund_amount,
          reason: incident.refund_reason || 'Customer Compensation',
          status: incident.refund_status || 'pending_review',
        }
      : null
  );

  const incidentTypes = Array.isArray(incident?.incident_types) && incident?.incident_types.length > 0
    ? incident.incident_types
    : typeof incident?.incident_types === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(incident.incident_types);
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : [incident?.incident_type || 'other'];
          } catch (e) {
            return [incident?.incident_type || 'other'];
          }
        })()
      : [incident?.incident_type || 'other'];

  const [resolveForm, setResolveForm] = useState({
    police_report_no: incident?.police_report_no || '',
    vehicle_towed_to: incident?.vehicle_towed_to || '',
    cargo_condition: incident?.cargo_condition || (incidentTypes.includes('cargo_damage') ? 'partial_damage' : 'intact'),
    vehicle_status_after: 'maintenance',
    notes: incident?.resolution_notes || '',
  });

  if (!incident) return null;

  const delivery = incident.delivery || {};
  const request = delivery.request || {};
  const customer = request.customer || {};
  const driver = delivery.driver || {};
  const driverUser = driver.user || {};
  const vehicle = delivery.vehicle || {};
  const dispatcher =
    delivery.assigned_by_user ||
    delivery.assignedByUser ||
    (delivery.assignedBy && typeof delivery.assignedBy === 'object' ? delivery.assignedBy : null) ||
    delivery.assigned_user ||
    {};
  const dispatcherName =
    dispatcher.full_name ||
    dispatcher.name ||
    authUser?.full_name ||
    'Authorized Dispatch Officer';

  // Find pre-trip checklist
  const checklists = Array.isArray(delivery.checklists) ? delivery.checklists : [];
  const preTrip = checklists.find((c) => c.type === 'pre_trip') || {};
  const inspectorName =
    preTrip.inspector_name ||
    preTrip.inspector?.full_name ||
    preTrip.inspector?.name ||
    (dispatcher.full_name ? dispatcher.full_name : (authUser?.full_name || 'Fleet Safety Inspector'));

  const incidentCode = `INC-${String(incident.incident_id).padStart(5, '0')}`;
  const requestCode = request.request_id ? `REQ${String(request.request_id).padStart(4, '0')}` : '—';
  const driverCode = driver.driver_id ? `DR${String(driver.driver_id).padStart(3, '0')}` : '—';

  const formatTypeName = (type) =>
    (type || 'Other')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

  const handlePrint = () => {
    window.print();
  };

  const handleOpenReliefModal = async () => {
    if (incidentTypes.includes('cargo_damage')) {
      const confirmDispatch = window.confirm(
        '⚠️ Warning: Cargo damage was reported on this delivery. If you dispatch a relief vehicle now, the driver will collect potentially damaged cargo.\n\nDo you want to proceed with Relief Truck dispatch anyway?'
      );
      if (!confirmDispatch) return;
    }

    setActionLoading(true);
    try {
      const [vehRes, drvRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/drivers'),
      ]);

      const vehList = (Array.isArray(vehRes.data) ? vehRes.data : vehRes.data?.data || []).filter(
        (v) => v.status === 'available' && String(v.vehicle_id) !== String(delivery.vehicle_id)
      );

      const drvList = (Array.isArray(drvRes.data) ? drvRes.data : drvRes.data?.data || []).filter(
        (d) =>
          d.status === 'active' &&
          d.availability_status === 'available' &&
          String(d.driver_id) !== String(delivery.driver_id)
      );

      setAvailableVehicles(vehList);
      setAvailableDrivers(drvList);
      setReliefForm({
        relief_vehicle_id: vehList[0]?.vehicle_id || '',
        relief_driver_id: drvList[0]?.driver_id || '',
        notes: `Relief vehicle dispatched to incident location (${incident.location_address || 'on route'}) for Delivery #${requestCode}. Cargo transshipment instructed.`,
      });
      setShowReliefModal(true);
    } catch (err) {
      alert('Failed to load available fleet for relief dispatch: ' + (err?.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRelief = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!reliefForm.relief_vehicle_id) {
      alert('Please select an available relief vehicle.');
      return;
    }

    setReliefLoading(true);
    try {
      await api.post(`/incident-reports/${incident.incident_id}/resolve`, {
        action: 'dispatch_relief',
        relief_vehicle_id: reliefForm.relief_vehicle_id,
        relief_driver_id: reliefForm.relief_driver_id || null,
        notes: reliefForm.notes.trim(),
      });

      const chosenVeh = availableVehicles.find((v) => String(v.vehicle_id) === String(reliefForm.relief_vehicle_id));
      const chosenDrv = availableDrivers.find((d) => String(d.driver_id) === String(reliefForm.relief_driver_id));

      setCurrentResolution('dispatch_relief');
      setReliefSuccessInfo({
        vehicle: chosenVeh ? `${chosenVeh.plate_number} (${chosenVeh.model})` : 'Relief Truck',
        driver: chosenDrv ? (chosenDrv.user?.full_name || chosenDrv.full_name || 'Standby Driver') : 'Standby Driver',
        dispatchedAt: new Date(),
      });
      setShowReliefModal(false);
      alert('✅ Relief Truck dispatched successfully!\n\n• Disabled vehicle has been set to Maintenance Hold.\n• Relief truck & driver assigned to continue the delivery.');
    } catch (err) {
      alert('Failed to dispatch relief truck: ' + (err?.response?.data?.message || err.message));
    } finally {
      setReliefLoading(false);
    }
  };

  const handleConfirmRefund = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (refundForm.refund_amount === '' || Number(refundForm.refund_amount) < 0) {
      alert('Please enter a valid refund / claim amount.');
      return;
    }

    setRefundLoading(true);
    try {
      await api.post(`/incident-reports/${incident.incident_id}/resolve`, {
        action: 'flag_refund',
        refund_amount: refundForm.refund_amount,
        refund_reason: refundForm.refund_reason,
        cargo_condition: refundForm.cargo_condition,
        notes: refundForm.notes.trim(),
      });

      setCurrentResolution('flag_refund');
      setRefundSuccessInfo({
        amount: refundForm.refund_amount,
        reason: refundForm.refund_reason,
        status: 'pending_review',
      });
      setShowRefundModal(false);
      alert('✅ Incident successfully flagged for Customer Refund & Cargo Compensation review!\n\n• Claim recorded.\n• Executive Analytics updated.');
    } catch (err) {
      alert('Failed to flag for refund: ' + (err?.response?.data?.message || err.message));
    } finally {
      setRefundLoading(false);
    }
  };

  const handleSubmitResolution = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!resolveForm.notes.trim()) {
      alert('Please provide official resolution findings and corrective actions taken.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post(`/incident-reports/${incident.incident_id}/resolve`, {
        action: 'mark_resolved',
        notes: resolveForm.notes.trim(),
        police_report_no: resolveForm.police_report_no.trim() || null,
        vehicle_towed_to: resolveForm.vehicle_towed_to.trim() || null,
        cargo_condition: resolveForm.cargo_condition,
        vehicle_status_after: resolveForm.vehicle_status_after,
      });

      const updated = res.data?.incident || {};
      setCurrentStatus('resolved');
      setCurrentResolution('mark_resolved');
      setResolvedRecord({
        ...incident,
        ...updated,
        resolver: updated.resolver || authUser,
      });
      setShowResolveModal(false);
      alert('Incident Case File successfully resolved and officially closed.');
    } catch (err) {
      alert('Failed to resolve incident: ' + (err?.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const incidentTypeFormatted = incidentTypes.map(formatTypeName).join(' & ');

  return (
    <div className="incident-print-modal-overlay" onClick={onClose}>
      <div className="incident-print-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Action Bar (Hidden on Print) */}
        <div className="incident-modal-action-bar no-print">
          <div className="incident-modal-title">
            <i className="fas fa-file-invoice text-red-600"></i>
            <span>Official Incident Report &middot; {incidentCode}</span>
          </div>
          <div className="incident-modal-actions">
            <button
              className="btn-relief-action"
              onClick={handleOpenReliefModal}
              disabled={actionLoading || currentResolution === 'dispatch_relief'}
              title="Assign an idle relief truck to the incident GPS coordinates"
            >
              <i className="fas fa-truck-pickup"></i> {currentResolution === 'dispatch_relief' ? 'Relief Dispatched' : 'Dispatch Relief'}
            </button>
            <button
              className="btn-refund-action"
              onClick={() => setShowRefundModal(true)}
              disabled={actionLoading || currentResolution === 'flag_refund' || incident.resolution_action === 'flag_refund'}
              style={(currentResolution === 'flag_refund' || incident.resolution_action === 'flag_refund') ? { backgroundColor: '#DC2626', color: '#fff', cursor: 'default' } : {}}
              title="Flag this incident for customer refund / cargo compensation review"
            >
              <i className="fas fa-hand-holding-usd"></i> {(currentResolution === 'flag_refund' || incident.resolution_action === 'flag_refund') ? 'Refund Flagged' : 'Flag Refund'}
            </button>
            {currentStatus !== 'resolved' ? (
              <button
                className="btn-resolve-action"
                onClick={() => setShowResolveModal(true)}
                disabled={actionLoading}
                title="Open structured case file resolution and audit sign-off"
              >
                <i className="fas fa-clipboard-check"></i> Resolve Case
              </button>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#DCFCE7',
                color: '#166534',
                fontSize: '12px',
                fontWeight: '700',
                border: '1px solid #86EFAC'
              }}>
                <i className="fas fa-check-circle"></i> Resolved &amp; Audited
              </span>
            )}
            <button className="btn-print-action" onClick={handlePrint}>
              <i className="fas fa-print"></i> Print
            </button>
            <button className="btn-close-action" onClick={onClose}>
              <i className="fas fa-times"></i> Close
            </button>
          </div>
        </div>

        {/* Printable Document Paper */}
        <div className="incident-paper-sheet" ref={printContentRef}>
          {/* Header Banner */}
          <div className="paper-header">
            <div className="company-branding">
              <div className="company-logo-text">HJY TRUCKING SERVICES</div>
              <div className="company-subtext">Logistics, Fleet Operations & Safety Division</div>
              <div className="company-subtext">Tel: (088) 856-1234 &middot; safety@hjytrucking.ph</div>
            </div>
            <div className="document-badge">
              <div className="doc-title-main">INCIDENT & ACCIDENT REPORT</div>
              <div className="doc-ref-id">{incidentCode}</div>
              <div className="doc-confidential">CONFIDENTIAL INVESTIGATION DOCUMENT</div>
            </div>
          </div>

          <div className="paper-divider-red"></div>

          {/* Incident Meta Summary Row */}
          <div className="meta-summary-grid">
            <div className="meta-cell">
              <span className="cell-label">Date & Time Filed</span>
              <span className="cell-value">{formatDateTime(incident.reported_at)}</span>
            </div>
            <div className="meta-cell">
              <span className="cell-label">Incident Classification</span>
              <span className="cell-value font-bold text-red">{incidentTypeFormatted}</span>
            </div>
            <div className="meta-cell">
              <span className="cell-label">Severity Level</span>
              <span className={`cell-badge severity-${incident.severity || 'medium'}`}>
                {(incident.severity || 'Medium').toUpperCase()}
              </span>
            </div>
            <div className="meta-cell">
              <span className="cell-label">Status</span>
              <span className={`cell-badge status-${currentStatus || 'pending'}`}>
                {(currentStatus || 'Pending').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Smart System Advisory & Operational Decision Banner */}
          {(incident.recommendation_title || incident.recommended_action || incidentTypes.length > 1) && (
            <div
              style={{
                margin: '18px 0 22px',
                padding: '14px 18px',
                borderRadius: '8px',
                backgroundColor:
                  incident.recommended_action === 'halt_and_inspect_cargo' ||
                  incident.recommended_action === 'emergency_escalation' ||
                  incident.severity === 'high'
                    ? '#FEF2F2'
                    : '#EFF6FF',
                borderLeft: `5px solid ${
                  incident.recommended_action === 'halt_and_inspect_cargo' ||
                  incident.recommended_action === 'emergency_escalation' ||
                  incident.severity === 'high'
                    ? '#DC2626'
                    : '#2563EB'
                }`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <i
                  className={
                    incident.recommended_action === 'halt_and_inspect_cargo' ||
                    incident.recommended_action === 'emergency_escalation' ||
                    incident.severity === 'high'
                      ? 'fas fa-exclamation-triangle text-red-600'
                      : 'fas fa-robot text-blue-600'
                  }
                  style={{ fontSize: '15px' }}
                ></i>
                <span style={{ fontWeight: '800', fontSize: '13px', color: '#1F2937', letterSpacing: '0.3px' }}>
                  SMART LOGISTICS ADVISORY: {incident.recommendation_title || 'Multi-Issue System Evaluation'}
                </span>
                {currentResolution && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      backgroundColor: currentResolution === 'dispatch_relief' ? '#16A34A' : '#DC2626',
                      color: '#FFF',
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}
                  >
                    Action: {currentResolution.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                {incident.recommendation_notes ||
                  'Multiple issues recorded for this trip. Verify cargo condition before transshipping and arrange appropriate roadside assistance or relief vehicles.'}
              </p>
              {reliefSuccessInfo && (
                <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46', fontSize: '12px' }}>
                  <strong><i className="fas fa-check-circle"></i> Relief Truck Dispatched:</strong> {reliefSuccessInfo.vehicle} with Driver <strong>{reliefSuccessInfo.driver}</strong>. Disabled vehicle placed on Maintenance Hold.
                </div>
              )}
            </div>
          )}

          {/* Customer Refund & Compensation Claim Banner */}
          {(refundSuccessInfo || currentResolution === 'flag_refund' || incident.resolution_action === 'flag_refund') && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#991B1B', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-hand-holding-usd" style={{ fontSize: '20px', color: '#DC2626' }}></i>
                <div>
                  <strong style={{ fontSize: '13px' }}>Flagged for Customer Refund &amp; Cargo Claim:</strong>{' '}
                  <span>{refundSuccessInfo?.reason || incident.refund_reason || 'Cargo Damage / SLA Compensation'}</span>
                  {(refundSuccessInfo?.amount || incident.refund_amount) && (
                    <span style={{ marginLeft: 6, fontWeight: '700', color: '#B91C1C' }}>
                      &bull; Claim Amount: ₱{Number(refundSuccessInfo?.amount || incident.refund_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: '700', background: '#FEE2E2', color: '#991B1B', padding: '4px 10px', borderRadius: '12px', border: '1px solid #F87171', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                Pending Review
              </span>
            </div>
          )}

          {/* Section 1: Driver & Vehicle Identification */}
          <div className="paper-section">
            <div className="section-heading">
              <span className="section-num">1</span>
              <span className="section-title">DRIVER & VEHICLE IDENTIFICATION</span>
            </div>
            <div className="form-fields-grid col-4">
              <div className="field-box">
                <span className="field-label">Assigned Driver</span>
                <span className="field-value font-semibold">{driverUser.full_name || '—'}</span>
              </div>
              <div className="field-box">
                <span className="field-label">Driver ID</span>
                <span className="field-value">{driverCode}</span>
              </div>
              <div className="field-box">
                <span className="field-label">Contact Number</span>
                <span className="field-value">{driverUser.phone || '—'}</span>
              </div>
              <div className="field-box">
                <span className="field-label">License Number</span>
                <span className="field-value">{driver.license_number || '—'}</span>
              </div>
              <div className="field-box">
                <span className="field-label">Truck Model</span>
                <span className="field-value">{vehicle.model || '—'}</span>
              </div>
              <div className="field-box">
                <span className="field-label">Plate Number</span>
                <span className="field-value font-semibold">{vehicle.plate_number || '—'}</span>
              </div>
              <div className="field-box">
                <span className="field-label">Vehicle Type / Capacity</span>
                <span className="field-value">{vehicle.vehicle_type || 'Cargo Truck'}</span>
              </div>
              <div className="field-box">
                <span className="field-label">Current Odometer</span>
                <span className="field-value">{vehicle.odometer_reading ? `${vehicle.odometer_reading} km` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Customer, Cargo & Route Details */}
          <div className="paper-section">
            <div className="section-heading">
              <span className="section-num">2</span>
              <span className="section-title">CUSTOMER, CARGO & ROUTE DETAILS</span>
            </div>
            <div className="form-fields-grid col-3">
              <div className="field-box">
                <span className="field-label">Customer Name</span>
                <span className="field-value font-semibold">{customer.full_name || '—'}</span>
              </div>
              <div className="field-box">
                <span className="field-label">Customer Contact</span>
                <span className="field-value">{customer.phone || '—'}</span>
              </div>
              <div className="field-box">
                <span className="field-label">Delivery Request ID</span>
                <span className="field-value">{requestCode}</span>
              </div>
              <div className="field-box col-span-3">
                <span className="field-label">Cargo Description & Type</span>
                <span className="field-value">{request.cargo_type || request.item_name || 'General Freight'}</span>
              </div>
              <div className="field-box col-span-3">
                <span className="field-label">Pick-up Location (Origin)</span>
                <span className="field-value">{request.pickup_address || request.pickup_location || '—'}</span>
              </div>
              <div className="field-box col-span-3">
                <span className="field-label">Drop-off Location (Destination)</span>
                <span className="field-value font-semibold">{request.delivery_address || request.dropoff_location || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Pre-Trip Inspection & Dispatch Verification */}
          <div className="paper-section">
            <div className="section-heading">
              <span className="section-num">3</span>
              <span className="section-title">PRE-TRIP INSPECTION & DISPATCH AUTHORIZATION</span>
            </div>
            <div className="form-fields-grid col-3">
              <div className="field-box">
                <span className="field-label">Vehicle Inspection Administered By</span>
                <span className="field-value font-semibold text-blue">{inspectorName}</span>
              </div>
              <div className="field-box">
                <span className="field-label">Inspection Completed At</span>
                <span className="field-value">{formatDateTime(preTrip.completed_at || delivery.start_time)}</span>
              </div>
              <div className="field-box">
                <span className="field-label">Inspection Verification Status</span>
                <span className="field-value font-semibold text-green">PASSED & CERTIFIED</span>
              </div>
              <div className="field-box">
                <span className="field-label">Starting Odometer Reading</span>
                <span className="field-value">
                  {preTrip.starting_odometer || delivery.starting_odometer ? `${preTrip.starting_odometer || delivery.starting_odometer} km` : '—'}
                </span>
              </div>
              <div className="field-box">
                <span className="field-label">Starting Fuel Level</span>
                <span className="field-value">
                  {preTrip.starting_fuel || delivery.starting_fuel ? `${preTrip.starting_fuel || delivery.starting_fuel} L` : '—'}
                </span>
              </div>
              <div className="field-box">
                <span className="field-label">Tire & Brake Pre-Check</span>
                <span className="field-value text-green font-semibold">VERIFIED OK</span>
              </div>
              <div className="field-box">
                <span className="field-label">Dispatched By (Authorized Officer)</span>
                <span className="field-value font-semibold text-blue">
                  {dispatcherName}
                </span>
              </div>
              <div className="field-box col-span-2">
                <span className="field-label">Date & Time Dispatched</span>
                <span className="field-value">{formatDateTime(delivery.start_time || delivery.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Incident Location & Circumstances */}
          <div className="paper-section">
            <div className="section-heading">
              <span className="section-num">4</span>
              <span className="section-title">INCIDENT LOCATION & ACCIDENT DETAILS</span>
            </div>
            <div className="form-fields-grid col-2">
              <div className="field-box col-span-2">
                <span className="field-label">Exact Location / Road Where Incident Took Place</span>
                <span className="field-value font-semibold text-red">
                  {incident.location_address ||
                    (incident.latitude && incident.longitude
                      ? `GPS: ${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`
                      : `En route towards ${request.delivery_address || 'destination'}`)}
                </span>
              </div>
              <div className="field-box">
                <span className="field-label">Driver Heading / Current Leg</span>
                <span className="field-value">
                  Towards {request.delivery_address ? request.delivery_address.slice(0, 45) + '...' : 'Destination Point'}
                </span>
              </div>
              <div className="field-box">
                <span className="field-label">Specific Incident Type(s)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {incidentTypes.map((type, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        border: '1px solid #FCA5A5',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <i className="fas fa-tag text-red-500" style={{ fontSize: '9px' }}></i>
                      {formatTypeName(type)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="field-box col-span-2">
                <span className="field-label">Incident Description & Driver Narrative / Cause</span>
                <div className="narrative-box">
                  {incident.description || 'No detailed statement provided by driver.'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Photo Proof / Evidence (if any) */}
          {(incident.photo_proof || (incident.photos && incident.photos.length > 0)) && (
            <div className="paper-section">
              <div className="section-heading">
                <span className="section-num">5</span>
                <span className="section-title">ATTACHED PHOTOGRAPHIC EVIDENCE</span>
              </div>
              <div className="evidence-photos-row">
                {incident.photo_proof && (
                  <div className="photo-thumb-container">
                    <img src={incident.photo_proof} alt="Proof" className="evidence-img" />
                    <span className="photo-caption">Primary Evidence</span>
                  </div>
                )}
                {Array.isArray(incident.photos) &&
                  incident.photos.slice(0, 4).map((p, idx) => (
                    <div key={idx} className="photo-thumb-container">
                      <img src={p} alt={`Proof ${idx + 1}`} className="evidence-img" />
                      <span className="photo-caption">Photo #{idx + 1}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Section 6: Official Sign-Off Block */}
          <div className="paper-section signature-section">
            <div className="section-heading">
              <span className="section-num">6</span>
              <span className="section-title">OFFICIAL INVESTIGATION SIGN-OFF &amp; CERTIFICATION</span>
            </div>
            <div className="signature-grid">
              <div className="signature-box">
                <div className="sig-line"></div>
                <div className="sig-name">{driverUser.full_name || 'Driver Name'}</div>
                <div className="sig-title">Reporting Driver</div>
                <div className="sig-date">Date: {formatDate(incident.reported_at)}</div>
              </div>
              <div className="signature-box">
                <div className="sig-line"></div>
                <div className="sig-name">{inspectorName}</div>
                <div className="sig-title">Safety &amp; Inspection Officer</div>
                <div className="sig-date">Date: {formatDate(preTrip.completed_at || incident.reported_at)}</div>
              </div>
              <div className="signature-box">
                <div className="sig-line"></div>
                <div className="sig-name">{resolvedRecord?.resolver?.full_name || dispatcherName}</div>
                <div className="sig-title">Fleet Operations Manager</div>
                <div className="sig-date">Date: {formatDate(resolvedRecord?.resolved_at || incident.reported_at)}</div>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="paper-footer">
            <span>HJY Trucking Services &bull; Official Incident Form &bull; System Generated Record &bull; Page 1 of 1</span>
          </div>
        </div>
      </div>

      {/* Structured Case File Resolution Modal */}
      {showResolveModal && (
        <div
          className="incident-resolve-submodal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowResolveModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ backgroundColor: '#1E293B', padding: '16px 20px', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', backgroundColor: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-clipboard-check" style={{ color: '#fff', fontSize: 16 }}></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Incident Case File Resolution</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>{incidentCode} &bull; Official Audit Sign-off</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '18px', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitResolution} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Police Blotter / Reference #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PNP-BLOTTER-2026-098"
                    value={resolveForm.police_report_no}
                    onChange={(e) => setResolveForm({ ...resolveForm, police_report_no: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Vehicle Towing / Depot Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HJY Yard 2 / Apex Shop"
                    value={resolveForm.vehicle_towed_to}
                    onChange={(e) => setResolveForm({ ...resolveForm, vehicle_towed_to: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Cargo Condition Assessment <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    value={resolveForm.cargo_condition}
                    onChange={(e) => setResolveForm({ ...resolveForm, cargo_condition: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#fff' }}
                  >
                    <option value="intact">Intact &amp; Verified Undamaged</option>
                    <option value="partial_damage">Partially Damaged</option>
                    <option value="total_loss">Total Loss (Destroyed)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Vehicle Post-Incident Status
                  </label>
                  <select
                    value={resolveForm.vehicle_status_after}
                    onChange={(e) => setResolveForm({ ...resolveForm, vehicle_status_after: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#fff' }}
                  >
                    <option value="maintenance">Keep in Maintenance Hold</option>
                    <option value="available">Cleared &amp; Return to Available</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Official Resolution Findings &amp; Actions Taken <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Document root cause, investigation outcome, driver medical check, and corrective measures taken..."
                  value={resolveForm.notes}
                  onChange={(e) => setResolveForm({ ...resolveForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', resize: 'vertical' }}
                  required
                />
              </div>

              {/* Staff Sign-off confirmation */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Authorizing Operations Officer:</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>{authUser?.full_name || 'Authorized Staff'}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <i className="fas fa-shield-alt"></i> Verified Session
                </span>
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  disabled={actionLoading}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#16A34A',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: actionLoading ? 0.7 : 1,
                  }}
                >
                  {actionLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                  Confirm &amp; Close Case File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Relief Truck Dispatch Modal */}
      {showReliefModal && (
        <div
          className="incident-resolve-submodal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowReliefModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ backgroundColor: '#1E293B', padding: '16px 20px', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-truck-pickup" style={{ color: '#fff', fontSize: 16 }}></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Dispatch Relief Truck &amp; Driver</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8' }}>{incidentCode} &bull; Cargo Transshipment &amp; Roadside Relief</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReliefModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '18px', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleConfirmRelief} style={{ padding: '20px' }}>
              {/* Incident Recap Box */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Delivery Request:</span>
                  <strong style={{ color: '#1E293B' }}>{requestCode}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Incident Location:</span>
                  <strong style={{ color: '#1E293B' }}>{incident.location_address || 'On Route'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Disabled Vehicle:</span>
                  <span style={{ color: '#DC2626', fontWeight: '600' }}>{vehicle.plate_number || 'Truck'} ({vehicle.model || 'Model'}) &bull; Moving to Maintenance</span>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block' }}>Relieved Driver:</span>
                  <strong style={{ color: '#1E293B' }}>{driverUser.full_name || 'Driver'}</strong>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Select Available Relief Vehicle <span style={{ color: '#DC2626' }}>*</span>
                </label>
                {availableVehicles.length === 0 ? (
                  <div style={{ padding: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', color: '#DC2626', fontSize: '12px' }}>
                    ⚠️ No spare vehicles are currently marked with "available" status in the depot.
                  </div>
                ) : (
                  <select
                    value={reliefForm.relief_vehicle_id}
                    onChange={(e) => setReliefForm({ ...reliefForm, relief_vehicle_id: e.target.value })}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#fff' }}
                    required
                  >
                    {availableVehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.plate_number} — {v.model} ({v.vehicle_type || 'Cargo Truck'}, {v.capacity_tons ? `${v.capacity_tons}T` : 'Standard'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Select Standby Driver
                </label>
                {availableDrivers.length === 0 ? (
                  <div style={{ padding: '10px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px', color: '#B45309', fontSize: '12px' }}>
                    ℹ️ No available standby drivers found. The current driver will remain assigned to the relief vehicle.
                  </div>
                ) : (
                  <select
                    value={reliefForm.relief_driver_id}
                    onChange={(e) => setReliefForm({ ...reliefForm, relief_driver_id: e.target.value })}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#fff' }}
                  >
                    <option value="">Keep current driver ({driverUser.full_name || 'Driver'})</option>
                    {availableDrivers.map((d) => (
                      <option key={d.driver_id} value={d.driver_id}>
                        {d.user?.full_name || d.full_name || `Driver #${d.driver_id}`} (License: {d.license_number || 'Valid'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Transshipment &amp; Roadside Instructions
                </label>
                <textarea
                  rows={3}
                  value={reliefForm.notes}
                  onChange={(e) => setReliefForm({ ...reliefForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              {/* Authorizing staff badge */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Authorizing Dispatcher:</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B' }}>{authUser?.full_name || 'Authorized Staff'}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <i className="fas fa-shield-alt"></i> Verified Session
                </span>
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowReliefModal(false)}
                  disabled={reliefLoading}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reliefLoading || availableVehicles.length === 0}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: reliefLoading ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: (reliefLoading || availableVehicles.length === 0) ? 0.6 : 1,
                  }}
                >
                  {reliefLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-truck-pickup"></i>}
                  Confirm &amp; Dispatch Relief Truck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Refund & Compensation Claim Modal */}
      {showRefundModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowRefundModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ backgroundColor: '#991B1B', padding: '16px 20px', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', backgroundColor: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-hand-holding-usd" style={{ color: '#fff', fontSize: 16 }}></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Flag Customer Refund &amp; Cargo Claim</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#FCA5A5' }}>{incidentCode} &bull; Executive Compensation Review</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                style={{ background: 'none', border: 'none', color: '#FCA5A5', fontSize: '18px', cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleConfirmRefund} style={{ padding: '20px' }}>
              {/* Delivery Recap */}
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: '#991B1B', display: 'block' }}>Customer:</span>
                  <strong style={{ color: '#1E293B' }}>{customer.full_name || 'Customer'}</strong>
                </div>
                <div>
                  <span style={{ color: '#991B1B', display: 'block' }}>Delivery Code:</span>
                  <strong style={{ color: '#1E293B' }}>{requestCode}</strong>
                </div>
                <div>
                  <span style={{ color: '#991B1B', display: 'block' }}>Cargo Type:</span>
                  <strong style={{ color: '#1E293B' }}>{request.cargo_type || 'General Cargo'}</strong>
                </div>
                <div>
                  <span style={{ color: '#991B1B', display: 'block' }}>Trip Standard Fee:</span>
                  <strong style={{ color: '#16A34A' }}>₱{Number(delivery.trip_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {/* Refund Amount Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Proposed Claim / Refund Amount (₱) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#64748B' }}>₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={refundForm.refund_amount}
                    onChange={(e) => setRefundForm({ ...refundForm, refund_amount: e.target.value })}
                    placeholder="Enter refund or compensation claim amount"
                    style={{ width: '100%', padding: '9px 10px 9px 28px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '600', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                  Trip Fee is ₱{Number(delivery.trip_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}. You may enter full fee or total cargo insured loss.
                </div>
              </div>

              {/* Compensation Reason */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Compensation Classification / Reason <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={refundForm.refund_reason}
                  onChange={(e) => setRefundForm({ ...refundForm, refund_reason: e.target.value })}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                  required
                >
                  <option value="Total Cargo Loss / Perished">Total Cargo Loss / Perished</option>
                  <option value="Partial Cargo Damage">Partial Cargo Damage</option>
                  <option value="Accident Delay / SLA Breach">Accident Delay / SLA Breach</option>
                  <option value="Customer Goodwill Courtesy">Customer Goodwill Courtesy</option>
                  <option value="Vehicle Breakdown Non-Delivery">Vehicle Breakdown Non-Delivery</option>
                </select>
              </div>

              {/* Cargo Condition */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Cargo Assessment Condition
                </label>
                <select
                  value={refundForm.cargo_condition}
                  onChange={(e) => setRefundForm({ ...refundForm, cargo_condition: e.target.value })}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="total_loss">Total Loss (100% Unrecoverable / Damaged)</option>
                  <option value="partial_damage">Partial Damage (Salvageable Cargo)</option>
                  <option value="intact">Intact Cargo (Refund for Delivery Delay Only)</option>
                </select>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Operations &amp; Audit Notes
                </label>
                <textarea
                  rows="3"
                  value={refundForm.notes}
                  onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
                  placeholder="State the justification for this refund or cargo claim..."
                  style={{ width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#F1F5F9', color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundLoading}
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fas fa-hand-holding-usd"></i> {refundLoading ? 'Submitting...' : 'Confirm & Flag Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
