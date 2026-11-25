import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import NotificationBell from '../components/NotificationBell';
import Pagination from '../components/Pagination';
import TableSkeleton from '../components/TableSkeleton';
import PrintableIncidentModal from '../components/driver/PrintableIncidentModal';
import reverb from '../utils/reverb';
import {
  validatePhoneNumber,
  formatPhoneInput,
  formatNameInput,
  getFormAlertTitle,
  validateLicenseNumber,
  formatLicenseInput,
  validateDateSequence,
  validatePositiveNumber,
  validateEmail,
  getTodayIso,
  getTomorrowIso,
  isStrictlyFutureDate,
  LTO_DL_CODES,
} from '../utils/validation';

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function formatDateTime(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function driverCode(id) {
  return `DR${String(id).padStart(3, '0')}`;
}

function deliveryCode(id) {
  return `DLV${String(id).padStart(4, '0')}`;
}

function isDeliveryRescheduled(del) {
  if (!del) return false;
  const s = (del.status || '').toLowerCase();
  const reqStatus = (del.request?.status || '').toLowerCase();
  const rescheduleStatus = (del.request?.reschedule_status || '').toLowerCase();
  return (
    s === 'rescheduled' ||
    reqStatus === 'rescheduled' ||
    rescheduleStatus === 'rescheduled' ||
    rescheduleStatus === 'proposed' ||
    rescheduleStatus === 'accepted' ||
    Boolean(del.request?.reschedule_proposed_date)
  );
}

function classifyDelivery(del) {
  if (!del) {
    return {
      category: 'completed',
      badge: 'Delivered',
      color: '#15803d',
      bg: '#dcfce7',
      border: '#bbf7d0',
      icon: 'fa-check-circle',
      reason: '',
      incident: null,
    };
  }

  const s = (del.status || '').toLowerCase();
  const reqStatus = (del.request?.status || '').toLowerCase();
  const incidents = Array.isArray(del.incidents) ? del.incidents : [];
  const hasIncident = incidents.length > 0 || Boolean(del.has_accident_incident) || Boolean(del.relief_incident_id);

  // 1. Terminal Failed / Cancelled / Accident
  if (
    s === 'cancelled' ||
    s === 'failed' ||
    s === 'rejected' ||
    reqStatus === 'cancelled' ||
    (hasIncident && s !== 'delivered' && s !== 'completed')
  ) {
    const isAccident =
      hasIncident ||
      (del.cancellation_reason || '').toLowerCase().includes('accident') ||
      (del.cancellation_reason || '').toLowerCase().includes('breakdown') ||
      (del.cancellation_reason || '').toLowerCase().includes('relief');

    return {
      category: 'failed',
      badge: isAccident ? 'Accident / Failure' : 'Cancelled',
      color: '#b91c1c',
      bg: '#fee2e2',
      border: '#fecaca',
      icon: isAccident ? 'fa-triangle-exclamation' : 'fa-times-circle',
      reason:
        del.cancellation_reason ||
        (incidents[0]?.incident_type ? `Incident: ${incidents[0].incident_type}` : isAccident ? 'Vehicle issue / Accident reported' : 'Delivery Cancelled'),
      incident: incidents[0] || null,
    };
  }

  // 2. Terminal Completed / Delivered
  if (s === 'delivered' || s === 'completed') {
    return {
      category: 'completed',
      badge: 'Delivered',
      color: '#15803d',
      bg: '#dcfce7',
      border: '#bbf7d0',
      icon: 'fa-check-circle',
      reason: 'Successfully completed',
      incident: null,
    };
  }

  // 3. Ongoing / Dispatched / Active / Assigned / Scheduled
  const isMoving = ['in_transit', 'in transit', 'out_for_delivery', 'departed', 'started', 'arrived_pickup', 'loading_cargo', 'arrived_dropoff', 'unloading_cargo'].includes(s);
  const isDispatched = ['dispatched', 'on_delivery'].includes(s);

  return {
    category: 'ongoing',
    isMoving,
    badge: isMoving ? 'In Transit' : isDispatched ? 'Dispatched' : 'Assigned',
    color: isMoving ? '#1d4ed8' : '#4338ca',
    bg: isMoving ? '#dbeafe' : '#e0e7ff',
    border: isMoving ? '#bfdbfe' : '#c7d2fe',
    icon: isMoving ? 'fa-truck-fast' : isDispatched ? 'fa-clipboard-check' : 'fa-calendar-check',
    reason: isMoving ? 'Delivery in progress' : isDispatched ? 'Dispatched to driver' : 'Assigned to driver',
    incident: null,
  };
}

const TERMINAL_DELIVERY_STATUSES = ['completed', 'delivered', 'rejected', 'cancelled'];

function isDriverOnActiveDelivery(driver) {
  if (!driver) return false;
  return (
    Array.isArray(driver.deliveries) &&
    driver.deliveries.some((d) => {
      const st = (d.status || '').toLowerCase();
      if (TERMINAL_DELIVERY_STATUSES.includes(st)) return false;
      if (st === 'returning_to_hq' && Boolean(d.hq_arrived_at)) return false;
      return true;
    })
  );
}

function parseDlCodes(raw) {
  if (!raw) return [];
  const validSet = new Set(LTO_DL_CODES.map((c) => c.code));
  return String(raw)
    .split(/[\s,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => validSet.has(s));
}

function availabilityLabel(driver) {
  if (driver.status === 'inactive') return 'Inactive';
  if (driver.availability_status === 'offline') return 'Inactive';
  const hasActiveDelivery = isDriverOnActiveDelivery(driver);
  if (hasActiveDelivery || driver.availability_status === 'busy') return 'On Delivery';
  if (driver.availability_status === 'on_leave') return 'On Leave';
  if (driver.availability_status === 'pending_leave') return 'Pending Leave';
  if (driver.availability_status === 'off_duty') return 'Off Duty';
  return 'Available';
}

function availabilityClass(driver) {
  const label = availabilityLabel(driver);
  if (label === 'On Delivery') return 'on-delivery';
  if (['Inactive', 'Off Duty', 'On Leave', 'Pending Leave'].includes(label)) return 'inactive';
  return 'available';
}

function formatLeaveType(type) {
  const map = {
    sick_leave: 'Sick Leave',
    emergency_absence: 'Emergency Absence',
    day_off: 'Day Off',
    vacation: 'Vacation / Personal',
  };
  return map[type] || (type || 'Leave').replace(/_/g, ' ');
}

const EMPTY_FORM = {
  first_name: '',
  middle_name: '',
  last_name: '',
  birthdate: '',
  nationality: 'Filipino',
  phone: '',
  license_number: '',
  license_type: 'Professional',
  agency_code: '',
  license_expiry_date: '',
  restriction_code: '',
  health_condition: 'Fit to Work',
  last_medical_check: '',
  prescriptions: '',
  existing_conditions: '',
  date_hired: '',
  experience_years: '',
  hired_by: '',
  contract_start: '',
  contract_end: '',
  clearance_type: 'NBI Clearance',
  clearance_date: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function splitFullName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', middle_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], middle_name: '', last_name: '' };
  if (parts.length === 2) return { first_name: parts[0], middle_name: '', last_name: parts[1] };
  return { first_name: parts[0], middle_name: parts.slice(1, -1).join(' '), last_name: parts[parts.length - 1] };
}

function DriversPage() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [driverLeaves, setDriverLeaves] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const [view, setView] = useState('drivers'); // 'drivers' | 'archives' | 'incidents' | 'leaves'
  const [showLogLeaveModal, setShowLogLeaveModal] = useState(false);
  const [savingLeave, setSavingLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    driver_id: '',
    leave_type: 'sick_leave',
    start_date: getTodayIso(),
    end_date: getTodayIso(),
    reason: '',
  });
  const [processingLeaveId, setProcessingLeaveId] = useState(null);
  const [togglingDutyId, setTogglingDutyId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all'); // 'all' | 'available' | 'busy' | 'inactive' | 'resigned'
  const [sortBy, setSortBy] = useState('id_asc'); // 'name_asc' | 'name_desc' | 'id_asc' | 'id_desc' | 'status_hierarchy' | 'contract_soonest' | 'contract_longest'

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [changePassword, setChangePassword] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Driver Documents state & refs
  const [licenseFile, setLicenseFile] = useState(null);
  const [medicalCertFile, setMedicalCertFile] = useState(null);
  const [clearanceFile, setClearanceFile] = useState(null);

  const licenseFileInputRef = useRef(null);
  const medicalCertFileInputRef = useRef(null);
  const clearanceFileInputRef = useRef(null);

  // Document Viewer / Missing File Modal
  const [docModal, setDocModal] = useState(null);

  const handleDocFileSelect = (file, docType) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFormError('Document file size exceeds 10MB limit.');
      return;
    }
    if (docType === 'license') {
      setLicenseFile(file);
      if (formErrors.license_file) {
        setFormErrors((prev) => {
          const copy = { ...prev };
          delete copy.license_file;
          return copy;
        });
      }
    }
    if (docType === 'medical') {
      setMedicalCertFile(file);
      if (formErrors.medical_cert_file) {
        setFormErrors((prev) => {
          const copy = { ...prev };
          delete copy.medical_cert_file;
          return copy;
        });
      }
    }
    if (docType === 'clearance') {
      setClearanceFile(file);
      if (formErrors.clearance_file) {
        setFormErrors((prev) => {
          const copy = { ...prev };
          delete copy.clearance_file;
          return copy;
        });
      }
    }
    setFormError('');
  };

  const handleViewDocFile = (title, url, driver = null) => {
    const targetDriver = driver || detailsDriver || editingDriver;
    setDocModal({
      isOpen: true,
      title,
      url: url || null,
      driver: targetDriver,
    });
  };

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (formError) {
      const timer = setTimeout(() => {
        setFormError('');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [formError]);

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsDriver, setDetailsDriver] = useState(null);
  const [driverDeliveryFilter, setDriverDeliveryFilter] = useState('all'); // 'all' | 'ongoing' | 'completed' | 'failed'
  const [driverDeliveryPage, setDriverDeliveryPage] = useState(1);

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archivingDriver, setArchivingDriver] = useState(null);
  const [toast, setToast] = useState(null);
  const [staffMembers, setStaffMembers] = useState([]);

  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentType, setIncidentType] = useState('All');
  const [incidentDriverFilter, setIncidentDriverFilter] = useState('All Drivers');
  const [selectedPrintIncident, setSelectedPrintIncident] = useState(null);

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

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setLoadError('');
    }
    try {
      const [driversRes, incidentsRes, leavesRes, usersRes] = await Promise.all([
        api.get('/drivers', { skipCache: true }),
        api.get('/incident-reports', { skipCache: true }),
        api.get('/driver-leaves', { skipCache: true }).catch(() => ({ data: [] })),
        isSilent ? Promise.resolve(null) : api.get('/users').catch(() => ({ data: [] })),
      ]);
      const freshDrivers = Array.isArray(driversRes.data) ? driversRes.data : [];
      setDrivers(freshDrivers);
      setIncidents(incidentsRes.data);
      setDriverLeaves(Array.isArray(leavesRes.data) ? leavesRes.data : []);
      setDetailsDriver((prev) => {
        if (!prev?.driver_id) return prev;
        return freshDrivers.find((d) => d.driver_id === prev.driver_id) || prev;
      });
      if (usersRes) {
        const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
        const companyStaff = rawUsers
          .filter((u) => {
            const roleName = (u.role?.role_name || u.role_name || '').toLowerCase();
            const status = (u.status || 'active').toLowerCase();
            return status !== 'inactive' && (roleName.includes('admin') || roleName.includes('staff'));
          })
          .map((u) => ({
            id: u.user_id || u.id,
            name: (u.full_name || '').trim(),
            role: u.role?.role_name || u.role_name || 'Staff',
          }))
          .filter((u) => u.name)
          .sort((a, b) => a.name.localeCompare(b.name));
        setStaffMembers(companyStaff);
      }
    } catch (err) {
      if (!isSilent) {
        setLoadError('Could not load drivers. Is the backend running and are you logged in?');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(false);

    let isPolling = false;
    const silentRefresh = async () => {
      if (isPolling || (typeof document !== 'undefined' && document.hidden)) return;
      isPolling = true;
      try {
        await loadData(true);
      } finally {
        isPolling = false;
      }
    };

    const unsubDelivery = reverb.subscribe('deliveries', 'delivery.updated', silentRefresh);
    const unsubNotif = reverb.subscribe('system-notifications', 'notification.created', silentRefresh);

    const handleFocus = () => {
      if (!document.hidden) silentRefresh();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('app:data-mutated', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    const pollInterval = setInterval(silentRefresh, 8000);

    return () => {
      unsubDelivery();
      unsubNotif();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('app:data-mutated', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(pollInterval);
    };
  }, [loadData]);

  const activeDrivers = useMemo(() => drivers.filter((d) => d.status === 'active'), [drivers]);
  const archivedDrivers = useMemo(() => drivers.filter((d) => d.status === 'inactive'), [drivers]);

  const kpiCounts = useMemo(() => {
    let available = 0;
    let onDelivery = 0;
    let inactive = 0;

    activeDrivers.forEach((d) => {
      const lbl = availabilityLabel(d);
      if (lbl === 'Available') available++;
      else if (lbl === 'On Delivery') onDelivery++;
      else inactive++;
    });

    return { available, onDelivery, inactive, incidents: incidents.length };
  }, [activeDrivers, incidents]);

  const handleKpiClick = (statusKey) => {
    if (statusKey === 'incidents') {
      if (view === 'incidents') {
        setView('drivers');
        setActiveStatusFilter('all');
      } else {
        setView('incidents');
        setActiveStatusFilter('all');
      }
      return;
    }

    if (view !== 'drivers') {
      setView('drivers');
    }
    setActiveStatusFilter((prev) => (prev === statusKey ? 'all' : statusKey));
  };

  const pendingLeaveCount = useMemo(
    () => driverLeaves.filter((l) => l.status === 'pending').length,
    [driverLeaves]
  );

  const handleToggleDuty = async (driver, nextStatus, e) => {
    e?.stopPropagation();
    if (!driver?.driver_id) return;
    const prevStatus = driver.availability_status;
    const targetLabel = nextStatus === 'available' ? 'On Duty' : 'Off Duty';

    const patchDriverList = (updater) => {
      setDrivers((prev) => prev.map((d) => (d.driver_id === driver.driver_id ? updater(d) : d)));
      setDetailsDriver((prev) =>
        prev?.driver_id === driver.driver_id ? updater(prev) : prev
      );
    };

    // Optimistic update so table badge & button flip immediately with zero perceived lag
    patchDriverList((d) => ({ ...d, availability_status: nextStatus }));
    setTogglingDutyId(driver.driver_id);

    try {
      const res = await api.post('/driver/duty-status', {
        driver_id: driver.driver_id,
        availability_status: nextStatus,
      });
      api.clearCache?.();
      const updatedDriver = res.data?.driver;
      if (updatedDriver) {
        patchDriverList((d) => ({
          ...d,
          ...updatedDriver,
          deliveries: updatedDriver.deliveries ?? d.deliveries,
        }));
      }
      setToast({ message: res.data?.message || `Driver set to ${targetLabel}.` });
      setTimeout(() => setToast(null), 3500);
      loadData(true).catch(() => {});
    } catch (err) {
      patchDriverList((d) => ({ ...d, availability_status: prevStatus }));
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Could not update driver duty status.',
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setTogglingDutyId(null);
    }
  };

  const handleApproveLeave = async (leave) => {
    setProcessingLeaveId(leave.leave_id);
    try {
      const res = await api.post(`/driver-leaves/${leave.leave_id}/approve`);
      await loadData(true);
      setToast({ message: res.data?.message || 'Leave request approved.' });
      setTimeout(() => setToast(null), 4500);
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Could not approve leave request.',
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleRejectLeave = async (leave) => {
    setProcessingLeaveId(leave.leave_id);
    try {
      const res = await api.post(`/driver-leaves/${leave.leave_id}/reject`, {
        review_notes: 'Declined by staff/admin.',
      });
      await loadData(true);
      setToast({ message: res.data?.message || 'Leave request rejected.' });
      setTimeout(() => setToast(null), 4500);
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Could not reject leave request.',
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleSubmitAdminLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.driver_id || !leaveForm.start_date || !leaveForm.reason.trim()) {
      setToast({ type: 'error', message: 'Please select driver, date, and reason.' });
      setTimeout(() => setToast(null), 4500);
      return;
    }
    setSavingLeave(true);
    try {
      const res = await api.post('/driver-leaves', {
        ...leaveForm,
        end_date: leaveForm.end_date || leaveForm.start_date,
        auto_approve: true,
      });
      setShowLogLeaveModal(false);
      setLeaveForm({
        driver_id: '',
        leave_type: 'sick_leave',
        start_date: getTodayIso(),
        end_date: getTodayIso(),
        reason: '',
      });
      await loadData(true);
      setToast({ message: res.data?.message || 'Driver leave recorded.' });
      setTimeout(() => setToast(null), 4500);
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to record leave.',
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSavingLeave(false);
    }
  };

  const filteredDrivers = useMemo(() => {
    let list = [...activeDrivers];

    if (activeStatusFilter === 'available') {
      list = list.filter((d) => availabilityLabel(d) === 'Available');
    } else if (activeStatusFilter === 'busy') {
      list = list.filter((d) => availabilityLabel(d) === 'On Delivery');
    } else if (activeStatusFilter === 'inactive') {
      list = list.filter((d) =>
        ['Inactive', 'Off Duty', 'On Leave', 'Pending Leave'].includes(availabilityLabel(d))
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((d) => {
        const name = d.user?.full_name || '';
        const idStr = driverCode(d.driver_id).toLowerCase();
        const license = d.license_number || '';
        const phone = d.user?.phone || '';
        const email = d.user?.email || '';
        return `${name} ${idStr} ${license} ${phone} ${email}`.toLowerCase().includes(term);
      });
    }

    if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.user?.full_name || '').localeCompare(b.user?.full_name || '', undefined, { sensitivity: 'base' }));
    } else if (sortBy === 'name_desc') {
      list.sort((a, b) => (b.user?.full_name || '').localeCompare(a.user?.full_name || '', undefined, { sensitivity: 'base' }));
    } else if (sortBy === 'id_asc') {
      list.sort((a, b) => (Number(a.driver_id) || 0) - (Number(b.driver_id) || 0));
    } else if (sortBy === 'id_desc') {
      list.sort((a, b) => (Number(b.driver_id) || 0) - (Number(a.driver_id) || 0));
    } else if (sortBy === 'status_hierarchy') {
      const rank = (d) => {
        const lbl = availabilityLabel(d);
        if (lbl === 'Available') return 1;
        if (lbl === 'On Delivery') return 2;
        if (lbl === 'Inactive') return 3;
        return 4;
      };
      list.sort((a, b) => rank(a) - rank(b));
    } else if (sortBy === 'contract_soonest') {
      list.sort((a, b) => {
        const timeA = a.contract_end ? new Date(a.contract_end).getTime() : Infinity;
        const timeB = b.contract_end ? new Date(b.contract_end).getTime() : Infinity;
        return timeA - timeB;
      });
    } else if (sortBy === 'contract_longest') {
      list.sort((a, b) => {
        const timeA = a.contract_end ? new Date(a.contract_end).getTime() : -Infinity;
        const timeB = b.contract_end ? new Date(b.contract_end).getTime() : -Infinity;
        return timeB - timeA;
      });
    }

    return list;
  }, [activeDrivers, activeStatusFilter, search, sortBy]);

  const filteredIncidents = useMemo(() => {
    const term = incidentSearch.toLowerCase().trim();
    return incidents.filter((inc) => {
      const driverName = inc.delivery?.driver?.user?.full_name || 'Unassigned';
      const customerName = inc.delivery?.request?.customer?.full_name || '';
      const reqCode = inc.delivery?.request?.request_id ? `REQ${String(inc.delivery.request.request_id).padStart(4, '0')}` : '';
      const haystack = `${driverName} ${customerName} ${reqCode} ${inc.description || ''} ${inc.location_address || ''} ${inc.incident_type}`.toLowerCase();
      const inSearch = !term || haystack.includes(term);

      let inType = true;
      if (incidentType !== 'All') {
        const iType = (inc.incident_type || '').toLowerCase();
        const fType = incidentType.toLowerCase();
        if (fType === 'lost item') {
          inType = iType === 'lost_item' || iType === 'lost item';
        } else if (fType === 'damage') {
          inType = iType === 'damage' || iType === 'cargo_damage';
        } else if (fType === 'delay') {
          inType = iType === 'delay' || iType === 'road_issue';
        } else if (fType === 'breakdown') {
          inType =
            iType === 'vehicle_breakdown' ||
            iType === 'breakdown' ||
            iType === 'vehicle_problem' ||
            iType === 'flat_tire';
        } else {
          inType = iType === fType || iType.replace(/_/g, ' ') === fType;
        }
      }

      const inDriver = incidentDriverFilter === 'All Drivers' || driverName === incidentDriverFilter;
      return inSearch && inType && inDriver;
    });
  }, [incidents, incidentSearch, incidentType, incidentDriverFilter]);

  const incidentDriverNames = useMemo(() => {
    const names = new Set(incidents.map((i) => i.delivery?.driver?.user?.full_name).filter(Boolean));
    return Array.from(names);
  }, [incidents]);

  // Pagination states
  const PAGE_SIZE = 10;
  const [driverPage, setDriverPage] = useState(1);
  const [archivePage, setArchivePage] = useState(1);
  const [incidentPage, setIncidentPage] = useState(1);

  useEffect(() => {
    setDriverPage(1);
  }, [search, activeStatusFilter, sortBy]);

  useEffect(() => {
    setIncidentPage(1);
  }, [incidentSearch, incidentType, incidentDriverFilter]);

  const totalDriverPages = Math.ceil(filteredDrivers.length / PAGE_SIZE) || 1;
  const paginatedDrivers = useMemo(() => {
    const start = (driverPage - 1) * PAGE_SIZE;
    return filteredDrivers.slice(start, start + PAGE_SIZE);
  }, [filteredDrivers, driverPage]);

  const totalArchivePages = Math.ceil(archivedDrivers.length / PAGE_SIZE) || 1;
  const paginatedArchivedDrivers = useMemo(() => {
    const start = (archivePage - 1) * PAGE_SIZE;
    return archivedDrivers.slice(start, start + PAGE_SIZE);
  }, [archivedDrivers, archivePage]);

  const totalIncidentPages = Math.ceil(filteredIncidents.length / PAGE_SIZE) || 1;
  const paginatedIncidents = useMemo(() => {
    const start = (incidentPage - 1) * PAGE_SIZE;
    return filteredIncidents.slice(start, start + PAGE_SIZE);
  }, [filteredIncidents, incidentPage]);

  // ----- Add / Edit -----
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Image size exceeds 5MB limit.');
        return;
      }
      setProfilePhotoFile(file);
      setProfilePhotoPreview(URL.createObjectURL(file));
      setFormError('');
      if (formErrors.profile_photo) {
        setFormErrors((prev) => {
          const copy = { ...prev };
          delete copy.profile_photo;
          return copy;
        });
      }
    }
  };

  const openAddModal = () => {
    setEditingDriver(null);
    setForm({
      ...EMPTY_FORM,
    });
    setChangePassword(false);
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
    setLicenseFile(null);
    setMedicalCertFile(null);
    setClearanceFile(null);
    setFormError('');
    setFormErrors({});
    setShowFormModal(true);
  };

  const openEditModal = (driver) => {
    if (isDriverOnActiveDelivery(driver)) {
      setToast({
        type: 'error',
        message: 'Cannot edit driver details while the driver is assigned to or currently on an active delivery.',
      });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setEditingDriver(driver);
    const { first_name, middle_name, last_name } = splitFullName(driver.user?.full_name);
    setForm({
      first_name,
      middle_name,
      last_name,
      birthdate: driver.birthdate || '',
      nationality: driver.nationality || 'Filipino',
      phone: driver.user?.phone || '',
      license_number: driver.license_number || '',
      license_type: driver.license_type || 'Professional',
      agency_code: driver.agency_code || '',
      license_expiry_date: driver.license_expiry_date || '',
      restriction_code: driver.restriction_code || '',
      health_condition: driver.health_condition || 'Fit to Work',
      last_medical_check: driver.last_medical_check || '',
      prescriptions: driver.prescriptions || '',
      existing_conditions: driver.existing_conditions || '',
      date_hired: driver.date_hired || '',
      experience_years: driver.experience_years != null ? driver.experience_years : '',
      hired_by: driver.hired_by || '',
      contract_start: driver.contract_start || '',
      contract_end: driver.contract_end || '',
      clearance_type: driver.clearance_type || 'NBI Clearance',
      clearance_date: driver.clearance_date || '',
      email: driver.user?.email || '',
      password: '',
      confirmPassword: '',
    });
    setChangePassword(false);
    setProfilePhotoFile(null);
    setProfilePhotoPreview(driver.user?.profile_photo_url || '/images/defaultavatar.png');
    setLicenseFile(null);
    setMedicalCertFile(null);
    setClearanceFile(null);
    setFormError('');
    setFormErrors({});
    setShowFormModal(true);
  };

  const saveDriver = async () => {
    const errs = {};
    const todayIso = getTodayIso();

    // 1. Personal Information
    if (!form.first_name?.trim()) errs.first_name = 'First name is required.';
    if (!form.last_name?.trim()) errs.last_name = 'Last name is required.';
    if (!form.birthdate) {
      errs.birthdate = 'Birthdate is required.';
    } else if (form.birthdate > todayIso) {
      errs.birthdate = 'Birthdate cannot be in the future.';
    }
    if (!form.nationality?.trim()) errs.nationality = 'Nationality is required.';
    if (!form.phone?.trim()) {
      errs.phone = 'Contact number is required.';
    } else if (!validatePhoneNumber(form.phone)) {
      errs.phone = 'Contact number must start with "09" and be exactly 11 digits.';
    }

    // 2. License Information
    if (!form.license_number?.trim()) {
      errs.license_number = 'License number is required.';
    } else if (!validateLicenseNumber(form.license_number)) {
      errs.license_number = 'Must be 3–15 alphanumeric characters (hyphens allowed).';
    }
    if (!form.license_type) errs.license_type = 'License type is required.';
    if (parseDlCodes(form.restriction_code).length === 0) {
      errs.restriction_code = 'Please select at least one valid LTO DL code.';
    }
    if (!form.agency_code?.trim()) {
      errs.agency_code = 'Agency code is required.';
    }
    if (!form.license_expiry_date) {
      errs.license_expiry_date = 'License expiry date is required.';
    } else if (!isStrictlyFutureDate(form.license_expiry_date)) {
      errs.license_expiry_date = 'License expiry date must be strictly after today (tomorrow onward).';
    }

    // 3. Health Information
    if (!form.health_condition) errs.health_condition = 'Health condition is required.';
    if (!form.last_medical_check) {
      errs.last_medical_check = 'Last medical check date is required.';
    } else if (form.last_medical_check > todayIso) {
      errs.last_medical_check = 'Medical check date cannot be in the future.';
    }
    if (!form.prescriptions?.trim()) errs.prescriptions = 'Prescriptions info is required (or "None").';
    if (!form.existing_conditions?.trim()) errs.existing_conditions = 'Existing conditions info is required (or "None").';

    // 4. Employment & Contract Information
    if (!form.date_hired) {
      errs.date_hired = 'Date hired is required.';
    } else if (form.date_hired > todayIso) {
      errs.date_hired = 'Date hired cannot be in the future.';
    }
    if (form.experience_years === '' || form.experience_years === null || form.experience_years === undefined) {
      errs.experience_years = 'Years of experience is required.';
    } else if (!validatePositiveNumber(form.experience_years)) {
      errs.experience_years = 'Years of experience cannot be negative.';
    }
    if (!form.hired_by?.trim()) errs.hired_by = 'Please select who hired this driver.';
    if (!form.contract_start) errs.contract_start = 'Contract start date is required.';
    if (!form.contract_end) {
      errs.contract_end = 'Contract end date is required.';
    } else if (!isStrictlyFutureDate(form.contract_end)) {
      errs.contract_end = 'Contract end date must be strictly after today (tomorrow onward).';
    } else if (form.contract_start && !validateDateSequence(form.contract_start, form.contract_end)) {
      errs.contract_end = 'Contract end date must be on or after start date.';
    }

    // 5. Driver Documents
    if (!editingDriver?.license_file_url && !licenseFile) {
      errs.license_file = "Driver's license copy file is required.";
    }
    if (!editingDriver?.medical_certificate_file_url && !medicalCertFile) {
      errs.medical_cert_file = 'Medical certificate file is required.';
    }
    if (!form.clearance_type) errs.clearance_type = 'Clearance type is required.';
    if (!form.clearance_date) {
      errs.clearance_date = 'Clearance date is required.';
    } else if (form.clearance_date > todayIso) {
      errs.clearance_date = 'Clearance date cannot be in the future.';
    }
    if (!editingDriver?.clearance_file_url && !clearanceFile) {
      errs.clearance_file = 'Security clearance file is required.';
    }

    // 6. Account Information
    if (!form.email?.trim()) {
      errs.email = 'Email address is required.';
    } else if (!validateEmail(form.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (editingDriver && changePassword) {
      if (!form.password) {
        errs.password = 'New password is required.';
      } else if (form.password.length < 6) {
        errs.password = 'Password must be at least 6 characters.';
      }
      if (!form.confirmPassword) {
        errs.confirmPassword = 'Confirm password is required.';
      } else if (form.password !== form.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match.';
      }
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      const count = Object.keys(errs).length;
      setFormError(`Please complete all ${count} required fields highlighted in red before saving.`);
      return;
    }

    setSaving(true);
    setFormError('');
    setFormErrors({});
    try {
      const full_name = [form.first_name?.trim(), form.middle_name?.trim(), form.last_name?.trim()].filter(Boolean).join(' ');
      const formData = new FormData();
      formData.append('full_name', full_name);
      formData.append('email', form.email);
      formData.append('phone', form.phone);
      if (form.birthdate) formData.append('birthdate', form.birthdate);
      if (form.nationality) formData.append('nationality', form.nationality);
      if (form.license_number) formData.append('license_number', form.license_number);
      if (form.license_type) formData.append('license_type', form.license_type);
      if (form.agency_code) formData.append('agency_code', form.agency_code.trim().toUpperCase());
      if (form.license_expiry_date) formData.append('license_expiry_date', form.license_expiry_date);
      if (form.restriction_code) formData.append('restriction_code', form.restriction_code);
      if (form.health_condition) formData.append('health_condition', form.health_condition);
      if (form.last_medical_check) formData.append('last_medical_check', form.last_medical_check);
      if (form.prescriptions) formData.append('prescriptions', form.prescriptions);
      if (form.existing_conditions) formData.append('existing_conditions', form.existing_conditions);
      if (form.date_hired) formData.append('date_hired', form.date_hired);
      if (form.experience_years !== '' && form.experience_years != null) formData.append('experience_years', form.experience_years);
      if (form.hired_by) formData.append('hired_by', form.hired_by);
      if (form.contract_start) formData.append('contract_start', form.contract_start);
      if (form.contract_end) formData.append('contract_end', form.contract_end);
      if (form.clearance_type) formData.append('clearance_type', form.clearance_type);
      if (form.clearance_date) formData.append('clearance_date', form.clearance_date);
      if (editingDriver && changePassword && form.password) formData.append('password', form.password);

      if (profilePhotoFile) {
        formData.append('profile_photo', profilePhotoFile);
      }
      if (licenseFile) {
        formData.append('license_file', licenseFile);
      }
      if (medicalCertFile) {
        formData.append('medical_certificate_file', medicalCertFile);
      }
      if (clearanceFile) {
        formData.append('clearance_file', clearanceFile);
      }

      if (editingDriver && form.email && form.email !== editingDriver.user?.email) {
        formData.append('resend_credentials', '1');
      }

      if (editingDriver) {
        await api.post(`/drivers/${editingDriver.driver_id}?_method=PUT`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/drivers', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setShowFormModal(false);
      await loadData();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      if (errors) {
        const backendErrs = {};
        Object.entries(errors).forEach(([field, msgs]) => {
          backendErrs[field] = Array.isArray(msgs) ? msgs[0] : msgs;
        });
        setFormErrors(backendErrs);
        setFormError(Object.values(backendErrs)[0] || 'Validation failed.');
      } else {
        setFormError(message || 'Could not save driver.');
      }
      console.error('Save driver failed:', err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (driver) => {
    setDetailsDriver(driver);
    setDriverDeliveryFilter('all');
    setDriverDeliveryPage(1);
    setShowDetailsModal(true);
    try {
      const res = await api.get(`/drivers/${driver.driver_id}`);
      if (res.data) {
        setDetailsDriver(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch detailed driver data:', err);
    }
  };

  const [resendingEmail, setResendingEmail] = useState(false);

  const handleResendCredentials = async (driver) => {
    const email = driver?.user?.email;
    if (!email) {
      alert('Driver does not have an email address configured.');
      return;
    }
    if (!window.confirm(`Resend initial login credentials and temporary password to ${email}?`)) {
      return;
    }
    setResendingEmail(true);
    try {
      const res = await api.post(`/drivers/${driver.driver_id}/resend-credentials`);
      setToast({ message: res.data?.message || `Credentials sent to ${email}!` });
      setTimeout(() => setToast(null), 5000);
      await loadData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send credentials email.';
      setToast({ message: msg, type: 'error' });
      setTimeout(() => setToast(null), 6000);
    } finally {
      setResendingEmail(false);
    }
  };

  const openArchiveModal = (driver) => {
    if (isDriverOnActiveDelivery(driver)) {
      setToast({
        message: 'Cannot archive a driver while they are assigned to or currently on an active delivery.',
      });
      setTimeout(() => setToast(null), 5000);
      return;
    }
    setArchivingDriver(driver);
    setShowArchiveModal(true);
  };

  const confirmArchive = async () => {
    if (!archivingDriver) return;
    try {
      await api.put(`/drivers/${archivingDriver.driver_id}`, { status: 'inactive' });
      setShowArchiveModal(false);
      await loadData();
      setToast({ message: `${archivingDriver.user?.full_name} archived.`, undoDriverId: archivingDriver.driver_id });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setShowArchiveModal(false);
      const msg = err.response?.data?.message || 'Could not archive driver.';
      setToast({ message: msg });
      setTimeout(() => setToast(null), 5000);
    }
  };

  const returnDriver = async (driver) => {
    try {
      await api.put(`/drivers/${driver.driver_id}`, { status: 'active' });
      await loadData();
    } catch (err) {
      console.error('Failed to restore driver:', err);
    }
  };

  const undoArchive = async () => {
    if (!toast?.undoDriverId) return;
    try {
      await api.put(`/drivers/${toast.undoDriverId}`, { status: 'active' });
      await loadData();
    } finally {
      setToast(null);
    }
  };

  return (
    <>
      <div className="dashboard-container">
        <Sidebar activePage="drivers" />

        <div className="main-content">
          <header className="header">
            <div className="page-info">
              <span className="breadcrumb">Page/Drivers</span>
              <h1 className="page-title">DRIVER MANAGEMENT</h1>
            </div>
            <div className="header-actions">
              <div className="date-picker">
                <span>{currentDate}</span>
                <i className="far fa-calendar-alt"></i>
              </div>
              <NotificationBell />
            </div>
          </header>

          {loadError && (
            <div className="form-error" style={{ margin: '16px 0', color: '#d32f2f' }}>
              {loadError}
            </div>
          )}

          {/* KPI Cards Row (Figma Design) */}
          <div className="driver-stats">
            <div
              className={`stat-card${activeStatusFilter === 'available' ? ' active active-available' : ''}`}
              onClick={() => handleKpiClick('available')}
              title="Click to filter Available drivers"
            >
              <div className="stat-badge green">{kpiCounts.available}</div>
              <span className="stat-label">Available</span>
            </div>

            <div
              className={`stat-card${activeStatusFilter === 'busy' ? ' active active-busy' : ''}`}
              onClick={() => handleKpiClick('busy')}
              title="Click to filter On Delivery drivers"
            >
              <div className="stat-badge blue">{kpiCounts.onDelivery}</div>
              <span className="stat-label">On Delivery</span>
            </div>

            <div
              className={`stat-card${activeStatusFilter === 'inactive' ? ' active active-inactive' : ''}`}
              onClick={() => handleKpiClick('inactive')}
              title="Click to filter Inactive drivers"
            >
              <div className="stat-badge red">{kpiCounts.inactive}</div>
              <span className="stat-label">Inactive</span>
            </div>

            <div
              className={`stat-card${view === 'incidents' ? ' active active-incidents' : ''}`}
              onClick={() => handleKpiClick('incidents')}
              title="Click to view Incidents Reported"
            >
              <div className="stat-badge orange">{kpiCounts.incidents}</div>
              <span className="stat-label">Incidents Reported</span>
            </div>
          </div>

          {/* ---------------- Drivers list ---------------- */}
          {view === 'drivers' && (
            <div className="content-section">
              <div className="drivers-toolbar">
                <div className="toolbar-left">
                  <div className="search-bar">
                    <i className="fas fa-search"></i>
                    <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="sort-wrapper">
                    <span className="sort-label">Sort by</span>
                    <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="name_asc">A – Z (Driver Name)</option>
                      <option value="name_desc">Z – A (Driver Name)</option>
                      <option value="id_asc">ID (DR001 →)</option>
                      <option value="id_desc">ID (DR999 →)</option>
                      <option value="status_hierarchy">Status (Available → On Delivery → Inactive)</option>
                      <option value="contract_soonest">Contract (Expiring Soonest)</option>
                      <option value="contract_longest">Contract (Longest Remaining)</option>
                    </select>
                  </div>
                </div>
                <div className="toolbar-right">
                  <button
                    className="btn-incidents"
                    style={{ background: '#0f766e' }}
                    onClick={() => setView('leaves')}
                  >
                    <i className="fas fa-calendar-times" style={{ marginRight: 5 }}></i>
                    Leave Requests{pendingLeaveCount > 0 ? ` (${pendingLeaveCount})` : ''}
                  </button>
                  <button className="btn-incidents" onClick={() => setView('incidents')}>Incidents</button>
                  <button className="btn-archives" onClick={() => { setView('archives'); setActiveStatusFilter('resigned'); }}>Archives</button>
                  <button className="btn-add-driver" onClick={openAddModal}><i className="fas fa-plus"></i> Add Driver</button>
                </div>
              </div>
              <div className="section-content">
                <table className="data-table drivers-table">
                  <thead>
                    <tr>
                      <th>Driver ID</th>
                      <th>Driver Name</th>
                      <th>Status</th>
                      <th>Contract Status</th>
                      <th>Contact Num</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={5} columns={6} hasAvatar={true} />
                    ) : paginatedDrivers.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>No drivers found.</td></tr>
                    ) : (
                      paginatedDrivers.map((driver) => {
                        const lockedOnDelivery = isDriverOnActiveDelivery(driver);
                        return (
                        <tr key={driver.driver_id} className="driver-row" onClick={() => openDetails(driver)}>
                          <td className="driver-id">{driverCode(driver.driver_id)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <img
                                src={driver.user?.profile_photo_url || '/images/defaultavatar.png'}
                                alt={driver.user?.full_name || 'Driver'}
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1.5px solid #e2e8f0',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                }}
                                onError={(e) => { e.currentTarget.src = '/images/defaultavatar.png'; }}
                              />
                              <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{driver.user?.full_name || '—'}</span>
                            </div>
                          </td>
                          <td>
                            {(() => {
                              const lbl = availabilityLabel(driver);
                              const customBadgeStyle =
                                lbl === 'On Leave'
                                  ? { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }
                                  : lbl === 'Pending Leave'
                                  ? { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }
                                  : lbl === 'Off Duty'
                                  ? { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }
                                  : undefined;
                              return (
                                <span className={`driver-status ${availabilityClass(driver)}`} style={customBadgeStyle}>
                                  <i className="fas fa-circle"></i> {lbl}
                                </span>
                              );
                            })()}
                          </td>
                          <td>{driver.contract_end ? `Valid until ${formatDate(driver.contract_end)}` : 'Not set'}</td>
                          <td>{driver.user?.phone || '—'}</td>
                          <td className="action-cell">
                            <div className="driver-action-buttons">
                              {!lockedOnDelivery && !['on_leave', 'pending_leave', 'offline'].includes(driver.availability_status) && (
                                <button
                                  type="button"
                                  disabled={togglingDutyId === driver.driver_id}
                                  title={
                                    driver.availability_status === 'available'
                                      ? 'Clock driver Off Duty (hides from Dispatch)'
                                      : 'Set driver On Duty (ready for Dispatch)'
                                  }
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: 'none',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: driver.availability_status === 'available' ? '#64748b' : '#16a34a',
                                    color: '#fff',
                                    whiteSpace: 'nowrap',
                                  }}
                                  onClick={(e) =>
                                    handleToggleDuty(
                                      driver,
                                      driver.availability_status === 'available' ? 'off_duty' : 'available',
                                      e
                                    )
                                  }
                                >
                                  {driver.availability_status === 'available' ? 'Set Off Duty' : 'Set On Duty'}
                                </button>
                              )}
                              <button
                                className="btn-edit-info"
                                disabled={lockedOnDelivery}
                                title={lockedOnDelivery ? 'Cannot edit while assigned to or on an active delivery' : 'Edit driver details'}
                                style={lockedOnDelivery ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                                onClick={(e) => { e.stopPropagation(); openEditModal(driver); }}
                              >
                                <i className={lockedOnDelivery ? 'fas fa-lock' : 'fas fa-pen-to-square'}></i> Edit
                              </button>
                              <button
                                className="btn-archive"
                                disabled={lockedOnDelivery}
                                title={lockedOnDelivery ? 'Cannot archive while assigned to or on an active delivery' : 'Archive driver'}
                                style={lockedOnDelivery ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                                onClick={(e) => { e.stopPropagation(); openArchiveModal(driver); }}
                              >
                                <i className={lockedOnDelivery ? 'fas fa-lock' : 'fas fa-box-archive'}></i> Archive
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <Pagination
                  currentPage={driverPage}
                  totalPages={totalDriverPages}
                  totalItems={filteredDrivers.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setDriverPage}
                  showAlways={true}
                />
              </div>
            </div>
          )}

          {/* ---------------- Archives ---------------- */}
          {view === 'archives' && (
            <div className="content-section" id="archivesSection">
              <div className="drivers-toolbar">
                <h3 className="section-title">Archived Drivers</h3>
                <button className="btn-return" onClick={() => { setView('drivers'); setActiveStatusFilter('all'); }}><span>Return</span><i className="fa fa-reply"></i></button>
              </div>
              <div className="section-content">
                <table className="data-table drivers-table">
                  <thead><tr><th>Driver</th><th>Driver ID</th><th>Contact</th><th>Action</th></tr></thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={4} columns={4} hasAvatar={true} />
                    ) : paginatedArchivedDrivers.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24 }}>No archived drivers.</td></tr>
                    ) : (
                      paginatedArchivedDrivers.map((driver) => (
                        <tr key={driver.driver_id} className="driver-row">
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <img
                                src={driver.user?.profile_photo_url || '/images/defaultavatar.png'}
                                alt=""
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1.5px solid #e2e8f0',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                }}
                                onError={(e) => { e.currentTarget.src = '/images/defaultavatar.png'; }}
                              />
                              <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{driver.user?.full_name || '—'}</span>
                            </div>
                          </td>
                          <td>{driverCode(driver.driver_id)}</td>
                          <td>{driver.user?.phone || '—'}</td>
                          <td className="action-cell">
                            <div className="driver-action-buttons">
                              <button className="btn-return-driver" onClick={() => returnDriver(driver)}>
                                <i className="fas fa-rotate-left"></i> Restore
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <Pagination
                  currentPage={archivePage}
                  totalPages={totalArchivePages}
                  totalItems={archivedDrivers.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setArchivePage}
                  showAlways={true}
                />
              </div>
            </div>
          )}

          {/* ---------------- Incidents ---------------- */}
          {view === 'incidents' && (
            <div className="content-section" id="incidentsSection">
              <div className="drivers-toolbar">
                <h3 className="section-title">Incident Reports & Investigation</h3>
                <button className="btn-return" onClick={() => setView('drivers')}>
                  <span>Return</span>
                  <i className="fa fa-reply"></i>
                </button>
              </div>

              <div className="incidents-controls" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '14px 0', alignItems: 'center' }}>
                <div className="search-bar">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Search incident, driver, customer..."
                    value={incidentSearch}
                    onChange={(e) => setIncidentSearch(e.target.value)}
                  />
                </div>

                {/* Pill filters matching user image */}
                <div className="incident-tabs">
                  {['All', 'accident', 'delay', 'damage', 'lost item', 'other'].map((t) => (
                    <button
                      key={t}
                      className={`incident-tab${incidentType === t ? ' active' : ''}`}
                      onClick={() => setIncidentType(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
                  <select
                    className="sort-select"
                    value={incidentDriverFilter}
                    onChange={(e) => setIncidentDriverFilter(e.target.value)}
                  >
                    <option>All Drivers</option>
                    {incidentDriverNames.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="incident-count">Showing {filteredIncidents.length} of {incidents.length} reports.</p>

              <div className="section-content">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Incident #</th>
                      <th>Date &amp; Time Incident Took Place</th>
                      <th>Driver</th>
                      <th>Request / Route</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Location &amp; Details</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={5} columns={8} />
                    ) : paginatedIncidents.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: 28, color: '#6B7280' }}>
                          No incidents match these filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedIncidents.map((inc) => {
                        const req = inc.delivery?.request;
                        const reqId = req?.request_id ? `REQ${String(req.request_id).padStart(4, '0')}` : '—';
                        const incCode = `INC-${String(inc.incident_id).padStart(5, '0')}`;
                        return (
                          <tr key={inc.incident_id}>
                            <td>
                              <span style={{ fontWeight: 700, color: '#DC2626' }}>{incCode}</span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>
                                {formatDateTime(inc.reported_at)}
                              </div>
                            </td>
                            <td>
                              <strong>{inc.delivery?.driver?.user?.full_name || 'Unassigned'}</strong>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontWeight: 600, color: '#1F2937' }}>{reqId}</span>
                                <span style={{ fontSize: 12, color: '#6B7280' }}>{req?.customer?.full_name || '—'}</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#DC2626' }}>
                                {(inc.incident_type || 'Other').replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td>
                              <span className={`cell-badge severity-${inc.severity || 'medium'}`}>
                                {(inc.severity || 'medium').toUpperCase()}
                              </span>
                            </td>
                            <td style={{ maxWidth: 220 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1F2937' }}>
                                {inc.location_address || 'Along route'}
                              </div>
                              <div style={{ fontSize: 11.5, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {inc.description || '—'}
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-print-incident"
                                onClick={() => setSelectedPrintIncident(inc)}
                                title="View Incident Details & Operational Actions"
                              >
                                <i className="fas fa-eye"></i>
                                <span>View Details</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <Pagination
                  currentPage={incidentPage}
                  totalPages={totalIncidentPages}
                  totalItems={filteredIncidents.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setIncidentPage}
                  showAlways={true}
                />
              </div>
            </div>
          )}

          {/* ---------------- Leave Requests ---------------- */}
          {view === 'leaves' && (
            <div className="content-section" id="leavesSection">
              <div className="drivers-toolbar">
                <div className="toolbar-left">
                  <button className="btn-return" onClick={() => setView('drivers')}>
                    <span>Return</span>
                    <i className="fa fa-reply"></i>
                  </button>
                  <h3 style={{ margin: '0 0 0 12px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    Driver Leave &amp; Emergency Absence Requests
                  </h3>
                </div>
                <div className="toolbar-right">
                  <button
                    type="button"
                    className="btn-add-driver"
                    onClick={() => {
                      setLeaveForm({
                        driver_id: activeDrivers[0]?.driver_id ? String(activeDrivers[0].driver_id) : '',
                        leave_type: 'sick_leave',
                        start_date: getTodayIso(),
                        end_date: getTodayIso(),
                        reason: '',
                      });
                      setShowLogLeaveModal(true);
                    }}
                  >
                    <i className="fas fa-plus"></i> Log Driver Leave / Absence
                  </button>
                </div>
              </div>
              <div className="section-content">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Leave Type</th>
                      <th>Dates</th>
                      <th>Reason &amp; Notes</th>
                      <th>Attachment</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverLeaves.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                          No leave or absence requests recorded yet.
                        </td>
                      </tr>
                    ) : (
                      driverLeaves.map((lv) => {
                        const isPending = lv.status === 'pending';
                        const isBusy = processingLeaveId === lv.leave_id;
                        const statusStyles = {
                          pending: { bg: '#fef3c7', color: '#b45309' },
                          approved: { bg: '#dcfce7', color: '#15803d' },
                          rejected: { bg: '#fee2e2', color: '#b91c1c' },
                          cancelled: { bg: '#f1f5f9', color: '#64748b' },
                          completed: { bg: '#e0f2fe', color: '#0369a1' },
                        }[lv.status] || { bg: '#f1f5f9', color: '#475569' };

                        return (
                          <tr key={lv.leave_id}>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>
                              {lv.driver?.user?.full_name || 'Driver'}
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {formatLeaveType(lv.leave_type)}
                            </td>
                            <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                              {formatDate(lv.start_date)}
                              {lv.end_date && lv.end_date !== lv.start_date ? ` – ${formatDate(lv.end_date)}` : ''}
                            </td>
                            <td style={{ maxWidth: 260, fontSize: 13, color: '#334155' }}>
                              {lv.reason}
                              {lv.review_notes && (
                                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                                  Note: {lv.review_notes}
                                </div>
                              )}
                            </td>
                            <td>
                              {lv.attachment_url ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleViewDocFile(
                                      `Leave Attachment (${lv.driver?.user?.full_name || 'Driver'})`,
                                      lv.attachment_url,
                                      lv.driver
                                    )
                                  }
                                  style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: 12.5 }}
                                >
                                  View File
                                </button>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td>
                              <span
                                style={{
                                  padding: '3px 10px',
                                  borderRadius: 999,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  textTransform: 'capitalize',
                                  background: statusStyles.bg,
                                  color: statusStyles.color,
                                }}
                              >
                                {lv.status}
                              </span>
                            </td>
                            <td>
                              {isPending ? (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleApproveLeave(lv)}
                                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleRejectLeave(lv)}
                                    style={{ background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', padding: '5px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: '#64748b' }}>
                                  {lv.reviewer?.full_name ? `By ${lv.reviewer.full_name}` : 'Processed'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Log Leave / Absence Modal */}
      {showLogLeaveModal && (
        <div
          className="modal"
          style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', zIndex: 1250, padding: 16 }}
          onClick={() => setShowLogLeaveModal(false)}
        >
          <div
            className="modal-content"
            style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 12, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: '#b91c1c', color: '#fff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>Log Driver Leave / Emergency Absence</h3>
              <button type="button" onClick={() => setShowLogLeaveModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmitAdminLeave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Driver *</label>
                <select
                  value={leaveForm.driver_id}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, driver_id: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose Driver --</option>
                  {activeDrivers.map((d) => (
                    <option key={d.driver_id} value={d.driver_id}>
                      {d.user?.full_name || driverCode(d.driver_id)} ({availabilityLabel(d)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Leave Type *</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, leave_type: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                >
                  <option value="sick_leave">Sick Leave</option>
                  <option value="emergency_absence">Emergency Absence</option>
                  <option value="day_off">Day Off</option>
                  <option value="vacation">Vacation / Personal</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Start Date *</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, start_date: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>End Date *</label>
                  <input
                    type="date"
                    min={leaveForm.start_date}
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, end_date: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Reason / Details *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Fever / medical emergency reported by driver"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowLogLeaveModal(false)} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={savingLeave} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#b91c1c', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  {savingLeave ? 'Saving...' : 'Save & Approve Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-notification show" style={toast.type === 'error' ? { background: '#991b1b', color: '#fff' } : {}}>
          <div className="toast-content">
            <span className="toast-message">
              <i className={toast.type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'}></i> {toast.message}
            </span>
            {toast.undoDriverId && (
              <button className="btn-undo" onClick={undoArchive}><i className="fa fa-undo"></i> Undo</button>
            )}
          </div>
        </div>
      )}

      {/* Archive confirmation */}
      {showArchiveModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-body" style={{ padding: 24 }}>
              <h3>Archive Driver</h3>
              <p>Are you sure you want to archive <strong>{archivingDriver?.user?.full_name}</strong>?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowArchiveModal(false)}>Cancel</button>
              <button className="btn-save" onClick={confirmArchive}>Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* Driver details modal (Figma Design Redesign) */}
      {showDetailsModal && detailsDriver && (() => {
        const parsedName = splitFullName(detailsDriver.user?.full_name);
        const driverDeliveries = detailsDriver.deliveries || [];

        const ongoingDeliveries = driverDeliveries.filter((d) => classifyDelivery(d).category === 'ongoing');
        const completedDeliveries = driverDeliveries.filter((d) => classifyDelivery(d).category === 'completed');
        const failedDeliveries = driverDeliveries.filter((d) => classifyDelivery(d).category === 'failed');

        const activeOngoingDelivery = ongoingDeliveries[0] || null;

        const filteredDeliveries = driverDeliveries.filter((d) => {
          if (driverDeliveryFilter === 'ongoing') return classifyDelivery(d).category === 'ongoing';
          if (driverDeliveryFilter === 'completed') return classifyDelivery(d).category === 'completed';
          if (driverDeliveryFilter === 'failed') return classifyDelivery(d).category === 'failed';
          return true;
        });

        const DELIVERY_PAGE_SIZE = 5;
        const totalDeliveryPages = Math.max(1, Math.ceil(filteredDeliveries.length / DELIVERY_PAGE_SIZE));
        const safeDeliveryPage = Math.min(driverDeliveryPage, totalDeliveryPages);
        const paginatedDeliveries = filteredDeliveries.slice((safeDeliveryPage - 1) * DELIVERY_PAGE_SIZE, safeDeliveryPage * DELIVERY_PAGE_SIZE);

        const driverIncidents = incidents.filter(
          (inc) =>
            inc.delivery?.driver_id === detailsDriver.driver_id ||
            inc.delivery?.driver?.driver_id === detailsDriver.driver_id ||
            inc.delivery?.driver?.user?.full_name === detailsDriver.user?.full_name
        );
        const overspeedingCount = driverIncidents.filter((i) => (i.incident_type || '').toLowerCase().includes('speed')).length;
        const lateArrivalCount = driverIncidents.filter(
          (i) => (i.incident_type || '').toLowerCase().includes('delay') || (i.incident_type || '').toLowerCase().includes('late')
        ).length;
        const trafficViolationsCount = driverIncidents.filter(
          (i) => (i.incident_type || '').toLowerCase().includes('traffic') || (i.incident_type || '').toLowerCase().includes('violation')
        ).length;
        const accidentsCount = driverIncidents.filter((i) => (i.incident_type || '').toLowerCase().includes('accident')).length;
        const totalOffenses = overspeedingCount + lateArrivalCount + trafficViolationsCount + accidentsCount;

        const statusLabel = availabilityLabel(detailsDriver);
        const statusClass = availabilityClass(detailsDriver);
        const statusDotColor = statusClass === 'on-delivery' ? '#2563eb' : statusClass === 'available' ? '#16a34a' : '#94a3b8';

        return (
          <div className="driver-info-modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="driver-info-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="driver-info-header">
                <h2 className="driver-info-title">DRIVER INFORMATION</h2>
                <button
                  type="button"
                  className="driver-info-close-btn"
                  onClick={() => setShowDetailsModal(false)}
                  aria-label="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="driver-info-body">
                {/* Left Profile Card */}
                <div className="driver-profile-card">
                  <div className="driver-profile-photo-wrapper">
                    <img
                      src={detailsDriver.user?.profile_photo_url || '/images/defaultavatar.png'}
                      alt={detailsDriver.user?.full_name || 'Driver'}
                      className="driver-profile-photo"
                      onError={(e) => {
                        e.currentTarget.src = '/images/defaultavatar.png';
                      }}
                    />
                  </div>

                  <h3 className="driver-profile-name">{detailsDriver.user?.full_name || '—'}</h3>
                  <div className="driver-profile-id">{driverCode(detailsDriver.driver_id)}</div>

                  <div className="driver-profile-rating">
                    <div className="rating-stars">
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                      <i className="fas fa-star"></i>
                    </div>
                    <span className="rating-score">5</span>
                    <span className="rating-reviews">(12 Reviews)</span>
                  </div>

                  <div className="driver-profile-meta-list">
                    <div className="driver-profile-meta-item">
                      <i className="fas fa-phone-alt meta-icon"></i>
                      <div className="driver-profile-meta-content">
                        <span className="meta-label">Contact Number</span>
                        <span className="meta-value">{detailsDriver.user?.phone || '—'}</span>
                      </div>
                    </div>

                    <div className="driver-profile-meta-item">
                      <i className="fas fa-file-contract meta-icon"></i>
                      <div className="driver-profile-meta-content">
                        <span className="meta-label">Contract Info</span>
                        <span className="meta-value">Valid from: {formatDate(detailsDriver.contract_start)}</span>
                        <span className="meta-value">Valid until: {formatDate(detailsDriver.contract_end)}</span>
                      </div>
                    </div>

                    <div className="driver-profile-meta-item">
                      <i className="fas fa-circle meta-icon-dot" style={{ color: statusDotColor }}></i>
                      <div className="driver-profile-meta-content">
                        <span className="meta-label">Status</span>
                        <span className={`meta-status-text ${statusClass}`}>{statusLabel}</span>
                      </div>
                    </div>

                    <div className="driver-profile-meta-item">
                      <i className="far fa-calendar-alt meta-icon"></i>
                      <div className="driver-profile-meta-content">
                        <span className="meta-label">Date Hired</span>
                        <span className="meta-value">{formatDate(detailsDriver.date_hired)}</span>
                      </div>
                    </div>

                    <div className="driver-profile-meta-item">
                      <i className="fas fa-user-tie meta-icon"></i>
                      <div className="driver-profile-meta-content">
                        <span className="meta-label">Hired by</span>
                        <span className="meta-value">{detailsDriver.hired_by || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const detailsLockedOnDelivery = isDriverOnActiveDelivery(detailsDriver);
                    const detailsBlockedLeave = ['on_leave', 'pending_leave', 'offline'].includes(detailsDriver.availability_status);
                    return (
                      <>
                        {!detailsLockedOnDelivery && !detailsBlockedLeave && detailsDriver.status === 'active' && (
                          <button
                            type="button"
                            disabled={togglingDutyId === detailsDriver.driver_id}
                            onClick={(e) =>
                              handleToggleDuty(
                                detailsDriver,
                                detailsDriver.availability_status === 'available' ? 'off_duty' : 'available',
                                e
                              )
                            }
                            style={{
                              width: '100%',
                              marginBottom: 8,
                              padding: '9px 12px',
                              borderRadius: 8,
                              border: 'none',
                              fontWeight: 700,
                              fontSize: 13,
                              cursor: 'pointer',
                              background: detailsDriver.availability_status === 'available' ? '#64748b' : '#16a34a',
                              color: '#fff',
                            }}
                          >
                            {detailsDriver.availability_status === 'available' ? 'Set Driver Off Duty' : 'Set Driver On Duty'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="driver-btn-edit-info"
                          disabled={detailsLockedOnDelivery}
                          title={
                            detailsLockedOnDelivery
                              ? 'Cannot edit driver details while assigned to or on an active delivery'
                              : 'Edit driver information'
                          }
                          style={
                            detailsLockedOnDelivery
                              ? { opacity: 0.5, cursor: 'not-allowed' }
                              : undefined
                          }
                          onClick={() => {
                            if (detailsLockedOnDelivery) return;
                            setShowDetailsModal(false);
                            openEditModal(detailsDriver);
                          }}
                        >
                          <i className={detailsLockedOnDelivery ? 'fas fa-lock' : 'far fa-edit'}></i>{' '}
                          {detailsLockedOnDelivery ? 'Locked (On Delivery)' : 'Edit Information'}
                        </button>
                        {detailsLockedOnDelivery && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 11.5,
                              color: '#b45309',
                              background: '#fffbeb',
                              border: '1px solid #fde68a',
                              borderRadius: 6,
                              padding: '6px 8px',
                              lineHeight: 1.35,
                              textAlign: 'center',
                            }}
                          >
                            <i className="fas fa-info-circle" style={{ marginRight: 5 }}></i>
                            Editing is disabled until the assigned delivery is completed.
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <button
                    type="button"
                    style={{
                      width: '100%',
                      marginTop: 8,
                      padding: '9px 12px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 12.5,
                      cursor: resendingEmail ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handleResendCredentials(detailsDriver)}
                    disabled={resendingEmail}
                    title="Resend welcome email with initial temporary password"
                  >
                    <i className={resendingEmail ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'}></i>
                    {resendingEmail ? 'Sending...' : 'Resend Credentials Email'}
                  </button>
                </div>

                {/* Right Cards Grid */}
                <div className="driver-info-grid-container">
                  <div className="driver-info-grid-row-top">
                    {/* Personal Information */}
                    <div className="driver-info-card">
                      <h4 className="driver-info-card-title">Personal Information</h4>
                      <div className="driver-info-kv-list">
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">First Name</span>
                          <span className="driver-info-kv-val">{parsedName.first_name || '—'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Middle Name</span>
                          <span className="driver-info-kv-val">{parsedName.middle_name || '—'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Last Name</span>
                          <span className="driver-info-kv-val">{parsedName.last_name || '—'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Birthdate</span>
                          <span className="driver-info-kv-val">{formatDate(detailsDriver.birthdate)}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Nationality</span>
                          <span className="driver-info-kv-val">{detailsDriver.nationality || 'Filipino'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Health Information */}
                    <div className="driver-info-card">
                      <h4 className="driver-info-card-title">Health Information</h4>
                      <div className="driver-info-kv-list">
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Health Condition</span>
                          <span className="driver-info-kv-val">{detailsDriver.health_condition || 'Fit to work'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Last Medical Check</span>
                          <span className="driver-info-kv-val">{formatDate(detailsDriver.last_medical_check)}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Prescriptions</span>
                          <span className="driver-info-kv-val">{detailsDriver.prescriptions || 'N/A'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Existing Conditions</span>
                          <span className="driver-info-kv-val">{detailsDriver.existing_conditions || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* License Information */}
                    <div className="driver-info-card">
                      <h4 className="driver-info-card-title">License Information</h4>
                      <div className="driver-info-kv-list">
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">License Number</span>
                          <span className="driver-info-kv-val">{detailsDriver.license_number || '—'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">License Type</span>
                          <span className="driver-info-kv-val">
                            {detailsDriver.license_type
                              ? `${detailsDriver.license_type}${
                                  detailsDriver.license_type.toLowerCase().includes('permit') ||
                                  detailsDriver.license_type.toLowerCase().includes('license')
                                    ? ''
                                    : ' License'
                                }`
                              : 'Drivers License'}
                          </span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">DL Code(s)</span>
                          <span className="driver-info-kv-val">{detailsDriver.restriction_code || 'None'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Agency Code</span>
                          <span className="driver-info-kv-val">{detailsDriver.agency_code || '—'}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Expiry Date</span>
                          <span className="driver-info-kv-val">{formatDate(detailsDriver.license_expiry_date)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="driver-info-grid-row-bottom" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    {/* Driver Performance */}
                    <div className="driver-info-card">
                      <h4 className="driver-info-card-title">Driver Performance</h4>
                      <div className="driver-info-kv-list">
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Completed Trips</span>
                          <span className="driver-info-kv-val" style={{ fontWeight: 700, color: '#16a34a' }}>{completedDeliveries.length}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Ongoing Trip</span>
                          <span className="driver-info-kv-val" style={{ fontWeight: 700, color: ongoingDeliveries.length > 0 ? '#2563eb' : '#64748b' }}>
                            {ongoingDeliveries.length > 0 ? '1 Active' : 'None'}
                          </span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Failed / Accidents</span>
                          <span className="driver-info-kv-val" style={{ fontWeight: 700, color: failedDeliveries.length > 0 ? '#b91c1c' : '#64748b' }}>
                            {failedDeliveries.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* History of Offenses */}
                    <div className="driver-info-card">
                      <h4 className="driver-info-card-title">History of Offenses</h4>
                      <div className="driver-info-kv-list">
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Overspeeding</span>
                          <span className="driver-info-kv-val">{overspeedingCount}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Late Arrival</span>
                          <span className="driver-info-kv-val">{lateArrivalCount}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Traffic Violations</span>
                          <span className="driver-info-kv-val">{trafficViolationsCount}</span>
                        </div>
                        <div className="driver-info-kv-row">
                          <span className="driver-info-kv-key">Accidents Involved</span>
                          <span className="driver-info-kv-val">{accidentsCount}</span>
                        </div>
                      </div>

                      {totalOffenses === 0 ? (
                        <div className="driver-record-badge good-record">Good Driver Record</div>
                      ) : (
                        <div className="driver-record-badge flagged-record">
                          {totalOffenses} Recorded Offense{totalOffenses > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* Documents & Clearances */}
                    <div className="driver-info-card">
                      <h4 className="driver-info-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fas fa-folder-open" style={{ color: '#d32f2f' }}></i> Documents &amp; Clearances
                      </h4>
                      <div className="driver-info-kv-list" style={{ gap: 12 }}>
                        {/* 1. Driver's License Copy */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="driver-info-kv-key">License Copy</span>
                          {detailsDriver.license_file_url ? (
                            <button
                              type="button"
                              onClick={() => handleViewDocFile("Driver's License Copy", detailsDriver.license_file_url, detailsDriver)}
                              style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              View File
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleViewDocFile("Driver's License Copy", null, detailsDriver)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Not Uploaded
                            </button>
                          )}
                        </div>

                        {/* 2. Medical / Fit-to-Work Certificate */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="driver-info-kv-key">Medical Certificate</span>
                          {detailsDriver.medical_certificate_file_url ? (
                            <button
                              type="button"
                              onClick={() => handleViewDocFile('Medical Fit-to-Work Certificate', detailsDriver.medical_certificate_file_url, detailsDriver)}
                              style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              View File
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleViewDocFile('Medical Fit-to-Work Certificate', null, detailsDriver)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Not Uploaded
                            </button>
                          )}
                        </div>

                        {/* 3. NBI / Police Clearance */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="driver-info-kv-key">{detailsDriver.clearance_type || 'NBI Clearance'}</span>
                            {detailsDriver.clearance_date && (
                              <span style={{ fontSize: 11, color: '#64748b' }}>Date: {formatDate(detailsDriver.clearance_date)}</span>
                            )}
                          </div>
                          {detailsDriver.clearance_file_url ? (
                            <button
                              type="button"
                              onClick={() => handleViewDocFile(detailsDriver.clearance_type || 'Security Clearance', detailsDriver.clearance_file_url, detailsDriver)}
                              style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              View File
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleViewDocFile(detailsDriver.clearance_type || 'Security Clearance', null, detailsDriver)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Not Uploaded
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Deliveries & Trip History */}
                  <div className="driver-info-card driver-recent-deliveries-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <h4 className="driver-info-card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-history" style={{ color: '#991b1b' }}></i>
                        Driver Delivery History &amp; Status
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: '#f1f5f9', color: '#475569' }}>
                          {driverDeliveries.length} Total {driverDeliveries.length === 1 ? 'Trip' : 'Trips'}
                        </span>
                        {activeOngoingDelivery && (
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: '#dbeafe', color: '#1d4ed8' }}>
                            ● Active Delivery
                          </span>
                        )}
                        {completedDeliveries.length > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: '#dcfce7', color: '#15803d' }}>
                            {completedDeliveries.length} Completed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active / Ongoing Delivery Spotlight Banner */}
                    {activeOngoingDelivery && (() => {
                      const activeInfo = classifyDelivery(activeOngoingDelivery);
                      return (
                        <div className="driver-active-delivery-banner">
                          <div className="banner-left">
                            {activeInfo.isMoving ? (
                              <div className="live-status-pill">
                                <span className="live-status-dot"></span>
                                IN TRANSIT • MOVING
                              </div>
                            ) : (
                              <div className="live-status-pill" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                                <i className="fas fa-clipboard-check" style={{ marginRight: 4 }}></i>
                                DISPATCHED • AWAITING DEPARTURE
                              </div>
                            )}
                            <div className="banner-code-title">
                              <span className="banner-code">{deliveryCode(activeOngoingDelivery.delivery_id)}</span>
                              <span className="banner-cargo">
                                {activeOngoingDelivery.request?.item_name || activeOngoingDelivery.request?.cargo_type || 'Cargo'}
                              </span>
                              {activeOngoingDelivery.request?.service_type && (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#e0e7ff', color: '#3730a3' }}>
                                  {activeOngoingDelivery.request.service_type}
                                </span>
                              )}
                              {activeOngoingDelivery.request?.customer?.full_name && (
                                <span className="banner-customer">• Client: {activeOngoingDelivery.request.customer.full_name}</span>
                              )}
                            </div>
                            <div className="banner-route">
                              <span title={activeOngoingDelivery.request?.pickup_address}>
                                <i className="fas fa-map-marker-alt" style={{ color: '#16a34a', marginRight: 4 }}></i>
                                {activeOngoingDelivery.request?.pickup_address || 'Origin'}
                              </span>
                              <i className="fas fa-arrow-right" style={{ color: '#94a3b8', fontSize: 11 }}></i>
                              <span title={activeOngoingDelivery.request?.dropoff_address || activeOngoingDelivery.request?.delivery_address}>
                                <i className="fas fa-flag-checkered" style={{ color: '#dc2626', marginRight: 4 }}></i>
                                {activeOngoingDelivery.request?.dropoff_address || activeOngoingDelivery.request?.delivery_address || 'Destination'}
                              </span>
                            </div>
                          </div>
                          <div className="banner-right">
                            <div className="banner-vehicle-info">
                              <i className="fas fa-truck" style={{ color: '#475569' }}></i>
                              <span>
                                {activeOngoingDelivery.vehicle
                                  ? `${activeOngoingDelivery.vehicle.model} (${activeOngoingDelivery.vehicle.plate_number})`
                                  : 'Assigned Vehicle'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Filter Tabs */}
                    <div className="driver-deliveries-tabs">
                      <button
                        type="button"
                        className={`driver-tab-btn ${driverDeliveryFilter === 'all' ? 'active' : ''}`}
                        onClick={() => {
                          setDriverDeliveryFilter('all');
                          setDriverDeliveryPage(1);
                        }}
                      >
                        All Trips <span className="tab-pill">{driverDeliveries.length}</span>
                      </button>
                      <button
                        type="button"
                        className={`driver-tab-btn ${driverDeliveryFilter === 'ongoing' ? 'active ongoing' : ''}`}
                        onClick={() => {
                          setDriverDeliveryFilter('ongoing');
                          setDriverDeliveryPage(1);
                        }}
                      >
                        <span className="tab-dot ongoing"></span> Ongoing <span className="tab-pill">{ongoingDeliveries.length}</span>
                      </button>
                      <button
                        type="button"
                        className={`driver-tab-btn ${driverDeliveryFilter === 'completed' ? 'active completed' : ''}`}
                        onClick={() => {
                          setDriverDeliveryFilter('completed');
                          setDriverDeliveryPage(1);
                        }}
                      >
                        <span className="tab-dot completed"></span> Completed <span className="tab-pill">{completedDeliveries.length}</span>
                      </button>
                      <button
                        type="button"
                        className={`driver-tab-btn ${driverDeliveryFilter === 'failed' ? 'active failed' : ''}`}
                        onClick={() => {
                          setDriverDeliveryFilter('failed');
                          setDriverDeliveryPage(1);
                        }}
                      >
                        <span className="tab-dot failed"></span> Failed / Accidents <span className="tab-pill">{failedDeliveries.length}</span>
                      </button>
                    </div>

                    {filteredDeliveries.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                        <i className="fas fa-truck" style={{ fontSize: 26, color: '#94a3b8', marginBottom: 8, display: 'block' }}></i>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                          {driverDeliveries.length === 0
                            ? 'No deliveries recorded for this driver yet.'
                            : `No ${driverDeliveryFilter.replace('_', ' ')} deliveries found for this driver.`}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="driver-deliveries-table-container">
                          <table className="driver-deliveries-table">
                            <thead>
                              <tr>
                                <th>Code</th>
                                <th>Service &amp; Cargo</th>
                                <th>Route</th>
                                <th>Vehicle</th>
                                <th>Date</th>
                                <th style={{ textAlign: 'center' }}>Status / Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedDeliveries.map((del) => {
                                const info = classifyDelivery(del);
                                const req = del.request || {};
                                const cargo = req.item_name || req.cargo_type || 'General Cargo';
                                const serviceType = req.service_type || 'Standard Delivery';
                                const pickup = req.pickup_address || del.pickup || '—';
                                const dropoff = req.dropoff_address || req.delivery_address || del.dropoff || '—';
                                const dateStr = formatDate(del.delivered_at || del.end_time || del.trip_date || del.created_at);

                                return (
                                  <tr key={del.delivery_id}>
                                    <td style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                                      {deliveryCode(del.delivery_id)}
                                    </td>
                                    <td>
                                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{cargo}</div>
                                      <div style={{ fontSize: 11, color: '#64748b' }}>
                                        {serviceType}
                                        {req.customer?.full_name ? ` • ${req.customer.full_name}` : ''}
                                      </div>
                                    </td>
                                    <td style={{ maxWidth: 220 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                        <span style={{ color: '#16a34a', fontWeight: 'bold' }}>●</span>
                                        <span style={{ color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }} title={pickup}>
                                          {pickup}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 2 }}>
                                        <span style={{ color: '#dc2626', fontWeight: 'bold' }}>●</span>
                                        <span style={{ color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }} title={dropoff}>
                                          {dropoff}
                                        </span>
                                      </div>
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                                      {del.vehicle ? (
                                        <div>
                                          <div style={{ fontWeight: 600 }}>{del.vehicle.model || 'Vehicle'}</div>
                                          <div style={{ fontSize: 11, color: '#64748b' }}>{del.vehicle.plate_number}</div>
                                        </div>
                                      ) : (
                                        <span style={{ color: '#94a3b8' }}>Unassigned</span>
                                      )}
                                    </td>
                                    <td style={{ whiteSpace: 'nowrap', color: '#64748b', fontSize: 12 }}>
                                      {dateStr}
                                    </td>
                                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '3px 9px',
                                            borderRadius: 12,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            background: info.bg,
                                            color: info.color,
                                            border: `1px solid ${info.border}`,
                                          }}
                                        >
                                          <i className={`fas ${info.icon}`} style={{ fontSize: 10 }}></i>
                                          {info.badge}
                                        </span>

                                        {/* Failure reason if failed */}
                                        {info.category === 'failed' && info.reason && (
                                          <span
                                            style={{
                                              fontSize: 10.5,
                                              color: info.color,
                                              fontWeight: 500,
                                              maxWidth: 170,
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                            }}
                                            title={info.reason}
                                          >
                                            {info.reason}
                                          </span>
                                        )}

                                        {/* Incident report button if accident/failure has incident */}
                                        {info.incident && (
                                          <button
                                            type="button"
                                            className="btn-incident-link"
                                            onClick={() => setSelectedPrintIncident(info.incident)}
                                            title="View & Print Official Incident Report"
                                          >
                                            <i className="fas fa-file-invoice"></i> Incident Report
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {filteredDeliveries.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <Pagination
                              currentPage={safeDeliveryPage}
                              totalPages={totalDeliveryPages}
                              totalItems={filteredDeliveries.length}
                              pageSize={DELIVERY_PAGE_SIZE}
                              onPageChange={setDriverDeliveryPage}
                              showAlways={true}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add / Edit driver modal */}
      {showFormModal && (
        <div
          className="modal driver-form-modal"
          style={{
            display: 'flex',
            position: 'fixed',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            className="modal-content driver-form-content hide-scrollbar"
            style={{
              width: '100%',
              maxWidth: 1040,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              borderRadius: 16,
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header driver-form-header"
              style={{
                background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%)',
                color: '#fff',
                padding: '18px 26px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}
                >
                  <i className="fas fa-id-card"></i>
                </div>
                <div>
                  <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '0.3px' }}>
                    {editingDriver ? 'EDIT DRIVER PROFILE' : 'ADD NEW DRIVER'}
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 400 }}>
                    All fields are required. Please complete personal, license, medical, contract, and account details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowFormModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                aria-label="Close modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body driver-form-body hide-scrollbar" style={{ padding: '24px 28px', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', background: '#f8fafc', flex: 1 }}>
              {/* SweetAlert-style Pop-up Toast */}
              {formError && (
                <div className="sweet-alert-popup" role="alert" style={{ zIndex: 100001 }}>
                  <div className="sweet-alert-icon">
                    <i className="fas fa-exclamation"></i>
                  </div>
                  <div className="sweet-alert-body">
                    <h4 className="sweet-alert-title">{getFormAlertTitle(formError)}</h4>
                    <p className="sweet-alert-desc">{formError}</p>
                  </div>
                  <button
                    type="button"
                    className="sweet-alert-close"
                    onClick={() => setFormError('')}
                    aria-label="Dismiss alert"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}

              <form className="edit-form" onSubmit={(e) => e.preventDefault()}>
                {/* Section 1: Personal & Contact Information */}
                <div className="driver-section-card">
                  <div className="driver-section-header">
                    <div className="driver-section-icon-badge">
                      <i className="fas fa-user"></i>
                    </div>
                    <div>
                      <h4 className="driver-section-title-text">Personal &amp; Contact Information</h4>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Driver identity, contact details, and identification photograph</span>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    style={{ display: 'none' }}
                    onChange={handlePhotoSelect}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 20, alignItems: 'stretch' }}>
                    {/* Left Column: Profile Picture Uploader */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label className="driver-field-label">
                        Profile Photo <span style={{ fontWeight: 400, color: '#64748b', fontSize: 11 }}>(Optional)</span>
                      </label>
                      <div
                        className={`driver-photo-box ${formErrors.profile_photo ? 'input-error' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ flex: 1, minHeight: 180, padding: 14 }}
                        title="Click to select driver photo (optional)"
                      >
                        {profilePhotoPreview ? (
                          <div style={{ position: 'relative' }}>
                            <img
                              src={profilePhotoPreview}
                              alt="Preview"
                              style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                              onError={(e) => { e.currentTarget.src = '/images/defaultavatar.png'; }}
                            />
                            <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#2563eb', fontWeight: 600 }}>
                              <i className="fas fa-sync-alt" style={{ marginRight: 4 }}></i> Change photo
                            </p>
                          </div>
                        ) : (
                          <>
                            <img
                              src="/images/defaultavatar.png"
                              alt="Default Avatar"
                              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0', marginBottom: 8 }}
                            />
                            <p style={{ margin: '0 0 2px', fontWeight: 700, color: '#1e293b', fontSize: 12.5 }}>Upload Photo</p>
                            <p style={{ fontSize: 10.5, margin: 0, color: '#64748b', textAlign: 'center' }}>Default avatar used if skipped</p>
                          </>
                        )}
                      </div>
                      {formErrors.profile_photo && (
                        <div className="driver-error-feedback" style={{ marginTop: 6, justifyContent: 'center' }}>
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.profile_photo}</span>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Personal & Contact Fields */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Row 1: First Name, Middle Name, Last Name */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                        <div className="form-group" style={{ position: 'relative' }}>
                          <label className="driver-field-label">
                            First Name <span className="req-star">*</span>
                          </label>
                          <input
                            type="text"
                            className={`driver-form-input ${formErrors.first_name ? 'input-error' : ''}`}
                            placeholder="e.g. Juan"
                            value={form.first_name}
                            onChange={(e) => handleFieldChange('first_name', formatNameInput(e.target.value))}
                          />
                          {formErrors.first_name && (
                            <div className="driver-error-feedback">
                              <i className="fas fa-circle-exclamation"></i>
                              <span>{formErrors.first_name}</span>
                            </div>
                          )}
                        </div>

                        <div className="form-group" style={{ position: 'relative' }}>
                          <label className="driver-field-label">
                            Middle Name <span style={{ fontWeight: 400, color: '#64748b', fontSize: 11 }}>(Optional)</span>
                          </label>
                          <input
                            type="text"
                            className={`driver-form-input ${formErrors.middle_name ? 'input-error' : ''}`}
                            placeholder="e.g. Santos (optional)"
                            value={form.middle_name}
                            onChange={(e) => handleFieldChange('middle_name', formatNameInput(e.target.value))}
                          />
                          {formErrors.middle_name && (
                            <div className="driver-error-feedback">
                              <i className="fas fa-circle-exclamation"></i>
                              <span>{formErrors.middle_name}</span>
                            </div>
                          )}
                        </div>

                        <div className="form-group" style={{ position: 'relative' }}>
                          <label className="driver-field-label">
                            Last Name <span className="req-star">*</span>
                          </label>
                          <input
                            type="text"
                            className={`driver-form-input ${formErrors.last_name ? 'input-error' : ''}`}
                            placeholder="e.g. Dela Cruz"
                            value={form.last_name}
                            onChange={(e) => handleFieldChange('last_name', formatNameInput(e.target.value))}
                          />
                          {formErrors.last_name && (
                            <div className="driver-error-feedback">
                              <i className="fas fa-circle-exclamation"></i>
                              <span>{formErrors.last_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Birthdate & Nationality */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="form-group" style={{ position: 'relative' }}>
                          <label className="driver-field-label">
                            Birthdate <span className="req-star">*</span>
                          </label>
                          <input
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            className={`driver-form-input ${formErrors.birthdate ? 'input-error' : ''}`}
                            value={form.birthdate || ''}
                            onChange={(e) => handleFieldChange('birthdate', e.target.value)}
                          />
                          {formErrors.birthdate && (
                            <div className="driver-error-feedback">
                              <i className="fas fa-circle-exclamation"></i>
                              <span>{formErrors.birthdate}</span>
                            </div>
                          )}
                        </div>

                        <div className="form-group" style={{ position: 'relative' }}>
                          <label className="driver-field-label">
                            Nationality <span className="req-star">*</span>
                          </label>
                          <input
                            type="text"
                            className={`driver-form-input ${formErrors.nationality ? 'input-error' : ''}`}
                            placeholder="e.g. Filipino"
                            value={form.nationality || ''}
                            onChange={(e) => handleFieldChange('nationality', e.target.value)}
                          />
                          {formErrors.nationality && (
                            <div className="driver-error-feedback">
                              <i className="fas fa-circle-exclamation"></i>
                              <span>{formErrors.nationality}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Row 3: Contact Number & Email Address */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 14 }}>
                        <div className="form-group" style={{ position: 'relative' }}>
                          <label className="driver-field-label">
                            Contact Number <span className="req-star">*</span>
                          </label>
                          <input
                            type="text"
                            maxLength={11}
                            className={`driver-form-input ${formErrors.phone ? 'input-error' : ''}`}
                            placeholder="09XXXXXXXXX"
                            value={form.phone}
                            onChange={(e) => handleFieldChange('phone', formatPhoneInput(e.target.value))}
                          />
                          {formErrors.phone && (
                            <div className="driver-error-feedback">
                              <i className="fas fa-circle-exclamation"></i>
                              <span>{formErrors.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="form-group" style={{ position: 'relative' }}>
                          <label className="driver-field-label">
                            Email Address <span className="req-star">*</span>
                          </label>
                          <input
                            type="email"
                            className={`driver-form-input ${formErrors.email ? 'input-error' : ''}`}
                            placeholder="driver@hjytransport.com"
                            value={form.email}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                          />
                          {editingDriver && form.email && form.email !== editingDriver.user?.email && (
                            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-check-circle"></i> A new temporary password will be emailed to this corrected address upon saving.
                            </p>
                          )}
                          {formErrors.email && (
                            <div className="driver-error-feedback">
                              <i className="fas fa-circle-exclamation"></i>
                              <span>{formErrors.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Driver's License Details */}
                <div className="driver-section-card">
                  <div className="driver-section-header">
                    <div className="driver-section-icon-badge">
                      <i className="fas fa-id-card"></i>
                    </div>
                    <div>
                      <h4 className="driver-section-title-text">Driver's License Details</h4>
                      <span style={{ fontSize: 12, color: '#64748b' }}>LTO License credentials, validity, and DL codes</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label">
                        License Number <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        className={`driver-form-input ${formErrors.license_number ? 'input-error' : ''}`}
                        placeholder="e.g. D01-23-456789"
                        value={form.license_number}
                        onChange={(e) => handleFieldChange('license_number', formatLicenseInput(e.target.value))}
                      />
                      {formErrors.license_number && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.license_number}</span>
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label">
                        License Type <span className="req-star">*</span>
                      </label>
                      <select
                        className={`driver-form-select ${formErrors.license_type ? 'input-error' : ''}`}
                        value={form.license_type}
                        onChange={(e) => handleFieldChange('license_type', e.target.value)}
                      >
                        <option value="Professional">Professional (Prof)</option>
                        <option value="Non-Professional">Non-Professional (Non-Prof)</option>
                        <option value="Student Permit">Student Permit</option>
                      </select>
                      {formErrors.license_type && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.license_type}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ position: 'relative', marginTop: 14 }}>
                    <label className="driver-field-label" style={{ justifyContent: 'space-between' }}>
                      <span>LTO DL Code(s) <span className="req-star">*</span></span>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                        Select all authorized vehicle classes on license
                      </span>
                    </label>
                    {(() => {
                      const selectedCodes = parseDlCodes(form.restriction_code);
                      const toggleDlCode = (code) => {
                        const next = selectedCodes.includes(code)
                          ? selectedCodes.filter((c) => c !== code)
                          : [...selectedCodes, code];
                        const ordered = LTO_DL_CODES.map((c) => c.code).filter((c) => next.includes(c));
                        handleFieldChange('restriction_code', ordered.join(', '));
                      };
                      return (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: formErrors.restriction_code ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                            background: formErrors.restriction_code ? '#fef2f2' : '#f8fafc',
                          }}
                        >
                          {LTO_DL_CODES.map((dl) => {
                            const active = selectedCodes.includes(dl.code);
                            return (
                              <button
                                key={dl.code}
                                type="button"
                                title={dl.label}
                                onClick={() => toggleDlCode(dl.code)}
                                style={{
                                  padding: '6px 11px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  border: active ? '1.5px solid #b91c1c' : '1px solid #cbd5e1',
                                  background: active ? '#b91c1c' : '#ffffff',
                                  color: active ? '#ffffff' : '#334155',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {active && <i className="fas fa-check" style={{ fontSize: 10 }}></i>}
                                {dl.code}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {form.restriction_code && parseDlCodes(form.restriction_code).length === 0 && (
                      <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>
                        Legacy restriction code on file: &ldquo;{form.restriction_code}&rdquo; — please select the matching LTO DL code(s) above.
                      </div>
                    )}
                    {formErrors.restriction_code && (
                      <div className="driver-error-feedback">
                        <i className="fas fa-circle-exclamation"></i>
                        <span>{formErrors.restriction_code}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginTop: 14 }}>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label">
                        Date Expiry <span className="req-star">*</span>
                      </label>
                      <input
                        type="date"
                        min={getTomorrowIso()}
                        className={`driver-form-input ${formErrors.license_expiry_date ? 'input-error' : ''}`}
                        value={form.license_expiry_date || ''}
                        onChange={(e) => handleFieldChange('license_expiry_date', e.target.value)}
                      />
                      {formErrors.license_expiry_date && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.license_expiry_date}</span>
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label">
                        Agency Code <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        className={`driver-form-input ${formErrors.agency_code ? 'input-error' : ''}`}
                        placeholder="e.g. K01"
                        value={form.agency_code || ''}
                        onChange={(e) => handleFieldChange('agency_code', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                      />
                      {formErrors.agency_code && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.agency_code}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Health & Medical Information */}
                <div className="driver-section-card">
                  <div className="driver-section-header">
                    <div className="driver-section-icon-badge">
                      <i className="fas fa-heartbeat"></i>
                    </div>
                    <div>
                      <h4 className="driver-section-title-text">Health &amp; Medical Profile</h4>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Fitness assessment and medical condition records</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label">
                        Condition / Health Status <span className="req-star">*</span>
                      </label>
                      <select
                        className={`driver-form-select ${formErrors.health_condition ? 'input-error' : ''}`}
                        value={form.health_condition}
                        onChange={(e) => handleFieldChange('health_condition', e.target.value)}
                      >
                        <option value="Fit to Work">Fit to Work</option>
                        <option value="1 - None / Normal">1 - None / Normal</option>
                        <option value="2 - Drive with Corrective Lenses">2 - Drive with Corrective Lenses</option>
                        <option value="3 - Special Equipment for Upper Limbs">3 - Special Equipment for Upper Limbs</option>
                        <option value="4 - Special Equipment for Lower Limbs">4 - Special Equipment for Lower Limbs</option>
                        <option value="5 - Daylight Driving Only">5 - Daylight Driving Only</option>
                        <option value="Under Observation">Under Observation</option>
                        <option value="Medical Leave">Medical Leave</option>
                        <option value="Unfit to Work">Unfit to Work</option>
                      </select>
                      {formErrors.health_condition && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.health_condition}</span>
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label">
                        Last Medical Check <span className="req-star">*</span>
                      </label>
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        className={`driver-form-input ${formErrors.last_medical_check ? 'input-error' : ''}`}
                        value={form.last_medical_check || ''}
                        onChange={(e) => handleFieldChange('last_medical_check', e.target.value)}
                      />
                      {formErrors.last_medical_check && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.last_medical_check}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginTop: 14 }}>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label">
                        Prescriptions <span className="req-star">*</span>
                      </label>
                      <textarea
                        rows={2}
                        className={`driver-form-textarea ${formErrors.prescriptions ? 'input-error' : ''}`}
                        placeholder="Enter current medications (or enter 'None')"
                        value={form.prescriptions}
                        onChange={(e) => handleFieldChange('prescriptions', e.target.value)}
                      />
                      {formErrors.prescriptions && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.prescriptions}</span>
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label">
                        Existing Conditions <span className="req-star">*</span>
                      </label>
                      <textarea
                        rows={2}
                        className={`driver-form-textarea ${formErrors.existing_conditions ? 'input-error' : ''}`}
                        placeholder="Enter health conditions or allergies (or enter 'None')"
                        value={form.existing_conditions}
                        onChange={(e) => handleFieldChange('existing_conditions', e.target.value)}
                      />
                      {formErrors.existing_conditions && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.existing_conditions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 4: Employment & Contract Information */}
                <div className="driver-section-card">
                  <div className="driver-section-header">
                    <div className="driver-section-icon-badge">
                      <i className="fas fa-briefcase"></i>
                    </div>
                    <div>
                      <h4 className="driver-section-title-text">Employment &amp; Contract Information</h4>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Hiring date, experience, and contract tenure</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label">
                        Date Hired <span className="req-star">*</span>
                      </label>
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        className={`driver-form-input ${formErrors.date_hired ? 'input-error' : ''}`}
                        value={form.date_hired || ''}
                        onChange={(e) => handleFieldChange('date_hired', e.target.value)}
                      />
                      {formErrors.date_hired && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.date_hired}</span>
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label">
                        Years of Experience <span className="req-star">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        placeholder="e.g. 5"
                        className={`driver-form-input ${formErrors.experience_years ? 'input-error' : ''}`}
                        value={form.experience_years ?? ''}
                        onChange={(e) => handleFieldChange('experience_years', e.target.value)}
                      />
                      {formErrors.experience_years && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.experience_years}</span>
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label" style={{ justifyContent: 'space-between' }}>
                        <span>Hired By <span className="req-star">*</span></span>
                        {editingDriver && (
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 'normal', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <i className="fas fa-lock" style={{ fontSize: 10 }}></i> Immutable
                          </span>
                        )}
                      </label>
                      {(() => {
                        const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
                        const currentAuthName = (authUser?.full_name || '').trim();
                        const optionsMap = new Map();
                        staffMembers.forEach((m) => optionsMap.set(m.name.toLowerCase(), m));
                        if (currentAuthName && !optionsMap.has(currentAuthName.toLowerCase())) {
                          optionsMap.set(currentAuthName.toLowerCase(), {
                            id: 'auth-self',
                            name: currentAuthName,
                            role: authUser?.role?.role_name || authUser?.role || 'Admin',
                          });
                        }
                        const savedName = (form.hired_by || '').trim();
                        const hasLegacyValue = savedName && !optionsMap.has(savedName.toLowerCase());
                        const dropdownOptions = Array.from(optionsMap.values());
                        return (
                          <select
                            className={`driver-form-select ${formErrors.hired_by ? 'input-error' : ''}`}
                            value={form.hired_by || ''}
                            disabled={Boolean(editingDriver)}
                            style={editingDriver ? { backgroundColor: '#f1f5f9', color: '#475569', cursor: 'not-allowed' } : {}}
                            onChange={(e) => handleFieldChange('hired_by', e.target.value)}
                          >
                            <option value="">Select Admin / Staff member...</option>
                            {hasLegacyValue && (
                              <option value={savedName}>{savedName}</option>
                            )}
                            {dropdownOptions.map((member) => (
                              <option key={member.id} value={member.name}>
                                {member.name} ({member.role})
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                      {formErrors.hired_by && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.hired_by}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginTop: 14 }}>
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label">
                        Contract Start Date <span className="req-star">*</span>
                      </label>
                      <input
                        type="date"
                        className={`driver-form-input ${formErrors.contract_start ? 'input-error' : ''}`}
                        value={form.contract_start || ''}
                        onChange={(e) => handleFieldChange('contract_start', e.target.value)}
                      />
                      {formErrors.contract_start && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.contract_start}</span>
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                      <label className="driver-field-label">
                        Contract End Date <span className="req-star">*</span>
                      </label>
                      <input
                        type="date"
                        min={[getTomorrowIso(), form.contract_start].filter(Boolean).sort().pop()}
                        className={`driver-form-input ${formErrors.contract_end ? 'input-error' : ''}`}
                        value={form.contract_end || ''}
                        onChange={(e) => handleFieldChange('contract_end', e.target.value)}
                      />
                      {formErrors.contract_end && (
                        <div className="driver-error-feedback">
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.contract_end}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 5: Driver Documents (Permits & Clearances) */}
                <div className="driver-section-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div className="driver-section-header" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                      <div className="driver-section-icon-badge">
                        <i className="fas fa-folder-open"></i>
                      </div>
                      <div>
                        <h4 className="driver-section-title-text">Driver Documents (Permits &amp; Clearances)</h4>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Required document photocopies / PDFs</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: 6 }}>
                      Accepted formats: JPG, PNG, WEBP, PDF (Max 10MB) <span className="req-star">*</span>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                    {/* Document 1: Driver's License Copy */}
                    <div className={`driver-upload-card ${formErrors.license_file ? 'input-error' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-id-card" style={{ color: '#b91c1c' }}></i> License Copy <span className="req-star">*</span>
                        </span>
                        {editingDriver?.license_file_url && !licenseFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile("Driver's License Copy", editingDriver.license_file_url, editingDriver)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={licenseFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'license')}
                      />
                      {licenseFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {licenseFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLicenseFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => licenseFileInputRef.current?.click()}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: '#94a3b8' }}></i>
                          {editingDriver?.license_file_url ? 'Replace License File' : 'Upload License File'}
                        </button>
                      )}
                      {formErrors.license_file && (
                        <div className="driver-error-feedback" style={{ marginTop: 6 }}>
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.license_file}</span>
                        </div>
                      )}
                    </div>

                    {/* Document 2: Medical Certificate */}
                    <div className={`driver-upload-card ${formErrors.medical_cert_file ? 'input-error' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-heartbeat" style={{ color: '#b91c1c' }}></i> Medical Certificate <span className="req-star">*</span>
                        </span>
                        {editingDriver?.medical_certificate_file_url && !medicalCertFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile('Medical Fit-to-Work Certificate', editingDriver.medical_certificate_file_url, editingDriver)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={medicalCertFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'medical')}
                      />
                      {medicalCertFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {medicalCertFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setMedicalCertFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => medicalCertFileInputRef.current?.click()}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: '#94a3b8' }}></i>
                          {editingDriver?.medical_certificate_file_url ? 'Replace Medical File' : 'Upload Medical Cert'}
                        </button>
                      )}
                      {formErrors.medical_cert_file && (
                        <div className="driver-error-feedback" style={{ marginTop: 6 }}>
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.medical_cert_file}</span>
                        </div>
                      )}
                    </div>

                    {/* Document 3: Security Clearance */}
                    <div className={`driver-upload-card ${formErrors.clearance_file || formErrors.clearance_type || formErrors.clearance_date ? 'input-error' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-shield-alt" style={{ color: '#b91c1c' }}></i> Security Clearance <span className="req-star">*</span>
                        </span>
                        {editingDriver?.clearance_file_url && !clearanceFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile(editingDriver.clearance_type || 'Security Clearance', editingDriver.clearance_file_url, editingDriver)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 6, marginBottom: 8 }}>
                        <select
                          value={form.clearance_type || 'NBI Clearance'}
                          onChange={(e) => handleFieldChange('clearance_type', e.target.value)}
                          className={`driver-form-select ${formErrors.clearance_type ? 'input-error' : ''}`}
                          style={{ padding: '6px 8px', borderRadius: 6, fontSize: 11, height: 34 }}
                        >
                          <option value="NBI Clearance">NBI Clearance</option>
                          <option value="Police Clearance">Police Clearance</option>
                          <option value="Barangay Clearance">Barangay Clearance</option>
                        </select>
                        <input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          value={form.clearance_date || ''}
                          onChange={(e) => handleFieldChange('clearance_date', e.target.value)}
                          className={`driver-form-input ${formErrors.clearance_date ? 'input-error' : ''}`}
                          style={{ padding: '6px 8px', borderRadius: 6, fontSize: 11, height: 34 }}
                          title="Clearance Issue Date"
                        />
                      </div>
                      <input
                        type="file"
                        ref={clearanceFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'clearance')}
                      />
                      {clearanceFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {clearanceFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setClearanceFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => clearanceFileInputRef.current?.click()}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: '#94a3b8' }}></i>
                          {editingDriver?.clearance_file_url ? 'Replace Clearance File' : 'Upload Clearance'}
                        </button>
                      )}
                      {(formErrors.clearance_file || formErrors.clearance_date) && (
                        <div className="driver-error-feedback" style={{ marginTop: 6 }}>
                          <i className="fas fa-circle-exclamation"></i>
                          <span>{formErrors.clearance_file || formErrors.clearance_date}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Security (Password Reset) - Only for Editing Existing Driver */}
                {editingDriver && (
                  <div className="driver-section-card" style={{ marginBottom: 0 }}>
                    <div className="driver-section-header">
                      <div className="driver-section-icon-badge">
                        <i className="fas fa-key"></i>
                      </div>
                      <div>
                        <h4 className="driver-section-title-text">Account Security</h4>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Reset or update driver login password</span>
                      </div>
                    </div>

                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                      <input type="checkbox" checked={changePassword} onChange={(e) => setChangePassword(e.target.checked)} />
                      <span style={{ fontWeight: 600 }}>Change driver password</span>
                    </label>

                    {changePassword && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                        <div className="form-group" style={{ position: 'relative' }}>
                          <label className="driver-field-label">
                            New Password <span className="req-star">*</span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              className={`driver-form-input ${formErrors.password ? 'input-error' : ''}`}
                              placeholder="At least 6 characters"
                              value={form.password}
                              onChange={(e) => handleFieldChange('password', e.target.value)}
                              style={{ paddingRight: 36 }}
                            />
                            <i
                              className={`fa-solid ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}
                              onClick={() => setShowPassword((p) => !p)}
                              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#64748b' }}
                            ></i>
                          </div>
                          {formErrors.password && (
                            <div className="driver-error-feedback">
                              <i className="fas fa-circle-exclamation"></i>
                              <span>{formErrors.password}</span>
                            </div>
                          )}
                        </div>

                        <div className="form-group" style={{ position: 'relative' }}>
                          <label className="driver-field-label">
                            Confirm New Password <span className="req-star">*</span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              className={`driver-form-input ${formErrors.confirmPassword ? 'input-error' : ''}`}
                              placeholder="Repeat password"
                              value={form.confirmPassword}
                              onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                              style={{ paddingRight: 36 }}
                            />
                            <i
                              className={`fa-solid ${showConfirmPassword ? 'fa-eye' : 'fa-eye-slash'}`}
                              onClick={() => setShowConfirmPassword((p) => !p)}
                              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#64748b' }}
                            ></i>
                          </div>
                          {formErrors.confirmPassword && (
                            <div className="driver-error-feedback">
                              <i className="fas fa-circle-exclamation"></i>
                              <span>{formErrors.confirmPassword}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div
              className="modal-footer"
              style={{
                padding: '16px 28px',
                borderTop: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#94a3b8';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.color = '#475569';
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDriver}
                disabled={saving}
                style={{
                  padding: '10px 28px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.28)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: saving ? 0.75 : 1,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  if (!saving) e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {saving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Printable Incident Report Modal */}
      {selectedPrintIncident && (
        <PrintableIncidentModal
          incident={selectedPrintIncident}
          onClose={() => setSelectedPrintIncident(null)}
        />
      )}

      {/* Custom Document Viewer & Missing Document Modal */}
      {docModal && docModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 20,
          }}
          onClick={() => setDocModal(null)}
        >
          {!docModal.url ? (
            /* Missing Document Modal */
            <div
              style={{
                background: '#ffffff',
                borderRadius: 16,
                width: '100%',
                maxWidth: 460,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden',
                textAlign: 'center',
                padding: '32px 28px 26px',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setDocModal(null)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: 14,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                title="Close"
              >
                <i className="fas fa-times"></i>
              </button>

              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: '#fee2e2',
                  border: '2px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                  color: '#dc2626',
                  fontSize: 28,
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.15)',
                }}
              >
                <i className="fas fa-file-invoice"></i>
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                No Document Attached
              </h3>

              <p style={{ margin: '0 0 18px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                No document has been uploaded for <strong style={{ color: '#0f172a' }}>{docModal.title}</strong> yet.
              </p>

              {docModal.driver && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '12px 16px',
                    marginBottom: 22,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    <i className="fas fa-user"></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {docModal.driver.user?.full_name || 'Driver'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      License: <span style={{ fontWeight: 600, color: '#334155' }}>{docModal.driver.license_number || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setDocModal(null)}
                  style={{
                    flex: 1,
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = docModal.driver;
                    setDocModal(null);
                    setShowDetailsModal(false);
                    if (d) {
                      openEditModal(d);
                    }
                  }}
                  style={{
                    flex: 1.3,
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#d32f2f',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 2px 8px rgba(211, 47, 47, 0.35)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#b71c1c'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#d32f2f'; }}
                >
                  <i className="fas fa-cloud-upload-alt"></i> Upload Now
                </button>
              </div>
            </div>
          ) : (
            /* Document Previewer Modal */
            <div
              style={{
                background: '#ffffff',
                borderRadius: 16,
                width: '100%',
                maxWidth: 900,
                height: '85vh',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: '#fee2e2',
                      color: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    <i className="fas fa-file-alt"></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                      {docModal.title}
                    </h3>
                    {docModal.driver && (
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        Driver: {docModal.driver.user?.full_name || 'Driver'} • License: {docModal.driver.license_number || 'N/A'}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <a
                    href={docModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#334155',
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                  >
                    <i className="fas fa-external-link-alt"></i> Open Full
                  </a>
                  <button
                    type="button"
                    onClick={() => setDocModal(null)}
                    style={{
                      background: '#e2e8f0',
                      border: 'none',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#475569',
                      fontSize: 14,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#cbd5e1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                    title="Close"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>

              {/* Body: Embedded PDF or Image */}
              <div
                style={{
                  flex: 1,
                  background: '#0f172a',
                  overflow: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 12,
                }}
              >
                {docModal.url.toLowerCase().includes('.pdf') ? (
                  <iframe
                    src={docModal.url}
                    title={docModal.title}
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#ffffff' }}
                  />
                ) : (
                  <img
                    src={docModal.url}
                    alt={docModal.title}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }}
                  />
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '12px 24px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <a
                  href={docModal.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                >
                  <i className="fas fa-download"></i> Download File
                </a>
                <button
                  type="button"
                  onClick={() => setDocModal(null)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#d32f2f',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#b71c1c'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#d32f2f'; }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default DriversPage;