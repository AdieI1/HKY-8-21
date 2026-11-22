import Sidebar from '../components/Sidebar';

/* ── Static data matching the Figma ───────────────────── */
const FLEET = [
  {
    id: 'VCL001', model: 'FUSO FJ 2828R', plate: 'XYZ 1213', driver: 'John J.',
    schedule: [
      { label: 'Delivery\n8:00 AM–2:30 PM\nCDO → Malaybalay', type: 'delivery', day: 'mon' },
      { label: 'Delivery\n8:00 AM–2:30 PM\nCDO → Iligan',    type: 'delivery', day: 'tue' },
      { label: 'Available',                                    type: 'available', day: 'wed' },
      { label: 'Available',                                    type: 'available', day: 'thu' },
      { label: 'Delivery\n9:00 AM–1:00 PM\nCDO → Valencia',  type: 'delivery', day: 'fri' },
      { label: '–', type: 'empty', day: 'sat' },
      { label: '–', type: 'empty', day: 'sun' },
    ],
  },
  {
    id: 'VCL002', model: 'FUSO FJ 2800', plate: 'ABC 5678', driver: 'Juan D.',
    schedule: [
      { label: 'Available',                                    type: 'available', day: 'mon' },
      { label: 'On Break\nAll Day',                            type: 'break',    day: 'tue' },
      { label: 'Delivery\n7:00 AM–3:00 PM\nCDO → Gingoog',   type: 'delivery', day: 'wed' },
      { label: 'Delivery\n7:00 AM–3:00 PM\nGingoog → CDO',   type: 'delivery', day: 'thu' },
      { label: 'Available',                                    type: 'available', day: 'fri' },
      { label: '–', type: 'empty', day: 'sat' },
      { label: '–', type: 'empty', day: 'sun' },
    ],
  },
  {
    id: 'VCL003', model: 'XYZ 1213', plate: 'DEF 9101', driver: 'Alec J.',
    schedule: [
      { label: 'Delivery\n6:00 AM–4:00 PM\nCDO → Bukidnon',  type: 'delivery', day: 'mon' },
      { label: 'Delivery\n6:00 AM–4:00 PM\nMalabalay → CDO', type: 'delivery', day: 'tue' },
      { label: 'Delivery\n6:00 AM–4:00 PM\nMalabalay → CDO', type: 'delivery', day: 'wed' },
      { label: 'Available',                                    type: 'available', day: 'thu' },
      { label: 'Available',                                    type: 'available', day: 'fri' },
      { label: '–', type: 'empty', day: 'sat' },
      { label: '–', type: 'empty', day: 'sun' },
    ],
  },
];

const DAYS = [
  { key: 'mon', label: 'MON', date: '30 Mar', highlight: true },
  { key: 'tue', label: 'TUE', date: '31 Mar' },
  { key: 'wed', label: 'WED', date: '1 Apr' },
  { key: 'thu', label: 'THU', date: '2 Apr' },
  { key: 'fri', label: 'FRI', date: '3 Apr' },
  { key: 'sat', label: 'SAT', date: '4 Apr' },
  { key: 'sun', label: 'SUN', date: '5 Apr' },
];

const ACTIVITY = [
  { icon: 'fas fa-exclamation-triangle', color: '#E8B400', title: 'REQ0001 Overdue!', sub: 'Exceeded expected processing time (2+ days).', time: '5 mins ago' },
  { icon: 'fas fa-exclamation-triangle', color: '#E8B400', title: 'REQ0002 Overdue!', sub: 'Exceeded expected processing time (2+ days).', time: '6 mins ago' },
  { icon: 'fas fa-user-circle',          color: '#4A90E2', title: 'Driver John Jones(DR001) is on break.', sub: '', time: '10 mins ago' },
  { icon: 'fas fa-truck',                color: '#C53030', title: 'Driver Alec Jude(DR004) is now In Transit.', sub: 'Iponan, CDO → Malaybalay, Bukidnon', time: '15 mins ago' },
];

const PRIORITY_REQS = [
  { id: 'REQ0001', customer: 'Christopher Lee', date: '3/22/2026', status: 'Overdue',  overdue: true },
  { id: 'REQ0002', customer: 'James Reed',       date: '3/22/2026', status: 'Overdue',  overdue: true },
  { id: 'REQ0005', customer: 'Anthony Smith',    date: '3/24/2026', status: 'Pending',  overdue: false },
  { id: 'REQ0006', customer: 'Chris Rock',       date: '3/24/2026', status: 'Pending',  overdue: false },
];

const VEHICLES_SUMMARY = [
  { label: 'Available',           count: 1 },
  { label: 'In Transit/On Delivery', count: 3 },
  { label: 'On Break',            count: 2 },
  { label: 'Under Maintenance',   count: 0 },
];

/* ── Cell style helper ─────────────────────────────────── */
function cellClass(type) {
  if (type === 'delivery')  return 'adm-fleet-cell delivery';
  if (type === 'available') return 'adm-fleet-cell available';
  if (type === 'break')     return 'adm-fleet-cell on-break';
  return 'adm-fleet-cell empty';
}

function AdminDashboardPage() {
  return (
    <div className="dashboard-container">
      <Sidebar />

      <div className="main-content">
        {/* ── Header ── */}
        <header className="header">
          <div className="page-info">
            <span className="breadcrumb">Page/Dashboard</span>
            <h1 className="page-title">DASHBOARD</h1>
          </div>
          <div className="header-actions">
            <div className="date-picker">
              <span>Fri, 29 March 2026</span>
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
              <span className="adm-stat-num">4</span>
              <span className="adm-stat-label">Active Deliveries</span>
            </div>
          </div>
          <div className="adm-stat-card orange">
            <div className="adm-stat-icon"><i className="fas fa-clipboard-list"></i></div>
            <div className="adm-stat-body">
              <span className="adm-stat-num">5</span>
              <span className="adm-stat-label">Pending Requests</span>
            </div>
          </div>
          <div className="adm-stat-card green">
            <div className="adm-stat-icon"><i className="fas fa-user"></i></div>
            <div className="adm-stat-body">
              <span className="adm-stat-num">5</span>
              <span className="adm-stat-label">Available Drivers</span>
            </div>
          </div>
          <div className="adm-stat-card blue">
            <div className="adm-stat-icon"><i className="fas fa-truck-moving"></i></div>
            <div className="adm-stat-body">
              <span className="adm-stat-num">5</span>
              <span className="adm-stat-label">Available Vehicles</span>
            </div>
          </div>
        </div>

        {/* ── Middle row: Fleet + Activity ── */}
        <div className="adm-mid-row">

          {/* Fleet Monitoring */}
          <div className="adm-card adm-fleet-card">
            <div className="adm-card-header">
              <span className="adm-card-title">FLEET MONITORING</span>
            </div>
            <div className="adm-fleet-table-wrap">
              <table className="adm-fleet-table">
                <thead>
                  <tr>
                    <th className="adm-fleet-veh-col">VEHICLE / DRIVER</th>
                    {DAYS.map((d) => (
                      <th key={d.key} className={d.highlight ? 'adm-fleet-day-col highlight' : 'adm-fleet-day-col'}>
                        <div className="adm-day-label">{d.label}</div>
                        <div className="adm-day-date">{d.date}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FLEET.map((row) => (
                    <tr key={row.id}>
                      <td className="adm-fleet-veh-td">
                        <div className="adm-veh-info">
                          <img src="images/trucknisiya.png" alt="truck" className="adm-veh-img" />
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
                  ))}
                </tbody>
              </table>
            </div>
            {/* Legend */}
            <div className="adm-fleet-legend">
              <span className="adm-legend-dot delivery"></span> Delivery / In Transit
              <span className="adm-legend-dot available"></span> Available
              <span className="adm-legend-dot break"></span> On Break
              <span className="adm-legend-dot maintenance"></span> Maintenance
            </div>
          </div>

          {/* Activity Feed */}
          <div className="adm-card adm-activity-card">
            <div className="adm-card-header">
              <span className="adm-card-title"><i className="fas fa-bolt" style={{color:'#C53030',marginRight:'6px'}}></i>Activity Feed</span>
              <a href="#" className="adm-view-all">View all</a>
            </div>
            <div className="adm-activity-list">
              {ACTIVITY.map((item, i) => (
                <div className="adm-activity-item" key={i}>
                  <div className="adm-activity-icon" style={{color: item.color}}>
                    <i className={item.icon}></i>
                  </div>
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

          {/* Priority Requests */}
          <div className="adm-card adm-priority-card">
            <div className="adm-card-header">
              <span className="adm-card-title">
                <i className="far fa-clock" style={{marginRight:'6px'}}></i>
                Priority Requests
                <span className="adm-priority-badge">5</span>
              </span>
              <a href="#" className="adm-view-all">View all</a>
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

          {/* Vehicles Summary */}
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

export default AdminDashboardPage;