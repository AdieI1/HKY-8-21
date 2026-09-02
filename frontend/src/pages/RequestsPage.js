import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/api-client';
import Sidebar from '../components/Sidebar';
import RequestDetailsModal from '../components/requests/RequestDetailsModal';
import CreateRequestModal from '../components/requests/CreateRequestModal';
import NotificationBell from '../components/NotificationBell';

const OVERDUE_DAYS = 2;
const ITEMS_PER_PAGE = 8;

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
  first_name: '', last_name: '', phone: '', email: '', username: '', password: '', confirmPassword: '',
  item_name: '', cargo_type: 'Construction', fragility: 'low', weight: '',
  pickup: { address: '', lat: null, lng: null }, dropoff: { address: '', lat: null, lng: null },
  distance_km: '', total_price: 800, payment_term: 'downpayment', payment_method: 'bank_transfer',
  bank_name: '', account_name: '', account_number: '', payment_receipt: null,
};

function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [view, setView] = useState('active');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approving, setApproving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApprovedModal, setShowApprovedModal] = useState(false);

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

  // Filter & Search Logic
  const filteredRequests = useMemo(() => {
    let list = view === 'drafts' ? draftRequests : activeRequests;

    if (view !== 'drafts' && statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        list = list.filter(isOverdue);
      } else if (statusFilter === 'pending') {
        list = list.filter((r) => r.status === 'pending' && !isOverdue(r));
      } else if (statusFilter === 'approved') {
        list = list.filter((r) => r.status === 'approved');
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((r) => {
        const code = requestCode(r.request_id).toLowerCase();
        const cust = (r.customer?.full_name || '').toLowerCase();
        const item = (r.item_name || '').toLowerCase();
        const pickup = (r.pickup_address || '').toLowerCase();
        const dropoff = (r.dropoff_address || '').toLowerCase();
        return code.includes(q) || cust.includes(q) || item.includes(q) || pickup.includes(q) || dropoff.includes(q);
      });
    }

    return list;
  }, [view, draftRequests, activeRequests, statusFilter, searchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE) || 1;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

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
        <Sidebar activePage="requests" />

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
              <NotificationBell />
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
                <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                  <h3 className="section-title">{view === 'drafts' ? 'Draft Requests' : 'Delivery Requests'}</h3>
                  <div className="section-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Search bar */}
                    <div className="search-bar" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f3f4f6', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e5e7eb', maxWidth: '200px' }}>
                      <i className="fas fa-search" style={{ color: '#9ca3af', fontSize: '13px' }}></i>
                      <input
                        type="text"
                        placeholder="Search requests..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%', color: '#333' }}
                      />
                      {searchTerm && (
                        <i className="fas fa-times" onClick={() => { setSearchTerm(''); setCurrentPage(1); }} style={{ color: '#9ca3af', cursor: 'pointer', fontSize: '12px' }}></i>
                      )}
                    </div>

                    {/* Filter dropdown */}
                    {view !== 'drafts' && (
                      <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: '13px', fontWeight: '500', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="all">Filter: All</option>
                        <option value="pending">Filter: Pending</option>
                        <option value="overdue">Filter: Overdue</option>
                        <option value="approved">Filter: Approved</option>
                      </select>
                    )}

                    <button className="btn-drafts" onClick={() => { setView(view === 'drafts' ? 'active' : 'drafts'); setCurrentPage(1); }}>
                      {view === 'drafts' ? 'Back to Requests' : `Drafts (${draftRequests.length})`}
                    </button>
                    <button className="btn-create-request" onClick={() => setShowCreateModal(true)}>
                      <i className="fas fa-plus"></i> Create request
                    </button>
                  </div>
                </div>

                <div className="section-content">
                  <table className="data-table">
                    <thead>
                      <tr><th>Request ID</th><th>Customer</th><th>Status</th><th>Date</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {paginatedRequests.map((r) => {
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
                      {!loading && paginatedRequests.length === 0 && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24 }}>No requests found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination & Footer */}
                <div className="pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px' }}>
                  <div className="admin-info">
                    <span><i className="fas fa-info-circle"></i> Click details to expand Request Information.</span>
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="btn-page"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{ opacity: currentPage === 1 ? 0.35 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`btn-page ${currentPage === page ? 'active' : ''}`}
                          style={{
                            fontWeight: currentPage === page ? '700' : '500',
                            color: currentPage === page ? '#C53030' : '#4b5563',
                            borderColor: currentPage === page ? '#C53030' : '#d1d5db',
                            background: currentPage === page ? '#FFF5F5' : '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        className="btn-page"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{ opacity: currentPage === totalPages ? 0.35 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  )}
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