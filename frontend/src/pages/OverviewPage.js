import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import api from '../api/api-client';
import reverb from '../utils/reverb';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';
import Pagination from '../components/Pagination';
import { validatePhoneNumber, formatPhoneInput } from '../utils/validation';

const ACTIVE_STATUSES = [
  'assigned',
  'accepted',
  'arrived_pickup',
  'loading_cargo',
  'out_for_delivery',
  'arrived_dropoff',
  'unloading_cargo',
  'returning_to_hq',
];

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function formatDateTime(dateString) {
  if (!dateString) return { time: '—', date: '—' };
  const d = new Date(dateString);
  if (isNaN(d)) return { time: '—', date: '—' };
  return {
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    date: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
  };
}

function formatMoney(amount) {
  return '₱' + Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
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

function cleanCityName(addr) {
  if (!addr) return { short: 'CDO', area: '', city: 'Cagayan de Oro' };
  const rawParts = String(addr).split(',').map((s) => s.trim()).filter(Boolean);
  if (rawParts.length === 0) return { short: 'CDO', area: '', city: 'Cagayan de Oro' };

  const regionRegex = /^(Northern Mindanao|Davao Region|Soccsksargen|Caraga|Zamboanga Peninsula|Central Visayas|Eastern Visayas|Western Visayas|Bicol Region|Mimaropa|Calabarzon|Central Luzon|Cagayan Valley|Ilocos Region|Cordillera Administrative Region|Bangsamoro|BARMM|Region [IVXLCDM0-9]+|Mindanao|Visayas|Luzon)$/i;
  const provinceRegex = /^(Misamis Oriental|Misamis Occidental|Bukidnon|Camiguin|Lanao del Norte|Lanao del Sur|Davao del Norte|Davao del Sur|Davao Oriental|Davao Occidental|Davao de Oro|South Cotabato|North Cotabato|Sultan Kudarat|Sarangani|Agusan del Norte|Agusan del Sur|Surigao del Norte|Surigao del Sur|Zamboanga del Norte|Zamboanga del Sur|Zamboanga Sibugay)$/i;

  const meaningful = rawParts.filter((s) => {
    if (/^philippines$/i.test(s) || /^ph$/i.test(s) || /^pilipinas$/i.test(s)) return false;
    if (/^\d{4,5}$/.test(s)) return false;
    if (regionRegex.test(s)) return false;
    return true;
  });

  if (meaningful.length === 0) return { short: 'CDO', area: '', city: 'Cagayan de Oro' };

  const candidates = [...meaningful];
  let city = '';
  if (candidates.length >= 2 && provinceRegex.test(candidates[candidates.length - 1])) {
    candidates.pop();
    city = candidates[candidates.length - 1];
  } else {
    city = candidates[candidates.length - 1];
  }

  const cityIndex = meaningful.lastIndexOf(city);
  let area = '';
  if (cityIndex > 0) {
    area = meaningful[cityIndex - 1].replace(/^(Barangay|Brgy\.?|Bgy\.?)\s*/i, '');
  }

  let short = city;
  if (/cagayan de oro/i.test(city)) short = 'CDO';
  else if (/davao city/i.test(city) || /^davao$/i.test(city)) short = 'Davao';
  else if (/general santos/i.test(city) || /gensan/i.test(city)) short = 'GenSan';
  else if (/iligan/i.test(city)) short = 'Iligan';
  else if (/butuan/i.test(city)) short = 'Butuan';
  else if (/tagum/i.test(city)) short = 'Tagum';
  else if (/malaybalay/i.test(city)) short = 'Malaybalay';
  else if (/valencia/i.test(city)) short = 'Valencia';

  return { short, area, city };
}

function shortCity(addr) {
  return cleanCityName(addr).short;
}

function formatRoute(fromAddr, toAddr) {
  const p = cleanCityName(fromAddr);
  const d = cleanCityName(toAddr);
  if (p.short === d.short && (p.area || d.area)) {
    const fromLoc = p.area || p.short;
    const toLoc = d.area || d.short;
    if (fromLoc !== toLoc) return `${fromLoc} → ${toLoc}`;
    return `${p.short} (Local)`;
  }
  return `${p.short || 'CDO'} → ${d.short || 'Davao'}`;
}

function statusLabel(status) {
  return (status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusClass(status) {
  if (status === 'completed') return 'completed';
  if (status === 'returning_to_hq') return 'returning';
  if (status === 'rejected') return 'overdue';
  if (ACTIVE_STATUSES.includes(status)) return 'pending';
  return 'pending';
}

const DELIVERY_TIMELINE_STEPS = [
  { key: 'assigned', label: 'Dispatched', activeBg: '#9333ea', activeText: '#ffffff', border: '#7e22ce' },
  { key: 'accepted', label: 'On Route', activeBg: '#2563eb', activeText: '#ffffff', border: '#1d4ed8' },
  { key: 'arrived_pickup', label: 'Arrived at Pickup', activeBg: '#0d9488', activeText: '#ffffff', border: '#0f766e' },
  { key: 'loading_cargo', label: 'Loading Cargo', activeBg: '#d97706', activeText: '#ffffff', border: '#b45309' },
  { key: 'out_for_delivery', label: 'On Delivery', activeBg: '#2563eb', activeText: '#ffffff', border: '#1d4ed8' },
  { key: 'arrived_dropoff', label: 'Arrived at Drop-off', activeBg: '#65a30d', activeText: '#ffffff', border: '#4d7c0f' },
  { key: 'unloading_cargo', label: 'Unloading Cargo', activeBg: '#d97706', activeText: '#ffffff', border: '#b45309' },
  { key: 'returning_to_hq', label: 'Returning to HQ', activeBg: '#ea580c', activeText: '#ffffff', border: '#c2410c' },
  { key: 'completed', label: 'Complete', activeBg: '#16a34a', activeText: '#ffffff', border: '#15803d' },
];

function getDeliveryStepIndex(status) {
  if (!status || status === 'pending') return -1;
  if (status === 'assigned') return 0;
  if (status === 'accepted') return 1;
  if (status === 'arrived_pickup') return 2;
  if (status === 'loading_cargo') return 3;
  if (status === 'out_for_delivery' || status === 'in_transit') return 4;
  if (status === 'arrived_dropoff') return 5;
  if (status === 'unloading_cargo' || status === 'delivered') return 6;
  if (status === 'returning_to_hq') return 7;
  if (status === 'completed') return 8;
  return -1;
}

const DELIVERY_STATUS_META = {
  pending: {
    rank: 0,
    label: 'Pending',
    bg: '#fff7ed',
    color: '#ea580c',
    border: '#fed7aa',
    icon: 'fa-clock',
  },
  assigned: {
    rank: 1,
    label: 'Dispatched',
    bg: '#f3e8ff',
    color: '#9333ea',
    border: '#d8b4fe',
    icon: 'fa-paper-plane',
  },
  accepted: {
    rank: 2,
    label: 'On Route',
    bg: '#dbeafe',
    color: '#2563eb',
    border: '#bfdbfe',
    icon: 'fa-route',
  },
  arrived_pickup: {
    rank: 3,
    label: 'Arrived at Pickup',
    bg: '#ccfbf1',
    color: '#0d9488',
    border: '#99f6e4',
    icon: 'fa-map-pin',
  },
  loading_cargo: {
    rank: 4,
    label: 'Loading Cargo',
    bg: '#fef3c7',
    color: '#d97706',
    border: '#fde68a',
    icon: 'fa-box',
  },
  out_for_delivery: {
    rank: 5,
    label: 'On Delivery',
    bg: '#dbeafe',
    color: '#2563eb',
    border: '#bfdbfe',
    icon: 'fa-truck',
  },
  in_transit: {
    rank: 5,
    label: 'On Delivery',
    bg: '#dbeafe',
    color: '#2563eb',
    border: '#bfdbfe',
    icon: 'fa-truck',
  },
  arrived_dropoff: {
    rank: 6,
    label: 'Arrived at Drop-off',
    bg: '#ecfccb',
    color: '#65a30d',
    border: '#d9f99d',
    icon: 'fa-flag-checkered',
  },
  unloading_cargo: {
    rank: 7,
    label: 'Unloading Cargo',
    bg: '#fef3c7',
    color: '#d97706',
    border: '#fde68a',
    icon: 'fa-dolly',
  },
  delivered: {
    rank: 7,
    label: 'Unloading Cargo',
    bg: '#fef3c7',
    color: '#d97706',
    border: '#fde68a',
    icon: 'fa-dolly',
  },
  returning_to_hq: {
    rank: 8,
    label: 'Returning to HQ',
    bg: '#ffedd5',
    color: '#ea580c',
    border: '#fed7aa',
    icon: 'fa-undo',
  },
  completed: {
    rank: 9,
    label: 'Complete',
    bg: '#dcfce7',
    color: '#16a34a',
    border: '#bbf7d0',
    icon: 'fa-check-circle',
  },
  rejected: {
    rank: 10,
    label: 'Rejected',
    bg: '#fee2e2',
    color: '#dc2626',
    border: '#fecaca',
    icon: 'fa-times-circle',
  },
};

function getDeliveryStatusInfo(status) {
  return (
    DELIVERY_STATUS_META[status] || {
      rank: 99,
      label: (status || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      bg: '#f1f5f9',
      color: '#475569',
      border: '#cbd5e1',
      icon: 'fa-circle',
    }
  );
}

function OverviewPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [activityCategoryFilter, setActivityCategoryFilter] = useState('all');
  const [staffUsers, setStaffUsers] = useState([]);
  const [staffRoleId, setStaffRoleId] = useState(5);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  // Pagination & view states
  const [deliveriesPage, setDeliveriesPage] = useState(1);
  const [deliverySortBy, setDeliverySortBy] = useState('hierarchy');
  const [accountsView, setAccountsView] = useState('active');
  const [staffPage, setStaffPage] = useState(1);
  const [staffPerPage, setStaffPerPage] = useState(2);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [expandedDeliveryId, setExpandedDeliveryId] = useState(null);
  const [expandedStaffId, setExpandedStaffId] = useState(null);

  // Modals
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logsModalPage, setLogsModalPage] = useState(1);
  const [logsModalSearch, setLogsModalSearch] = useState('');
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthModalTab, setHealthModalTab] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [addForm, setAddForm] = useState({ full_name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    changePassword: false,
    password: '',
    confirmPassword: '',
  });

  // Live clock for the header date
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
      let delData = [];
      let logsData = [];
      let usersData = [];
      let rolesData = [];
      let reqData = [];
      let drvData = [];
      let vehData = [];
      let mntData = [];
      let incData = [];

      try {
        const overviewRes = await api.get('/dashboard/overview');
        if (overviewRes.data) {
          delData = overviewRes.data.deliveries || [];
          reqData = overviewRes.data.requests || [];
          drvData = overviewRes.data.drivers || [];
          vehData = overviewRes.data.vehicles || [];
          mntData = overviewRes.data.maintenances || [];
          incData = overviewRes.data.incidents || [];
          logsData = overviewRes.data.system_logs || [];
          usersData = overviewRes.data.users || [];
          rolesData = overviewRes.data.roles || [];
        }
      } catch (_) {
        const [deliveriesRes, logsRes, usersRes, rolesRes, reqRes, drvRes, vehRes, mntRes, incRes] = await Promise.all([
          api.get('/deliveries').catch(() => ({ data: [] })),
          api.get('/system-logs').catch(() => ({ data: [] })),
          api.get('/users').catch(() => ({ data: [] })),
          api.get('/roles').catch(() => ({ data: [] })),
          api.get('/delivery-requests').catch(() => ({ data: [] })),
          api.get('/drivers').catch(() => ({ data: [] })),
          api.get('/vehicles').catch(() => ({ data: [] })),
          api.get('/vehicle-maintenances').catch(() => ({ data: [] })),
          api.get('/incident-reports').catch(() => ({ data: [] })),
        ]);

        delData = Array.isArray(deliveriesRes.data) ? deliveriesRes.data : [];
        logsData = Array.isArray(logsRes.data) ? logsRes.data : [];
        usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
        rolesData = Array.isArray(rolesRes.data) ? rolesRes.data : [];
        reqData = Array.isArray(reqRes.data) ? reqRes.data : [];
        drvData = Array.isArray(drvRes.data) ? drvRes.data : [];
        vehData = Array.isArray(vehRes.data) ? vehRes.data : [];
        mntData = Array.isArray(mntRes.data) ? mntRes.data : [];
        incData = Array.isArray(incRes.data) ? incRes.data : [];
      }

      setDeliveries(delData);
      setSystemLogs(logsData);
      setVehicles(vehData);
      setMaintenances(mntData);
      setIncidents(incData);

      const staffRole = rolesData.find((r) => r.role_name?.toLowerCase() === 'staff')
        || rolesData.find((r) => r.role_id === 5);
      setStaffRoleId(staffRole ? staffRole.role_id : 5);

      const staffUsersList = usersData.filter((u) =>
        u.role_id === 5 || u.role?.role_name?.toLowerCase() === 'staff'
      );
      setStaffUsers(staffUsersList);

      // Construct Unified Dynamic Activities
      const dynamicActivities = [];

      // 1. Deliveries Activity
      delData.forEach((d) => {
        const rawTime = d.updated_at || d.created_at;
        const timeMs = rawTime ? new Date(rawTime).getTime() : 0;
        const isScheduled = d.request?.is_scheduled || !!d.request?.scheduled_date;
        const schedTime = d.request?.scheduled_time_slot ? ` at ${d.request.scheduled_time_slot}` : '';
        const schedDate = d.request?.scheduled_date ? ` (${d.request.scheduled_date}${schedTime})` : '';

        if (d.status === 'in_transit' || d.status === 'out_for_delivery') {
          dynamicActivities.push({
            id: `del-${d.delivery_id}`,
            category: 'delivery',
            icon: 'fas fa-truck',
            color: '#C53030',
            title: `Driver ${d.driver?.user?.full_name || 'Driver'} is now In Transit.`,
            sub: formatRoute(d.request?.pickup_address, d.request?.dropoff_address),
            actor: d.driver?.user?.full_name || 'Driver',
            role: 'Driver',
            time: timeAgo(rawTime),
            timeMs,
            rawDate: rawTime,
          });
        } else if (d.status === 'assigned' || d.status === 'accepted') {
          dynamicActivities.push({
            id: `del-assign-${d.delivery_id}`,
            category: 'delivery',
            icon: 'fas fa-clipboard-check',
            color: '#3B82F6',
            title: isScheduled
              ? `Delivery DLV${String(d.delivery_id).padStart(4, '0')} scheduled & dispatched to Driver ${d.driver?.user?.full_name || 'Driver'}${schedDate}.`
              : `Delivery DLV${String(d.delivery_id).padStart(4, '0')} dispatched to Driver ${d.driver?.user?.full_name || 'Driver'}.`,
            sub: `${formatRoute(d.request?.pickup_address, d.request?.dropoff_address)} • Dispatched`,
            actor: d.driver?.user?.full_name || 'Driver',
            role: 'Driver',
            time: timeAgo(rawTime),
            timeMs,
            rawDate: rawTime,
          });
        } else if (d.status === 'completed') {
          dynamicActivities.push({
            id: `del-comp-${d.delivery_id}`,
            category: 'delivery',
            icon: 'fas fa-check-circle',
            color: '#10B981',
            title: `Delivery DLV${String(d.delivery_id).padStart(4, '0')} completed!`,
            sub: `Delivered to ${shortCity(d.request?.dropoff_address)} by ${d.driver?.user?.full_name || 'Driver'}`,
            actor: d.driver?.user?.full_name || 'Driver',
            role: 'Driver',
            time: timeAgo(d.end_time || rawTime),
            timeMs,
            rawDate: d.end_time || rawTime,
          });
        }
      });

      // 2. Pending & Overdue Requests Activity
      reqData.forEach((r) => {
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
            actor: r.customer?.full_name || 'Customer',
            role: 'Customer',
            time: timeAgo(rawTime),
            timeMs,
            rawDate: rawTime,
          });
        } else if (r.status === 'pending') {
          dynamicActivities.push({
            id: `req-new-${r.request_id}`,
            category: 'request',
            icon: 'fas fa-file-invoice',
            color: '#6366F1',
            title: `New booking REQ${String(r.request_id).padStart(4, '0')} received.`,
            sub: `${r.customer?.full_name || 'Customer'} • ${r.item_name || r.cargo_type || 'Cargo'}`,
            actor: r.customer?.full_name || 'Customer',
            role: 'Customer',
            time: timeAgo(rawTime),
            timeMs,
            rawDate: rawTime,
          });
        }
      });

      // 3. Driver Status
      const activeDriverIds = new Set(
        delData
          .filter((d) => ['assigned', 'accepted', 'out_for_delivery', 'in_transit', 'loading_cargo', 'arrived_pickup'].includes(d.status))
          .map((d) => Number(d.driver_id))
      );

      drvData.forEach((dr) => {
        const rawTime = dr.updated_at || dr.created_at;
        const isAssigned = activeDriverIds.has(Number(dr.driver_id));

        if (dr.availability_status === 'offline') {
          dynamicActivities.push({
            id: `drv-${dr.driver_id}`,
            category: 'fleet',
            icon: 'fas fa-user-slash',
            color: '#9CA3AF',
            title: `Driver ${dr.user?.full_name || 'Driver'} (${driverCode(dr.driver_id)}) is offline.`,
            sub: 'Driver availability status updated',
            actor: dr.user?.full_name || 'Driver',
            role: 'Driver',
            time: timeAgo(rawTime),
            timeMs: rawTime ? new Date(rawTime).getTime() : 0,
            rawDate: rawTime,
          });
        } else if (dr.availability_status === 'busy' && !isAssigned) {
          dynamicActivities.push({
            id: `drv-${dr.driver_id}`,
            category: 'fleet',
            icon: 'fas fa-coffee',
            color: '#F59E0B',
            title: `Driver ${dr.user?.full_name || 'Driver'} (${driverCode(dr.driver_id)}) is on break.`,
            sub: 'Driver availability status updated',
            actor: dr.user?.full_name || 'Driver',
            role: 'Driver',
            time: timeAgo(rawTime),
            timeMs: rawTime ? new Date(rawTime).getTime() : 0,
            rawDate: rawTime,
          });
        }
      });

      // 4. Vehicle Maintenance
      mntData.forEach((m) => {
        const rawTime = m.created_at || m.maintenance_date;
        dynamicActivities.push({
          id: `mnt-${m.maintenance_id}`,
          category: 'fleet',
          icon: 'fas fa-wrench',
          color: '#F97316',
          title: `Maintenance alert: ${m.vehicle?.model || 'Fleet Vehicle'} (${m.vehicle?.plate_number || 'Unit'})`,
          sub: `${m.maintenance_type || 'Scheduled Service'}: ${m.service_type || 'Under checkup'}`,
          actor: m.vehicle?.plate_number || 'Fleet',
          role: 'Maintenance',
          time: timeAgo(rawTime),
          timeMs: rawTime ? new Date(rawTime).getTime() : 0,
          rawDate: rawTime,
        });
      });

      // 5. Incident Reports
      incData.forEach((inc) => {
        const rawTime = inc.created_at;
        dynamicActivities.push({
          id: `inc-${inc.report_id}`,
          category: 'fleet',
          icon: 'fas fa-exclamation-circle',
          color: '#EF4444',
          title: `Incident: ${inc.incident_type || 'Issue reported'}`,
          sub: inc.description || 'Reported during trip',
          actor: inc.delivery?.driver?.user?.full_name || 'Driver',
          role: 'Incident',
          time: timeAgo(rawTime),
          timeMs: rawTime ? new Date(rawTime).getTime() : 0,
          rawDate: rawTime,
        });
      });

      // 6. System Logs
      logsData.forEach((log) => {
        const rawTime = log.timestamp || log.created_at;
        dynamicActivities.push({
          id: `log-${log.log_id}`,
          category: 'system',
          icon: 'fas fa-shield-alt',
          color: '#8B5CF6',
          title: `${log.user?.full_name || 'Staff User'}: ${log.action}`,
          sub: 'System audit event',
          actor: log.user?.full_name || 'System',
          role: log.user?.role?.role_name || 'Staff',
          time: timeAgo(rawTime),
          timeMs: rawTime ? new Date(rawTime).getTime() : 0,
          rawDate: rawTime,
        });
      });

      dynamicActivities.sort((a, b) => b.timeMs - a.timeMs);

      if (dynamicActivities.length === 0) {
        dynamicActivities.push(
          { id: 'def-1', category: 'system', icon: 'fas fa-check-circle', color: '#10B981', title: 'System Online & Operational', sub: 'All monitoring sensors active.', actor: 'System', role: 'System', time: 'Just now', timeMs: Date.now(), rawDate: new Date().toISOString() },
          { id: 'def-2', category: 'fleet', icon: 'fas fa-truck', color: '#4A90E2', title: 'Fleet Ready for Dispatch', sub: 'Vehicles and drivers available.', actor: 'Fleet Manager', role: 'Fleet', time: '1 hr ago', timeMs: Date.now() - 3600000, rawDate: new Date().toISOString() }
        );
      }

      setActivityFeed(dynamicActivities);
    } catch (err) {
      setLoadError('Could not load dashboard data. Is the backend running and are you logged in?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Instant real-time updates via Laravel Reverb WebSocket
    const unsubscribeDel = reverb.subscribe('deliveries', 'delivery.updated', () => {
      loadData();
    });
    const unsubscribeNotif = reverb.subscribe('system-notifications', 'notification.created', () => {
      loadData();
    });

    return () => {
      unsubscribeDel();
      unsubscribeNotif();
    };
  }, [loadData]);

  // ----- Executive KPI Calculations -----
  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveries.filter((d) => d.status === 'completed').length;
  const activeDeliveries = deliveries.filter((d) => ACTIVE_STATUSES.includes(d.status)).length;
  const completionRate = totalDeliveries > 0 ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1) : '0.0';

  const totalRevenue = deliveries
    .filter((d) => d.payment_verification === 'approved')
    .reduce((sum, d) => sum + Number(d.trip_cost || 0), 0);

  const claimsList = incidents.filter((inc) => Number(inc.refund_amount) > 0 || inc.refund_status);
  const totalClaimsAmount = claimsList.reduce((sum, inc) => sum + Number(inc.refund_amount || 0), 0);
  const pendingClaimsCount = claimsList.filter((inc) => inc.refund_status === 'pending_review' || inc.status === 'pending').length;

  // ----- Operations Health & Fleet Readiness -----
  const activeDeliveryMap = {};
  deliveries.filter((d) => ACTIVE_STATUSES.includes(d.status) && d.vehicle_id).forEach((d) => {
    activeDeliveryMap[d.vehicle_id] = d;
  });

  const totalVehiclesCount = vehicles.length || 1;
  const activeVehicles = vehicles.filter((v) => v.status === 'in_use' || v.status === 'active' || !!activeDeliveryMap[v.vehicle_id]);
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'maintenance' || v.status === 'broken' || v.status === 'repair');
  const availableVehicles = vehicles.filter(
    (v) => !activeVehicles.some((av) => av.vehicle_id === v.vehicle_id) && !maintenanceVehicles.some((mv) => mv.vehicle_id === v.vehicle_id)
  );

  const activePct = Math.round((activeVehicles.length / totalVehiclesCount) * 100);
  const maintPct = Math.round((maintenanceVehicles.length / totalVehiclesCount) * 100);
  const availPct = Math.max(0, 100 - activePct - maintPct);

  // ----- Deliveries Pagination & Sorting -----
  const DELIVERIES_PER_PAGE = 5;
  const sortedDeliveries = useMemo(() => {
    const list = [...deliveries];
    if (deliverySortBy === 'hierarchy') {
      list.sort((a, b) => {
        const rankA = getDeliveryStatusInfo(a.status).rank;
        const rankB = getDeliveryStatusInfo(b.status).rank;
        if (rankA !== rankB) return rankA - rankB;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    } else if (deliverySortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (deliverySortBy === 'oldest') {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (deliverySortBy === 'id') {
      list.sort((a, b) => b.delivery_id - a.delivery_id);
    }
    return list;
  }, [deliveries, deliverySortBy]);
  const totalDeliveryPages = Math.max(1, Math.ceil(sortedDeliveries.length / DELIVERIES_PER_PAGE));
  const currentDeliveries = sortedDeliveries.slice((deliveriesPage - 1) * DELIVERIES_PER_PAGE, deliveriesPage * DELIVERIES_PER_PAGE);

  // ----- Staff Accounts Pagination & Search -----
  const activeStaff = staffUsers.filter((u) => u.status === 'active');
  const deactivatedStaff = staffUsers.filter((u) => u.status !== 'active');
  const currentStaffList = accountsView === 'active' ? activeStaff : deactivatedStaff;
  const filteredStaff = currentStaffList.filter((s) => {
    const q = staffSearchQuery.toLowerCase();
    return !q || s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.phone?.includes(q);
  });
  const totalStaffPages = Math.max(1, Math.ceil(filteredStaff.length / staffPerPage));
  const currentStaff = filteredStaff.slice((staffPage - 1) * staffPerPage, staffPage * staffPerPage);

  // ----- Handlers -----
  const toggleDelivery = (id) => setExpandedDeliveryId((prev) => (prev === id ? null : id));
  const toggleStaffProfile = (id) => setExpandedStaffId((prev) => (prev === id ? null : id));

  const openAddModal = () => {
    setAddForm({ full_name: '', email: '', phone: '', password: '', confirmPassword: '' });
    setFormError('');
    setShowAddModal(true);
  };

  const saveNewStaff = async () => {
    const { full_name, email, phone, password, confirmPassword } = addForm;
    if (!full_name || !email || !phone || !password || !confirmPassword) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (!validatePhoneNumber(phone)) {
      setFormError('Phone number must start with "09" and be exactly 11 digits (e.g. 09123456789).');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await api.post('/users', { role_id: staffRoleId || 5, full_name, email, phone, password, status: 'active' });
      setShowAddModal(false);
      await loadData();
    } catch (err) {
      const errors = err.response?.data?.errors;
      setFormError(errors ? Object.values(errors)[0][0] : 'Could not add staff member.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (staff) => {
    setSelectedStaff(staff);
    setEditForm({
      full_name: staff.full_name,
      email: staff.email,
      phone: staff.phone || '',
      changePassword: false,
      password: '',
      confirmPassword: '',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const saveStaffChanges = async () => {
    if (editForm.phone && !validatePhoneNumber(editForm.phone)) {
      setFormError('Phone number must start with "09" and be exactly 11 digits (e.g. 09123456789).');
      return;
    }
    if (editForm.changePassword && (!editForm.password || editForm.password !== editForm.confirmPassword)) {
      setFormError('Passwords do not match.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { full_name: editForm.full_name, email: editForm.email, phone: editForm.phone };
      if (editForm.changePassword) payload.password = editForm.password;
      await api.put(`/users/${selectedStaff.user_id}`, payload);
      setShowEditModal(false);
      await loadData();
    } catch (err) {
      const errors = err.response?.data?.errors;
      setFormError(errors ? Object.values(errors)[0][0] : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const openDeactivateModal = (staff) => {
    setSelectedStaff(staff);
    setShowDeactivateModal(true);
  };

  const confirmDeactivate = async () => {
    const staff = selectedStaff;
    try {
      await api.patch(`/users/${staff.user_id}`, { status: 'inactive' });
      setShowDeactivateModal(false);
      await loadData();
      setToast({ message: `${staff.full_name} deactivated.`, undoId: staff.user_id });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setShowDeactivateModal(false);
    }
  };

  const undoDeactivate = async () => {
    if (!toast?.undoId) return;
    try {
      await api.patch(`/users/${toast.undoId}`, { status: 'active' });
      await loadData();
    } finally {
      setToast(null);
    }
  };

  const openRestoreModal = (staff) => {
    setSelectedStaff(staff);
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    try {
      await api.patch(`/users/${selectedStaff.user_id}`, { status: 'active' });
      setShowRestoreModal(false);
      await loadData();
    } catch (err) {
      setShowRestoreModal(false);
    }
  };


  return (
    <>
      <div className="dashboard-container">
        <Sidebar activePage="overview" />

        <div className="main-content">
          <header className="header">
            <div className="page-info">
              <span className="breadcrumb">Page/Overview</span>
              <h1 className="page-title">OVERVIEW</h1>
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

          <div className="dashboard-cards">
            {/* Card 1: Total Revenue */}
            <div className="card card-green">
              <div className="card-header">
                <i className="fas fa-money-bill-wave"></i>
                <span className="card-title">Total Revenue</span>
              </div>
              <div className="card-content">
                <span className="card-number green">{formatMoney(totalRevenue)}</span>
                <span className="card-subtitle">From verified payments.</span>
              </div>
            </div>

            {/* Card 2: Completion Rate */}
            <div className="card card-blue">
              <div className="card-header">
                <i className="fas fa-check-circle"></i>
                <span className="card-title">Completion Rate</span>
              </div>
              <div className="card-content">
                <span className="card-number blue">{completionRate}%</span>
                <span className="card-subtitle">{completedDeliveries} of {totalDeliveries} fulfilled.</span>
              </div>
            </div>

            {/* Card 3: Total Deliveries */}
            <div className="card">
              <div className="card-header">
                <i className="fas fa-box"></i>
                <span className="card-title">Total Deliveries</span>
              </div>
              <div className="card-content">
                <span className="card-number red">{totalDeliveries}</span>
                <span className="card-subtitle">{activeDeliveries} in transit / active.</span>
              </div>
            </div>

            {/* Card 4: Claims & Refunds */}
            <div className="card card-amber">
              <div className="card-header">
                <i className="fas fa-file-invoice-dollar"></i>
                <span className="card-title">Claims &amp; Refunds</span>
              </div>
              <div className="card-content">
                <span className="card-number amber">{formatMoney(totalClaimsAmount)}</span>
                <span className="card-subtitle">{pendingClaimsCount} Pending Executive Review</span>
              </div>
            </div>
          </div>

          {/* Operations Health Bar (Clickable for Detailed Breakdown) */}
          <div
            className="operations-health-card"
            onClick={() => { setHealthModalTab('all'); setShowHealthModal(true); }}
            title="Click to view full operational readiness breakdown"
          >
            <div className="operations-health-header">
              <div className="operations-health-title">
                <i className="fas fa-heartbeat"></i>
                <span>Fleet Operations &amp; Readiness</span>
                <span className="operations-health-badge">
                  {maintenanceVehicles.length === 0 ? 'Optimal (100%)' : `${Math.round(((totalVehiclesCount - maintenanceVehicles.length) / totalVehiclesCount) * 100)}% Ready`}
                </span>
              </div>
              <button
                className="btn-view-breakdown"
                type="button"
                onClick={(e) => { e.stopPropagation(); setHealthModalTab('all'); setShowHealthModal(true); }}
              >
                <i className="fas fa-chart-pie"></i>
                <span>View Detailed Breakdown</span>
                <i className="fas fa-chevron-right" style={{ fontSize: 10 }}></i>
              </button>
            </div>
            <div className="health-progress-bar">
              {activePct > 0 && (
                <div
                  className="health-segment active-segment"
                  style={{ width: `${activePct}%` }}
                  title={`Active En-Route: ${activeVehicles.length} Units (${activePct}%)`}
                ></div>
              )}
              {availPct > 0 && (
                <div
                  className="health-segment available-segment"
                  style={{ width: `${availPct}%` }}
                  title={`Depot Available: ${availableVehicles.length} Units (${availPct}%)`}
                ></div>
              )}
              {maintPct > 0 && (
                <div
                  className="health-segment maintenance-segment"
                  style={{ width: `${maintPct}%` }}
                  title={`Under Maintenance: ${maintenanceVehicles.length} Units (${maintPct}%)`}
                ></div>
              )}
            </div>
            <div className="health-legend-row">
              <div className="health-legend-item">
                <span className="health-legend-dot active-dot"></span>
                <span><strong>Active En-Route:</strong> {activeVehicles.length} Units ({activePct}%)</span>
              </div>
              <div className="health-legend-item">
                <span className="health-legend-dot available-dot"></span>
                <span><strong>Depot Available:</strong> {availableVehicles.length} Units ({availPct}%)</span>
              </div>
              <div className="health-legend-item">
                <span className="health-legend-dot maintenance-dot"></span>
                <span><strong>Maintenance / Grounded:</strong> {maintenanceVehicles.length} Units ({maintPct}%)</span>
              </div>
            </div>
          </div>

          <div className="content-sections">
            <div className="content-row">
              {/* ---------------- Delivery Operations (Paginated) ---------------- */}
              <div className="content-section recent-deliveries">
                <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <h3 className="section-title"><i className="fas fa-boxes"></i> Delivery Operations</h3>
                  <div className="section-controls" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Sort by:</span>
                    <select
                      value={deliverySortBy}
                      onChange={(e) => {
                        setDeliverySortBy(e.target.value);
                        setDeliveriesPage(1);
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                        background: '#ffffff',
                        color: '#334155',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="hierarchy">Delivery Progress (Pending → Complete)</option>
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="id">Delivery ID</option>
                    </select>
                  </div>
                </div>
                <div className="section-content">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Delivery ID</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentDeliveries.map((d) => {
                        const isOpen = expandedDeliveryId === d.delivery_id;
                        const statusInfo = getDeliveryStatusInfo(d.status);
                        return (
                          <Fragment key={d.delivery_id}>
                            <tr className="delivery-row" onClick={() => toggleDelivery(d.delivery_id)} style={{ cursor: 'pointer' }}>
                              <td style={{ fontWeight: 600 }}>DLV{String(d.delivery_id).padStart(4, '0')}</td>
                              <td>{d.request?.customer?.full_name || '—'}</td>
                              <td>
                                <span
                                  className="delivery-status-pill"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '3px 9px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    background: statusInfo.bg,
                                    color: statusInfo.color,
                                    border: `1px solid ${statusInfo.border}`,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <i className={`fas ${statusInfo.icon}`} style={{ fontSize: 10 }}></i>
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td>{formatDate(d.created_at)}</td>
                              <td>
                                <button
                                  className="btn-expand"
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleDelivery(d.delivery_id); }}
                                >
                                  {isOpen ? 'Collapse' : 'Details'}
                                </button>
                              </td>
                            </tr>
                            {isOpen && (() => {
                              const currentStepIdx = getDeliveryStepIndex(d.status);
                              return (
                                <tr className="delivery-details-row">
                                  <td colSpan="5">
                                    <div className="delivery-details-panel">
                                      <div className="delivery-info-grid">
                                        <div className="delivery-locations">
                                          <div className="location-item">
                                            <i className="fas fa-map-marker-alt"></i>
                                            <div className="location-info">
                                              <span className="location-label">Pick-up Location:</span>
                                              <span className="location-value">{d.request?.pickup_address || '—'}</span>
                                            </div>
                                          </div>
                                          <div className="location-item">
                                            <i className="fas fa-map-marker-alt"></i>
                                            <div className="location-info">
                                              <span className="location-label">Drop-off Location:</span>
                                              <span className="location-value">{d.request?.dropoff_address || '—'}</span>
                                            </div>
                                          </div>
                                          <div className="distance-info">
                                            <span className="distance-label">Distance:</span>
                                            <span className="distance-value">
                                              {d.request?.distance_km ? `${d.request.distance_km} kilometers` : '—'}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="delivery-meta">
                                          <div className="meta-item">
                                            <span className="meta-label">Driver:</span>
                                            <span className="meta-value">{d.driver?.user?.full_name || 'Unassigned'}</span>
                                          </div>
                                          <div className="meta-item">
                                            <span className="meta-label">Vehicle Used:</span>
                                            <span className="meta-value">
                                              {d.vehicle
                                                ? `${d.vehicle.brand || ''} ${d.vehicle.model || ''} - ${d.vehicle.plate_number}`.trim()
                                                : 'Unassigned'}
                                            </span>
                                          </div>
                                          {d.request?.customer?.phone && (
                                            <div className="meta-item">
                                              <span className="meta-label">Contact:</span>
                                              <span className="meta-value">{d.request.customer.phone}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Horizontal Status Update Bar */}
                                      <div className="delivery-status-stepper-container">
                                        <div className="delivery-status-stepper">
                                          {DELIVERY_TIMELINE_STEPS.map((step, idx) => {
                                            const isPassed = currentStepIdx > idx;
                                            const isCurrent = currentStepIdx === idx;
                                            return (
                                              <Fragment key={step.key}>
                                                {idx > 0 && (
                                                  <div
                                                    className="stepper-line"
                                                    style={{
                                                      background: isPassed || isCurrent ? '#94a3b8' : '#e2e8f0',
                                                    }}
                                                  />
                                                )}
                                                <div
                                                  className={`stepper-pill ${isCurrent ? 'current' : isPassed ? 'passed' : 'upcoming'}`}
                                                  style={
                                                    isCurrent
                                                      ? { background: step.activeBg, color: step.activeText, borderColor: step.border }
                                                      : isPassed
                                                      ? { background: step.activeBg, color: step.activeText, borderColor: step.border, opacity: 0.9 }
                                                      : { background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }
                                                  }
                                                  title={`Status: ${step.label}`}
                                                >
                                                  {isPassed && <i className="fas fa-check" style={{ fontSize: 9, marginRight: 5 }}></i>}
                                                  {isCurrent && <i className="fas fa-circle" style={{ fontSize: 7, marginRight: 5, color: '#ffffff' }}></i>}
                                                  {step.label}
                                                </div>
                                              </Fragment>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })()}
                          </Fragment>
                        );
                      })}
                      {loading && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading deliveries...</td></tr>
                      )}
                      {!loading && currentDeliveries.length === 0 && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24 }}>No deliveries found.</td></tr>
                      )}
                    </tbody>
                  </table>

                  {/* Deliveries Pagination */}
                  <Pagination
                    currentPage={deliveriesPage}
                    totalPages={totalDeliveryPages}
                    totalItems={sortedDeliveries.length}
                    pageSize={DELIVERIES_PER_PAGE}
                    onPageChange={setDeliveriesPage}
                    showAlways={true}
                  />
                </div>
              </div>

              {/* ---------------- Activity Feed (Opens Modal on "View all") ---------------- */}
              <div className="content-section system-logs">
                <div className="section-header">
                  <h3 className="section-title"><i className="fas fa-bolt" style={{ color: '#dc2626' }}></i> Activity Feed</h3>
                  <a
                    href="#"
                    className="view-all"
                    onClick={(e) => {
                      e.preventDefault();
                      setLogsModalPage(1);
                      setShowLogsModal(true);
                    }}
                  >
                    View all logs
                  </a>
                </div>
                <div className="section-content" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activityFeed.slice(0, 5).map((item) => (
                    <div
                      className="log-entry"
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderBottom: '1px solid #f1f5f9',
                        borderRadius: 6,
                        background: '#ffffff',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: item.color,
                            fontSize: 15,
                            border: '1px solid #e2e8f0',
                            flexShrink: 0,
                          }}
                        >
                          <i className={item.icon}></i>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                            {item.title}
                          </span>
                          {item.sub && (
                            <span style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                              {item.sub}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 12 }}>
                        {item.time}
                      </span>
                    </div>
                  ))}
                  {activityFeed.length === 0 && (
                    <div style={{ padding: 24, color: '#888', textAlign: 'center', fontSize: 13 }}>
                      No system activity recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* ---------------- Staff Accounts (Paginated & Searchable) ---------------- */}
              <div className="content-section admin-accounts" style={{ gridColumn: 'span 2' }}>
                <div className="section-header" style={{ flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <h3 className="section-title"><i className="fas fa-users-cog"></i> Staff Accounts</h3>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                      ({activeStaff.length} Active • {deactivatedStaff.length} Inactive)
                    </span>
                  </div>
                  <div className="section-controls" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search staff name, email..."
                        value={staffSearchQuery}
                        onChange={(e) => { setStaffSearchQuery(e.target.value); setStaffPage(1); }}
                        style={{
                          padding: '6px 12px 6px 30px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                          outline: 'none',
                          width: 200,
                        }}
                      />
                      <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: 9, color: '#94a3b8', fontSize: 12 }}></i>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                      <span>Rows:</span>
                      <select
                        value={staffPerPage}
                        onChange={(e) => {
                          setStaffPerPage(Number(e.target.value));
                          setStaffPage(1);
                        }}
                        style={{
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 12,
                          background: '#fff',
                          color: '#334155',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <option value={2}>2 / page</option>
                        <option value={5}>5 / page</option>
                        <option value={10}>10 / page</option>
                      </select>
                    </div>

                    {accountsView === 'active' ? (
                      <button
                        className="btn-view-inactive"
                        onClick={() => { setAccountsView('deactivated'); setStaffPage(1); }}
                      >
                        View Inactive
                      </button>
                    ) : (
                      <button
                        className="btn-view-inactive"
                        onClick={() => { setAccountsView('active'); setStaffPage(1); }}
                      >
                        View Active
                      </button>
                    )}

                    <button className="btn-add-admin" onClick={openAddModal}>
                      <i className="fas fa-plus"></i> Add Staff
                    </button>
                  </div>
                </div>

                <div className="section-content">
                  <table className="data-table admin-table">
                    <thead>
                      <tr>
                        <th>Staff ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountsView === 'active' ? (
                        currentStaff.map((staff) => {
                          const staffId = `STF${String(staff.user_id).padStart(4, '0')}`;
                          const isOpen = expandedStaffId === staff.user_id;
                          return (
                            <Fragment key={staff.user_id}>
                              <tr className="admin-row" onClick={() => toggleStaffProfile(staff.user_id)} style={{ cursor: 'pointer' }}>
                                <td>
                                  <i className={`fas fa-chevron-right caret-chevron${isOpen ? ' rotate-down' : ''}`}></i>
                                  {staffId}
                                </td>
                                <td style={{ fontWeight: 600 }}>{staff.full_name}</td>
                                <td>{staff.email}</td>
                                <td><span className="status-badge active"><i className="fas fa-circle"></i> Active</span></td>
                                <td className="action-cell">
                                  <div className="action-buttons-group">
                                    <button className="btn-edit" type="button" onClick={(e) => { e.stopPropagation(); openEditModal(staff); }}>
                                      <i className="fas fa-pen"></i> Edit
                                    </button>
                                    <button className="btn-deactivate" type="button" onClick={(e) => { e.stopPropagation(); openDeactivateModal(staff); }}>
                                      Deactivate
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isOpen && (
                                <tr className="admin-profile-row">
                                  <td colSpan="5">
                                    <div className="admin-profile-panel">
                                      <div className="profile-header"><h4><i className="fas fa-id-badge"></i> Staff Profile Details:</h4></div>
                                      <div className="profile-content">
                                        <div className="profile-details">
                                          <div className="profile-item"><i className="fas fa-user"></i><span className="label">Full Name:</span><span className="value">{staff.full_name}</span></div>
                                          <div className="profile-item"><i className="fas fa-envelope"></i><span className="label">Email Address:</span><span className="value">{staff.email}</span></div>
                                          <div className="profile-item"><i className="fas fa-phone"></i><span className="label">Phone Number:</span><span className="value">{staff.phone || 'N/A'}</span></div>
                                          <div className="profile-item"><i className="fas fa-calendar"></i><span className="label">Date Created:</span><span className="value">{formatDate(staff.created_at)}</span></div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })
                      ) : (
                        currentStaff.map((staff) => (
                          <tr key={staff.user_id} className="admin-row">
                            <td>STF{String(staff.user_id).padStart(4, '0')}</td>
                            <td style={{ fontWeight: 600 }}>{staff.full_name}</td>
                            <td>{staff.email}</td>
                            <td><span className="status-badge inactive"><i className="fas fa-circle"></i> Inactive</span></td>
                            <td className="action-cell">
                              <div className="action-buttons-group">
                                <button className="btn-restore" type="button" onClick={() => openRestoreModal(staff)}>
                                  <i className="fas fa-undo"></i> Restore
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}

                      {currentStaff.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: 24, color: '#888' }}>
                            {staffSearchQuery ? 'No staff matching search query.' : accountsView === 'active' ? 'No active staff accounts.' : 'No deactivated staff accounts.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Staff Pagination */}
                  <Pagination
                    currentPage={staffPage}
                    totalPages={totalStaffPages}
                    totalItems={filteredStaff.length}
                    pageSize={staffPerPage}
                    onPageChange={setStaffPage}
                    showAlways={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- MODAL 1: Operations Health Detailed Breakdown ---------------- */}
      {showHealthModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content modal-wide">
            <div className="modal-header modal-header-with-close">
              <div>
                <h2>Fleet Operations &amp; Readiness Breakdown</h2>
                <p style={{ fontSize: 12, margin: '4px 0 0', opacity: 0.9 }}>
                  Real-time status analysis of all company delivery vehicles and depot readiness.
                </p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowHealthModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              {/* Stat Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Fleet</span>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginTop: 2 }}>{vehicles.length} Units</div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>Active En-Route</span>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#15803d', marginTop: 2 }}>{activeVehicles.length} Units ({activePct}%)</div>
                </div>
                <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                  <span style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600, textTransform: 'uppercase' }}>Depot Available</span>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1d4ed8', marginTop: 2 }}>{availableVehicles.length} Units ({availPct}%)</div>
                </div>
                <div style={{ background: '#fffbeb', padding: '12px 14px', borderRadius: 8, border: '1px solid #fde68a' }}>
                  <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600, textTransform: 'uppercase' }}>Under Maintenance</span>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#b45309', marginTop: 2 }}>{maintenanceVehicles.length} Units ({maintPct}%)</div>
                </div>
              </div>

              {/* Tabs */}
              <div className="modal-pill-tabs">
                <button
                  className={`modal-pill-tab${healthModalTab === 'all' ? ' active' : ''}`}
                  onClick={() => setHealthModalTab('all')}
                >
                  All Fleet Units ({vehicles.length})
                </button>
                <button
                  className={`modal-pill-tab${healthModalTab === 'active' ? ' active' : ''}`}
                  onClick={() => setHealthModalTab('active')}
                >
                  Active En-Route ({activeVehicles.length})
                </button>
                <button
                  className={`modal-pill-tab${healthModalTab === 'available' ? ' active' : ''}`}
                  onClick={() => setHealthModalTab('available')}
                >
                  Depot Available ({availableVehicles.length})
                </button>
                <button
                  className={`modal-pill-tab${healthModalTab === 'maintenance' ? ' active' : ''}`}
                  onClick={() => setHealthModalTab('maintenance')}
                >
                  Maintenance / Service ({maintenanceVehicles.length})
                </button>
              </div>

              {/* Vehicle Units List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {vehicles
                  .filter((v) => {
                    const isActive = activeVehicles.some((av) => av.vehicle_id === v.vehicle_id);
                    const isMaint = maintenanceVehicles.some((mv) => mv.vehicle_id === v.vehicle_id);
                    const isAvail = !isActive && !isMaint;

                    if (healthModalTab === 'active') return isActive;
                    if (healthModalTab === 'available') return isAvail;
                    if (healthModalTab === 'maintenance') return isMaint;
                    return true;
                  })
                  .map((v) => {
                    const activeDelivery = activeDeliveryMap[v.vehicle_id];
                    const isMaint = maintenanceVehicles.some((mv) => mv.vehicle_id === v.vehicle_id);
                    const maintRecord = maintenances.find((m) => m.vehicle_id === v.vehicle_id);

                    return (
                      <div
                        key={v.vehicle_id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '14px 18px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              background: activeDelivery ? '#dcfce7' : isMaint ? '#fef3c7' : '#dbeafe',
                              color: activeDelivery ? '#16a34a' : isMaint ? '#d97706' : '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 18,
                            }}
                          >
                            <i className={activeDelivery ? 'fas fa-truck-moving' : isMaint ? 'fas fa-tools' : 'fas fa-warehouse'}></i>
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                                {v.plate_number}
                              </span>
                              <span style={{ fontSize: 13, color: '#475569' }}>
                                {v.brand} {v.model}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                              {activeDelivery ? (
                                <span>
                                  Assigned to <strong>Driver {activeDelivery.driver?.user?.full_name || 'Driver'}</strong> • Delivery DLV{String(activeDelivery.delivery_id).padStart(4, '0')}
                                </span>
                              ) : isMaint ? (
                                <span>
                                  Service: {maintRecord?.service_type || 'Routine Inspection'} ({maintRecord?.maintenance_type || 'Maintenance'})
                                </span>
                              ) : (
                                <span>Stationed at Central Depot (CDO) — Available for immediate dispatch</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          {activeDelivery ? (
                            <div>
                              <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                                IN TRANSIT
                              </span>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                {formatRoute(activeDelivery.request?.pickup_address, activeDelivery.request?.dropoff_address)}
                              </div>
                            </div>
                          ) : isMaint ? (
                            <div>
                              <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                                MAINTENANCE
                              </span>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                {maintRecord?.maintenance_date ? formatDate(maintRecord.maintenance_date) : 'In Progress'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                              STANDBY / READY
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowHealthModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 2: Dedicated Activity & System Logs Modal ---------------- */}
      {showLogsModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content modal-wide">
            <div className="modal-header modal-header-with-close">
              <div>
                <h2>System Activity &amp; Audit Logs</h2>
                <p style={{ fontSize: 12, margin: '4px 0 0', opacity: 0.9 }}>
                  Comprehensive audit trail of deliveries, customer booking requests, fleet dispatches, and system actions.
                </p>
              </div>
              <button className="btn-modal-close" onClick={() => setShowLogsModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              {/* Category Filter Pills & Search */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <div className="modal-pill-tabs" style={{ marginBottom: 0 }}>
                  {['all', 'delivery', 'request', 'fleet', 'system'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`modal-pill-tab${activityCategoryFilter === cat ? ' active' : ''}`}
                      onClick={() => { setActivityCategoryFilter(cat); setLogsModalPage(1); }}
                    >
                      {cat === 'all' ? 'All Activities' : cat === 'fleet' ? 'Fleet & Drivers' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative', width: 260 }}>
                  <input
                    type="text"
                    placeholder="Search logs by keyword, actor..."
                    value={logsModalSearch}
                    onChange={(e) => { setLogsModalSearch(e.target.value); setLogsModalPage(1); }}
                    style={{
                      width: '100%',
                      padding: '7px 12px 7px 32px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                  <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8', fontSize: 12 }}></i>
                </div>
              </div>

              {/* Logs Table */}
              {(() => {
                const LOGS_PER_PAGE = 10;
                const filtered = activityFeed.filter((item) => {
                  const matchesCat = activityCategoryFilter === 'all' || item.category === activityCategoryFilter;
                  const q = logsModalSearch.toLowerCase();
                  const matchesSearch = !q || item.title?.toLowerCase().includes(q) || item.sub?.toLowerCase().includes(q) || item.actor?.toLowerCase().includes(q) || item.role?.toLowerCase().includes(q);
                  return matchesCat && matchesSearch;
                });
                const totalPages = Math.max(1, Math.ceil(filtered.length / LOGS_PER_PAGE));
                const currentLogs = filtered.slice((logsModalPage - 1) * LOGS_PER_PAGE, logsModalPage * LOGS_PER_PAGE);

                return (
                  <>
                    <table className="data-table logs-table">
                      <thead>
                        <tr>
                          <th style={{ width: 44 }}>Type</th>
                          <th>Activity Event</th>
                          <th>Details / Route</th>
                          <th>Actor / Role</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentLogs.map((item) => (
                          <tr key={item.id}>
                            <td style={{ textAlign: 'center' }}>
                              <i className={item.icon} style={{ color: item.color, fontSize: 16 }}></i>
                            </td>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>{item.title}</td>
                            <td style={{ color: '#64748b', fontSize: 12 }}>{item.sub || '—'}</td>
                            <td>
                              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#334155' }}>
                                {item.actor} ({item.role})
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap', color: '#64748b', fontSize: 12 }}>{item.time}</td>
                          </tr>
                        ))}
                        {filtered.length === 0 && (
                          <tr><td colSpan="5" style={{ textAlign: 'center', padding: 28, color: '#888' }}>No logs match your filter criteria.</td></tr>
                        )}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    <Pagination
                      currentPage={logsModalPage}
                      totalPages={totalPages}
                      totalItems={filtered.length}
                      pageSize={LOGS_PER_PAGE}
                      onPageChange={setLogsModalPage}
                    />
                  </>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowLogsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification show">
          <div className="toast-content">
            <span className="toast-message"><i className="fas fa-check-circle"></i> {toast.message}</span>
            <button className="btn-undo" onClick={undoDeactivate}><i className="fa fa-undo"></i> Undo</button>
          </div>
        </div>
      )}

      {/* Deactivate confirmation */}
      {showDeactivateModal && (
        <div className="modal deactivate-modal" style={{ display: 'block' }}>
          <div className="modal-content deactivate-content">
            <div className="deactivate-body">
              <div className="deactivate-header">
                <div className="deactivate-icon"><i className="fas fa-trash-alt"></i></div>
                <h3>Deactivate Staff Account</h3>
              </div>
              <p>Are you sure you want to deactivate staff <span className="admin-name-highlight">{selectedStaff?.full_name}</span>? The account will be moved to Inactive Accounts.</p>
              <div className="deactivate-actions">
                <button className="btn-cancel-deactivate" onClick={() => setShowDeactivateModal(false)}>Cancel</button>
                <button className="btn-confirm-deactivate" onClick={confirmDeactivate}>Deactivate</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore confirmation */}
      {showRestoreModal && (
        <div className="modal restore-modal" style={{ display: 'block' }}>
          <div className="modal-content restore-content">
            <div className="restore-body">
              <div className="restore-header"><div className="restore-icon"><i className="fas fa-user-check"></i></div><h3>Restore Staff Account</h3></div>
              <p>Are you sure you want to restore staff <span className="admin-name-highlight">{selectedStaff?.full_name}</span>? The account will be moved back to Active Accounts.</p>
              <div className="restore-actions">
                <button className="btn-cancel-restore" onClick={() => setShowRestoreModal(false)}>Cancel</button>
                <button className="btn-confirm-restore" onClick={confirmRestore}>Restore</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit staff */}
      {showEditModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-header"><h2>Edit Staff Information</h2></div>
            <div className="modal-body">
              {formError && <div className="form-error" style={{ color: '#d32f2f', marginBottom: 12 }}>{formError}</div>}
              <form className="edit-form" onSubmit={(e) => e.preventDefault()}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name<span className="required">*</span></label>
                    <input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address<span className="required">*</span></label>
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number<span className="required">*</span></label>
                    <input
                      type="text"
                      value={editForm.phone}
                      maxLength={11}
                      placeholder="09XXXXXXXXX"
                      onChange={(e) => setEditForm({ ...editForm, phone: formatPhoneInput(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="password-section">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={editForm.changePassword} onChange={(e) => setEditForm({ ...editForm, changePassword: e.target.checked })} />
                    <span>Change password</span>
                  </label>
                  {editForm.changePassword && (
                    <div className="password-fields show">
                      <div className="form-row">
                        <div className="form-group password-group">
                          <label>New password</label>
                          <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                        </div>
                        <div className="form-group password-group">
                          <label>Confirm password</label>
                          <input type="password" value={editForm.confirmPassword} onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="password-hint">Leave unchecked to keep the current password.</p>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-save" onClick={saveStaffChanges} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add staff */}
      {showAddModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <div className="modal-header"><h2>Add New Staff Account</h2></div>
            <div className="modal-body">
              {formError && <div className="form-error" style={{ color: '#d32f2f', marginBottom: 12 }}>{formError}</div>}
              <form className="edit-form" onSubmit={(e) => e.preventDefault()}>
                <h4 className="form-section-title">Account Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name<span className="required">*</span></label>
                    <input type="text" value={addForm.full_name} onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address<span className="required">*</span></label>
                    <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number<span className="required">*</span></label>
                    <input
                      type="text"
                      value={addForm.phone}
                      maxLength={11}
                      placeholder="09XXXXXXXXX"
                      onChange={(e) => setAddForm({ ...addForm, phone: formatPhoneInput(e.target.value) })}
                    />
                  </div>
                </div>
                <h4 className="form-section-title">Security</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>New password<span className="required">*</span></label>
                    <input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Confirm password<span className="required">*</span></label>
                    <input type="password" value={addForm.confirmPassword} onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })} />
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-save" onClick={saveNewStaff} disabled={saving}>{saving ? 'Adding...' : 'Add Staff'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default OverviewPage;