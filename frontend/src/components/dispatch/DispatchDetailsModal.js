import React from 'react';

function requestCode(id) {
  return `REQ${String(id).padStart(4, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function DispatchDetailsModal({ delivery, onClose }) {
  if (!delivery) return null;

  const req = delivery.request || {};
  const customer = req.customer || {};
  const driver = delivery.driver || {};
  const driverUser = driver.user || {};
  const vehicle = delivery.vehicle || {};
  const assignedBy = (typeof delivery.assigned_by === 'object' && delivery.assigned_by !== null)
    ? delivery.assigned_by
    : (delivery.assignedBy || delivery.assigned_by_user || {});
  const roleName = assignedBy.role?.role_name || (assignedBy.role_id === 2 ? 'Admin' : 'Staff');

  const areaPermitUrl = delivery.area_permit_url ||
    (delivery.area_permit_path ? (delivery.area_permit_path.startsWith('http') ? delivery.area_permit_path : `http://localhost:8000/storage/${delivery.area_permit_path.replace(/^\/?storage\//, '')}`) : null);

  const itemPermitUrl = delivery.item_permit_url || req.item_permit_url ||
    (req.item_permit_path ? (req.item_permit_path.startsWith('http') ? req.item_permit_path : `http://localhost:8000/storage/${req.item_permit_path.replace(/^\/?storage\//, '')}`) : null);

  const statusLabel = delivery.status ? delivery.status.replace(/_/g, ' ').toUpperCase() : 'DISPATCHED';

  return (
    <div
      className="modal request-modal"
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content request-modal-content"
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      >
        {/* Modal Header */}
        <div
          className="request-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #E5E7EB',
            background: '#F9FAFB',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="fas fa-clipboard-check" style={{ color: '#2563EB' }}></i>
              DISPATCH ASSIGNMENT DOSSIER
            </h2>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              Reference: <strong style={{ color: '#2563EB' }}>{requestCode(req.request_id || delivery.delivery_id)}</strong> • Delivery ID #{delivery.delivery_id}
            </div>
          </div>
          <button
            className="btn-close"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 26,
              color: '#9CA3AF',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24 }}>
          {/* Dispatch Authority Card */}
          <div
            style={{
              marginBottom: 20,
              padding: '14px 18px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#DBEAFE',
                  color: '#1D4ED8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                <i className="fas fa-user-check"></i>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Dispatched by {assignedBy.full_name || 'Authorized Dispatcher'}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: roleName.toLowerCase() === 'admin' ? '#FEE2E2' : '#DBEAFE',
                      color: roleName.toLowerCase() === 'admin' ? '#991B1B' : '#1E40AF',
                      border: `1px solid ${roleName.toLowerCase() === 'admin' ? '#FECACA' : '#BFDBFE'}`,
                    }}
                  >
                    {roleName}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#3B82F6', marginTop: 3 }}>
                  <i className="far fa-calendar-check" style={{ marginRight: 5 }}></i>
                  Dispatched on {formatDate(delivery.trip_date || delivery.start_time || delivery.created_at)}
                </div>
              </div>
            </div>

            <div>
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: delivery.status === 'completed' ? '#DCFCE7' : '#FEF3C7',
                  color: delivery.status === 'completed' ? '#15803D' : '#92400E',
                  border: `1px solid ${delivery.status === 'completed' ? '#86EFAC' : '#FCD34D'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className={`fas ${delivery.status === 'completed' ? 'fa-circle-check' : 'fa-truck-fast'}`}></i>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* 2-Column Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 20 }}>
            {/* Personnel & Vehicle Card */}
            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                padding: 16,
                background: '#FAFAFA',
              }}
            >
              <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <i className="fas fa-users-gear" style={{ marginRight: 6, color: '#4B5563' }}></i>
                Assigned Team & Vehicle
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280' }}>Assigned Driver:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {driverUser.full_name || driver.full_name || 'No driver assigned'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280' }}>Driver Contact:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {driverUser.phone || driver.phone || '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280' }}>Assigned Vehicle:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {vehicle.plate_number ? `${vehicle.plate_number} (${vehicle.brand || ''} ${vehicle.model || ''})` : 'No vehicle assigned'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280' }}>Starting Odometer:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {delivery.starting_odometer != null ? `${delivery.starting_odometer} km` : '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>Fuel Issued:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {delivery.fuel_issued ? `${delivery.fuel_issued} Liters ${delivery.fuel_receipt_no ? `(Receipt #${delivery.fuel_receipt_no})` : ''}` : 'None issued'}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipment & Customer Card */}
            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                padding: 16,
                background: '#FAFAFA',
              }}
            >
              <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <i className="fas fa-box-open" style={{ marginRight: 6, color: '#4B5563' }}></i>
                Customer & Cargo Information
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280' }}>Customer:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {customer.full_name || '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280' }}>Customer Contact:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {customer.phone || customer.email || '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280' }}>Cargo Type:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {req.cargo_type || 'General Cargo'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#6B7280' }}>Weight / Volume:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {req.weight ? `${req.weight} kg` : '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280' }}>Estimated Duration:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {delivery.estimated_duration_days || 2} Day(s)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Route Card */}
          <div
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              padding: 16,
              background: '#FAFAFA',
              marginBottom: 20,
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="fas fa-route" style={{ marginRight: 6, color: '#4B5563' }}></i>
              Route Itinerary
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ color: '#16A34A', fontSize: 18, marginTop: 2 }}>
                  <i className="fas fa-location-dot"></i>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Pickup Location</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 2 }}>
                    {req.pickup_address || '—'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ color: '#DC2626', fontSize: 18, marginTop: 2 }}>
                  <i className="fas fa-flag-checkered"></i>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Drop-off Location</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginTop: 2 }}>
                    {req.dropoff_address || '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Permits & Clearances Card */}
          <div
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              padding: 16,
              background: '#FAFAFA',
              marginBottom: 20,
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="fas fa-file-shield" style={{ marginRight: 6, color: '#4B5563' }}></i>
              Attached Permits & Clearances
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <div style={{ padding: 12, border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                  <i className="fas fa-map-location-dot" style={{ color: '#2563EB', marginRight: 6 }}></i>
                  Area Delivery Permit
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                  Type: {delivery.area_permit_type || 'Mindanao Regional Route Clearance'}
                </div>
                {areaPermitUrl ? (
                  <a
                    href={areaPermitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#2563EB',
                      textDecoration: 'none',
                    }}
                  >
                    <i className="fas fa-arrow-up-right-from-square"></i> View Area Permit Document
                  </a>
                ) : (
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No document uploaded</span>
                )}
              </div>

              <div style={{ padding: 12, border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                  <i className="fas fa-file-contract" style={{ color: '#059669', marginRight: 6 }}></i>
                  Item / Quarantine Permit
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                  Type: {req.item_permit_type || delivery.item_permit_type || 'DA-BAI Quarantine Clearance'}
                </div>
                {itemPermitUrl ? (
                  <a
                    href={itemPermitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#059669',
                      textDecoration: 'none',
                    }}
                  >
                    <i className="fas fa-arrow-up-right-from-square"></i> View Item Permit Document
                  </a>
                ) : (
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No document uploaded</span>
                )}
              </div>
            </div>

            {delivery.permit_notes && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#4B5563', background: '#F3F4F6', padding: '8px 12px', borderRadius: 6 }}>
                <strong>Permit Notes:</strong> {delivery.permit_notes}
              </div>
            )}
          </div>

          {/* Remarks Card */}
          <div
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              padding: 16,
              background: '#FAFAFA',
            }}
          >
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="fas fa-comment-dots" style={{ marginRight: 6, color: '#4B5563' }}></i>
              Dispatch Remarks & Instructions
            </h4>
            <div style={{ fontSize: 13, color: delivery.remarks ? '#1F2937' : '#9CA3AF', fontStyle: delivery.remarks ? 'normal' : 'italic' }}>
              {delivery.remarks || 'No dispatch remarks or special instructions recorded for this assignment.'}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            background: '#F9FAFB',
            borderRadius: '0 0 12px 12px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              background: '#4B5563',
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close Record
          </button>
        </div>
      </div>
    </div>
  );
}
