import React, { useRef } from 'react';

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

  if (!incident) return null;

  const delivery = incident.delivery || {};
  const request = delivery.request || {};
  const customer = request.customer || {};
  const driver = delivery.driver || {};
  const driverUser = driver.user || {};
  const vehicle = delivery.vehicle || {};
  const dispatcher = delivery.assigned_by_user || delivery.assignedByUser || {};

  // Find pre-trip checklist
  const checklists = Array.isArray(delivery.checklists) ? delivery.checklists : [];
  const preTrip = checklists.find((c) => c.type === 'pre_trip') || {};
  const inspectorName =
    preTrip.inspector_name ||
    preTrip.inspector?.full_name ||
    preTrip.inspector?.name ||
    'Certified Fleet Inspector';

  const incidentCode = `INC-${String(incident.incident_id).padStart(5, '0')}`;
  const requestCode = request.request_id ? `REQ${String(request.request_id).padStart(4, '0')}` : '—';
  const driverCode = driver.driver_id ? `DR${String(driver.driver_id).padStart(3, '0')}` : '—';

  const handlePrint = () => {
    window.print();
  };

  const incidentTypeFormatted = (incident.incident_type || 'Other')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

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
            <button className="btn-print-action" onClick={handlePrint}>
              <i className="fas fa-print"></i> Print / Save as PDF
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
              <span className={`cell-badge status-${incident.status || 'pending'}`}>
                {(incident.status || 'Pending').toUpperCase()}
              </span>
            </div>
          </div>

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
                  {dispatcher.full_name || dispatcher.name || 'Operations Dispatch Officer'}
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
                <span className="field-label">Specific Incident Type</span>
                <span className="field-value font-semibold">{incidentTypeFormatted}</span>
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
              <span className="section-title">OFFICIAL INVESTIGATION SIGN-OFF & CERTIFICATION</span>
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
                <div className="sig-title">Safety & Inspection Officer</div>
                <div className="sig-date">Date: {formatDate(preTrip.completed_at || incident.reported_at)}</div>
              </div>
              <div className="signature-box">
                <div className="sig-line"></div>
                <div className="sig-name">{dispatcher.full_name || 'Fleet Manager'}</div>
                <div className="sig-title">Fleet Operations Manager</div>
                <div className="sig-date">Date: _______________</div>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="paper-footer">
            <span>HJY Trucking Services &bull; Official Incident Form &bull; System Generated Record &bull; Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
