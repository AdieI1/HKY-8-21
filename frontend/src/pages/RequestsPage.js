import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api-client';
import RequestDetailsModal from '../components/requests/RequestDetailsModal';
import CreateRequestModal from '../components/requests/CreateRequestModal';

const OVERDUE_DAYS = 2;

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function formatMoney(amount) {
  if (amount == null) return '—';
  return '₱' + Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

function requestCode(id, short) {
  return `${short ? 'RQ' : 'REQ'}${String(id).padStart(4, '0')}`;
}

function isOverdue(request) {
  if (request.status !== 'pending') return false;
  const created = new Date(request.created_at);
  const daysOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
  return daysOld >= OVERDUE_DAYS;
}

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  item_name: '',
  cargo_type: 'Construction',
  fragility: 'low',
  weight: '',
  pickup: { address: '', lat: null, lng: null },
  dropoff: { address: '', lat: null, lng: null },
  distance_km: '',
  total_price: 800,
  payment_term: 'downpayment',
  payment_method: 'bank_transfer',
  bank_name: '',
  account_name: '',
  account_number: '',
  payment_receipt: null,
};

function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [view, setView] = useState('active');

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approving, setApproving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApprovedModal, setShowApprovedModal] = useState(false);

  const toggleProfileMenu = () => setProfileMenuOpen((v) => !v);

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
      const res = await api.get('/delivery-requests');
      setRequests(res.data);
    } catch {
      setLoadError('Could not load requests. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeRequests = useMemo(() => requests.filter((r) => r.status !== 'draft'), [requests]);
  const draftRequests = useMemo(() => requests.filter((r) => r.status === 'draft'), [requests]);

  const stats = useMemo(() => {
    const pending = activeRequests.filter((r) => r.status === 'pending').length;
    const overdue = activeRequests.filter(isOverdue).length;
    const approved = activeRequests.filter((r) => r.status === 'approved').length;
    return { pending, overdue, approved };
  }, [activeRequests]);

  const overdueList = useMemo(() => activeRequests.filter(isOverdue), [activeRequests]);
  const shownRequests = view === 'drafts' ? draftRequests : activeRequests;

  const openDetails = (request) => setSelectedRequest(request);
  const closeDetails = () => setSelectedRequest(null);

  const approveRequest = async () => {
    if (!selectedRequest) return;
    setApproving(true);
    try {
      await api.post(`/delivery-requests/${selectedRequest.request_id}/approve`);
      setSelectedRequest(null);
      setShowApprovedModal(true);
      await loadData();
    } catch (err) {
      console.error('Approve failed:', err.response?.data || err);
    } finally {
      setApproving(false);
    }
  };

  const undraftRequest = async (request) => {
    try {
      await api.put(`/delivery-requests/${request.request_id}`, { status: 'pending' });
      await loadData();
    } catch (err) {
      console.error('Undraft failed:', err.response?.data || err);
    }
  };

  return (
    <>
      <div className="dashboard-container">
        <div className="sidebar">
          <div className="logo">
            <img src="images/HJY LOGO 2 1.png" alt="HJY Trucking Services Logo" />
          </div>
          <nav className="navigation">
            <ul>
              <li><Link to="/overview"><i className="fas fa-chart-pie"></i> Overview</Link></li>
              <li className="active"><Link to="/requests"><i className="fas fa-clipboard-list"></i> Requests Management</Link></li>
              <li><Link to="/dispatch"><i className="fas fa-route"></i> Dispatch Management</Link></li>
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
          <div className="user-profile" onClick={toggleProfileMenu}>
            <img src="images/brucednegrow.png" alt="Admin" className="user-avatar" />
            <div className="user-info">
              <span className="user-name">{JSON.parse(localStorage.getItem('auth_user') || '{}').full_name || 'Admin'}</span>
              <span className="user-role">Admin <span className="status-online"></span></span>
            </div>
            {profileMenuOpen && (
              <div className="profile-dropdown" onClick={(e) => e.stopPropagation()}>
                <Link to="/profile" className="dropdown-item">
                  <i className="fas fa-user"></i><span>Profile</span><i className="fas fa-chevron-right dropdown-arrow"></i>
                </Link>
                <Link to="/settings" className="dropdown-item">
                  <i className="fas fa-cog"></i><span>Settings</span><i className="fas fa-chevron-right dropdown-arrow"></i>
                </Link>
              </div>
            )}
          </div>
          <div className="logout">
            <Link to="/" onClick={() => { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); }}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </Link>
          </div>
        </div>

        <div className="main-content">
          <header className="header">
            <div className="page-info">
              <span className="breadcrumb">Page/Requests</span>
              <h1 className="page-title">REQUESTS MANAGEMENT</h1>
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

          {loadError && <div className="form-error" style={{ margin: '16px 0', color: '#d32f2f' }}>{loadError}</div>}

          <div className="content-row">
            <div className="left-column">
              <div className="request-stats">
                <div className="stat-card stat-pending">
                  <div className="stat-header"><i className="fas fa-exclamation-triangle"></i><span className="stat-label">Pending Requests:</span></div>
                  <span className="stat-number">{stats.pending}</span>
                </div>
                <div className="stat-card stat-overdue">
                  <div className="stat-header"><i className="fas fa-exclamation-triangle"></i><span className="stat-label">Overdue:</span></div>
                  <span className="stat-number">{stats.overdue}</span>
                </div>
                <div className="stat-card stat-approved">
                  <div className="stat-header"><i className="fas fa-check-circle"></i><span className="stat-label">Approved:</span></div>
                  <span className="stat-number">{stats.approved}</span>
                </div>
              </div>

              <div className="content-section delivery-requests">
                <div className="section-header">
                  <h3 className="section-title">{view === 'drafts' ? 'Draft Requests' : 'Delivery Requests'}</h3>
                  <div className="section-controls">
                    <button className="btn-drafts" onClick={() => setView(view === 'drafts' ? 'active' : 'drafts')}>
                      {view === 'drafts' ? 'Back to Requests' : `Drafts (${draftRequests.length})`}
                    </button>
                    <button className="btn-create-request" onClick={() => setShowCreateModal(true)}><i className="fas fa-plus"></i> Create request</button>
                  </div>
                </div>
                <div className="section-content">
                  <table className="data-table">
                    <thead>
                      <tr><th>Request ID</th><th>Customer</th><th>Status</th><th>Date</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {shownRequests.map((r) => {
                        const overdue = isOverdue(r);
                        return (
                          <tr key={r.request_id}>
                            <td className="request-id">
                              {overdue && <i className="fas fa-exclamation-triangle status-icon"></i>} {requestCode(r.request_id)}
                            </td>
                            <td>{r.customer?.full_name || '—'}</td>
                            <td>
                              <span className={`status-badge status-${overdue ? 'overdue' : r.status}`}>
                                {overdue ? 'Overdue' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                              </span>
                            </td>
                            <td>{formatDate(r.created_at)}</td>
                            <td style={{ display: 'flex', gap: 6 }}>
                              <button className="btn-details" onClick={() => openDetails(r)}>Details</button>
                              {view === 'drafts' && (
                                <button className="btn-approve" onClick={() => undraftRequest(r)}>Undraft</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {loading && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading requests...</td></tr>
                      )}
                      {!loading && shownRequests.length === 0 && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24 }}>No requests found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="pagination">
                  <div className="admin-info">
                    <span><i className="fas fa-info-circle"></i> Click details to expand Request Information.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="right-column">
              <div className="content-section activity-logs">
                <div className="section-header">
                  <h3 className="section-title"><i className="fas fa-exclamation-circle"></i> Activity Logs</h3>
                </div>
                <div className="section-content">
                  {overdueList.slice(0, 5).map((r) => (
                    <div className="log-entry log-overdue" key={r.request_id}>
                      <i className="fas fa-exclamation-triangle"></i>
                      <div className="log-content">
                        <span className="log-title">{requestCode(r.request_id)} Overdue!</span>
                        <span className="log-time">{formatDate(r.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  {overdueList.length === 0 && (
                    <div className="log-entry"><span className="log-content">No overdue requests right now.</span></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RequestDetailsModal
        selectedRequest={selectedRequest}
        closeDetails={closeDetails}
        approveRequest={approveRequest}
        approving={approving}
        formatDate={formatDate}
        formatMoney={formatMoney}
        requestCode={requestCode}
        isOverdue={isOverdue}
      />

      {showApprovedModal && (
        <div
          className="modal approved-modal"
          style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
        >
          <div className="modal-content approved-modal-content" style={{ background: '#fff', borderRadius: 10, padding: 32, maxWidth: 420, textAlign: 'center' }}>
            <h2 className="approved-title">DELIVERY APPROVED!</h2>
            <div className="approved-icon">
              <img src="images/trucknisiya.png" alt="Delivery Truck" className="truck-icon-img" />
            </div>
            <p className="approved-message">Delivery is approved and will be sent to the dispatch management window</p>
            <button className="btn-return-menu" onClick={() => setShowApprovedModal(false)}>Return to menu</button>
          </div>
        </div>
      )}

      <CreateRequestModal
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        EMPTY_FORM={EMPTY_FORM}
        loadData={loadData}
      />
    </>
  );
}

export default RequestsPage;