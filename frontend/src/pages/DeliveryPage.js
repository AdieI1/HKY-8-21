import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import ViewLocationMap from '../components/delivery/ViewLocationMap';
import NotificationBell from '../components/NotificationBell';
import reverb from '../utils/reverb';
import { computeTripSpeedMetrics } from '../utils/speedTelemetry';
import RescheduleProposalModal from '../components/delivery/RescheduleProposalModal';
import ReassignDriverModal from '../components/delivery/ReassignDriverModal';
import PostDeliveryMetricsPanel, { formatTripDuration, getFuelMetrics } from '../components/delivery/PostDeliveryMetricsPanel';

const STATUS_STEPS = [
  { key: 'pending', label: 'Pending Dispatch' },
  { key: 'assigned', label: 'Dispatched' },
  { key: 'accepted', label: 'In Transit' },
  { key: 'arrived_pickup', label: 'Arrived at Pickup' },
  { key: 'loading_cargo', label: 'Loading Cargo' },
  { key: 'out_for_delivery', label: 'On Delivery' },
  { key: 'arrived_dropoff', label: 'Arrived at Drop-off' },
  { key: 'unloading_cargo', label: 'Unloading Cargo' },
  { key: 'returning_to_hq', label: 'Returning to HQ' },
  { key: 'completed', label: 'Complete' },
];

export function isDeliveryDelayed(d) {
  if (!d || typeof d !== 'object') return false;
  // If delivery is assigned/dispatched and has not transitioned to accepted/in-transit for >= 3 hours
  if (d.status === 'assigned' && d.start_time) {
    return (Date.now() - new Date(d.start_time).getTime()) / 3600000 >= 3;
  }
  return false;
}

export function getDelayDetails(d) {
  if (!isDeliveryDelayed(d) || !d.start_time) return null;
  const startMs = new Date(d.start_time).getTime();
  const diffMs = Math.max(0, Date.now() - startMs);
  const totalHours = Math.floor(diffMs / 3600000);
  const days = Math.floor(totalHours / 24);

  let durationText = '';
  if (days >= 1) {
    durationText = `${days} day${days > 1 ? 's' : ''} overdue`;
  } else if (totalHours >= 1) {
    durationText = `${totalHours} hr${totalHours > 1 ? 's' : ''} overdue`;
  } else {
    durationText = `${Math.floor(diffMs / 60000)} mins overdue`;
  }

  const dateObj = new Date(d.start_time);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const dispatchedDateStr = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;

  return {
    durationText,
    dispatchedDateStr,
    fullLabel: `${durationText} (Dispatched ${dispatchedDateStr})`,
  };
}

function statusLabel(d) {
  if (!d) return '—';
  if (typeof d === 'string') {
    const step = STATUS_STEPS.find((s) => s.key === d);
    return step ? step.label : d === 'rejected' ? 'Rejected' : d === 'draft' ? 'Draft' : d;
  }
  if (isDeliveryDelayed(d)) {
    return 'Delayed';
  }
  if (!d.driver_id) {
    if (d.request?.reschedule_status === 'proposed') {
      const pDate = d.request?.reschedule_proposed_date ? new Date(d.request.reschedule_proposed_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : 'Date';
      return `Reschedule Proposed (${pDate})`;
    }
    return 'Awaiting Driver';
  }
  const step = STATUS_STEPS.find((s) => s.key === d.status);
  return step ? step.label : d.status === 'rejected' ? 'Rejected' : d.status === 'draft' ? 'Draft' : (d.status || 'Pending');
}

function statusBadgeClass(d) {
  if (!d) return 'in-transit';
  if (typeof d === 'string') {
    if (d === 'returning_to_hq') return 'returning';
    if (d === 'completed') return 'completed';
    if (d === 'assigned') return 'dispatched';
    if (d === 'pending' || d === 'draft') return 'pending';
    if (d === 'rejected') return 'rejected';
    return 'in-transit';
  }
  if (isDeliveryDelayed(d)) {
    return 'delayed';
  }
  if (!d.driver_id) {
    if (d.request?.reschedule_status === 'proposed') return 'reschedule-proposed';
    return 'awaiting-driver';
  }
  const status = d.status;
  if (status === 'returning_to_hq') return 'returning';
  if (status === 'completed') return 'completed';
  if (status === 'assigned') return 'dispatched';
  if (status === 'pending' || status === 'draft') return 'pending';
  if (status === 'rejected') return 'rejected';
  return 'in-transit';
}

function formatRelativeTime(dateString) {
  if (!dateString) return '—';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatTime(dateString) {
  return dateString ? new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
}

function deliveryCode(id) {
  return `DLV${String(id).padStart(4, '0')}`;
}

function DeliveryPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [viewTab, setViewTab] = useState('active'); // 'active' | 'completed'
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [eta, setEta] = useState(null);
  const [detectedHazards, setDetectedHazards] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('09:00 AM');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleSuccessMsg, setRescheduleSuccessMsg] = useState('');

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassignDriverId, setReassignDriverId] = useState('');
  const [reassignVehicleId, setReassignVehicleId] = useState('');
  const [reassignRemarks, setReassignRemarks] = useState('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [reassignError, setReassignError] = useState('');
  const [reassignSuccessMsg, setReassignSuccessMsg] = useState('');

  const availableDrivers = useMemo(
    () => drivers.filter((d) => d.status === 'active' && d.availability_status === 'available'),
    [drivers]
  );
  const availableVehicles = useMemo(
    () => vehicles.filter((v) => v.status === 'available'),
    [vehicles]
  );
  const hasAvailableDrivers = availableDrivers.length > 0;
  const hasAvailableVehicles = availableVehicles.length > 0;
  const canReassign = hasAvailableDrivers && hasAvailableVehicles;

  const openReassignModal = (d) => {
    setReassignTarget(d);
    setReassignDriverId(availableDrivers[0]?.driver_id || '');
    setReassignVehicleId(availableVehicles[0]?.vehicle_id || '');
    setReassignRemarks('Re-assigned due to dispatch delay');
    setReassignError('');
    setReassignSuccessMsg('');
  };

  const handleConfirmReassign = async () => {
    if (!reassignTarget || !reassignDriverId || !reassignVehicleId) {
      setReassignError('Please select both an available driver and vehicle.');
      return;
    }
    setReassignSubmitting(true);
    setReassignError('');
    try {
      await api.post(`/deliveries/${reassignTarget.delivery_id}/dispatch`, {
        driver_id: reassignDriverId,
        vehicle_id: reassignVehicleId,
        remarks: reassignRemarks.trim() || undefined,
      });
      setReassignSuccessMsg('Driver and vehicle successfully re-assigned!');
      setTimeout(async () => {
        setReassignTarget(null);
        setReassignSuccessMsg('');
        await loadData();
      }, 1400);
    } catch (err) {
      setReassignError(err.response?.data?.message || 'Failed to re-assign driver.');
    } finally {
      setReassignSubmitting(false);
    }
  };

  const openRescheduleModal = (d) => {
    setRescheduleTarget(d);
    setRescheduleDate(d.request?.reschedule_proposed_date || forecast?.earliest_available_date || '');
    setRescheduleSlot(d.request?.reschedule_proposed_time_slot || forecast?.earliest_available_slot || '09:00 AM');
    setRescheduleSuccessMsg('');
  };

  const handleSendRescheduleProposal = async () => {
    if (!rescheduleTarget || !rescheduleDate) return;
    setRescheduleSubmitting(true);
    try {
      await api.post(`/deliveries/${rescheduleTarget.delivery_id}/propose-reschedule`, {
        proposed_date: rescheduleDate,
        proposed_time_slot: rescheduleSlot,
      });
      setRescheduleSuccessMsg(`Proposal sent to customer for ${rescheduleDate}!`);
      setTimeout(() => {
        setRescheduleTarget(null);
        setRescheduleSuccessMsg('');
      }, 1500);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reschedule proposal.');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  useEffect(() => {
    const update = () => setCurrentDate(new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [res, forecastRes, driversRes, vehiclesRes] = await Promise.all([
        api.get('/deliveries'),
        api.get('/fleet/availability-forecast').catch(() => ({ data: null })),
        api.get('/drivers').catch(() => ({ data: [] })),
        api.get('/vehicles').catch(() => ({ data: [] })),
      ]);
      setDeliveries(res.data || []);
      if (forecastRes?.data) setForecast(forecastRes.data);
      if (driversRes?.data) setDrivers(driversRes.data || []);
      if (vehiclesRes?.data) setVehicles(vehiclesRes.data || []);
    } catch {
      setLoadError('Could not load deliveries. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Instant real-time updates via Laravel Reverb WebSocket
    const unsubscribe = reverb.subscribe('deliveries', 'delivery.updated', () => {
      loadData();
    });

    // Instant real-time location updates via Laravel Reverb WebSocket
    const unsubscribeLocation = reverb.subscribe('deliveries', 'delivery.location_updated', (data) => {
      const loc = data?.location || data;
      if (!loc || !loc.delivery_id) return;

      setDeliveries((prev) =>
        prev.map((d) => {
          if (d.delivery_id === loc.delivery_id) {
            const tracking = Array.isArray(d.tracking) ? [...d.tracking] : [];
            tracking.push({
              tracking_id: loc.tracking_id || Date.now(),
              latitude: loc.latitude,
              longitude: loc.longitude,
              speed: loc.speed !== undefined ? loc.speed : null,
              status_update: loc.status,
              timestamp: loc.timestamp || new Date().toISOString(),
            });
            return {
              ...d,
              tracking,
            };
          }
          return d;
        })
      );
    });

    // Background safety poll (15s instead of aggressive 10s)
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/deliveries');
        setDeliveries(res.data);
      } catch (err) {
        console.error('Delivery monitoring refresh failed:', err);
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      unsubscribe();
      unsubscribeLocation();
    };
  }, [loadData]);

  useEffect(() => {
    if (!selectedDelivery) return;
    const fresh = deliveries.find((d) => d.delivery_id === selectedDelivery.delivery_id);
    if (fresh) setSelectedDelivery(fresh);
  }, [deliveries, selectedDelivery]);

  const stats = useMemo(() => {
    const active = deliveries.filter((d) => !['completed', 'rejected'].includes(d.status)).length;
    const inTransit = deliveries.filter((d) => ['accepted', 'arrived_pickup', 'loading_cargo', 'out_for_delivery', 'arrived_dropoff', 'unloading_cargo'].includes(d.status)).length;
    const returning = deliveries.filter((d) => d.status === 'returning_to_hq').length;
    const dispatched = deliveries.filter((d) => d.status === 'assigned').length;
    const delayed = deliveries.filter(isDeliveryDelayed).length;
    const completed = deliveries.filter((d) => d.status === 'completed').length;
    return { active, inTransit, returning, dispatched, delayed, completed };
  }, [deliveries]);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewTab, activeFilter, search, sortBy]);

  const filteredDeliveries = useMemo(() => {
    let list = [...deliveries];

    // Primary viewTab filtering:
    if (viewTab === 'completed') {
      list = list.filter((d) => d.status === 'completed');
    } else {
      list = list.filter((d) => d.status !== 'completed');

      // Optional granular sub-filter from clicking KPI cards:
      if (activeFilter === 'inTransit') {
        list = list.filter((d) => ['accepted', 'arrived_pickup', 'loading_cargo', 'out_for_delivery', 'arrived_dropoff', 'unloading_cargo'].includes(d.status));
      } else if (activeFilter === 'returning') {
        list = list.filter((d) => d.status === 'returning_to_hq');
      } else if (activeFilter === 'dispatched') {
        list = list.filter((d) => d.status === 'assigned');
      } else if (activeFilter === 'delayed') {
        list = list.filter(isDeliveryDelayed);
      }
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((d) => {
        const idStr = deliveryCode(d.delivery_id).toLowerCase();
        const haystack = `${idStr} ${d.request?.customer?.full_name || ''} ${d.driver?.user?.full_name || ''} ${d.vehicle?.model || ''} ${d.vehicle?.plate_number || ''}`.toLowerCase();
        return haystack.includes(term);
      });
    }

    const getTimestamp = (d) => {
      const timeStr = d.created_at || d.start_time || d.updated_at;
      if (!timeStr) return 0;
      const t = new Date(typeof timeStr === 'string' ? timeStr.replace(' ', 'T') : timeStr).getTime();
      return isNaN(t) ? 0 : t;
    };

    if (sortBy === 'recent') {
      list.sort((a, b) => {
        const diff = getTimestamp(b) - getTimestamp(a);
        return diff !== 0 ? diff : (Number(b.delivery_id) || 0) - (Number(a.delivery_id) || 0);
      });
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => {
        const diff = getTimestamp(a) - getTimestamp(b);
        return diff !== 0 ? diff : (Number(a.delivery_id) || 0) - (Number(b.delivery_id) || 0);
      });
    } else if (sortBy === 'id_asc') {
      list.sort((a, b) => (Number(a.delivery_id) || 0) - (Number(b.delivery_id) || 0));
    } else if (sortBy === 'id_desc') {
      list.sort((a, b) => (Number(b.delivery_id) || 0) - (Number(a.delivery_id) || 0));
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => {
        const nameA = a.request?.customer?.full_name || '';
        const nameB = b.request?.customer?.full_name || '';
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      });
    } else if (sortBy === 'name_desc') {
      list.sort((a, b) => {
        const nameA = a.request?.customer?.full_name || '';
        const nameB = b.request?.customer?.full_name || '';
        return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
      });
    }

    return list;
  }, [deliveries, viewTab, activeFilter, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredDeliveries.length / PAGE_SIZE));
  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDeliveries.slice(start, start + PAGE_SIZE);
  }, [filteredDeliveries, currentPage, PAGE_SIZE]);

  const openDeliveryPanel = (delivery) => setSelectedDelivery(delivery);
  const closeDeliveryPanel = () => setSelectedDelivery(null);
  const openMapModal = () => { setEta(null); setDetectedHazards([]); setShowMapModal(true); };
  const closeMapModal = () => { setShowMapModal(false); setDetectedHazards([]); };

  const currentStepIndex = selectedDelivery ? STATUS_STEPS.findIndex((s) => s.key === selectedDelivery.status) : -1;

  const sortedTracking = useMemo(() => {
    const tracking = selectedDelivery?.tracking || [];
    const valid = tracking.filter(
      (entry) =>
        entry.latitude != null &&
        entry.longitude != null &&
        !isNaN(Number(entry.latitude)) &&
        !isNaN(Number(entry.longitude))
    );
    return [...valid].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) {
        return timeA - timeB;
      }
      return (Number(a.tracking_id) || 0) - (Number(b.tracking_id) || 0);
    });
  }, [selectedDelivery]);

  const latestDriverLocation = useMemo(() => {
    if (!sortedTracking.length) return null;
    const latest = sortedTracking[sortedTracking.length - 1];
    return {
      lat: Number(latest.latitude),
      lng: Number(latest.longitude),
      timestamp: latest.timestamp,
      status: latest.status_update || selectedDelivery?.status,
      tracking_id: latest.tracking_id,
    };
  }, [sortedTracking, selectedDelivery]);

  const selectedDeliverySpeedMetrics = useMemo(() => {
    return computeTripSpeedMetrics(sortedTracking, latestDriverLocation);
  }, [sortedTracking, latestDriverLocation]);

  const deliverySpeeds = useMemo(() => {
    const map = new Map();
    deliveries.forEach((d) => {
      if (Array.isArray(d.tracking) && d.tracking.length > 0) {
        map.set(d.delivery_id, computeTripSpeedMetrics(d.tracking));
      }
    });
    return map;
  }, [deliveries]);

  const timeForStep = (stepKey) => {
    if (!selectedDelivery) return '';
    const entry = (selectedDelivery.tracking || []).find((t) => t.status_update === stepKey);
    return entry ? formatTime(entry.timestamp) : '';
  };

  return (
    <>
      <div className="dashboard-container">
        <Sidebar activePage="delivery" />

        <div className="main-content">
          <header className="header">
            <div className="page-info"><span className="breadcrumb">Page/Delivery Monitoring</span><h1 className="page-title">DELIVERY MONITORING</h1></div>
            <div className="header-actions">
              <div className="date-picker"><span>{currentDate}</span><i className="far fa-calendar-alt"></i></div>
              <NotificationBell />
            </div>
          </header>

          {loadError && <div className="form-error" style={{ margin: '16px 0', color: '#d32f2f' }}>{loadError}</div>}

          <div className="monitoring-stats">
            <div
              className={`stat-card ${viewTab === 'active' && activeFilter === 'all' ? 'active-filter' : ''}`}
              onClick={() => { setViewTab('active'); setActiveFilter('all'); }}
              title="View All Active Deliveries"
            >
              <div className="stat-badge green">{stats.active}</div>
              <span className="stat-label">Active Deliveries</span>
            </div>

            <div
              className={`stat-card ${viewTab === 'active' && activeFilter === 'inTransit' ? 'active-filter' : ''}`}
              onClick={() => { setViewTab('active'); setActiveFilter('inTransit'); }}
              title="Filter by In Transit Deliveries"
            >
              <div className="stat-badge blue">{stats.inTransit}</div>
              <span className="stat-label">In Transit</span>
            </div>

            <div
              className={`stat-card ${viewTab === 'active' && activeFilter === 'returning' ? 'active-filter' : ''}`}
              onClick={() => { setViewTab('active'); setActiveFilter('returning'); }}
              title="Filter by Returning to HQ"
            >
              <div className="stat-badge orange">{stats.returning}</div>
              <span className="stat-label">Returning to HQ</span>
            </div>

            <div
              className={`stat-card ${viewTab === 'active' && activeFilter === 'dispatched' ? 'active-filter' : ''}`}
              onClick={() => { setViewTab('active'); setActiveFilter('dispatched'); }}
              title="Filter by Dispatched Deliveries"
            >
              <div className="stat-badge purple">{stats.dispatched}</div>
              <span className="stat-label">Dispatched</span>
            </div>

            <div
              className={`stat-card ${viewTab === 'active' && activeFilter === 'delayed' ? 'active-filter' : ''}`}
              onClick={() => { setViewTab('active'); setActiveFilter('delayed'); }}
              title="Filter by Delayed Deliveries"
            >
              <div className="stat-badge red">{stats.delayed}</div>
              <span className="stat-label">Delayed</span>
            </div>

            <div
              className={`stat-card ${viewTab === 'completed' ? 'active-filter' : ''}`}
              onClick={() => { setViewTab('completed'); setActiveFilter('all'); }}
              title="View Completed Deliveries (History)"
            >
              <div className="stat-badge green-dark">{stats.completed}</div>
              <span className="stat-label">Completed</span>
            </div>
          </div>

          <div className="content-section">
            <div className="section-header">
              <h3 className="section-title">
                {viewTab === 'completed' ? 'Completed Deliveries' : 'All Deliveries'}
              </h3>
              <div className="section-controls">
                <div className="search-bar">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <button
                  className={`btn-tab-toggle ${viewTab === 'completed' ? 'viewing-completed' : ''}`}
                  onClick={() => {
                    setViewTab(viewTab === 'completed' ? 'active' : 'completed');
                    setActiveFilter('all');
                  }}
                  title={viewTab === 'completed' ? 'Switch to Active Deliveries' : 'Switch to Completed Deliveries'}
                >
                  <i className={`fas ${viewTab === 'completed' ? 'fa-truck' : 'fa-check-circle'}`}></i>
                  {viewTab === 'completed' ? 'Active Deliveries' : 'Completed Deliveries'}
                </button>

                <div className="sort-dropdown">
                  <span>Sort by</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest</option>
                    <option value="id_asc">ID (DLV001 →)</option>
                    <option value="id_desc">ID (DLV999 →)</option>
                    <option value="name_asc">Customer (A – Z)</option>
                    <option value="name_desc">Customer (Z – A)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="section-content">
              <table className="data-table monitoring-table">
                <thead>
                  {viewTab === 'completed' ? (
                    <tr>
                      <th>Delivery ID</th>
                      <th>Customer</th>
                      <th>Driver</th>
                      <th>Vehicle</th>
                      <th>Trip Duration &amp; Distance</th>
                      <th>Fuel Consumed</th>
                      <th>Status</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Delivery ID</th>
                      <th>Customer</th>
                      <th>Driver</th>
                      <th>Vehicle</th>
                      <th>Last Update</th>
                      <th>Status</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {paginatedDeliveries.map((d) => {
                    if (viewTab === 'completed') {
                      const tripDuration = formatTripDuration(d.start_time || d.created_at, d.end_time || d.updated_at);
                      const fuelInfo = getFuelMetrics(d);
                      const distLabel = fuelInfo.distance !== '—' ? `${fuelInfo.distance} km` : (d.request?.distance_km ? `${d.request.distance_km} km` : '—');

                      return (
                        <tr className="delivery-row" key={d.delivery_id} onClick={() => openDeliveryPanel(d)}>
                          <td className="delivery-id">{deliveryCode(d.delivery_id)}</td>
                          <td>{d.request?.customer?.full_name || '—'}</td>
                          <td>{d.driver?.user?.full_name || 'Unassigned'}</td>
                          <td>{d.vehicle ? `${d.vehicle.model} – ${d.vehicle.plate_number}` : 'Unassigned'}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>
                                <i className="far fa-clock" style={{ marginRight: '4px', color: '#6366f1' }}></i>
                                {tripDuration}
                              </span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                🛣️ {distLabel}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 600, color: '#ea580c', fontSize: '13px' }}>
                                ⛽ {fuelInfo.consumed} {fuelInfo.unit}
                              </span>
                              <span style={{ fontSize: '11px', color: '#16a34a' }}>
                                {fuelInfo.efficiency !== '—' ? `${fuelInfo.efficiency}` : 'Standard'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="status-badge-monitor completed" onClick={(e) => { e.stopPropagation(); openDeliveryPanel(d); }}>
                              <i className="fas fa-check" style={{ marginRight: '4px', fontSize: '10px' }}></i>
                              Completed
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    const delayed = isDeliveryDelayed(d);
                    const delayInfo = delayed ? getDelayDetails(d) : null;
                    return (
                      <tr className={`delivery-row ${delayed ? 'delayed-row' : ''}`} key={d.delivery_id} onClick={() => openDeliveryPanel(d)}>
                        <td className="delivery-id">{deliveryCode(d.delivery_id)}</td>
                        <td>{d.request?.customer?.full_name || '—'}</td>
                        <td>{d.driver?.user?.full_name || 'Unassigned'}</td>
                        <td>{d.vehicle ? `${d.vehicle.model} – ${d.vehicle.plate_number}` : 'Unassigned'}</td>
                        <td>{formatRelativeTime(d.updated_at)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span
                              className={`status-badge-monitor ${statusBadgeClass(d)}`}
                              onClick={(e) => { e.stopPropagation(); openDeliveryPanel(d); }}
                              title={delayed && delayInfo ? `Delayed: ${delayInfo.fullLabel}` : undefined}
                            >
                              {delayed && <i className="fas fa-exclamation-triangle" style={{ marginRight: '5px', fontSize: '11px' }}></i>}
                              {statusLabel(d)}
                            </span>
                            {delayed && delayInfo && (
                              <span
                                className="delayed-duration-chip"
                                title={delayInfo.fullLabel}
                                onClick={(e) => { e.stopPropagation(); openDeliveryPanel(d); }}
                              >
                                <i className="far fa-clock" style={{ marginRight: '4px', fontSize: '10px' }}></i>
                                {delayInfo.durationText}
                              </span>
                            )}
                            {(() => {
                              const speedInfo = deliverySpeeds.get(d.delivery_id);
                              if (!speedInfo || !speedInfo.totalPointsCount) return null;
                              return (
                                <span
                                  className={`table-speed-chip ${speedInfo.category.badgeClass}`}
                                  title={`Speed: ${speedInfo.currentSpeed} km/h • ${speedInfo.category.label} (Avg: ${speedInfo.avgSpeed} km/h, Peak: ${speedInfo.peakSpeed} km/h)`}
                                  style={{
                                    background: speedInfo.category.bg,
                                    color: speedInfo.category.color,
                                    borderColor: speedInfo.category.border,
                                  }}
                                >
                                  <i className={`fas ${speedInfo.category.icon}`} style={{ fontSize: '9px', marginRight: '3px' }}></i>
                                  {speedInfo.currentSpeed} km/h
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && paginatedDeliveries.length === 0 && (
                    <tr>
                      <td colSpan={viewTab === 'completed' ? '7' : '6'} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                        {viewTab === 'completed' ? 'No completed deliveries found.' : 'No active deliveries found.'}
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan={viewTab === 'completed' ? '7' : '6'} style={{ textAlign: 'center', padding: 24 }}>
                        Loading deliveries...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="delivery-footer">
              <div className="delivery-info">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>
                  Select a Delivery Row to expand{' '}
                  <strong>{viewTab === 'completed' ? 'Post-Delivery Metrics & Audit' : 'Delivery details'}</strong>.
                </span>
              </div>

              <div className="pagination-controls">
                <span className="pagination-label">Page</span>
                <button
                  className="pagination-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <span className="pagination-current">{currentPage}</span>
                <button
                  className="pagination-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Details Panel */}
      <div className={`delivery-panel${selectedDelivery ? ' active' : ''}`}>
        {selectedDelivery && (
          <>
            <div className="delivery-panel-header">
              <span><i className="fas fa-truck"></i> Delivery Details</span>
              <i className="fas fa-arrow-left" onClick={closeDeliveryPanel}></i>
            </div>
            <div className="delivery-panel-content">
              <div className="panel-delivery-id">{deliveryCode(selectedDelivery.delivery_id)}</div>
              <div className="panel-customer-name">{selectedDelivery.request?.customer?.full_name || '—'}</div>
              <div className="panel-distance">Distance: {selectedDelivery.request?.distance_km ? `${selectedDelivery.request.distance_km} Kilometers` : '—'}</div>
              <div className="panel-status-row">
                <span className="panel-status-label">Status:</span>
                <span className={`panel-status-badge ${statusBadgeClass(selectedDelivery)}`}>
                  {isDeliveryDelayed(selectedDelivery) && <i className="fas fa-exclamation-triangle" style={{ marginRight: '5px', fontSize: '11px' }}></i>}
                  {statusLabel(selectedDelivery)}
                </span>
              </div>
              {isDeliveryDelayed(selectedDelivery) && (() => {
                const delayInfo = getDelayDetails(selectedDelivery);
                return (
                  <div className="panel-delayed-alert-box">
                    <div className="panel-delayed-alert-title">
                      <i className="fas fa-exclamation-triangle"></i> Delayed Delivery Notice
                    </div>
                    <div className="panel-delayed-alert-desc">
                      {delayInfo?.fullLabel || 'Delayed delivery'} • Awaiting driver transit
                    </div>
                  </div>
                );
              })()}

              {selectedDelivery.status === 'completed' && (() => {
                const completedTime = selectedDelivery.end_time || selectedDelivery.updated_at;
                const formattedCompletedDate = completedTime
                  ? new Date(completedTime).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'Completed';
                return (
                  <div className="panel-completed-alert-box">
                    <div className="panel-completed-alert-title">
                      <i className="fas fa-check-circle"></i> Delivery Completed &amp; Verified
                    </div>
                    <div className="panel-completed-alert-desc">
                      Delivered on <strong>{formattedCompletedDate}</strong>
                    </div>
                  </div>
                );
              })()}

              <div className="panel-divider"></div>

              <div className="panel-detail"><span className="panel-detail-label">Contact Number:</span><span className="panel-detail-value">{selectedDelivery.request?.customer?.phone || '—'}</span></div>
              <div className="panel-detail"><span className="panel-detail-label">Driver:</span><span className="panel-detail-value">{selectedDelivery.driver?.user?.full_name ? `${selectedDelivery.driver.user.full_name} (DR${String(selectedDelivery.driver.driver_id).padStart(3, '0')})` : 'Unassigned'}</span></div>
              <div className="panel-detail"><span className="panel-detail-label">Vehicle:</span><span className="panel-detail-value">{selectedDelivery.vehicle ? `${selectedDelivery.vehicle.model} – ${selectedDelivery.vehicle.plate_number}` : 'Unassigned'}</span></div>
              <div className="panel-detail"><span className="panel-detail-label">Pickup:</span><span className="panel-detail-value">{selectedDelivery.request?.pickup_address || '—'}</span></div>
              <div className="panel-detail"><span className="panel-detail-label">Drop-Off:</span><span className="panel-detail-value">{selectedDelivery.request?.dropoff_address || '—'}</span></div>

              {selectedDelivery.status === 'completed' ? (
                <PostDeliveryMetricsPanel
                  delivery={selectedDelivery}
                  speedMetrics={selectedDeliverySpeedMetrics}
                  onViewRouteMap={openMapModal}
                  hideBanner={true}
                />
              ) : (
                <>

                  <div className="panel-divider"></div>

                  <div className="panel-timeline-title">TRIP TELEMETRY (ODOMETER &amp; FUEL)</div>
                  <div className="panel-detail"><span className="panel-detail-label">Starting Odometer:</span><span className="panel-detail-value">{selectedDelivery.starting_odometer !== null && selectedDelivery.starting_odometer !== undefined ? `${Number(selectedDelivery.starting_odometer).toLocaleString()} km` : '—'}</span></div>
                  <div className="panel-detail"><span className="panel-detail-label">Ending Odometer:</span><span className="panel-detail-value">{selectedDelivery.ending_odometer !== null && selectedDelivery.ending_odometer !== undefined ? `${Number(selectedDelivery.ending_odometer).toLocaleString()} km` : (selectedDelivery.status === 'completed' ? '—' : 'In Progress')}</span></div>
                  <div className="panel-detail"><span className="panel-detail-label">Starting Fuel:</span><span className="panel-detail-value">{selectedDelivery.starting_fuel !== null && selectedDelivery.starting_fuel !== undefined ? `${selectedDelivery.starting_fuel} ${selectedDelivery.fuel_unit || 'Liters'}` : '—'}</span></div>
                  <div className="panel-detail"><span className="panel-detail-label">Ending Fuel:</span><span className="panel-detail-value">{selectedDelivery.ending_fuel !== null && selectedDelivery.ending_fuel !== undefined ? `${selectedDelivery.ending_fuel} ${selectedDelivery.fuel_unit || 'Liters'}` : (selectedDelivery.status === 'completed' ? '—' : 'In Progress')}</span></div>

                  <div className="panel-divider"></div>

                  <div className="panel-timeline-title">LIVE MOVEMENT &amp; SPEED TELEMETRY</div>
                  <div className="panel-detail">
                    <span className="panel-detail-label">Current Speed:</span>
                    <span className="panel-detail-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        className={`speed-status-pill-small ${selectedDeliverySpeedMetrics.category.badgeClass}`}
                        style={{
                          background: selectedDeliverySpeedMetrics.category.bg,
                          color: selectedDeliverySpeedMetrics.category.color,
                          border: `1px solid ${selectedDeliverySpeedMetrics.category.border}`,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className={`fas ${selectedDeliverySpeedMetrics.category.icon}`}></i>
                        {selectedDeliverySpeedMetrics.currentSpeed} km/h • {selectedDeliverySpeedMetrics.category.shortLabel}
                      </span>
                    </span>
                  </div>
                  <div className="panel-detail">
                    <span className="panel-detail-label">Trip Avg Speed:</span>
                    <span className="panel-detail-value">{selectedDeliverySpeedMetrics.avgSpeed} km/h</span>
                  </div>
                  <div className="panel-detail">
                    <span className="panel-detail-label">Peak Speed:</span>
                    <span className="panel-detail-value">{selectedDeliverySpeedMetrics.peakSpeed} km/h</span>
                  </div>
                  <div className="panel-detail">
                    <span className="panel-detail-label">Movement Status:</span>
                    <span className="panel-detail-value">{selectedDeliverySpeedMetrics.category.label}</span>
                  </div>

                  <div className="panel-divider"></div>

                  <div className="panel-timeline-title">DELIVERY TIMELINE</div>
                  <div className="panel-timeline-subtitle">Last Updated {formatTime(selectedDelivery.updated_at)}</div>
                  <div className="panel-timeline">
                    {STATUS_STEPS.map((step, i) => {
                      const state = i < currentStepIndex ? 'completed' : i === currentStepIndex ? 'active' : '';
                      const time = timeForStep(step.key);
                      return (
                        <div className={`timeline-item ${state}`} key={step.key}>
                          <div className="timeline-marker">{state === 'completed' && <i className="fas fa-check"></i>}</div>
                          <div className="timeline-text">{step.label}</div>
                          {state === 'active' ? (
                            <div className="timeline-meta"><span className="timeline-tag">Current</span><span className="timeline-time">{time}</span></div>
                          ) : (
                            <div className="timeline-time">{time}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {(() => {
                    const isInTransitNavigating = ['accepted', 'arrived_pickup', 'loading_cargo', 'out_for_delivery', 'arrived_dropoff', 'unloading_cargo', 'returning_to_hq'].includes(selectedDelivery.status);

                    if (isInTransitNavigating) {
                      return (
                        <button className="btn-view-location" onClick={openMapModal}>
                          <i className="fas fa-map-marker-alt"></i> View Live Location
                        </button>
                      );
                    }

                    return (
                      <div className="panel-transit-status-box">
                        <div className="transit-status-header">
                          <span className="transit-status-dot"></span>
                          <span className="transit-status-title">Waiting for driver to be in transit</span>
                        </div>
                        <div className="transit-status-subtitle">
                          Live location tracking will pop up once the driver is in transit navigating to the pickup point.
                        </div>

                        <div className="transit-actions-wrap">
                          {canReassign ? (
                            <>
                              <button
                                type="button"
                                className="btn-reassign-panel-primary"
                                onClick={() => openReassignModal(selectedDelivery)}
                              >
                                <i className="fas fa-user-edit"></i> Re-assign Driver &amp; Vehicle
                              </button>
                              <button
                                type="button"
                                className="btn-link-resched"
                                onClick={() => openRescheduleModal(selectedDelivery)}
                              >
                                <i className="far fa-calendar-alt"></i> Propose Reschedule Instead
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn-resched-panel-primary"
                                onClick={() => openRescheduleModal(selectedDelivery)}
                              >
                                <i className="far fa-calendar-alt"></i> Propose Reschedule to Customer
                              </button>
                              <div className="transit-fleet-note">
                                <i className="fas fa-info-circle"></i> {!hasAvailableDrivers && !hasAvailableVehicles
                                  ? 'No drivers or vehicles currently available for reassignment.'
                                  : !hasAvailableDrivers
                                  ? 'No drivers currently available for reassignment.'
                                  : 'No vehicles currently available for reassignment.'}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </>
        )}
      </div>
      {selectedDelivery && <div className="panel-overlay active" onClick={closeDeliveryPanel}></div>}

      {/* Map View Modal */}
      {showMapModal && selectedDelivery && (
        <>
          <div className="map-modal-overlay active" onClick={closeMapModal}></div>
          <div className="map-modal active">
            <div className="map-modal-header">
              <div className="map-header-info">
                <div className="map-header-id">{deliveryCode(selectedDelivery.delivery_id)}</div>
                <div className="map-header-name">{selectedDelivery.request?.customer?.full_name}</div>
              </div>
              <button className="map-back-btn" onClick={closeMapModal}><i className="fas fa-arrow-left"></i></button>
            </div>
            <div className="map-modal-body">
              <div className="map-info-card">
                <div className="map-section">
                  <div className="map-section-title"><i className="fas fa-truck"></i> Delivery Details</div>
                  <div className="map-detail-row">
                    <span className="map-detail-label">Status:</span>
                    <span className={`map-status-badge ${statusBadgeClass(selectedDelivery)}`}>
                      {isDeliveryDelayed(selectedDelivery) && <i className="fas fa-exclamation-triangle" style={{ marginRight: '5px', fontSize: '11px' }}></i>}
                      {statusLabel(selectedDelivery)}
                    </span>
                  </div>
                  {isDeliveryDelayed(selectedDelivery) && (() => {
                    const delayInfo = getDelayDetails(selectedDelivery);
                    if (!delayInfo) return null;
                    return (
                      <div className="map-detail-row">
                        <span className="map-detail-label">Duration:</span>
                        <span className="map-detail-value" style={{ color: '#EF4444', fontWeight: 600 }}>
                          <i className="far fa-clock" style={{ marginRight: '4px' }}></i>
                          {delayInfo.fullLabel}
                        </span>
                      </div>
                    );
                  })()}
                  <div className="map-detail-row"><span className="map-detail-label">Vehicle:</span><span className="map-detail-value">{selectedDelivery.vehicle ? `${selectedDelivery.vehicle.model} – ${selectedDelivery.vehicle.plate_number}` : 'Unassigned'}</span></div>
                  <div className="map-detail-row"><span className="map-detail-label">Distance:</span><span className="map-detail-value">{selectedDelivery.request?.distance_km ? `${selectedDelivery.request.distance_km} kilometers` : '—'}</span></div>
                  <div className="map-detail-row"><span className="map-detail-label">ETA:</span><span className="map-detail-value">{eta || 'Calculating...'}</span></div>
                  <div className="map-detail-row">
                    <span className="map-detail-label">Speed:</span>
                    <span className="map-detail-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: selectedDeliverySpeedMetrics.category.bg,
                          color: selectedDeliverySpeedMetrics.category.color,
                          border: `1px solid ${selectedDeliverySpeedMetrics.category.border}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className={`fas ${selectedDeliverySpeedMetrics.category.icon}`}></i>
                        {selectedDeliverySpeedMetrics.currentSpeed} km/h • {selectedDeliverySpeedMetrics.category.shortLabel}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="map-section">
                  <div className="map-section-title"><i className="fas fa-map-marker-alt"></i> Location</div>
                  <div className="map-location-row"><span className="map-location-label">Pick-up:</span><span className="map-location-value">{selectedDelivery.request?.pickup_address || '—'}</span></div>
                  <div className="map-location-row"><span className="map-location-label">Drop-off:</span><span className="map-location-value">{selectedDelivery.request?.dropoff_address || '—'}</span></div>
                </div>
                <div className="map-section">
                  <div className="map-section-title"><i className="fas fa-user"></i> Driver Info</div>
                  {selectedDelivery.driver?.user ? (
                    <div className="map-driver-card">
                      <img src="images/brucednegrow.png" alt="Driver" className="map-driver-avatar" />
                      <div className="map-driver-info" style={{ width: '100%' }}>
                        <div className="map-driver-name">{selectedDelivery.driver.user.full_name}</div>
                        <div className="map-driver-contact">Contact Number: {selectedDelivery.driver.user.phone || '—'}</div>
                        <div className="map-driver-lastseen" style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                          {latestDriverLocation ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: selectedDeliverySpeedMetrics.category.color, boxShadow: `0 0 6px ${selectedDeliverySpeedMetrics.category.color}` }}></span>
                              Live GPS • {selectedDeliverySpeedMetrics.currentSpeed} km/h • {formatRelativeTime(latestDriverLocation.timestamp)}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Waiting for driver GPS signal...</span>
                          )}
                        </div>
                        {latestDriverLocation && (
                          <div style={{ marginTop: '6px', fontSize: '10.5px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', color: '#334155', fontFamily: 'monospace' }}>
                            <div>📍 {latestDriverLocation.lat.toFixed(5)}, {latestDriverLocation.lng.toFixed(5)} • {selectedDeliverySpeedMetrics.currentSpeed} km/h</div>
                            <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                              📡 {sortedTracking.length} GPS ping{sortedTracking.length === 1 ? '' : 's'} • Avg: {selectedDeliverySpeedMetrics.avgSpeed} km/h • Peak: {selectedDeliverySpeedMetrics.peakSpeed} km/h
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#888' }}>No driver assigned.</p>
                  )}
                </div>

                {detectedHazards.length > 0 && (
                  <div className="map-section" style={{ borderLeft: '3.5px solid #dc2626', paddingLeft: '10px' }}>
                    <div className="map-section-title" style={{ color: '#dc2626' }}>
                      <i className="fas fa-exclamation-triangle"></i> Route Hazards ({detectedHazards.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                      {detectedHazards.map((zone) => (
                        <div key={zone.id} style={{ background: '#fef2f2', padding: '6px 8px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                          <div style={{ fontWeight: '700', fontSize: '11.5px', color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{zone.name} {zone.region ? <span style={{ fontWeight: 500, fontSize: '10px', color: '#b91c1c', opacity: 0.85 }}>({zone.region})</span> : ''}</span>
                            <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: zone.severity === 'critical' ? '#dc2626' : '#ea580c' }}>
                              {zone.severity}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px', lineHeight: '1.3' }}>
                            {zone.advisory || zone.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <ViewLocationMap
                pickupAddress={selectedDelivery.request?.pickup_address}
                pickupLat={selectedDelivery.request?.pickup_lat}
                pickupLng={selectedDelivery.request?.pickup_lng}
                dropoffAddress={selectedDelivery.request?.dropoff_address}
                dropoffLat={selectedDelivery.request?.dropoff_lat}
                dropoffLng={selectedDelivery.request?.dropoff_lng}
                driverLocation={latestDriverLocation}
                trackingHistory={sortedTracking}
                deliveryStatus={selectedDelivery.status}
                driverName={selectedDelivery.driver?.user?.full_name}
                driverPhone={selectedDelivery.driver?.user?.phone}
                vehiclePlate={selectedDelivery.vehicle ? `${selectedDelivery.vehicle.model} (${selectedDelivery.vehicle.plate_number})` : ''}
                onEtaChange={setEta}
                onDangerZonesDetected={setDetectedHazards}
              />
            </div>
          </div>
        </>
      )}

      <RescheduleProposalModal
        target={rescheduleTarget}
        forecast={forecast}
        rescheduleDate={rescheduleDate}
        setRescheduleDate={setRescheduleDate}
        rescheduleSlot={rescheduleSlot}
        setRescheduleSlot={setRescheduleSlot}
        submitting={rescheduleSubmitting}
        successMsg={rescheduleSuccessMsg}
        onClose={() => setRescheduleTarget(null)}
        onSubmit={handleSendRescheduleProposal}
      />

      <ReassignDriverModal
        target={reassignTarget}
        availableDrivers={availableDrivers}
        availableVehicles={availableVehicles}
        selectedDriverId={reassignDriverId}
        setSelectedDriverId={setReassignDriverId}
        selectedVehicleId={reassignVehicleId}
        setSelectedVehicleId={setReassignVehicleId}
        remarks={reassignRemarks}
        setRemarks={setReassignRemarks}
        submitting={reassignSubmitting}
        errorMsg={reassignError}
        successMsg={reassignSuccessMsg}
        onClose={() => setReassignTarget(null)}
        onSubmit={handleConfirmReassign}
      />
    </>
  );
}

export default DeliveryPage;