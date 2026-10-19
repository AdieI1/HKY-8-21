import React, { useState } from 'react';
import { formatTripDuration, getFuelMetrics } from './PostDeliveryMetricsPanel';

function deliveryCode(id) {
  return `DLV${String(id).padStart(4, '0')}`;
}

export default function CompletedDeliveryDetailsModal({
  delivery,
  onClose,
  onOpenReceipt,
}) {
  const [lightboxImage, setLightboxImage] = useState(null);

  if (!delivery) return null;

  const req = delivery.request || {};
  const customer = req.customer || {};
  const driver = delivery.driver || {};
  const driverUser = driver.user || {};
  const vehicle = delivery.vehicle || {};

  const podUrl = delivery.proof_of_delivery_url ||
    (delivery.proof_of_delivery_path
      ? (delivery.proof_of_delivery_path.startsWith('http')
          ? delivery.proof_of_delivery_path
          : `http://localhost:8000/storage/${delivery.proof_of_delivery_path.replace(/^\/?storage\/?/, '')}`)
      : null) ||
    (delivery.receipt_photo
      ? (delivery.receipt_photo.startsWith('http')
          ? delivery.receipt_photo
          : `http://localhost:8000/storage/${delivery.receipt_photo.replace(/^\/?storage\/?/, '')}`)
      : null);

  const completedTime = delivery.end_time || delivery.updated_at;
  const formattedCompletedDate = completedTime
    ? new Date(completedTime).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Completed';

  const tripDuration = formatTripDuration(delivery.start_time || delivery.created_at, delivery.end_time || delivery.updated_at);
  const fuel = getFuelMetrics(delivery);
  const distance = fuel.distance !== '—' ? fuel.distance : (req.distance_km ? `${req.distance_km} km` : '—');
  const startOdo = delivery.starting_odometer != null ? `${Number(delivery.starting_odometer).toLocaleString()} km` : '—';
  const endOdo = delivery.ending_odometer != null ? `${Number(delivery.ending_odometer).toLocaleString()} km` : '—';

  // Check for reviews
  const review = delivery.reviews && delivery.reviews.length > 0 ? delivery.reviews[0] : null;

  return (
    <div
      className="modal"
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.55)',
        zIndex: 1100,
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: 860,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
          borderTop: '4px solid #C53030', // System signature red accent line
          borderLeft: '1px solid #E5E7EB',
          borderRight: '1px solid #E5E7EB',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #F3F4F6',
            background: '#FFFFFF',
            borderRadius: '8px 8px 0 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: '#FFF5F5',
                color: '#C53030',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                border: '1px solid #FED7D7',
              }}
            >
              <i className="fas fa-truck-ramp-box"></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#C53030', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>DELIVERY DETAILS</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#C53030',
                    background: '#FFF5F5',
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid #FED7D7',
                  }}
                >
                  {deliveryCode(delivery.delivery_id)}
                </span>
              </h2>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                Customer: <strong style={{ color: '#1F2937' }}>{customer.full_name || '—'}</strong> • Distance: {distance}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: 28,
              color: '#9CA3AF',
              cursor: 'pointer',
              lineHeight: 1,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#C53030'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24 }}>
          {/* Verified Completion Banner */}
          <div
            style={{
              marginBottom: 20,
              padding: '12px 18px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                <i className="fas fa-check-circle"></i>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                  Delivery Completed &amp; Verified
                </div>
                <div style={{ fontSize: 12, color: '#15803D', marginTop: 1 }}>
                  Delivered on <strong>{formattedCompletedDate}</strong>
                </div>
              </div>
            </div>

            <div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: '#DCFCE7',
                  color: '#15803D',
                  border: '1px solid #86EFAC',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <i className="fas fa-circle-check"></i> Completed
              </span>
            </div>
          </div>

          {/* 2-Column Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 20 }}>
            {/* Shipment & Personnel Card */}
            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                padding: 16,
                background: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  margin: '0 0 12px 0',
                  paddingBottom: 8,
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <i className="fas fa-truck" style={{ color: '#C53030', fontSize: 13 }}></i>
                <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Trip &amp; Personnel Info
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ color: '#6B7280' }}>Contact Number:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {customer.phone || '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ color: '#6B7280' }}>Driver:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {driverUser.full_name ? `${driverUser.full_name} (DR${String(driver.driver_id).padStart(3, '0')})` : 'Unassigned'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ color: '#6B7280' }}>Vehicle:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {vehicle.plate_number ? `${vehicle.model || 'FUSO'} – ${vehicle.plate_number}` : 'Unassigned'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #F9FAFB' }}>
                  <span style={{ color: '#6B7280' }}>Receiver:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {req.receiver_name ? `${req.receiver_name} (${req.receiver_phone || '—'})` : (customer.full_name || 'Same as Customer')}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 2 }}>
                    <i className="fas fa-location-dot" style={{ color: '#16A34A', marginRight: 4 }}></i> Pickup Address
                  </div>
                  <div style={{ fontWeight: 600, color: '#1F2937', fontSize: 12, lineHeight: 1.4 }}>
                    {req.pickup_address || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 2 }}>
                    <i className="fas fa-flag-checkered" style={{ color: '#C53030', marginRight: 4 }}></i> Drop-off Address
                  </div>
                  <div style={{ fontWeight: 600, color: '#1F2937', fontSize: 12, lineHeight: 1.4 }}>
                    {req.dropoff_address || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Verification & Receipt Card */}
            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                padding: 16,
                background: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              <div>
                {/* Proof of Delivery (POD) Section */}
                <div style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      margin: '0 0 10px 0',
                      paddingBottom: 8,
                      borderBottom: '1px solid #F3F4F6',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-camera" style={{ color: '#C53030', fontSize: 13 }}></i>
                      <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Proof of Delivery (POD)
                      </h4>
                    </div>
                    {podUrl ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: '#DCFCE7',
                          color: '#15803D',
                          padding: '2px 8px',
                          borderRadius: 10,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <i className="fas fa-check-circle"></i> Captured &amp; Verified
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#F3F4F6',
                          color: '#6B7280',
                          padding: '2px 8px',
                          borderRadius: 10,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <i className="fas fa-minus-circle"></i> Not Uploaded
                      </span>
                    )}
                  </div>

                  {podUrl ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        padding: '10px 12px',
                      }}
                    >
                      <div
                        onClick={() => setLightboxImage(podUrl)}
                        title="Click to view full photo"
                        style={{
                          width: 80,
                          height: 70,
                          borderRadius: 6,
                          overflow: 'hidden',
                          background: '#1F2937',
                          position: 'relative',
                          flexShrink: 0,
                          cursor: 'pointer',
                          border: '1px solid #D1D5DB',
                        }}
                      >
                        <img
                          src={podUrl}
                          alt="Proof of Delivery"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            fontSize: 12,
                          }}
                        >
                          <i className="fas fa-magnifying-glass-plus"></i>
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                        <div style={{ color: '#6B7280', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                          Received By:
                        </div>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {delivery.received_by || req.receiver_name || customer.full_name || 'Recipient'}
                        </div>
                        <div style={{ color: '#15803D', fontSize: 11, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-circle-check"></i> E-Delivery Confirmed
                        </div>
                        <div
                          onClick={() => setLightboxImage(podUrl)}
                          style={{
                            color: '#C53030',
                            fontSize: 11,
                            fontWeight: 700,
                            marginTop: 3,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span>View Full Photo</span> &rarr;
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '14px 12px',
                        background: '#F9FAFB',
                        border: '1.5px dashed #D1D5DB',
                        borderRadius: 8,
                        textAlign: 'center',
                        color: '#6B7280',
                        fontSize: 12,
                      }}
                    >
                      <i className="fas fa-camera-retro" style={{ color: '#9CA3AF', marginBottom: 4, display: 'block', fontSize: 18 }}></i>
                      <div style={{ fontWeight: 600, color: '#4B5563' }}>No Proof of Delivery (POD) Uploaded</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                        No delivery photo or recipient sign-off attached for this shipment.
                      </div>
                    </div>
                  )}
                </div>

                {/* Official Collection Receipt Section */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      margin: '0 0 10px 0',
                      paddingBottom: 8,
                      borderBottom: '1px solid #F3F4F6',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-receipt" style={{ color: '#C53030', fontSize: 13 }}></i>
                      <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Official Collection Receipt
                      </h4>
                    </div>
                    {delivery.collection_receipt_no && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: '#DCFCE7',
                          color: '#15803D',
                          padding: '2px 8px',
                          borderRadius: 10,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <i className="fas fa-check-circle"></i> Issued &amp; Emailed
                      </span>
                    )}
                  </div>

                  {delivery.collection_receipt_no ? (
                    <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #F3F4F6' }}>
                        <span style={{ color: '#6B7280' }}>Receipt Number:</span>
                        <strong style={{ color: '#111827' }}>{delivery.collection_receipt_no}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
                        <span style={{ color: '#6B7280' }}>Amount Collected:</span>
                        <strong style={{ color: '#15803D', fontSize: 15 }}>
                          ₱{Number(delivery.collection_receipt_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6 }}>
                        <span style={{ color: '#6B7280' }}>Payment Mode:</span>
                        <span style={{ color: '#374151', fontWeight: 600 }}>{delivery.collection_receipt_payment_mode || 'Cash'}</span>
                      </div>
                      <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed #E5E7EB', fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="fas fa-envelope-circle-check" style={{ color: '#16A34A' }}></i>
                        <span>Auto-delivered to customer email &amp; mobile app</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '14px 12px', background: '#F9FAFB', borderRadius: 8, textAlign: 'center', color: '#6B7280', fontSize: 12, marginBottom: 12 }}>
                      <i className="fas fa-circle-info" style={{ color: '#9CA3AF', marginBottom: 4, display: 'block', fontSize: 18 }}></i>
                      No official collection receipt has been issued yet for this shipment.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => onOpenReceipt(delivery)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#C53030', // System red button
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 2px 4px rgba(197, 48, 48, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#9B2C2C'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#C53030'; }}
                >
                  <i className="fas fa-file-invoice"></i>
                  View Official Receipt
                </button>
              </div>
            </div>
          </div>

          {/* Post-Delivery Performance Metrics Section */}
          <div
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              padding: 16,
              background: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '0 0 14px 0',
                paddingBottom: 8,
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <i className="fas fa-chart-line" style={{ color: '#C53030', fontSize: 13 }}></i>
              <h4 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Post-Delivery Performance Metrics
              </h4>
            </div>

            {/* 4 Performance Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  <i className="far fa-clock"></i>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                    {tripDuration}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
                    Total Trip Duration
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#F0FDF4',
                    color: '#16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  <i className="fas fa-route"></i>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                    {distance}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
                    Distance Traveled
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#FFF7ED',
                    color: '#EA580C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  <i className="fas fa-gas-pump"></i>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                    {fuel.consumed}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
                    Fuel Used ({fuel.efficiency})
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#FFF5F5',
                    color: '#C53030',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  <i className="fas fa-gauge-high"></i>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                    {startOdo} &rarr; {endOdo}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
                    Odometer (Start &rarr; End)
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Rating & Review snippet if available */}
            {review && (
              <div
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 10,
                }}
              >
                <div style={{ color: '#D97706', fontSize: 16 }}>
                  <i className="fas fa-star"></i>
                </div>
                <div style={{ fontSize: 12, color: '#92400E' }}>
                  <strong>Customer Rating: {review.rating || 5}/5 Stars</strong>
                  {review.comments && <span> &mdash; &ldquo;{review.comments}&rdquo;</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #F3F4F6',
            background: '#FAFAFA',
            borderRadius: '0 0 12px 12px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 22px',
              borderRadius: 6,
              background: '#FFFFFF',
              color: '#374151',
              border: '1px solid #D1D5DB',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#C53030';
              e.currentTarget.style.color = '#C53030';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#D1D5DB';
              e.currentTarget.style.color = '#374151';
            }}
          >
            Close Details
          </button>
        </div>
      </div>

      {/* Lightbox for full-size Proof of Delivery photo */}
      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            zIndex: 1500,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setLightboxImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: 760,
              width: '100%',
              maxHeight: '90vh',
              background: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              borderTop: '3px solid #C53030',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 10,
                marginBottom: 10,
                borderBottom: '1px solid #E5E7EB',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: '#C53030', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-camera"></i> Proof of Delivery Photo &bull; {deliveryCode(delivery.delivery_id)}
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="btn-close"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#C53030'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
              >
                &times;
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', textAlign: 'center', background: '#0F172A', borderRadius: 8, padding: 8 }}>
              <img
                src={lightboxImage}
                alt="Proof of Delivery Full"
                style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', display: 'block', margin: '0 auto' }}
              />
            </div>
            {delivery.received_by && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#4B5563', textAlign: 'center' }}>
                Recipient Sign-off: <strong style={{ color: '#111827' }}>{delivery.received_by}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
