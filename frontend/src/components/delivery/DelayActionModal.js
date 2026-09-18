import { useState, useEffect } from 'react';

export default function DelayActionModal({
  isOpen,
  mode, // 'notify_customer' | 'ping_driver'
  delivery,
  onClose,
  onSubmitSuccess,
  api,
}) {
  const [delayReason, setDelayReason] = useState('Heavy traffic congestion along route');
  const [revisedDate, setRevisedDate] = useState('');
  const [revisedTime, setRevisedTime] = useState('02:00 PM');
  const [customMsg, setCustomMsg] = useState('');
  const [inquiryType, setInquiryType] = useState('traffic');
  const [driverNote, setDriverNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (delivery && isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      // Suggest tomorrow or next day for revised date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setRevisedDate(`${yyyy}-${mm}-${dd}`);
      setDelayReason(delivery.delay_reason || 'Heavy traffic congestion along route');
      setCustomMsg('');
      setDriverNote('');
    }
  }, [delivery, isOpen, mode]);

  if (!isOpen || !delivery) return null;

  const delCode = `DLV${String(delivery.delivery_id).padStart(4, '0')}`;
  const customerName = delivery.request?.customer?.full_name || 'Customer';
  const driverName = delivery.driver?.user?.full_name || 'Assigned Driver';

  const REASON_PRESETS = [
    'Heavy traffic congestion along highway',
    'Adverse weather & torrential rain',
    'Road obstruction or mountain detour',
    'Port or checkpoint clearance queue',
    'Vehicle inspection / maintenance pause',
    'Customer pickup/drop-off access delayed',
  ];

  const INQUIRY_TYPES = [
    { key: 'traffic', label: 'Heavy Traffic Check', icon: 'fa-traffic-light' },
    { key: 'weather', label: 'Weather / Road Condition', icon: 'fa-cloud-rain' },
    { key: 'mechanical', label: 'Mechanical & Vehicle Check', icon: 'fa-wrench' },
    { key: 'rest_stop', label: 'Driver Rest / Meal Stop', icon: 'fa-bed' },
    { key: 'general', label: 'General Transit Status', icon: 'fa-compass' },
  ];

  const handleSendCustomerNotice = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const revisedEtaString = revisedDate ? `${revisedDate} ${revisedTime}` : null;
      const res = await api.post(`/deliveries/${delivery.delivery_id}/notify-delay`, {
        delay_reason: delayReason,
        revised_eta: revisedEtaString,
        custom_message: customMsg.trim() || undefined,
      });
      setSuccessMsg('Delay notice successfully sent to customer!');
      setTimeout(() => {
        onSubmitSuccess?.(res.data?.delivery);
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send delay notice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePingDriver = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.post(`/deliveries/${delivery.delivery_id}/ping-driver`, {
        inquiry_type: inquiryType,
        note: driverNote.trim() || undefined,
      });
      setSuccessMsg('Urgent status check alert pushed to driver device!');
      setTimeout(() => {
        onSubmitSuccess?.(res.data?.delivery);
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to send alert to driver.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal"
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 14,
          padding: 24,
          maxWidth: 480,
          width: '92%',
          boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.3)',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: mode === 'notify_customer' ? '#FEF2F2' : '#EFF6FF',
                color: mode === 'notify_customer' ? '#DC2626' : '#2563EB',
                fontSize: 16,
              }}
            >
              <i className={mode === 'notify_customer' ? 'fas fa-bullhorn' : 'fas fa-satellite-dish'}></i>
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
                {mode === 'notify_customer' ? 'Notify Customer of Delay' : 'Ping Driver for Delay Reason'}
              </h3>
              <span style={{ fontSize: 12, color: '#64748B' }}>
                Shipment {delCode} • {mode === 'notify_customer' ? `Customer: ${customerName}` : `Driver: ${driverName}`}
              </span>
            </div>
          </div>
          <i
            className="fas fa-times"
            onClick={onClose}
            style={{ cursor: 'pointer', color: '#94A3B8', fontSize: 16 }}
          ></i>
        </div>

        {/* Content Mode 1: Notify Customer */}
        {mode === 'notify_customer' && (
          <div>
            <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: '#9A3412', marginBottom: 14 }}>
              <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
              This will update the ETA and send an in-app notice to <strong>{customerName}</strong> detailing why the delivery is delayed.
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                Delay Reason / Cause:
              </label>
              <select
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  background: '#F8FAFC',
                }}
              >
                {REASON_PRESETS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                  Revised Arrival Date:
                </label>
                <input
                  type="date"
                  value={revisedDate}
                  onChange={(e) => setRevisedDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                  Target Arrival Time:
                </label>
                <input
                  type="text"
                  value={revisedTime}
                  onChange={(e) => setRevisedTime(e.target.value)}
                  placeholder="e.g. 02:00 PM"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                Custom Message Note (Optional):
              </label>
              <textarea
                rows={2}
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="Add specific instructions or personalized note to the customer..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 12,
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        )}

        {/* Content Mode 2: Ping Driver */}
        {mode === 'ping_driver' && (
          <div>
            <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: '#0369A1', marginBottom: 14 }}>
              <i className="fas fa-signal" style={{ marginRight: 6 }}></i>
              Dispatch a priority check alert to <strong>{driverName}</strong> asking for real-time delay reasons or issues.
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Inquiry Topic:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {INQUIRY_TYPES.map((t) => (
                  <label
                    key={t.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: inquiryType === t.key ? '#F1F5F9' : '#FFFFFF',
                      border: `1px solid ${inquiryType === t.key ? '#0284C7' : '#E2E8F0'}`,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: inquiryType === t.key ? 600 : 400,
                      color: inquiryType === t.key ? '#0369A1' : '#475569',
                    }}
                  >
                    <input
                      type="radio"
                      name="inquiry_type"
                      value={t.key}
                      checked={inquiryType === t.key}
                      onChange={() => setInquiryType(t.key)}
                      style={{ accentColor: '#0284C7' }}
                    />
                    <i className={`fas ${t.icon}`} style={{ width: 16, textAlign: 'center' }}></i>
                    {t.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                Dispatcher Note to Driver (Optional):
              </label>
              <textarea
                rows={2}
                value={driverNote}
                onChange={(e) => setDriverNote(e.target.value)}
                placeholder="e.g. Please update us when you pass the Malaybalay checkpoint..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 12,
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        )}

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div style={{ color: '#DC2626', fontSize: 12, marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 4 }}></i>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ color: '#059669', fontSize: 13, marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>
            <i className="fas fa-check-circle" style={{ marginRight: 5 }}></i>
            {successMsg}
          </div>
        )}

        {/* Action Buttons */}
        {!successMsg && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#F1F5F9',
                color: '#475569',
                border: 'none',
                borderRadius: 6,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={mode === 'notify_customer' ? handleSendCustomerNotice : handlePingDriver}
              disabled={submitting}
              style={{
                background: mode === 'notify_customer' ? '#DC2626' : '#2563EB',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '9px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: submitting ? 0.75 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Processing...
                </>
              ) : mode === 'notify_customer' ? (
                <>
                  <i className="fas fa-paper-plane"></i> Send Delay Notice
                </>
              ) : (
                <>
                  <i className="fas fa-satellite-dish"></i> Alert Driver Device
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
