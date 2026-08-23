import { Link } from 'react-router-dom';

export function DispatchSidebar() {
  return (
    <div className="sidebar">
      <div className="logo">
        <img src="images/HJY LOGO 2 1.png" alt="HJY Trucking Services Logo" />
      </div>
      <nav className="navigation">
        <ul>
          <li><Link to="/overview"><i className="fas fa-chart-pie"></i> Overview</Link></li>
          <li><Link to="/requests"><i className="fas fa-clipboard-list"></i> Requests Management</Link></li>
          <li className="active"><Link to="/dispatch"><i className="fas fa-route"></i> Dispatch Management</Link></li>
          <li><Link to="/delivery"><i className="fas fa-truck-loading"></i> Delivery Monitoring</Link></li>
          <li><Link to="/drivers"><i className="fas fa-id-card"></i> Drivers</Link></li>
          <li><Link to="/vehicles"><i className="fas fa-truck"></i> Vehicles</Link></li>
          <li className="nav-group">
            <span className="nav-group-label"><i className="fas fa-boxes"></i> Inventory</span>
            <ul className="nav-submenu">
              <li><Link to="/fuel-inventory"><i className="fas fa-gas-pump"></i> Fuel Inventory</Link></li>
              <li><Link to="/parts-inventory"><i className="fas fa-tools"></i> Parts Inventory</Link></li>
            </ul>
          </li>
          <li><Link to="/analytics"><i className="fas fa-chart-bar"></i> Analytics</Link></li>
          <li><Link to="/customers"><i className="fas fa-users"></i> Customers</Link></li>
        </ul>
      </nav>
      <div className="user-profile">
        <img src="images/brucednegrow.png" alt="Admin" className="user-avatar" />
        <div className="user-info">
          <span className="user-name">{JSON.parse(localStorage.getItem('auth_user') || '{}').full_name || 'Admin'}</span>
          <span className="user-role">Admin <span className="status-online"></span></span>
        </div>
      </div>
      <div className="logout">
        <Link to="/" onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); }}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </Link>
      </div>
    </div>
  );
}

export function DispatchHeader({ currentDate }) {
  return (
    <header className="header">
      <div className="page-info">
        <span className="breadcrumb">Page/Dispatch</span>
        <h1 className="page-title">DISPATCH MANAGEMENT</h1>
      </div>
      <div className="header-actions">
        <div className="date-picker">
          <span>{currentDate}</span>
          <i className="far fa-calendar-alt"></i>
        </div>
        <div className="notification">
          <div className="bell-container"><div className="bell"></div></div>
        </div>
      </div>
    </header>
  );
}
