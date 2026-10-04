export default function RescheduleProposalModal({
  target,
  forecast,
  availableDrivers = [],
  availableVehicles = [],
  selectedDriverId,
  setSelectedDriverId,
  selectedVehicleId,
  setSelectedVehicleId,
  rescheduleDate,
  setRescheduleDate,
  rescheduleSlot,
  setRescheduleSlot,
  remarks,
  setRemarks,
  submitting,
  errorMsg,
  successMsg,
  onClose,
  onSubmit,
}) {
  if (!target) return null;

  const currentDriverName = target.driver?.user?.full_name || 'Current Driver';
  const currentVehicleInfo = target.vehicle
    ? `${target.vehicle.model || target.vehicle.brand} (${target.vehicle.plate_number})`
    : 'None';

  return (
    <div
      className="modal"
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '22px 24px',
          maxWidth: 490,
          width: '92%',
          boxShadow: '0 16px 36px rgba(0,0,0,0.3)',
          maxHeight: '90vh',
          overflowY: 'auto',
          color: '#1f2937',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: '#B91C1C',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <i className="far fa-calendar-alt" style={{ color: '#DC2626' }}></i>
            Propose Re-schedule
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: 16,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 14px 0', lineHeight: 1.45 }}>
          Re-schedule <strong>DLV{String(target.delivery_id).padStart(4, '0')}</strong> for{' '}
          <strong>{target.request?.customer?.full_name || 'Customer'}</strong> by assigning a new available driver and suitable vehicle.
        </p>

        {/* Current Assignment Snapshot */}
        <div
          style={{
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 12,
            color: '#374151',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <i className="fas fa-user-clock" style={{ color: '#6B7280' }}></i>
            <span>Current Assignment:</span>
          </div>
          <div style={{ color: '#4B5563', marginTop: 2, fontSize: '11.5px' }}>
            {currentDriverName} • {currentVehicleInfo}
          </div>
        </div>

        {/* Available Driver Selection */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            Assign New Available Driver: <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #D1D5DB',
              fontSize: 13,
              boxSizing: 'border-box',
              background: '#fff',
            }}
          >
            <option value="">-- Choose an Available Driver --</option>
            {availableDrivers.map((d) => (
              <option key={d.driver_id} value={d.driver_id}>
                {d.user?.full_name || `Driver #${d.driver_id}`} {d.license_number ? `• (${d.license_number})` : ''}
              </option>
            ))}
          </select>
          {availableDrivers.length === 0 && (
            <div style={{ color: '#DC2626', fontSize: 11, marginTop: 3 }}>
              No active drivers currently marked available.
            </div>
          )}
        </div>

        {/* Suitable Vehicle Selection */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            Assign Suitable Vehicle: <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #D1D5DB',
              fontSize: 13,
              boxSizing: 'border-box',
              background: '#fff',
            }}
          >
            <option value="">-- Choose a Suitable Vehicle --</option>
            {availableVehicles.map((v) => (
              <option key={v.vehicle_id} value={v.vehicle_id}>
                {v.model || v.brand} – {v.plate_number} ({v.type || 'Standard'})
              </option>
            ))}
          </select>
          {availableVehicles.length === 0 && (
            <div style={{ color: '#DC2626', fontSize: 11, marginTop: 3 }}>
              No vehicles currently marked available in fleet.
            </div>
          )}
        </div>

        {/* Reschedule Date & Slot Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Proposed Date:
            </label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Preferred Slot:
            </label>
            <input
              type="text"
              value={rescheduleSlot}
              onChange={(e) => setRescheduleSlot(e.target.value)}
              placeholder="e.g. 09:00 AM"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Remarks / Reason */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            Remarks / Reason:
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Reassigned due to dispatch delay"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #D1D5DB',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {errorMsg && (
          <div
            style={{
              color: '#DC2626',
              background: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: 12,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="fas fa-exclamation-circle"></i>
            {errorMsg}
          </div>
        )}

        {successMsg ? (
          <div
            style={{
              color: '#065F46',
              background: '#D1FAE5',
              border: '1px solid #A7F3D0',
              borderRadius: 6,
              padding: '10px 12px',
              fontWeight: 600,
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>
            {successMsg}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#F3F4F6',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting || (!selectedDriverId && !selectedVehicleId && !rescheduleDate)}
              style={{
                background: '#DC2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: submitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
              }}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Processing...
                </>
              ) : (
                <>
                  <i className="far fa-calendar-check"></i> Confirm Re-schedule
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
