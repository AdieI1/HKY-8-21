export default function ReassignDriverModal({
  target,
  availableDrivers = [],
  availableVehicles = [],
  selectedDriverId,
  setSelectedDriverId,
  selectedVehicleId,
  setSelectedVehicleId,
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
  const currentVehicleInfo = target.vehicle ? `${target.vehicle.model} (${target.vehicle.plate_number})` : 'None';

  return (
    <div
      className="modal"
      style={{
        display: 'flex',
        position: 'fixed',
        inset: 0,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 480,
          width: '90%',
          boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-user-edit"></i> Re-assign Driver &amp; Vehicle
          </h3>
          <i className="fas fa-times" onClick={onClose} style={{ cursor: 'pointer', color: '#888', fontSize: 16 }}></i>
        </div>

        <p style={{ fontSize: 13, color: '#4B5563', margin: '0 0 12px 0' }}>
          Re-assign <strong>DLV{String(target.delivery_id).padStart(4, '0')}</strong> for <strong>{target.request?.customer?.full_name || 'Customer'}</strong>.
        </p>

        {/* Current assignment notice */}
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12,
            color: '#991B1B',
            marginBottom: 14,
          }}
        >
          <div><i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }}></i><strong>Current Assignment:</strong> {currentDriverName} • {currentVehicleInfo}</div>
          <div style={{ fontSize: 11, marginTop: 4, color: '#B91C1C' }}>
            Confirming will release the current driver and vehicle back to available and restart the dispatch timer.
          </div>
        </div>

        {/* Driver Selection */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            Select New Driver: <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }}
          >
            <option value="">-- Choose an Available Driver --</option>
            {availableDrivers.map((d) => (
              <option key={d.driver_id} value={d.driver_id}>
                {d.user?.full_name || `Driver #${d.driver_id}`} {d.license_number ? `(License: ${d.license_number})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Selection */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            Select Vehicle: <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }}
          >
            <option value="">-- Choose a Vehicle --</option>
            {availableVehicles.map((v) => (
              <option key={v.vehicle_id} value={v.vehicle_id}>
                {v.model} – {v.plate_number} (Available)
              </option>
            ))}
          </select>
        </div>

        {/* Remarks */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            Remarks / Reassignment Reason:
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Reassigned due to dispatch delay"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>

        {errorMsg && (
          <div style={{ color: '#DC2626', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 10px', fontSize: 12, marginBottom: 12 }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }}></i>
            {errorMsg}
          </div>
        )}

        {successMsg ? (
          <div style={{ color: '#059669', background: '#D1FAE5', border: '1px solid #A7F3D0', borderRadius: 6, padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
            <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i> {successMsg}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
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
              disabled={submitting || !selectedDriverId || !selectedVehicleId}
              style={{
                background: '#2563EB',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting || !selectedDriverId || !selectedVehicleId ? 'not-allowed' : 'pointer',
                opacity: submitting || !selectedDriverId || !selectedVehicleId ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fas fa-exchange-alt"></i>
              {submitting ? 'Re-assigning...' : 'Confirm Re-assignment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
