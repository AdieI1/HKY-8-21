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

export function getVehicleLastEndingOdometer(vehicleId, vehicles = [], deliveries = []) {
  if (!vehicleId) return '';

  const vId = String(vehicleId);

  const vehicleDeliveries = (deliveries || []).filter((d) => {
    return String(d.vehicle_id) === vId || String(d.vehicle?.vehicle_id) === vId;
  });

  const completedDeliveries = vehicleDeliveries.filter((d) => d.status === 'completed');
  const candidateDeliveries = completedDeliveries.length > 0 ? completedDeliveries : vehicleDeliveries;

  const sortedDeliveries = [...candidateDeliveries].sort((a, b) => {
    const timeA = new Date(a.end_time || a.trip_date || a.updated_at || a.created_at).getTime() || 0;
    const timeB = new Date(b.end_time || b.trip_date || b.updated_at || b.created_at).getTime() || 0;
    if (timeB !== timeA) return timeB - timeA;
    return (Number(b.delivery_id) || 0) - (Number(a.delivery_id) || 0);
  });

  for (const delivery of sortedDeliveries) {
    if (delivery.ending_odometer !== null && delivery.ending_odometer !== undefined && delivery.ending_odometer !== '') {
      const num = Number(delivery.ending_odometer);
      if (!isNaN(num) && num > 0) {
        return num.toFixed(2);
      }
    }

    const postTripChecklist = (delivery.checklists || []).find(
      (c) => c.type === 'post_trip' && c.ending_odometer !== null && c.ending_odometer !== undefined && c.ending_odometer !== ''
    );
    if (postTripChecklist) {
      const num = Number(postTripChecklist.ending_odometer);
      if (!isNaN(num) && num > 0) {
        return num.toFixed(2);
      }
    }

    if (delivery.starting_odometer !== null && delivery.starting_odometer !== undefined && delivery.starting_odometer !== '') {
      const startNum = Number(delivery.starting_odometer);
      const dist = Number(delivery.request?.distance_km || delivery.distance_travelled || 0);
      if (!isNaN(startNum) && startNum > 0) {
        return (startNum + (isNaN(dist) ? 0 : dist)).toFixed(2);
      }
    }
  }

  const vehicle = (vehicles || []).find((v) => String(v.vehicle_id) === vId);
  if (vehicle) {
    if (Array.isArray(vehicle.deliveries) && vehicle.deliveries.length > 0) {
      const vDeliveries = [...vehicle.deliveries].sort((a, b) => {
        const timeA = new Date(a.end_time || a.trip_date || a.updated_at || a.created_at).getTime() || 0;
        const timeB = new Date(b.end_time || b.trip_date || b.updated_at || b.created_at).getTime() || 0;
        if (timeB !== timeA) return timeB - timeA;
        return (Number(b.delivery_id) || 0) - (Number(a.delivery_id) || 0);
      });
      for (const d of vDeliveries) {
        if (d.ending_odometer !== null && d.ending_odometer !== undefined && d.ending_odometer !== '') {
          const num = Number(d.ending_odometer);
          if (!isNaN(num) && num > 0) return num.toFixed(2);
        }
      }
    }

    if (vehicle.odometer_reading !== null && vehicle.odometer_reading !== undefined && vehicle.odometer_reading !== '') {
      const num = Number(vehicle.odometer_reading);
      if (!isNaN(num) && num > 0) {
        return num.toFixed(2);
      }
    }
    if (vehicle.mileage !== null && vehicle.mileage !== undefined && vehicle.mileage !== '') {
      const num = Number(vehicle.mileage);
      if (!isNaN(num) && num > 0) {
        return num.toFixed(2);
      }
    }
  }

  return '';
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
  deliveries = [],
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
  onVehicleChange,
}) {
  const handleVehicleSelect = (vehicleId) => {
    if (onVehicleChange) {
      onVehicleChange(vehicleId);
      return;
    }
    setChosenVehicleId(vehicleId);
    if (!vehicleId) {
      if (setOdometerReading) setOdometerReading('');
      return;
    }
    const lastOdometer = getVehicleLastEndingOdometer(vehicleId, availableVehicles, deliveries);
    if (setOdometerReading) {
      setOdometerReading(lastOdometer !== null && lastOdometer !== undefined ? String(lastOdometer) : '');
    }
  };
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
                <select className="tt-select" value={chosenVehicleId} onChange={(event) => handleVehicleSelect(event.target.value)}>
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
                  <input className="tt-input" type="text" value={({ low: 'Normal', medium: 'Fragile', high: 'Perishable' })[selectedDelivery.request?.fragility] || '—'} readOnly />
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
                      step="any"
                      placeholder={selectedVehicle?.odometer_reading ? Number(selectedVehicle.odometer_reading).toFixed(2) : '124000.00'}
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
