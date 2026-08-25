import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';

const ACTIVITY = [
  { icon: 'fas fa-exclamation-triangle', color: '#E8B400', title: 'REQ0001 Overdue!', sub: 'Exceeded expected processing time (2+ days).', time: '5 mins ago' },
  { icon: 'fas fa-exclamation-triangle', color: '#E8B400', title: 'REQ0002 Overdue!', sub: 'Exceeded expected processing time (2+ days).', time: '6 mins ago' },
  { icon: 'fas fa-user-circle', color: '#4A90E2', title: 'Driver John Jones(DR001) is on break.', sub: '', time: '10 mins ago' },
  { icon: 'fas fa-truck', color: '#C53030', title: 'Driver Alec Jude(DR004) is now In Transit.', sub: 'Iponan, CDO → Malaybalay, Bukidnon', time: '15 mins ago' },
];

const PRIORITY_REQS = [
  { id: 'REQ0001', customer: 'Christopher Lee', date: '3/22/2026', status: 'Overdue', overdue: true },
  { id: 'REQ0002', customer: 'James Reed', date: '3/22/2026', status: 'Overdue', overdue: true },
  { id: 'REQ0005', customer: 'Anthony Smith', date: '3/24/2026', status: 'Pending', overdue: false },
  { id: 'REQ0006', customer: 'Chris Rock', date: '3/24/2026', status: 'Pending', overdue: false },
];

const VEHICLES_SUMMARY = [
  { label: 'Available', count: 1 },
  { label: 'In Transit/On Delivery', count: 3 },
  { label: 'On Break', count: 2 },
  { label: 'Under Maintenance', count: 0 },
];

function cellClass(type) {
  if (type === 'delivery') return 'adm-fleet-cell delivery';
  if (type === 'available') return 'adm-fleet-cell available';
  if (type === 'break') return 'adm-fleet-cell on-break';
  return 'adm-fleet-cell empty';
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
  if (parts.length >= 2) {
    const cand = parts[parts.length - 2];
    if (isNaN(cand)) return cand;
    return parts[parts.length - 1] || cand;
  }
  return parts[0] || 'CDO';
}

function StaffDashboardPage() {
  const [currentDate, setCurrentDate] = useState('');
  const [weekDays, setWeekDays] = useState(() => getCurrentWeekDays());
  const [fleetList, setFleetList] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [stats, setStats] = useState({ activeDeliveries: 4, pendingRequests: 5, availableDrivers: 5, availableVehicles: 5 });

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
    ]).then(([delRes, reqRes, drvRes, vehRes]) => {
      const deliveries = Array.isArray(delRes.data) ? delRes.data : [];
      const requests = Array.isArray(reqRes.data) ? reqRes.data : [];
      const drivers = Array.isArray(drvRes.data) ? drvRes.data : [];
      const vehicles = Array.isArray(vehRes.data) ? vehRes.data : [];

      const activeDel = deliveries.filter((d) => ['assigned', 'accepted', 'out_for_delivery', 'in_transit'].includes(d.status)).length;
      const pendingReq = requests.filter((r) => r.status === 'pending').length;
      const availDrivers = drivers.filter((d) => d.status === 'available' || d.status === 'active').length;
      const availVehicles = vehicles.filter((v) => v.status === 'available' || v.status === 'active').length;

      setStats({ activeDeliveries: activeDel || 4, pendingRequests: pendingReq || 5, availableDrivers: availDrivers || 5, availableVehicles: availVehicles || 5 });

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

          const driverObj = activeDelivery?.driver
            || drivers.find((dr) => Number(dr.driver_id) === Number(activeDelivery?.driver_id));

          const rawDriverName = driverObj?.user?.full_name
            || activeDelivery?.driver?.user?.full_name
            || 'Driver';

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
            <div className="notification">
              <div className="bell-container"><div className="bell"></div></div>
            </div>
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
              <Link to="/delivery" className="adm-view-all">View all</Link>
            </div>
            <div className="adm-activity-list">
              {ACTIVITY.map((item, i) => (
                <div className="adm-activity-item" key={i}>
                  <div className="adm-activity-icon" style={{ color: item.color }}><i className={item.icon}></i></div>
                  <div className="adm-activity-body">
                    <div className="adm-activity-title">{item.title}</div>
                    {item.sub && <div className="adm-activity-sub">{item.sub}</div>}
                  </div>
                  <div className="adm-activity-time">{item.time}</div>
                </div>
              ))}
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
                <span className="adm-priority-badge">5</span>
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
                {PRIORITY_REQS.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.overdue && <i className="fas fa-exclamation-triangle adm-warn-icon"></i>}
                      {r.id}
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
                ))}
              </tbody>
            </table>
          </div>

          <div className="adm-card adm-vsummary-card">
            <div className="adm-card-header">
              <span className="adm-card-title">VEHICLES SUMMARY</span>
            </div>
            <table className="adm-vsummary-table">
              <tbody>
                {VEHICLES_SUMMARY.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className="adm-vsummary-count">{row.count}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="adm-vsummary-total">
                  <td>Total Vehicles</td>
                  <td className="adm-vsummary-count">6</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffDashboardPage;
