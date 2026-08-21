import AssignMap from './AssignMap';

function requestCode(id) {
  return `REQ${String(id).padStart(4, '0')}`;
}

function formatDistance(value, fallback) {
  const distance = Number(value);

  if (Number.isFinite(distance)) {
    return `${distance.toFixed(1)} Kilometers`;
  }

  const fallbackDistance = Number(fallback);
  return Number.isFinite(fallbackDistance)
    ? `${fallbackDistance.toFixed(1)} Kilometers`
    : '— Kilometers';
}

export default function DispatchTicketPanel({
  selectedDelivery,
  closeAssignPanel,
  chosenDriverId,
  setChosenDriverId,
  chosenVehicleId,
  setChosenVehicleId,
  availableDrivers,
  availableVehicles,
  dangerPoints,
  routeDistanceKm,
  setRouteDistanceKm,
  tripDate,
  setTripDate,
  selectedVehicle,
  odometerReading,
  setOdometerReading,
  fuelLiters,
  setFuelLiters,
  fuelReceiptNo,
  setFuelReceiptNo,
  remarks,
  setRemarks,
  dispatchError,
  dispatchDelivery,
  dispatching,
}) {
  return (
    <>
      <div
        className={`trip-ticket-overlay${selectedDelivery ? ' active' : ''}`}
        id="panelOverlay"
        onClick={closeAssignPanel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 998,
          opacity: selectedDelivery ? 1 : 0,
          pointerEvents: selectedDelivery ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      ></div>
      <div
        className={`trip-ticket-modal${selectedDelivery ? ' active' : ''}`}
        id="assignPanel"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 'min(480px, 100vw)',
          background: '#fff',
          zIndex: 999,
          overflowY: 'auto',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          transform: selectedDelivery ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
        }}
      >
        {selectedDelivery && (
          <>
            <div className="tt-header">
              <span><i className="fas fa-route"></i> TRIP TICKET / DISPATCH</span>
              <button className="tt-close-btn" onClick={closeAssignPanel}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="tt-body">
              <div className="tt-request-id">{requestCode(selectedDelivery.request?.request_id)}</div>
              <div className="tt-customer-name">{selectedDelivery.request?.customer?.full_name}</div>
              <div className="tt-contact">Contact Number: {selectedDelivery.request?.customer?.phone || '—'}</div>

              {dispatchError && <div className="form-error" style={{ color: '#d32f2f', margin: '8px 0' }}>{dispatchError}</div>}

              <div className="tt-section-header">
                <i className="fas fa-user-circle tt-section-icon"></i>
                <span>DRIVER</span>
              </div>
              <div className="tt-field tt-full">
                <label className="tt-label">Driver</label>
                <select className="tt-select" value={chosenDriverId} onChange={(event) => setChosenDriverId(event.target.value)}>
                  <option value="">Select Driver</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver.driver_id} value={driver.driver_id}>{driver.user?.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="tt-section-header">
                <i className="fas fa-truck tt-section-icon"></i>
                <span>VEHICLE INFORMATION</span>
              </div>
              <div className="tt-field tt-full">
                <label className="tt-label">Truck No. / Plate No.</label>
                <select className="tt-select" value={chosenVehicleId} onChange={(event) => setChosenVehicleId(event.target.value)}>
                  <option value="">Select Vehicle</option>
                  {availableVehicles.map((vehicle) => (
                    <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>{vehicle.model} ({vehicle.plate_number})</option>
                  ))}
                </select>
              </div>

              <div className="tt-section-header">
                <i className="fas fa-box tt-section-icon"></i>
                <span>CLIENT / CARGO</span>
              </div>
              <div className="tt-two-col">
                <div className="tt-field">
                  <label className="tt-label">Client Name</label>
                  <input className="tt-input" type="text" value={selectedDelivery.request?.customer?.full_name || ''} readOnly />
                </div>
                <div className="tt-field">
                  <label className="tt-label">Cargo Type</label>
                  <input className="tt-input" type="text" value={selectedDelivery.request?.cargo_type || '—'} readOnly />
                </div>
              </div>
              <div className="tt-two-col" style={{ marginTop: '10px' }}>
                <div className="tt-field">
                  <label className="tt-label">Cargo Weight</label>
                  <div className="tt-input-unit">
                    <input className="tt-input" type="text" value={selectedDelivery.request?.weight ?? '—'} readOnly />
                    <span className="tt-unit">kg</span>
                  </div>
                </div>
                <div className="tt-field">
                  <label className="tt-label">Cargo Fragility</label>
                  <input className="tt-input" type="text" value={selectedDelivery.request?.fragility || '—'} readOnly />
                </div>
              </div>

              <div className="tt-section-header">
                <i className="fas fa-map-marker-alt tt-section-icon"></i>
                <span>ROUTE INFORMATION</span>
              </div>
              <div className="tt-field tt-full">
                <label className="tt-label">Origin (Pick-up Point)</label>
                <input className="tt-input" type="text" value={selectedDelivery.request?.pickup_address || ''} readOnly />
              </div>
              <div className="tt-field tt-full" style={{ marginTop: '10px' }}>
                <label className="tt-label">Destination (Drop-off Point)</label>
                <input className="tt-input" type="text" value={selectedDelivery.request?.dropoff_address || ''} readOnly />
              </div>

              <div style={{ marginTop: '10px' }}>
                <AssignMap
                  pickupAddress={selectedDelivery.request?.pickup_address}
                  pickupLat={selectedDelivery.request?.pickup_lat}
                  pickupLng={selectedDelivery.request?.pickup_lng}
                  dropoffAddress={selectedDelivery.request?.dropoff_address}
                  dropoffLat={selectedDelivery.request?.dropoff_lat}
                  dropoffLng={selectedDelivery.request?.dropoff_lng}
                  fallbackDistanceKm={selectedDelivery.request?.distance_km}
                  dangerPoints={dangerPoints}
                  onDistanceResolved={setRouteDistanceKm}
                />
              </div>
              <div className="tt-distance">
                Distance: {formatDistance(routeDistanceKm, selectedDelivery.request?.distance_km)}
              </div>

              <div className="tt-section-header">
                <i className="fas fa-clipboard-list tt-section-icon"></i>
                <span>TRIP INFORMATION</span>
              </div>
              <div className="tt-three-col">
                <div className="tt-field">
                  <label className="tt-label">Date</label>
                  <div className="tt-input-unit">
                    <input className="tt-input" type="date" value={tripDate} onChange={(event) => setTripDate(event.target.value)} />
                  </div>
                </div>
                <div className="tt-field">
                  <label className="tt-label">Odometer Reading In</label>
                  <div className="tt-input-unit">
                    <input
                      className="tt-input"
                      type="number"
                      placeholder={selectedVehicle?.odometer_reading ?? '124000'}
                      value={odometerReading}
                      onChange={(event) => setOdometerReading(event.target.value)}
                    />
                    <span className="tt-unit">km</span>
                  </div>
                </div>
                <div className="tt-field">
                  <label className="tt-label">Fuel Issued</label>
                  <div className="tt-input-unit">
                    <input
                      className="tt-input"
                      type="number"
                      placeholder="100"
                      value={fuelLiters}
                      onChange={(event) => setFuelLiters(event.target.value)}
                    />
                    <span className="tt-unit">L</span>
                  </div>
                </div>
              </div>
              <div className="tt-two-col" style={{ marginTop: '10px' }}>
                <div className="tt-field">
                  <label className="tt-label">Fuel Receipt No.</label>
                  <input
                    className="tt-input"
                    type="text"
                    placeholder="FR-2026-00045"
                    value={fuelReceiptNo}
                    onChange={(event) => setFuelReceiptNo(event.target.value)}
                  />
                </div>
                <div className="tt-field">
                  <label className="tt-label">Remarks (Optional)</label>
                  <input
                    className="tt-input"
                    type="text"
                    placeholder="Enter remarks..."
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                  />
                </div>
              </div>

              <button className="tt-send-btn" onClick={dispatchDelivery} disabled={dispatching}>
                <i className="fas fa-paper-plane"></i> {dispatching ? 'Dispatching...' : 'Send Trip Ticket & Dispatch'}
              </button>
              <div className="tt-note">
                <i className="fas fa-shield-alt"></i> This assigns the driver &amp; vehicle to the delivery, and records the odometer/fuel entries above.
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
