import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/api-client';
import AssignMap from '../components/dispatch/AssignMap';
import { DispatchHeader, DispatchSidebar } from '../components/dispatch/DispatchChrome';

function requestCode(id) {
  return `REQ${String(id).padStart(4, '0')}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function DispatchPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [fuelInventory, setFuelInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [chosenDriverId, setChosenDriverId] = useState('');
  const [chosenVehicleId, setChosenVehicleId] = useState('');
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);

  // Trip ticket fields
  const [tripDate, setTripDate] = useState(todayIso());
  const [odometerReading, setOdometerReading] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelReceiptNo, setFuelReceiptNo] = useState('');
  const [remarks, setRemarks] = useState('');

  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState('');
  const [dispatchWarning, setDispatchWarning] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const update = () => {
      setCurrentDate(
        new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })
      );
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [deliveriesRes, driversRes, vehiclesRes, incidentsRes, fuelRes] = await Promise.all([
        api.get('/deliveries'),
        api.get('/drivers'),
        api.get('/vehicles'),
        api.get('/incident-reports'),
        api.get('/fuel-inventory'),
      ]);
      setDeliveries(deliveriesRes.data);
      setDrivers(driversRes.data);
      setVehicles(vehiclesRes.data);
      setIncidents(incidentsRes.data);
      setFuelInventory(fuelRes.data);
    } catch (err) {
      setLoadError('Could not load dispatch data. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const unassigned = useMemo(() => {
    let list = deliveries.filter((d) => !d.driver_id);
    if (sortBy === 'date-desc') list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortBy === 'date-asc') list = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return list;
  }, [deliveries, sortBy]);

  const availableDrivers = useMemo(
    () => drivers.filter((d) => d.status === 'active' && d.availability_status === 'available'),
    [drivers]
  );
  const availableVehicles = useMemo(() => vehicles.filter((v) => v.status === 'available'), [vehicles]);

  const dangerPoints = useMemo(() => {
    return incidents
      .filter((inc) => ['accident', 'damage'].includes(inc.incident_type))
      .map((inc) => {
        const req = inc.delivery?.request;
        if (!req) return null;
        const point = req.dropoff_lat && req.dropoff_lng
          ? { lat: parseFloat(req.dropoff_lat), lng: parseFloat(req.dropoff_lng) }
          : req.pickup_lat && req.pickup_lng
          ? { lat: parseFloat(req.pickup_lat), lng: parseFloat(req.pickup_lng) }
          : null;
        if (!point) return null;
        return { ...point, type: inc.incident_type, description: inc.description };
      })
      .filter(Boolean);
  }, [incidents]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => String(v.vehicle_id) === String(chosenVehicleId)) || null,
    [vehicles, chosenVehicleId]
  );

  const openAssignPanel = (delivery) => {
    setSelectedDelivery(delivery);
    setChosenDriverId('');
    setChosenVehicleId('');
    setRouteDistanceKm(null);
    setTripDate(todayIso());
    setOdometerReading('');
    setFuelLiters('');
    setFuelReceiptNo('');
    setRemarks('');
    setDispatchError('');
    setDispatchWarning('');
  };
  const closeAssignPanel = () => setSelectedDelivery(null);

  const dispatchDelivery = async () => {
    if (!chosenDriverId) {
      setDispatchError('Please select a driver.');
      return;
    }
    if (!chosenVehicleId) {
      setDispatchError('Please select a vehicle.');
      return;
    }
    setDispatching(true);
    setDispatchError('');
    setDispatchWarning('');


    try {
      await api.post(`/deliveries/${selectedDelivery.delivery_id}/dispatch`, {
        driver_id: chosenDriverId,
        vehicle_id: chosenVehicleId,
      });
    } catch (err) {
      const errors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      setDispatchError(errors ? Object.values(errors)[0][0] : message || 'Could not dispatch this delivery.');
      console.error('Dispatch failed:', err.response?.data || err);
      setDispatching(false);
      return;
    }


    const warnings = [];

    if (odometerReading !== '') {
      try {
        await api.patch(`/vehicles/${chosenVehicleId}`, {
          odometer_reading: odometerReading,
        });
      } catch (err) {
        console.error('Odometer update failed:', err.response?.data || err);
        warnings.push('Dispatched, but the odometer reading could not be saved.');
      }
    }

    if (fuelLiters !== '' && Number(fuelLiters) > 0) {
      const matchedFuel = fuelInventory.find(
        (f) => selectedVehicle && f.fuel_type?.toLowerCase() === selectedVehicle.fuel_type?.toLowerCase()
      );

      if (!matchedFuel) {
        warnings.push(
          `Dispatched, but no fuel inventory record matches this vehicle's fuel type ("${selectedVehicle?.fuel_type || 'unknown'}") — fuel was not deducted.`
        );
      } else {
        try {
          const purposeParts = [];
          if (remarks) purposeParts.push(remarks);
          if (fuelReceiptNo) purposeParts.push(`Receipt: ${fuelReceiptNo}`);
          purposeParts.push(`Trip dispatch for ${requestCode(selectedDelivery.request?.request_id)}`);

          await api.post(`/fuel-inventory/${matchedFuel.fuel_id}/issue`, {
            liters: fuelLiters,
            vehicle_id: chosenVehicleId,
            driver_id: chosenDriverId,
            purpose: purposeParts.join(' | '),
          });
        } catch (err) {
          const message = err.response?.data?.message;
          console.error('Fuel issuance failed:', err.response?.data || err);
          warnings.push(message || 'Dispatched, but fuel could not be issued (insufficient stock or a server error).');
        }
      }
    }

    setSelectedDelivery(null);
    setDispatchWarning(warnings.join(' '));
    setShowSuccessModal(true);
    await loadData();
    setTimeout(() => setShowSuccessModal(false), warnings.length ? 8000 : 5000);
    setDispatching(false);
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center' }}>Loading dispatch data...</div>;
  }

  return (
    <>
      <div className="dashboard-container">
        <DispatchSidebar />

        <div className="main-content">
          <DispatchHeader currentDate={currentDate} />

          {loadError && <div className="form-error" style={{ margin: '16px 0', color: '#d32f2f' }}>{loadError}</div>}

          <div className="content-section">
            <div className="section-header">
              <h3 className="section-title">Approved Delivery Requests</h3>
              <div className="sort-dropdown">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ border: 'none', background: 'transparent' }}>
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                </select>
              </div>
            </div>
            <div className="section-content">
              <table className="data-table">
                <thead>
                  <tr><th>Request ID</th><th>Customer</th><th>Route</th><th>Date Approved</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {unassigned.map((d) => (
                    <tr key={d.delivery_id}>
                      <td className="request-id">{requestCode(d.request?.request_id)}</td>
                      <td>{d.request?.customer?.full_name || '—'}</td>
                      <td className="route">
                        {(d.request?.pickup_address || '—').split(',')[0]} - {(d.request?.dropoff_address || '—').split(',')[0]}
                      </td>
                      <td>{new Date(d.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</td>
                      <td><button className="btn-assign" onClick={() => openAssignPanel(d)}>Assign</button></td>
                    </tr>
                  ))}
                  {unassigned.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24 }}>No approved requests waiting for dispatch.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="dispatch-footer">
              <div className="dispatch-info">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>Click assign button to assign driver and vehicle.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Ticket / Dispatch Modal */}
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

              {/* Driver / Crew */}
              <div className="tt-section-header">
                <i className="fas fa-user-circle tt-section-icon"></i>
                <span>DRIVER</span>
              </div>
              <div className="tt-field tt-full">
                <label className="tt-label">Driver</label>
                <select className="tt-select" value={chosenDriverId} onChange={(e) => setChosenDriverId(e.target.value)}>
                  <option value="">Select Driver</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver.driver_id} value={driver.driver_id}>{driver.user?.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Vehicle Information */}
              <div className="tt-section-header">
                <i className="fas fa-truck tt-section-icon"></i>
                <span>VEHICLE INFORMATION</span>
              </div>
              <div className="tt-field tt-full">
                <label className="tt-label">Truck No. / Plate No.</label>
                <select className="tt-select" value={chosenVehicleId} onChange={(e) => setChosenVehicleId(e.target.value)}>
                  <option value="">Select Vehicle</option>
                  {availableVehicles.map((vehicle) => (
                    <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>{vehicle.model} ({vehicle.plate_number})</option>
                  ))}
                </select>
              </div>

              {/* Client / Cargo */}
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

              {/* Route Information */}
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
                Distance: {routeDistanceKm != null ? `${Number(routeDistanceKm).toFixed(1)} Kilometers` : `${selectedDelivery.request?.distance_km ?? '—'} Kilometers`}
              </div>

              {/* Trip Information */}
              <div className="tt-section-header">
                <i className="fas fa-clipboard-list tt-section-icon"></i>
                <span>TRIP INFORMATION</span>
              </div>
              <div className="tt-three-col">
                <div className="tt-field">
                  <label className="tt-label">Date</label>
                  <div className="tt-input-unit">
                    <input className="tt-input" type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} />
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
                      onChange={(e) => setOdometerReading(e.target.value)}
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
                      onChange={(e) => setFuelLiters(e.target.value)}
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
                    onChange={(e) => setFuelReceiptNo(e.target.value)}
                  />
                </div>
                <div className="tt-field">
                  <label className="tt-label">Remarks (Optional)</label>
                  <input
                    className="tt-input"
                    type="text"
                    placeholder="Enter remarks..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
              </div>

              {/* Send Button */}
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

      {/* Dispatch Success Modal */}
      {showSuccessModal && (
        <div className="dispatch-success-modal active">
          <div className="dispatch-success-content">
            <div className="dispatch-success-icon"><i className="fas fa-check-circle"></i></div>
            <h2 className="dispatch-success-title">Dispatched Successfully!</h2>
            <p className="dispatch-success-text">The request can now be viewed in the Delivery Monitoring tab for tracking.</p>
            {dispatchWarning && (
              <p className="dispatch-success-text" style={{ color: '#c0392b', marginTop: 8 }}>{dispatchWarning}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default DispatchPage;