import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import NotificationBell from '../components/NotificationBell';

function cellClass(type) {
  if (type === 'delivery') return 'adm-fleet-cell delivery';
  if (type === 'available') return 'adm-fleet-cell available';
  if (type === 'break') return 'adm-fleet-cell on-break';
  return 'adm-fleet-cell empty';
}

function driverCode(id) {
  return `DR${String(id || 0).padStart(3, '0')}`;
}

function timeAgo(dateString) {
  if (!dateString) return 'Just now';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Recently';
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hr${diffHour > 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

function getCurrentWeekDays() {
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);

  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return dayKeys.map((key, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayNum = d.getDate();
    const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    return { key, label: dayLabels[i], date: `${dayNum} ${monthStr}`, highlight: d.toDateString() === now.toDateString(), iso: `${yyyy}-${mm}-${dd}` };
  });
}

function formatTime12(timeStr) {
  if (!timeStr) return '';
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    return isNaN(d) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hour = parseInt(parts[0], 10);
  const m = parts[1];
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function shortCity(addr) {
  if (!addr) return 'CDO';
  const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length >= 2 ? (isNaN(parts[parts.length - 2]) ? parts[parts.length - 2] : parts[parts.length - 1]) : parts[0] || 'CDO';
}

function StaffDashboardPage() {
  const [currentDate, setCurrentDate] = useState('');
  const [weekDays, setWeekDays] = useState(() => getCurrentWeekDays());
  const [fleetList, setFleetList] = useState([]);
  const [priorityRequests, setPriorityRequests] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');
  const [vehiclesSummary, setVehiclesSummary] = useState({
    available: 0,
    inTransit: 0,
    onBreak: 0,
    underMaintenance: 0,
    total: 0,
  });
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [stats, setStats] = useState({ activeDeliveries: 0, pendingRequests: 0, availableDrivers: 0, availableVehicles: 0 });

  useEffect(() => {
    const update = () => setCurrentDate(new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/deliveries').catch(() => ({ data: [] })),
      api.get('/delivery-requests').catch(() => ({ data: [] })),
      api.get('/drivers').catch(() => ({ data: [] })),
      api.get('/vehicles').catch(() => ({ data: [] })),
      api.get('/vehicle-maintenances').catch(() => ({ data: [] })),
      api.get('/incident-reports').catch(() => ({ data: [] })),
      api.get('/system-logs').catch(() => ({ data: [] })),
    ]).then(([delRes, reqRes, drvRes, vehRes, mntRes, incRes, logRes]) => {
      const deliveries = Array.isArray(delRes.data) ? delRes.data : [];
      const requests = Array.isArray(reqRes.data) ? reqRes.data : [];
      const drivers = Array.isArray(drvRes.data) ? drvRes.data : [];
      const vehicles = Array.isArray(vehRes.data) ? vehRes.data : [];
      const maintenances = Array.isArray(mntRes.data) ? mntRes.data : [];
      const incidents = Array.isArray(incRes.data) ? incRes.data : [];
      const systemLogs = Array.isArray(logRes.data) ? logRes.data : [];

      const activeDel = deliveries.filter((d) => ['assigned', 'accepted', 'out_for_delivery', 'in_transit', 'loading_cargo', 'arrived_pickup'].includes(d.status)).length;
      const pendingReq = requests.filter((r) => r.status === 'pending').length;
      const availDrivers = drivers.filter((d) => (d.status === 'active' || d.status === 'available') && d.availability_status !== 'busy').length;
      const availVehicles = vehicles.filter((v) => (v.status === 'available' || v.status === 'active')).length;

      setStats({ activeDeliveries: activeDel, pendingRequests: pendingReq, availableDrivers: availDrivers, availableVehicles: availVehicles });

      // ── Connected Dynamic Priority Requests ──
      const pendingRequestsList = requests
        .filter((r) => r.status === 'pending')
        .map((r) => {
          const created = new Date(r.created_at);
          const daysOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
          const isOver = daysOld >= 2;
          return {
            id: `REQ${String(r.request_id).padStart(4, '0')}`,
            customer: r.customer?.full_name || 'Customer',
            date: created.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
            status: isOver ? 'Overdue' : 'Pending',
            overdue: isOver,
            createdTime: created.getTime(),
          };
        })
        .sort((a, b) => (a.overdue !== b.overdue ? (a.overdue ? -1 : 1) : a.createdTime - b.createdTime));

      if (pendingRequestsList.length > 0) {
        setPriorityRequests(pendingRequestsList.slice(0, 5));
      } else {
        // Fallback: if 0 pending, show recent requests so the dashboard shows real activity
        const recentReqs = requests.slice(-5).reverse().map((r) => {
          const created = new Date(r.created_at);
          return {
            id: `REQ${String(r.request_id).padStart(4, '0')}`,
            customer: r.customer?.full_name || 'Customer',
            date: created.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
            status: (r.status || 'pending').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            overdue: false,
            createdTime: created.getTime(),
          };
        });
        setPriorityRequests(recentReqs);
      }

      // ── Connected Dynamic Vehicles Summary ──
      const activeDeliveryVehIds = new Set(
        deliveries
          .filter((d) => ['assigned', 'accepted', 'out_for_delivery', 'in_transit', 'loading_cargo', 'arrived_pickup'].includes(d.status))
          .map((d) => Number(d.vehicle_id))
          .filter(Boolean)
      );

      const maintenanceVehIds = new Set([
        ...vehicles.filter((v) => ['maintenance', 'broken', 'in_shop'].includes(v.status?.toLowerCase())).map((v) => Number(v.vehicle_id)),
        ...maintenances.filter((m) => ['pending', 'in_progress', 'scheduled'].includes(m.status?.toLowerCase())).map((m) => Number(m.vehicle_id)),
      ]);

      const inTransitCount = vehicles.filter((v) => activeDeliveryVehIds.has(Number(v.vehicle_id))).length;
      const maintenanceCount = vehicles.filter((v) => maintenanceVehIds.has(Number(v.vehicle_id)) && !activeDeliveryVehIds.has(Number(v.vehicle_id))).length;
      const onBreakCount = vehicles.filter((v) => {
        return !activeDeliveryVehIds.has(Number(v.vehicle_id)) && !maintenanceVehIds.has(Number(v.vehicle_id)) && (v.status === 'on_break' || v.status === 'standby');
      }).length;

      const availableCount = Math.max(0, vehicles.length - inTransitCount - maintenanceCount - onBreakCount);

      setVehiclesSummary({
        available: availableCount,
        inTransit: inTransitCount,
        onBreak: onBreakCount,
        underMaintenance: maintenanceCount,
        total: vehicles.length,
      });

      // ── Connected Dynamic Activity Feed ──
      const dynamicActivities = [];

      // 1. Deliveries Activity
      deliveries.forEach((d) => {
        const rawTime = d.updated_at || d.created_at;
        const timeMs = rawTime ? new Date(rawTime).getTime() : 0;
        if (['in_transit', 'out_for_delivery', 'assigned', 'accepted'].includes(d.status)) {
          dynamicActivities.push({
            id: `del-${d.delivery_id}`,
            category: 'delivery',
            icon: 'fas fa-truck',
            color: '#C53030',
            title: `Driver ${d.driver?.user?.full_name || 'Driver'} is now In Transit.`,
            sub: `${shortCity(d.request?.pickup_address)} → ${shortCity(d.request?.dropoff_address)}`,
            time: timeAgo(rawTime),
            timeMs,
          });
        } else if (d.status === 'completed') {
          dynamicActivities.push({
            id: `del-comp-${d.delivery_id}`,
            category: 'delivery',
            icon: 'fas fa-check-circle',
            color: '#10B981',
            title: `Delivery DLV${String(d.delivery_id).padStart(4, '0')} completed!`,
            sub: `Delivered to ${shortCity(d.request?.dropoff_address)} by ${d.driver?.user?.full_name || 'Driver'}`,
            time: timeAgo(d.end_time || rawTime),
            timeMs,
          });
        }
      });

      // 2. Pending & Overdue Requests Activity
      requests.forEach((r) => {
        const rawTime = r.created_at;
        const timeMs = rawTime ? new Date(rawTime).getTime() : 0;
        const daysOld = (Date.now() - timeMs) / (1000 * 60 * 60 * 24);
        if (r.status === 'pending' && daysOld >= 2) {
          dynamicActivities.push({
            id: `req-ovd-${r.request_id}`,
            category: 'request',
            icon: 'fas fa-exclamation-triangle',
            color: '#E8B400',
            title: `REQ${String(r.request_id).padStart(4, '0')} Overdue!`,
            sub: 'Exceeded expected processing time (2+ days).',
            time: timeAgo(rawTime),
            timeMs,
          });
        } else if (r.status === 'pending') {
          dynamicActivities.push({
            id: `req-new-${r.request_id}`,
            category: 'request',
            icon: 'fas fa-file-invoice',
            color: '#6366F1',
            title: `New booking REQ${String(r.request_id).padStart(4, '0')} received.`,
            sub: `${r.customer?.full_name || 'Customer'} • ${r.item_name || r.cargo_type || 'Cargo'}`,
            time: timeAgo(rawTime),
            timeMs,
          });
        }
      });

      // 3. Driver Availability
      drivers.forEach((dr) => {
        if (dr.availability_status === 'busy' || dr.availability_status === 'offline') {
          const rawTime = dr.updated_at || dr.created_at;
          dynamicActivities.push({
            id: `drv-${dr.driver_id}`,
            category: 'fleet',
            icon: 'fas fa-user-circle',
            color: '#4A90E2',
            title: `Driver ${dr.user?.full_name || 'Driver'} (${driverCode(dr.driver_id)}) is ${dr.availability_status === 'busy' ? 'on break' : 'offline'}.`,
            sub: 'Driver availability status updated',
            time: timeAgo(rawTime),
            timeMs: rawTime ? new Date(rawTime).getTime() : 0,
          });
        }
      });

      // 4. Vehicle Maintenance
      maintenances.forEach((m) => {
        const rawTime = m.created_at || m.maintenance_date;
        dynamicActivities.push({
          id: `mnt-${m.maintenance_id}`,
          category: 'fleet',
          icon: 'fas fa-wrench',
          color: '#F97316',
          title: `Maintenance alert: ${m.vehicle?.model || 'Fleet Vehicle'} (${m.vehicle?.plate_number || 'Unit'})`,
          sub: `${m.maintenance_type || 'Scheduled Service'}: ${m.service_type || 'Under checkup'}`,
          time: timeAgo(rawTime),
          timeMs: rawTime ? new Date(rawTime).getTime() : 0,
        });
      });

      // 5. Incident Reports
      incidents.forEach((inc) => {
        const rawTime = inc.created_at;
        dynamicActivities.push({
          id: `inc-${inc.report_id}`,
          category: 'fleet',
          icon: 'fas fa-exclamation-circle',
          color: '#EF4444',
          title: `Incident: ${inc.incident_type || 'Issue reported'}`,
          sub: inc.description || 'Reported during trip',
          time: timeAgo(rawTime),
          timeMs: rawTime ? new Date(rawTime).getTime() : 0,
        });
      });

      // 6. System Logs
      systemLogs.slice(-5).forEach((log) => {
        const rawTime = log.timestamp || log.created_at;
        dynamicActivities.push({
          id: `log-${log.log_id}`,
          category: 'system',
          icon: 'fas fa-shield-alt',
          color: '#8B5CF6',
          title: `${log.user?.full_name || 'Staff User'}: ${log.action}`,
          sub: 'System audit log',
          time: timeAgo(rawTime),
          timeMs: rawTime ? new Date(rawTime).getTime() : 0,
        });
      });

      // Sort by newest first
      dynamicActivities.sort((a, b) => b.timeMs - a.timeMs);

      // Default fallback items if database has very little records
      if (dynamicActivities.length === 0) {
        dynamicActivities.push(
          { id: 'def-1', category: 'system', icon: 'fas fa-check-circle', color: '#10B981', title: 'System Online & Operational', sub: 'All fleet monitoring sensors active.', time: 'Just now' },
          { id: 'def-2', category: 'fleet', icon: 'fas fa-truck', color: '#4A90E2', title: 'Fleet Ready for Dispatch', sub: `${vehicles.length} vehicles registered in fleet.`, time: '1 hr ago' }
        );
      }

      setActivityFeed(dynamicActivities);

      const currentDays = getCurrentWeekDays();
      setWeekDays(currentDays);

      if (vehicles.length > 0) {
        const mappedFleet = vehicles.map((v, idx) => {
          const vehId = `VCL${String(v.vehicle_id || idx + 1).padStart(3, '0')}`;
          const model = v.model || v.brand || 'Truck';
          const plate = v.plate_number || 'XYZ 1213';

          const vehicleDeliveries = deliveries.filter((d) => Number(d.vehicle_id) === Number(v.vehicle_id));
          const activeDelivery = vehicleDeliveries.find((d) => ['assigned', 'accepted', 'out_for_delivery', 'in_transit'].includes(d.status))
            || vehicleDeliveries[vehicleDeliveries.length - 1];

          const driverObj = activeDelivery?.driver || drivers.find((dr) => Number(dr.driver_id) === Number(activeDelivery?.driver_id));
          const rawDriverName = driverObj?.user?.full_name || activeDelivery?.driver?.user?.full_name || 'Driver';
          const nameParts = rawDriverName.split(' ').filter(Boolean);
          const shortDriver = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0].toUpperCase()}.` : rawDriverName;

          const schedule = currentDays.map((day) => {
            const del = deliveries.find((d) => {
              if (Number(d.vehicle_id) !== Number(v.vehicle_id)) return false;
              const dateStr = d.trip_date || (d.created_at ? d.created_at.slice(0, 10) : '');
              return dateStr === day.iso;
            });

            if (del) {
              const start = formatTime12(del.start_time || '08:00:00');
              const end = formatTime12(del.end_time || '14:30:00');
              const from = shortCity(del.request?.pickup_address);
              const to = shortCity(del.request?.dropoff_address);
              const timeStr = start && end ? `${start}–${end}` : start || 'In Transit';
              return { label: `Delivery\n${timeStr}\n${from} → ${to}`, type: 'delivery', day: day.key };
            }
            if (v.status === 'maintenance' || v.status === 'broken') {
              return { label: 'Under Maintenance', type: 'break', day: day.key };
            }
            if (day.key === 'sat' || day.key === 'sun') {
              return { label: '–', type: 'empty', day: day.key };
            }
            return { label: 'Available', type: 'available', day: day.key };
          });

          return { id: vehId, model, plate, driver: shortDriver, schedule };
        });

        setFleetList(mappedFleet);
      } else {
        setFleetList([]);
      }
    }).finally(() => {
      setLoadingCalendar(false);
    });
  }, []);

  return (
    <div className="dashboard-container">
      <Sidebar activePage="dashboard" />

      <div className="main-content">
        <header className="header">
          <div className="page-info">
            <span className="breadcrumb">Page/Dashboard</span>
            <h1 className="page-title">DASHBOARD</h1>
          </div>
          <div className="header-actions">
            <div className="date-picker">
              <span>{currentDate || 'Fri, 29 March 2026'}</span>
              <i className="far fa-calendar-alt"></i>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* ── Stat Cards ── */}
        <div className="adm-stat-row">
          <div className="adm-stat-card pink">
            <div className="adm-stat-icon"><i className="fas fa-truck"></i></div>
            <div className="adm-stat-body">
              <span className="adm-stat-num">{stats.activeDeliveries}</span>
              <span className="adm-stat-label">Active Deliveries</span>
            </div>
          </div>
          <div className="adm-stat-card orange">
            <div className="adm-stat-icon"><i className="fas fa-clipboard-list"></i></div>
            <div className="adm-stat-body">
              <span className="adm-stat-num">{stats.pendingRequests}</span>
              <span className="adm-stat-label">Pending Requests</span>
            </div>
          </div>
          <div className="adm-stat-card green">
            <div className="adm-stat-icon"><i className="fas fa-user"></i></div>
            <div className="adm-stat-body">
              <span className="adm-stat-num">{stats.availableDrivers}</span>
              <span className="adm-stat-label">Available Drivers</span>
            </div>
          </div>
          <div className="adm-stat-card blue">
            <div className="adm-stat-icon"><i className="fas fa-truck-moving"></i></div>
            <div className="adm-stat-body">
              <span className="adm-stat-num">{stats.availableVehicles}</span>
              <span className="adm-stat-label">Available Vehicles</span>
            </div>
          </div>
        </div>

        {/* ── Middle row: Fleet + Activity ── */}
        <div className="adm-mid-row">
          <div className="adm-card adm-fleet-card">
            <div className="adm-card-header">
              <span className="adm-card-title">FLEET MONITORING</span>
            </div>
            <div className="adm-fleet-table-wrap">
              <table className="adm-fleet-table">
                <thead>
                  <tr>
                    <th className="adm-fleet-veh-col">VEHICLE / DRIVER</th>
                    {weekDays.map((d) => (
                      <th key={d.key} className={d.highlight ? 'adm-fleet-day-col highlight' : 'adm-fleet-day-col'}>
                        <div className="adm-day-label">{d.label}</div>
                        <div className="adm-day-date">{d.date}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingCalendar ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#888', fontSize: '14px' }}>
                        <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Loading Calendar...
                      </td>
                    </tr>
                  ) : fleetList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#888', fontSize: '14px' }}>
                        No vehicles or deliveries scheduled for this week.
                      </td>
                    </tr>
                  ) : (
                    fleetList.map((row) => (
                      <tr key={row.id}>
                        <td className="adm-fleet-veh-td">
                          <div className="adm-veh-info">
                            <img src="/images/trucknisiya.png" alt="truck" className="adm-veh-img" />
                            <div>
                              <div className="adm-veh-model">{row.model}</div>
                              <div className="adm-veh-plate">{row.plate}</div>
                              <div className="adm-veh-driver"><i className="fas fa-user-circle"></i> {row.driver}</div>
                            </div>
                          </div>
                        </td>
                        {row.schedule.map((cell, ci) => (
                          <td key={ci} className={cellClass(cell.type)}>
                            {cell.label.split('\n').map((line, li) => (
                              <span key={li}>{line}{li < cell.label.split('\n').length - 1 && <br />}</span>
                            ))}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="adm-fleet-legend">
              <span className="adm-legend-dot delivery"></span> Delivery / In Transit
              <span className="adm-legend-dot available"></span> Available
              <span className="adm-legend-dot break"></span> On Break
              <span className="adm-legend-dot maintenance"></span> Maintenance
            </div>
          </div>

          <div className="adm-card adm-activity-card">
            <div className="adm-card-header">
              <span className="adm-card-title"><i className="fas fa-bolt" style={{ color: '#C53030', marginRight: '6px' }}></i>Activity Feed</span>
              <button
                type="button"
                onClick={() => setShowAllActivitiesModal(true)}
                className="adm-view-all"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                View all
              </button>
            </div>
            <div className="adm-activity-list">
              {activityFeed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#888', fontSize: '13px' }}>
                  No recent activities recorded.
                </div>
              ) : (
                activityFeed.slice(0, 5).map((item, i) => (
                  <div className="adm-activity-item" key={item.id || i}>
                    <div className="adm-activity-icon" style={{ color: item.color }}><i className={item.icon}></i></div>
                    <div className="adm-activity-body">
                      <div className="adm-activity-title">{item.title}</div>
                      {item.sub && <div className="adm-activity-sub">{item.sub}</div>}
                    </div>
                    <div className="adm-activity-time">{item.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom row: Priority Requests + Vehicles Summary ── */}
        <div className="adm-bottom-row">
          <div className="adm-card adm-priority-card">
            <div className="adm-card-header">
              <span className="adm-card-title">
                <i className="far fa-clock" style={{ marginRight: '6px' }}></i>
                Priority Requests
                <span className="adm-priority-badge">{priorityRequests.length}</span>
              </span>
              <Link to="/requests" className="adm-view-all">View all</Link>
            </div>
            <table className="adm-priority-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Customer</th>
                  <th>Date Requested</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {priorityRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#888', fontSize: '13px' }}>
                      No pending priority requests.
                    </td>
                  </tr>
                ) : (
                  priorityRequests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.overdue && <i className="fas fa-exclamation-triangle adm-warn-icon"></i>}
                        <Link to="/requests" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                          {r.id}
                        </Link>
                      </td>
                      <td>{r.customer}</td>
                      <td>{r.date}</td>
                      <td>
                        <span className={`adm-status-dot ${r.overdue ? 'overdue' : 'pending'}`}></span>
                        <span className={r.overdue ? 'adm-status-text overdue' : 'adm-status-text pending'}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="adm-card adm-vsummary-card">
            <div className="adm-card-header">
              <span className="adm-card-title">VEHICLES SUMMARY</span>
            </div>
            <table className="adm-vsummary-table">
              <tbody>
                <tr>
                  <td>Available</td>
                  <td className="adm-vsummary-count">{vehiclesSummary.available}</td>
                </tr>
                <tr>
                  <td>In Transit/On Delivery</td>
                  <td className="adm-vsummary-count">{vehiclesSummary.inTransit}</td>
                </tr>
                <tr>
                  <td>On Break</td>
                  <td className="adm-vsummary-count">{vehiclesSummary.onBreak}</td>
                </tr>
                <tr>
                  <td>Under Maintenance</td>
                  <td className="adm-vsummary-count">{vehiclesSummary.underMaintenance}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="adm-vsummary-total">
                  <td>Total Vehicles</td>
                  <td className="adm-vsummary-count">{vehiclesSummary.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ── All Activities History Modal ── */}
      {showAllActivitiesModal && (
        <div
          className="modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: 16,
          }}
        >
          <div
            className="modal-content"
            style={{
              background: '#fff',
              borderRadius: 12,
              maxWidth: 700,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                background: '#1e293b',
                color: '#fff',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 2,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-bolt" style={{ color: '#ef4444' }}></i>
                All System Activity Feed &amp; Logs
              </h3>
              <button
                onClick={() => setShowAllActivitiesModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: 16 }}>
              {/* Category Filters */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
                {['all', 'delivery', 'request', 'fleet', 'system'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActivityFilter(cat)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: activityFilter === cat ? '#1e293b' : '#f8fafc',
                      color: activityFilter === cat ? '#ffffff' : '#475569',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat === 'all' ? 'All Activities' : cat === 'fleet' ? 'Fleet & Drivers' : cat}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activityFeed
                  .filter((item) => activityFilter === 'all' || item.category === activityFilter)
                  .map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: item.color,
                            fontSize: 16,
                            border: '1px solid #cbd5e1',
                            flexShrink: 0,
                          }}
                        >
                          <i className={item.icon}></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{item.title}</div>
                          {item.sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.sub}</div>}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 12 }}>
                        {item.time}
                      </span>
                    </div>
                  ))}
                {activityFeed.filter((item) => activityFilter === 'all' || item.category === activityFilter).length === 0 && (
                  <div style={{ textAlign: 'center', padding: 32, color: '#888', fontSize: 13 }}>
                    No activities found in this category.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffDashboardPage;
