import React, { useState, useEffect } from 'react';
import api from '../../api/api-client';

export default function CollectionReceiptModal({
  isOpen,
  delivery,
  onClose,
  onSuccess,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [receiptNo, setReceiptNo] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !delivery) return;

    setErrorMsg('');
    setSuccessMsg('');
    setReceiptFile(null);
    setFilePreview(null);

    const hasReceipt = Boolean(delivery.collection_receipt_no || delivery.collection_receipt_path);
    setIsEditing(!hasReceipt);

    if (hasReceipt) {
      setReceiptNo(delivery.collection_receipt_no || '');
      setAmount(delivery.collection_receipt_amount ? String(delivery.collection_receipt_amount) : '');
      setPaymentMode(delivery.collection_receipt_payment_mode || 'Cash');
      setNotes(delivery.collection_receipt_notes || '');
    } else {
      // Auto-suggest receipt number
      const paddedId = String(delivery.delivery_id).padStart(4, '0');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setReceiptNo(`CR-${paddedId}-${randomSuffix}`);

      const suggestedAmount = delivery.trip_cost || delivery.request?.total_price || '';
      setAmount(suggestedAmount ? String(suggestedAmount) : '');
      setPaymentMode('Cash');
      setNotes('');
    }
  }, [isOpen, delivery]);

  if (!isOpen || !delivery) return null;

  const hasExistingReceipt = Boolean(delivery.collection_receipt_no || delivery.collection_receipt_path);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!receiptNo.trim()) {
      setErrorMsg('Receipt Number is required.');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErrorMsg('Please enter a valid collection amount.');
      return;
    }
    if (!paymentMode) {
      setErrorMsg('Please select a payment mode.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('collection_receipt_no', receiptNo.trim());
      formData.append('collection_receipt_amount', amount);
      formData.append('collection_receipt_payment_mode', paymentMode);
      if (notes.trim()) {
        formData.append('collection_receipt_notes', notes.trim());
      }
      if (receiptFile) {
        formData.append('collection_receipt_file', receiptFile);
      }

      const res = await api.post(`/deliveries/${delivery.delivery_id}/collection-receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMsg('Collection Receipt issued and saved successfully!');
      if (onSuccess) {
        onSuccess(res.data.delivery);
      }
      setTimeout(() => {
        setIsEditing(false);
        setSuccessMsg('');
      }, 1200);
    } catch (err) {
      console.error('Failed to issue collection receipt:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  const receiptUrl = delivery.collection_receipt_url || (delivery.collection_receipt_path ? `/storage/${delivery.collection_receipt_path}` : null);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '16px',
              }}
            >
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#1E293B' }}>
                Official Collection Receipt
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Delivery #{String(delivery.delivery_id).padStart(4, '0')} • {delivery.request?.customer?.full_name || 'Customer'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '12.5px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className="fas fa-circle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '10px 14px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                color: '#065F46',
                fontSize: '12.5px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <i className="fas fa-check-circle"></i>
              <span>{successMsg}</span>
            </div>
          )}

          {!isEditing && hasExistingReceipt ? (
            <div>
              {/* Receipt Visual Voucher */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ textAlign: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#1E293B', letterSpacing: '0.5px' }}>
                    HKY LOGISTICS CORPORATION
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    OFFICIAL COLLECTION RECEIPT
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px' }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Receipt Number</span>
                    <strong style={{ color: '#0F172A', fontSize: '14px' }}>{delivery.collection_receipt_no}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Date Issued</span>
                    <strong style={{ color: '#0F172A' }}>
                      {delivery.collection_receipt_issued_at
                        ? new Date(delivery.collection_receipt_issued_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Payment Mode</span>
                    <strong style={{ color: '#0F172A' }}>{delivery.collection_receipt_payment_mode || 'Cash'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '11px' }}>Issued By Staff</span>
                    <strong style={{ color: '#0F172A' }}>{delivery.receipt_issuer?.full_name || 'Staff Member'}</strong>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: '#EFF6FF',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#1E40AF' }}>TOTAL AMOUNT COLLECTED:</span>
                  <span style={{ fontSize: '18px', fontWeight: '900', color: '#1E40AF' }}>
                    ₱{Number(delivery.collection_receipt_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {delivery.collection_receipt_notes && (
                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#475569' }}>
                    <strong>Remarks:</strong> {delivery.collection_receipt_notes}
                  </div>
                )}
              </div>

              {/* Receipt Attachment preview */}
              {receiptUrl ? (
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Receipt Photo / Document:
                  </label>
                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0', maxHeight: '220px', textAlign: 'center', background: '#0F172A' }}>
                    <img
                      src={receiptUrl}
                      alt="Collection Receipt"
                      style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ marginTop: '6px', textAlign: 'right' }}>
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: '#2563EB', textDecoration: 'none', fontWeight: '600' }}
                    >
                      <i className="fas fa-external-link-alt"></i> Open Full Document
                    </a>
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: '#F1F5F9',
                    color: '#334155',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="fas fa-edit"></i> Edit / Re-issue Receipt
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: '#2563EB',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Receipt Number <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    placeholder="e.g. CR-0021-9876"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Amount Collected (₱) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Payment Mode <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Cash">Cash on Delivery / Pickup</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Company Cheque</option>
                  <option value="GCash / E-Wallet">GCash / Maya / E-Wallet</option>
                  <option value="Online Banking">Online Banking / Wire</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Notes &amp; Acknowledgement (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Full collection received in cash upon cargo unloading."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Attach Signed Receipt / Deposit Slip Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px dashed #CBD5E1',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
                {filePreview && (
                  <div style={{ marginTop: '8px', textAlign: 'center' }}>
                    <img
                      src={filePreview}
                      alt="Preview"
                      style={{ maxHeight: '140px', borderRadius: '6px', border: '1px solid #E2E8F0' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {hasExistingReceipt && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={submitting}
                    style={{
                      padding: '10px 16px',
                      background: '#F1F5F9',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: '#2563EB',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="fas fa-check"></i>
                  {submitting ? 'Saving Receipt...' : hasExistingReceipt ? 'Update Collection Receipt' : 'Issue Collection Receipt'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
