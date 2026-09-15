export default function RescheduleProposalModal({
  target,
  forecast,
  rescheduleDate,
  setRescheduleDate,
  rescheduleSlot,
  setRescheduleSlot,
  submitting,
  successMsg,
  onClose,
  onSubmit,
}) {
  if (!target) return null;

  return (
    <div
      className="modal"
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
      }}
    >
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 440, width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#C2410C', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="far fa-calendar-alt"></i> Propose Reschedule
          </h3>
          <i className="fas fa-times" onClick={onClose} style={{ cursor: 'pointer', color: '#888' }}></i>
        </div>
        <p style={{ fontSize: 13, color: '#4B5563', margin: '0 0 12px 0' }}>
          Propose a confirmed dispatch slot to <strong>{target.request?.customer?.full_name || 'Customer'}</strong> for <strong>DLV{String(target.delivery_id).padStart(4, '0')}</strong>.
        </p>
        {forecast?.earliest_available_label && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 12px', borderRadius: 8, fontSize: 12, color: '#92400E', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-lightbulb" style={{ color: '#D97706' }}></i>
            <span>Earliest free driver forecast: <strong>{forecast.earliest_available_label}</strong></span>
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Proposed Date:</label>
          <input
            type="date"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Preferred Time Slot:</label>
          <input
            type="text"
            value={rescheduleSlot}
            onChange={(e) => setRescheduleSlot(e.target.value)}
            placeholder="e.g. 09:00 AM"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
        {successMsg ? (
          <div style={{ color: '#059669', fontWeight: 600, fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
            <i className="fas fa-check-circle"></i> {successMsg}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: '#E5E7EB', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              style={{ background: '#EA580C', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Sending...' : 'Send Proposal to Customer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
