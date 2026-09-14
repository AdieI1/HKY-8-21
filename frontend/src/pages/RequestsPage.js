import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/api-client';
import reverb from '../utils/reverb';
import Sidebar from '../components/Sidebar';
import RequestDetailsModal from '../components/requests/RequestDetailsModal';
import CreateRequestModal from '../components/requests/CreateRequestModal';
import NotificationBell from '../components/NotificationBell';

const OVERDUE_DAYS = 2;
const ITEMS_PER_PAGE = 8;

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function formatRelativeTime(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return diffDay < 7 ? `${diffDay}d ago` : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function formatMoney(amount) {
  return amount == null ? '—' : '₱' + Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

function requestCode(id, short) {
  return `${short ? 'RQ' : 'REQ'}${String(id).padStart(4, '0')}`;
}

function isOverdue(request) {
  if (request.status !== 'pending') return false;
  if (request.is_scheduled && request.scheduled_date) {
    return Date.now() > new Date(request.scheduled_date + 'T23:59:59').getTime();
  }
  return (Date.now() - new Date(request.created_at).getTime()) / 86400000 >= OVERDUE_DAYS;
}

const EMPTY_FORM = {
  first_name: '', last_name: '', phone: '', email: '', username: '', password: '', confirmPassword: '',
  item_name: '', cargo_type: 'Construction', fragility: 'low', weight: '',
  pickup: { address: '', lat: null, lng: null }, dropoff: { address: '', lat: null, lng: null },
  distance_km: '', total_price: 800, payment_term: 'downpayment', payment_method: 'bank_transfer',
  bank_name: '', account_name: '', account_number: '', payment_receipt: null,
  is_scheduled: false, scheduled_date: '', scheduled_time_slot: '09:00 AM',
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
    setCurrentPage(1);
  }, [view, statusFilter, searchTerm]);

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
    const unsub = reverb.subscribe('system-notifications', 'notification.created', () => loadData());
    const interval = setInterval(loadData, 60000);
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [loadData]);

  const activeRequests = useMemo(() => requests.filter((r) => r.status !== 'draft'), [requests]);
  const draftRequests = useMemo(() => requests.filter((r) => r.status === 'draft'), [requests]);

  const stats = useMemo(() => {
    const pending = activeRequests.filter((r) => r.status === 'pending').length;
    const overdue = activeRequests.filter(isOverdue).length;
    const approved = activeRequests.filter((r) => r.status === 'approved').length;
    const scheduled = activeRequests.filter((r) => r.is_scheduled || r.scheduled_date).length;
    return { pending, overdue, approved, scheduled };
  }, [activeRequests]);

  const requestActivities = useMemo(() => {
    const list = [];
    requests.forEach((r) => {
      const code = requestCode(r.request_id);
      const cust = r.customer?.full_name || 'Customer';
      const cTime = new Date(r.created_at || Date.now()).getTime();
      const uTime = new Date(r.updated_at || r.created_at || Date.now()).getTime();

      if (isOverdue(r)) {
        list.push({ id: `overdue-${r.request_id}`, type: 'overdue', icon: 'fas fa-exclamation-triangle', title: `${code} Overdue!`, sub: `${cust} • Pending response`, time: formatRelativeTime(r.created_at), timeMs: Date.now() + 100000000, request: r });
      }
      if (r.is_scheduled || r.scheduled_date) {
        list.push({ id: `sched-${r.request_id}`, type: 'scheduled', icon: 'far fa-calendar-alt', title: `${code} Scheduled`, sub: `${cust} • ${r.scheduled_date ? formatDate(r.scheduled_date) : 'Upcoming'}${r.scheduled_time_slot ? ` (${r.scheduled_time_slot})` : ''}`, time: formatRelativeTime(r.updated_at || r.created_at), timeMs: uTime + 200, request: r });
      }
      if (r.status === 'approved') {
        list.push({ id: `appr-${r.request_id}`, type: 'approved', icon: 'fas fa-check-circle', title: `${code} Approved`, sub: `${cust} • Ready for fleet dispatch`, time: formatRelativeTime(r.updated_at || r.created_at), timeMs: uTime + 100, request: r });
      }
      if (r.status !== 'draft') {
        list.push({ id: `new-${r.request_id}`, type: 'submitted', icon: 'fas fa-paper-plane', title: `New Request ${code}`, sub: `${cust} • ${r.item_name || 'Cargo delivery'}`, time: formatRelativeTime(r.created_at), timeMs: cTime, request: r });
      } else {
        list.push({ id: `draft-${r.request_id}`, type: 'draft', icon: 'fas fa-file-alt', title: `Draft ${code} Saved`, sub: `${r.item_name || 'Draft delivery'}`, time: formatRelativeTime(r.updated_at || r.created_at), timeMs: uTime, request: r });
      }
    });
    return list.sort((a, b) => b.timeMs - a.timeMs);
  }, [requests]);

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
      } else if (statusFilter === 'scheduled') {
        list = list.filter((r) => r.is_scheduled || r.scheduled_date);
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

    // Always sort latest requests first (descending by request_id / created_at)
    return [...list].sort((a, b) => {
      const idA = Number(a.request_id || 0);
      const idB = Number(b.request_id || 0);
      if (idA !== idB) return idB - idA;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
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
                {[
                  { key: 'pending', label: 'Pending', icon: 'fas fa-exclamation-triangle', count: stats.pending, cls: 'stat-pending' },
                  { key: 'overdue', label: 'Overdue', icon: 'fas fa-exclamation-triangle', count: stats.overdue, cls: 'stat-overdue' },
                  { key: 'approved', label: 'Approved', icon: 'fas fa-check-circle', count: stats.approved, cls: 'stat-approved' },
                  { key: 'scheduled', label: 'Scheduled', icon: 'far fa-calendar-alt', count: stats.scheduled, cls: 'stat-scheduled' },
                ].map((c) => (
                  <div
                    key={c.key}
                    className={`stat-card ${c.cls} ${statusFilter === c.key ? 'active-filter' : ''}`}
                    onClick={() => { setStatusFilter(statusFilter === c.key ? 'all' : c.key); setCurrentPage(1); }}
                    title={`Click to filter by ${c.label}`}
                  >
                    <div className="stat-header">
                      <i className={c.icon}></i>
                      <span className="stat-label">{c.label}</span>
                    </div>
                    <span className="stat-number">{c.count}</span>
                  </div>
                ))}
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
                        <option value="scheduled">Filter: Scheduled</option>
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
                            <td>
                              {formatDate(r.created_at)}
                              {(r.is_scheduled || r.scheduled_date) && (
                                <div className="schedule-pill" title={`Scheduled for ${r.scheduled_date || 'Future'} (${r.scheduled_time_slot || 'Anytime'})`}>
                                  <i className="far fa-calendar-alt"></i> Sched: {r.scheduled_date ? formatDate(r.scheduled_date) : 'Yes'}{r.scheduled_time_slot ? ` · ${r.scheduled_time_slot}` : ''}
                                </div>
                              )}
                            </td>
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
                  <h3 className="section-title"><i className="fas fa-bell"></i> Request Alerts</h3>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', background: '#E5E7EB', padding: '2px 8px', borderRadius: '10px' }}>
                    {requestActivities.length}
                  </span>
                </div>
                <div className="section-content">
                  {requestActivities.slice(0, 10).map((act) => (
                    <div
                      className={`log-entry log-${act.type}`}
                      key={act.id}
                      onClick={() => openDetails(act.request)}
                      title="Click to view request details"
                      style={{ cursor: 'pointer' }}
                    >
                      <i className={act.icon}></i>
                      <div className="log-content">
                        <span className="log-title">{act.title}</span>
                        <span className="log-sub">{act.sub}</span>
                        <span className="log-time">{act.time}</span>
                      </div>
                    </div>
                  ))}
                  {requestActivities.length === 0 && (
                    <div className="log-entry"><span className="log-content" style={{ color: '#888' }}>No request activities yet.</span></div>
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