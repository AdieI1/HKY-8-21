import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Sidebar({ activePage }) {
  const navigate = useNavigate();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(
    activePage === 'fuel-inventory' || activePage === 'parts-inventory'
  );

  const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const roleName = authUser?.role?.role_name || '';
  const isAdmin = roleName.toLowerCase().includes('admin');
  const isStaff = !isAdmin;

  const toggleProfileMenu = () => setProfileMenuOpen((v) => !v);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    navigate('/');
  };

  return (
    <div className="sidebar">
      <div className="logo">
        <img src="/images/HJY LOGO 2 1.png" alt="HJY Trucking Services Logo" />
      </div>

      <nav className="navigation">
        <ul>
          {isAdmin ? (
            <li className={activePage === 'overview' ? 'active' : ''}>
              <Link to="/overview">
                <i className="fas fa-chart-pie"></i> Overview
              </Link>
            </li>
          ) : (
            <li className={activePage === 'dashboard' ? 'active' : ''}>
              <Link to="/dashboard">
                <i className="fas fa-chart-pie"></i> Dashboard
              </Link>
            </li>
          )}

          <li className={activePage === 'requests' ? 'active' : ''}>
            <Link to="/requests">
              <i className="fas fa-clipboard-list"></i> Requests Management
            </Link>
          </li>
          <li className={activePage === 'dispatch' ? 'active' : ''}>
            <Link to="/dispatch">
              <i className="fas fa-route"></i> Dispatch Management
            </Link>
          </li>
          <li className={activePage === 'delivery' ? 'active' : ''}>
            <Link to="/delivery">
              <i className="fas fa-truck-loading"></i> Delivery Monitoring
            </Link>
          </li>
          <li className={activePage === 'drivers' ? 'active' : ''}>
            <Link to="/drivers">
              <i className="fas fa-id-card"></i> Drivers
            </Link>
          </li>
          <li className={activePage === 'vehicles' ? 'active' : ''}>
            <Link to="/vehicles">
              <i className="fas fa-truck"></i> Vehicles
            </Link>
          </li>

          <li className={`nav-group ${inventoryOpen ? 'open' : ''}`}>
            <span
              className="nav-group-label"
              onClick={() => setInventoryOpen((prev) => !prev)}
              style={{ cursor: 'pointer' }}
            >
              <i className="fas fa-boxes"></i> Inventory
            </span>
            <ul className="nav-submenu">
              <li className={activePage === 'fuel-inventory' ? 'active' : ''}>
                <Link to="/fuel-inventory">
                  <i className="fas fa-gas-pump"></i> Fuel Inventory
                </Link>
              </li>
              <li className={activePage === 'parts-inventory' ? 'active' : ''}>
                <Link to="/parts-inventory">
                  <i className="fas fa-tools"></i> Parts Inventory
                </Link>
              </li>
            </ul>
          </li>

          <li className={activePage === 'analytics' ? 'active' : ''}>
            <Link to="/analytics">
              <i className="fas fa-chart-bar"></i> Analytics
            </Link>
          </li>
          <li className={activePage === 'customers' ? 'active' : ''}>
            <Link to="/customers">
              <i className="fas fa-users"></i> Customers
            </Link>
          </li>
        </ul>
      </nav>

      <div className="user-profile" onClick={toggleProfileMenu}>
        <img
          src={authUser?.profile_photo_url || '/images/brucednegrow.png'}
          alt={authUser?.full_name || (isAdmin ? 'Admin' : 'Staff')}
          className="user-avatar"
        />
        <div className="user-info">
          <span className="user-name">{authUser?.full_name || (isAdmin ? 'Admin' : 'Staff User')}</span>
          <span className="user-role">
            {isAdmin ? 'Admin' : 'Staff'} <span className="status-online"></span>
          </span>
        </div>

        {profileMenuOpen && (
          <div className="profile-dropdown" onClick={(e) => e.stopPropagation()}>
            <Link to="/profile" className="dropdown-item">
              <i className="fas fa-user"></i>
              <span>Profile</span>
              <i className="fas fa-chevron-right dropdown-arrow"></i>
            </Link>
            <Link to="/settings" className="dropdown-item">
              <i className="fas fa-cog"></i>
              <span>Settings</span>
              <i className="fas fa-chevron-right dropdown-arrow"></i>
            </Link>
          </div>
        )}
      </div>

      <div className="logout">
        <button
          type="button"
          onClick={handleLogout}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', width: '100%', padding: 0 }}
        >
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>
  );
}
