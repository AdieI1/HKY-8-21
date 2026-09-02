import React from 'react';

export default function RequestDetailsModal({
  selectedRequest,
  closeDetails,
  approveRequest,
  approving,
  formatDate,
  formatMoney,
  requestCode,
  isOverdue,
}) {
  if (!selectedRequest) return null;

  const overdue = isOverdue(selectedRequest);
  const receiptUrl = selectedRequest.payment_receipt_url ||
    (selectedRequest.payment_receipt_path ? `http://localhost:8000/storage/${selectedRequest.payment_receipt_path}` : null);

  return (
    <div
      className="modal request-modal"
      style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: 20 }}
    >
      <div className="modal-content request-modal-content" style={{ width: '100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 10 }}>
        <div className="request-modal-header">
          <h2>DELIVERY REQUEST DETAILS</h2>
          <button className="btn-close" onClick={closeDetails}>&times;</button>
        </div>
        <div className="request-modal-body" style={{ padding: 20 }}>
          <div className="request-info-grid">
            <div className="request-left">
              <div className="request-info-item">
                <span className="request-label">Request ID:</span>
                <span className="request-value">{requestCode(selectedRequest.request_id, true)}</span>
              </div>
              <div className="request-info-item">
                <span className="request-label">Customer Name:</span>
                <span className="request-value">{selectedRequest.customer?.full_name || '—'}</span>
              </div>
              <div className="receipt-section">
                <span className="receipt-label">Receipt:</span>
                <div className="receipt-image" style={{ color: '#888', fontSize: 13, padding: 12, border: '1px dashed #ccc', borderRadius: 6 }}>
                  {receiptUrl ? (
                    <a href={receiptUrl} target="_blank" rel="noreferrer" title="Click to view full receipt">
                      <img src={receiptUrl} alt="Bank Transfer Receipt" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 6, objectFit: 'contain' }} />
                    </a>
                  ) : (
                    'No receipt uploaded.'
                  )}
                </div>
              </div>
            </div>

            <div className="request-right">
              <div className="request-info-item"><span className="request-label">Contact Number:</span><span className="request-value">{selectedRequest.customer?.phone || '—'}</span></div>
              <div className="request-info-item"><span className="request-label">Date requested:</span><span className="request-value">{formatDate(selectedRequest.created_at)}</span></div>
              <div className="request-info-item"><span className="request-label">Item name:</span><span className="request-value">{selectedRequest.item_name || '—'}</span></div>
              <div className="request-info-item"><span className="request-label">Cargo type:</span><span className="request-value">{selectedRequest.cargo_type || '—'}</span></div>
              <div className="request-info-item">
                <span className="request-label">Cargo Fragility:</span>
                <span className={`request-value${selectedRequest.fragility === 'high' ? ' fragile' : ''}`}>
                  {selectedRequest.fragility ? selectedRequest.fragility.charAt(0).toUpperCase() + selectedRequest.fragility.slice(1) : '—'}
                  {selectedRequest.fragility === 'high' && <i className="fas fa-exclamation-triangle" style={{ marginLeft: 6 }}></i>}
                </span>
              </div>
              <div className="request-info-item"><span className="request-label">Cargo Weight:</span><span className="request-value">{selectedRequest.weight ? `${selectedRequest.weight} kg` : '—'}</span></div>
              <div className="request-info-item"><span className="request-label">Pickup location:</span><span className="request-value">{selectedRequest.pickup_address || '—'}</span></div>
              <div className="request-info-item"><span className="request-label">Drop off location:</span><span className="request-value">{selectedRequest.dropoff_address || '—'}</span></div>
              <div className="request-info-item"><span className="request-label">Distance:</span><span className="request-value">{selectedRequest.distance_km ? `${selectedRequest.distance_km} km` : '—'}</span></div>
              <div className="request-info-item"><span className="request-label">Total Price:</span><span className="request-value price">{formatMoney(selectedRequest.total_price)}</span></div>
              {selectedRequest.payment_term === 'downpayment' ? (
                <>
                  <div className="request-info-item"><span className="request-label">Downpayment (50%):</span><span className="request-value price">{formatMoney((selectedRequest.total_price || 0) / 2)}</span></div>
                  <div className="request-info-item"><span className="request-label">Remaining Balance:</span><span className="request-value price">{formatMoney((selectedRequest.total_price || 0) / 2)}</span></div>
                </>
              ) : (
                <div className="request-info-item"><span className="request-label">Payment Term:</span><span className="request-value">Full Payment</span></div>
              )}
              <div className="request-info-item">
                <span className="request-label">Payment Method:</span>
                <span className="request-value">{selectedRequest.payment_method === 'cash' ? 'Pay in Cash' : 'Pay through Bank Transfer'}</span>
              </div>
              {selectedRequest.bank_name && (
                <div className="request-info-item"><span className="request-label">Bank Name:</span><span className="request-value">{selectedRequest.bank_name}</span></div>
              )}
              {selectedRequest.account_name && (
                <div className="request-info-item"><span className="request-label">Account Name:</span><span className="request-value">{selectedRequest.account_name}</span></div>
              )}
              {selectedRequest.account_number && (
                <div className="request-info-item"><span className="request-label">Account Number:</span><span className="request-value">{selectedRequest.account_number}</span></div>
              )}
            </div>
          </div>
          <div className="request-actions">
            {selectedRequest.status === 'pending' || overdue ? (
              <button className="btn-approve" onClick={approveRequest} disabled={approving}>
                {approving ? 'Approving...' : 'Approve'}
              </button>
            ) : (
              <span style={{ color: '#888', textTransform: 'capitalize' }}>Status: {selectedRequest.status}</span>
            )}
            <button className="btn-cancel-request" onClick={closeDetails}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
