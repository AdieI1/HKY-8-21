import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/api-client';
import reverb from '../utils/reverb';
import AssignMap from '../components/dispatch/AssignMap';
import { DispatchHeader, DispatchSidebar } from '../components/dispatch/DispatchChrome';

function requestCode(id) {
  return `REQ${String(id).padStart(4, '0')}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function getVehicleLastEndingOdometer(vehicleId, vehicles = [], deliveries = []) {
  if (!vehicleId) return '';

  const vId = String(vehicleId);

  // 1. Check in deliveries list for this vehicle
  const vehicleDeliveries = (deliveries || []).filter((d) => {
    return String(d.vehicle_id) === vId || String(d.vehicle?.vehicle_id) === vId;
  });

  // Completed trips should take priority, then sort by newest date/ID
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

  // 2. Fallback to vehicle's own stored odometer_reading or mileage
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
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'pending' | 'overdue' | 'awaiting' | 'dispatched'
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [chosenDriverId, setChosenDriverId] = useState('');
  const [chosenVehicleId, setChosenVehicleId] = useState('');
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);

  const [tripDate, setTripDate] = useState(todayIso());
  const [estimatedDurationDays, setEstimatedDurationDays] = useState('2');
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
      try {
        const overviewRes = await api.get('/dispatch/overview');
        if (overviewRes.data) {
          setDeliveries(overviewRes.data.deliveries || []);
          setDrivers(overviewRes.data.drivers || []);
          setVehicles(overviewRes.data.vehicles || []);
          setIncidents(overviewRes.data.incidents || []);
          setFuelInventory(overviewRes.data.fuel_inventory || []);
          return;
        }
      } catch (_) {
        // Fallback to parallel requests if endpoint not available
      }

      const [deliveriesRes, driversRes, vehiclesRes, incidentsRes, fuelRes] = await Promise.all([
        api.get('/deliveries'),
        api.get('/drivers'),
        api.get('/vehicles'),
        api.get('/incident-reports'),
        api.get('/fuel-inventory'),
      ]);
      setDeliveries(deliveriesRes.data || []);
      setDrivers(driversRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setIncidents(incidentsRes.data || []);
      setFuelInventory(fuelRes.data || []);
    } catch (err) {
      setLoadError('Could not load dispatch data. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Instant real-time update when dispatch status changes
    const unsubscribe = reverb.subscribe('deliveries', 'delivery.updated', () => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);


  const isOverdue = useCallback((d) => {
    if (d.status === 'assigned' && d.start_time) {
      return (Date.now() - new Date(d.start_time).getTime()) / 3600000 >= 3;
    }
    if (!d.driver_id && d.created_at) {
      return (Date.now() - new Date(d.created_at).getTime()) / 3600000 >= 24;
    }
    return false;
  }, []);

  const getDeliveryStatus = useCallback((d) => {
    const overdue = isOverdue(d);
    if (!d.driver_id || d.status === 'pending') {
      return { label: 'Pending', key: 'pending', isOverdue: overdue };
    }
    if (d.status === 'assigned') {
      return { label: 'Awaiting Dispatch', key: 'awaiting', isOverdue: overdue };
    }
    if (['accepted', 'arrived_pickup', 'loading_cargo', 'out_for_delivery', 'in_transit'].includes(d.status)) {
      return { label: 'Dispatched', key: 'dispatched', isOverdue: false };
    }
    return { label: 'Pending', key: 'pending', isOverdue: overdue };
  }, [isOverdue]);

  const kpiCounts = useMemo(() => {
    let pending = 0;
    let overdue = 0;
    let awaiting = 0;
    let dispatched = 0;

    deliveries.forEach((d) => {
      if (d.status === 'completed') return;

      if (isOverdue(d)) overdue++;

      if (!d.driver_id || d.status === 'pending') {
        pending++;
      } else if (d.status === 'assigned') {
        awaiting++;
      } else if (['accepted', 'arrived_pickup', 'loading_cargo', 'out_for_delivery', 'in_transit'].includes(d.status)) {
        dispatched++;
      }
    });

    return { pending, overdue, awaiting, dispatched };
  }, [deliveries, isOverdue]);

  const sortedDeliveries = useMemo(() => {
    let list = [];
    if (activeFilter === 'overdue') {
      list = deliveries.filter(isOverdue);
    } else if (activeFilter === 'awaiting') {
      list = deliveries.filter((d) => d.status === 'assigned');
    } else if (activeFilter === 'dispatched') {
      list = deliveries.filter((d) => ['accepted', 'arrived_pickup', 'loading_cargo', 'out_for_delivery', 'in_transit'].includes(d.status));
    } else if (activeFilter === 'pending') {
      list = deliveries.filter((d) => !d.driver_id || d.status === 'pending');
    } else {
      // Default: show all active deliveries
      list = deliveries.filter((d) => d.status !== 'completed');
    }

    if (sortBy === 'date-desc') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'date-asc') {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'id-asc') {
      list.sort((a, b) => (Number(a.request?.request_id || a.delivery_id) || 0) - (Number(b.request?.request_id || b.delivery_id) || 0));
    } else if (sortBy === 'id-desc') {
      list.sort((a, b) => (Number(b.request?.request_id || b.delivery_id) || 0) - (Number(a.request?.request_id || a.delivery_id) || 0));
    } else if (sortBy === 'customer-asc') {
      list.sort((a, b) => (a.request?.customer?.full_name || '').localeCompare(b.request?.customer?.full_name || '', undefined, { sensitivity: 'base' }));
    } else if (sortBy === 'customer-desc') {
      list.sort((a, b) => (b.request?.customer?.full_name || '').localeCompare(a.request?.customer?.full_name || '', undefined, { sensitivity: 'base' }));
    } else if (sortBy === 'route-asc') {
      list.sort((a, b) => (a.request?.pickup_address || '').localeCompare(b.request?.pickup_address || '', undefined, { sensitivity: 'base' }));
    }

    return list;
  }, [deliveries, activeFilter, sortBy, isOverdue]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedDeliveries.length / PAGE_SIZE));
  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedDeliveries.slice(start, start + PAGE_SIZE);
  }, [sortedDeliveries, currentPage, PAGE_SIZE]);

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

  const handleVehicleChange = (vehicleId) => {
    setChosenVehicleId(vehicleId);
    if (!vehicleId) {
      setOdometerReading('');
      return;
    }
    const lastOdometer = getVehicleLastEndingOdometer(vehicleId, vehicles, deliveries);
    setOdometerReading(lastOdometer !== null && lastOdometer !== undefined ? String(lastOdometer) : '');
  };

  const openAssignPanel = (delivery) => {
    setSelectedDelivery(delivery);
    setChosenDriverId(delivery.driver_id ? String(delivery.driver_id) : '');
    const initialVehicleId = delivery.vehicle_id ? String(delivery.vehicle_id) : '';
    setChosenVehicleId(initialVehicleId);
    setRouteDistanceKm(null);
    setTripDate(
      delivery.trip_date
        ? String(delivery.trip_date).split('T')[0]
        : (delivery.start_time ? String(delivery.start_time).split('T')[0] : todayIso())
    );
    setEstimatedDurationDays(delivery.estimated_duration_days ? String(delivery.estimated_duration_days) : '2');
    const initialOdometer = delivery.starting_odometer !== null && delivery.starting_odometer !== undefined
      ? String(delivery.starting_odometer)
      : (initialVehicleId ? getVehicleLastEndingOdometer(initialVehicleId, vehicles, deliveries) : '');
    setOdometerReading(initialOdometer || '');
    setFuelLiters(delivery.fuel_issued !== null && delivery.fuel_issued !== undefined ? String(delivery.fuel_issued) : '');
    setFuelReceiptNo(delivery.fuel_receipt_no || '');
    setRemarks(delivery.remarks || '');
    setDispatchError('');
    setDispatchWarning('');
  };
  const closeAssignPanel = () => setSelectedDelivery(null);

  const isDispatched = Boolean(
    selectedDelivery &&
    ['accepted', 'arrived_pickup', 'loading_cargo', 'out_for_delivery', 'in_transit', 'delivered', 'completed'].includes(selectedDelivery.status)
  );

  const assignedDriver = useMemo(() => {
    if (!selectedDelivery) return null;
    return selectedDelivery.driver || drivers.find((d) => String(d.driver_id) === String(selectedDelivery.driver_id)) || null;
  }, [selectedDelivery, drivers]);

  const assignedVehicle = useMemo(() => {
    if (!selectedDelivery) return null;
    return selectedDelivery.vehicle || vehicles.find((v) => String(v.vehicle_id) === String(selectedDelivery.vehicle_id)) || null;
  }, [selectedDelivery, vehicles]);

  const assignedBy = useMemo(() => {
    if (!selectedDelivery) return null;
    return selectedDelivery.assigned_by_user?.full_name || selectedDelivery.assignedBy?.full_name || null;
  }, [selectedDelivery]);

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
        trip_date: tripDate,
        estimated_duration_days: parseInt(estimatedDurationDays, 10) || 2,
        fuel_issued: fuelLiters || null,
        fuel_receipt_no: fuelReceiptNo || null,
        remarks: remarks.trim() || null,
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
            issue_date: tripDate,
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


  return (
    <>
      <div className="dashboard-container">
        <DispatchSidebar />

        <div className="main-content">
          <DispatchHeader currentDate={currentDate} />

          {loadError && <div className="form-error" style={{ margin: '16px 0', color: '#d32f2f' }}>{loadError}</div>}

          {/* Dispatch KPI Cards - Figma Design */}
          <div className="dispatch-stats">
            <div
              className={`dispatch-stat-card${activeFilter === 'pending' ? ' active active-pending' : ''}`}
              onClick={() => setActiveFilter((prev) => (prev === 'pending' ? 'all' : 'pending'))}
              title="Click to filter Pending requests"
            >
              <div className="dispatch-stat-number pending">{kpiCounts.pending}</div>
              <span className="dispatch-stat-label">Pending</span>
            </div>

            <div
              className={`dispatch-stat-card${activeFilter === 'overdue' ? ' active active-overdue' : ''}`}
              onClick={() => setActiveFilter((prev) => (prev === 'overdue' ? 'all' : 'overdue'))}
              title="Click to filter Overdue requests"
            >
              <div className="dispatch-stat-number overdue">{kpiCounts.overdue}</div>
              <span className="dispatch-stat-label">Overdue</span>
            </div>

            <div
              className={`dispatch-stat-card${activeFilter === 'awaiting' ? ' active active-awaiting' : ''}`}
              onClick={() => setActiveFilter((prev) => (prev === 'awaiting' ? 'all' : 'awaiting'))}
              title="Click to filter Awaiting Dispatch requests"
            >
              <div className="dispatch-stat-number awaiting">{kpiCounts.awaiting}</div>
              <span className="dispatch-stat-label">Awaiting Dispatch</span>
            </div>

            <div
              className={`dispatch-stat-card${activeFilter === 'dispatched' ? ' active active-dispatched' : ''}`}
              onClick={() => setActiveFilter((prev) => (prev === 'dispatched' ? 'all' : 'dispatched'))}
              title="Click to filter Dispatched requests"
            >
              <div className="dispatch-stat-number dispatched">{kpiCounts.dispatched}</div>
              <span className="dispatch-stat-label">Dispatched</span>
            </div>
          </div>

          <div className="content-section">
            <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <h3 className="section-title">
                {activeFilter === 'overdue'
                  ? 'Overdue Delivery Requests'
                  : activeFilter === 'awaiting'
                  ? 'Awaiting Dispatch (Assigned to Drivers)'
                  : activeFilter === 'dispatched'
                  ? 'Dispatched Deliveries (Active In-Transit)'
                  : activeFilter === 'pending'
                  ? 'Approved Delivery Requests (Pending Driver Assignment)'
                  : 'Approved Delivery Requests'}
              </h3>
              <div className="sort-wrapper">
                <span className="sort-label">Sort by</span>
                <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="id-asc">Request ID (REQ0001 →)</option>
                  <option value="id-desc">Request ID (REQ9999 →)</option>
                  <option value="customer-asc">Customer (A – Z)</option>
                  <option value="customer-desc">Customer (Z – A)</option>
                  <option value="route-asc">Route (A – Z)</option>
                </select>
              </div>
            </div>
            <div className="section-content">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Customer</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>Date Approved</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDeliveries.map((d) => {
                    const st = getDeliveryStatus(d);
                    return (
                      <tr key={d.delivery_id}>
                        <td className="request-id">{requestCode(d.request?.request_id || d.delivery_id)}</td>
                        <td style={{ fontWeight: 600 }}>{d.request?.customer?.full_name || '—'}</td>
                        <td className="route">
                          {(d.request?.pickup_address || '—').split(',')[0]} ~ {(d.request?.dropoff_address || '—').split(',')[0]}
                        </td>
                        <td>
                          <span className={`dispatch-status-val ${st.key}`}>
                            {st.label}
                          </span>
                          {st.isOverdue && (
                            <span
                              style={{
                                marginLeft: '8px',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                backgroundColor: '#FEE2E2',
                                color: '#DC2626',
                                fontSize: '11px',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                verticalAlign: 'middle',
                              }}
                              title="Exceeded SLA dispatch timeline"
                            >
                              <i className="fas fa-exclamation-triangle" style={{ fontSize: '10px' }}></i> Overdue
                            </span>
                          )}
                        </td>
                        <td>{new Date(d.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</td>
                        <td>
                          <button
                            className="btn-assign"
                            style={d.status === 'assigned' ? { background: '#2563EB' } : (['accepted', 'arrived_pickup', 'loading_cargo', 'out_for_delivery', 'in_transit'].includes(d.status) ? { background: '#475569' } : {})}
                            onClick={() => openAssignPanel(d)}
                          >
                            {!d.driver_id || d.status === 'pending' ? 'Assign' : (d.status === 'assigned' ? 'Reassign' : 'View Ticket')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {loading && (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading dispatch...</td></tr>
                  )}
                  {!loading && paginatedDeliveries.length === 0 && (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#6B7280' }}>No delivery requests found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="dispatch-footer">
              <div className="dispatch-info" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#DC2626', fontSize: 14, fontWeight: 500 }}>
                <i className="fas fa-info-circle" style={{ color: '#DC2626', fontSize: 16, flexShrink: 0 }}></i>
                <span>Click assign button to assign driver and delivery.</span>
              </div>
              {totalPages > 1 && (
                <div className="dispatch-pagination">
                  <span className="page-label">Page</span>
                  <button
                    className="btn-page"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <span className="page-number active">{currentPage}</span>
                  <button
                    className="btn-page"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
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
            <div className="tt-header" style={isDispatched ? { background: '#1E293B' } : {}}>
              <span>
                <i className={isDispatched ? "fas fa-lock" : "fas fa-route"}></i>
                {isDispatched ? 'TRIP TICKET (LOCKED - IN TRANSIT)' : 'TRIP TICKET / DISPATCH'}
              </span>
              <button className="tt-close-btn" onClick={closeAssignPanel}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="tt-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div className="tt-request-id" style={{ margin: 0 }}>{requestCode(selectedDelivery.request?.request_id)}</div>
                {isDispatched && (
                  <span style={{
                    background: '#EFF6FF',
                    color: '#1D4ED8',
                    border: '1px solid #BFDBFE',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <i className="fas fa-satellite-dish" style={{ fontSize: 10 }}></i> Active In-Transit
                  </span>
                )}
              </div>
              <div className="tt-customer-name">{selectedDelivery.request?.customer?.full_name}</div>
              <div className="tt-contact">Contact Number: {selectedDelivery.request?.customer?.phone || '—'}</div>

              {isDispatched && (
                <div style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <i className="fas fa-lock" style={{ color: '#16A34A', fontSize: 16, marginTop: 2 }}></i>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#15803D', marginBottom: 2 }}>
                      Dispatched &amp; Locked (Read-Only)
                    </div>
                    <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.4 }}>
                      This delivery is actively in transit. Reassignments are locked to protect live tracking and driver milestone synchronization.
                    </div>
                  </div>
                </div>
              )}

              {dispatchError && <div className="form-error" style={{ color: '#d32f2f', margin: '8px 0' }}>{dispatchError}</div>}

              {/* Driver / Crew */}
              <div className="tt-section-header">
                <i className="fas fa-user-circle tt-section-icon"></i>
                <span>{isDispatched ? 'ASSIGNED DRIVER' : 'DRIVER'}</span>
              </div>
              <div className="tt-field tt-full">
                {isDispatched ? (
                  <div style={{
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#DBEAFE',
                        color: '#1D4ED8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14
                      }}>
                        <i className="fas fa-user"></i>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                          {assignedDriver?.user?.full_name || 'Assigned Driver'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          {assignedDriver?.user?.phone ? `📞 ${assignedDriver.user.phone}` : ''}
                          {assignedDriver?.license_number ? ` • Lic: ${assignedDriver.license_number}` : ''}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: '#DCFCE7',
                      color: '#15803D',
                      fontWeight: 600
                    }}>
                      On Route
                    </span>
                  </div>
                ) : (
                  <>
                    <label className="tt-label">Driver</label>
                    <select className="tt-select" value={chosenDriverId} onChange={(e) => setChosenDriverId(e.target.value)}>
                      <option value="">Select Driver</option>
                      {availableDrivers.map((driver) => (
                        <option key={driver.driver_id} value={driver.driver_id}>{driver.user?.full_name}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              {/* Vehicle Information */}
              <div className="tt-section-header">
                <i className="fas fa-truck tt-section-icon"></i>
                <span>{isDispatched ? 'ASSIGNED VEHICLE' : 'VEHICLE INFORMATION'}</span>
              </div>
              <div className="tt-field tt-full">
                {isDispatched ? (
                  <div style={{
                    padding: '10px 14px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: '#FEF3C7',
                        color: '#B45309',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14
                      }}>
                        <i className="fas fa-truck"></i>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                          {assignedVehicle ? `${assignedVehicle.model} (${assignedVehicle.plate_number})` : 'Assigned Truck'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          {assignedVehicle?.fuel_type ? `Fuel: ${assignedVehicle.fuel_type.toUpperCase()}` : ''}
                          {(selectedDelivery.starting_odometer !== null && selectedDelivery.starting_odometer !== undefined) ? ` • Start Odo: ${selectedDelivery.starting_odometer} km` : ''}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: '#FEF3C7',
                      color: '#92400E',
                      fontWeight: 600
                    }}>
                      In Use
                    </span>
                  </div>
                ) : (
                  <>
                    <label className="tt-label">Truck No. / Plate No.</label>
                    <select className="tt-select" value={chosenVehicleId} onChange={(e) => handleVehicleChange(e.target.value)}>
                      <option value="">Select Vehicle</option>
                      {availableVehicles.map((vehicle) => (
                        <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>{vehicle.model} ({vehicle.plate_number})</option>
                      ))}
                    </select>
                  </>
                )}
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
                  <input className="tt-input" type="text" value={({ low: 'Normal', medium: 'Fragile', high: 'Perishable' })[selectedDelivery.request?.fragility] || '—'} readOnly />
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
              <div className="tt-two-col">
                <div className="tt-field">
                  <label className="tt-label">Date</label>
                  <div className="tt-input-unit">
                    <input className="tt-input" type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} readOnly={isDispatched} />
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
                      readOnly={isDispatched}
                    />
                    <span className="tt-unit">L</span>
                  </div>
                </div>
              </div>
              <div className="tt-two-col" style={{ marginTop: '10px' }}>
                <div className="tt-field">
                  <label className="tt-label">Expected Duration / ETA</label>
                  <div className="tt-input-unit">
                    <input
                      className="tt-input"
                      type="number"
                      min="1"
                      max="30"
                      value={estimatedDurationDays}
                      onChange={(e) => setEstimatedDurationDays(e.target.value)}
                      placeholder="2"
                      readOnly={isDispatched}
                    />
                    <span className="tt-unit">Days</span>
                  </div>
                </div>
                <div className="tt-field">
                  <label className="tt-label">Fuel Receipt No.</label>
                  <input
                    className="tt-input"
                    type="text"
                    placeholder="FR-2026-00045"
                    value={fuelReceiptNo}
                    onChange={(e) => setFuelReceiptNo(e.target.value)}
                    readOnly={isDispatched}
                  />
                </div>
              </div>
              <div className="tt-field tt-full" style={{ marginTop: '10px' }}>
                <label className="tt-label">Remarks</label>
                <input
                  className="tt-input"
                  type="text"
                  placeholder={isDispatched ? 'No remarks recorded' : 'Enter remarks...'}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  readOnly={isDispatched}
                />
              </div>

              {assignedBy && (
                <div style={{ marginTop: '12px', fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-user-check" style={{ color: '#2563EB' }}></i>
                  <span>Dispatched by: <strong style={{ color: '#1E293B' }}>{assignedBy}</strong></span>
                </div>
              )}

              {/* Actions */}
              {isDispatched ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                    <button
                      type="button"
                      className="tt-send-btn"
                      style={{ background: '#2563EB', margin: 0 }}
                      onClick={() => {
                        window.location.href = `/delivery?deliveryId=${selectedDelivery.delivery_id}`;
                      }}
                    >
                      <i className="fas fa-satellite-dish"></i> View Live on Delivery Monitoring
                    </button>
                    <button
                      type="button"
                      onClick={closeAssignPanel}
                      style={{
                        width: '100%',
                        padding: '11px',
                        borderRadius: 8,
                        border: '1px solid #D1D5DB',
                        background: '#F3F4F6',
                        color: '#374151',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      Close Details
                    </button>
                  </div>
                  <div className="tt-note" style={{ marginTop: 10 }}>
                    <i className="fas fa-lock"></i> Trip details are locked because this shipment has already been dispatched.
                  </div>
                </>
              ) : (
                <>
                  <button className="tt-send-btn" onClick={dispatchDelivery} disabled={dispatching}>
                    <i className="fas fa-paper-plane"></i> {dispatching ? 'Dispatching...' : 'Send Trip Ticket & Dispatch'}
                  </button>
                  <div className="tt-note">
                    <i className="fas fa-shield-alt"></i> This assigns the driver &amp; vehicle to the delivery, and records the odometer/fuel entries above.
                  </div>
                </>
              )}
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