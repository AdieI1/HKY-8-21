import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import NotificationBell from '../components/NotificationBell';
import TableSkeleton from '../components/TableSkeleton';
import StaffWeatherCard from '../components/dashboard/StaffWeatherCard';
import reverb from '../utils/reverb';

const DELIVERY_STAGE_LABELS = {
  assigned: 'Dispatched',
  accepted: 'On Route',
  arrived_pickup: 'Arrived at Pickup',
  loading_cargo: 'Loading Cargo',
  out_for_delivery: 'On Delivery',
  in_transit: 'On Delivery',
  arrived_dropoff: 'Arrived at Drop-off',
  unloading_cargo: 'Unloading Cargo',
  delivered: 'Unloading Cargo',
  returning_to_hq: 'Returning to HQ',
  completed: 'Complete',
};

const DELIVERY_STAGE_CELL_TYPES = {
  assigned: 'dispatched',
  accepted: 'on-route',
  arrived_pickup: 'arrived-pickup',
  loading_cargo: 'loading-cargo',
  out_for_delivery: 'on-delivery',
  in_transit: 'on-delivery',
  arrived_dropoff: 'arrived-dropoff',
  unloading_cargo: 'unloading-cargo',
  delivered: 'unloading-cargo',
  returning_to_hq: 'returning-hq',
  completed: 'complete',
};

const DELIVERY_STAGE_COLORS = {
  dispatched: { bg: '#F3E8FF', color: '#9333EA', border: '#D8B4FE', solid: '#9333EA', label: 'Dispatched' },
  'on-route': { bg: '#DBEAFE', color: '#2563EB', border: '#BFDBFE', solid: '#2563EB', label: 'On Route' },
  'arrived-pickup': { bg: '#CCFBF1', color: '#0D9488', border: '#99F6E4', solid: '#0D9488', label: 'Arrived at Pickup' },
  'loading-cargo': { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A', solid: '#D97706', label: 'Loading Cargo' },
  'on-delivery': { bg: '#DBEAFE', color: '#2563EB', border: '#BFDBFE', solid: '#2563EB', label: 'On Delivery' },
  'arrived-dropoff': { bg: '#ECFCCB', color: '#65A30D', border: '#D9F99D', solid: '#65A30D', label: 'Arrived at Drop-off' },
  'unloading-cargo': { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A', solid: '#D97706', label: 'Unloading Cargo' },
  'returning-hq': { bg: '#FFEDD5', color: '#EA580C', border: '#FED7AA', solid: '#EA580C', label: 'Returning to HQ' },
  complete: { bg: '#DCFCE7', color: '#16A34A', border: '#86EFAC', solid: '#16A34A', label: 'Complete' },
  delayed: { bg: '#FEF2F2', color: '#DC2626', border: '#EF4444', solid: '#EF4444', label: 'Delayed / Overdue' },
  accident: { bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5', solid: '#DC2626', label: 'Accident Reported' },
  available: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', solid: '#22C55E', label: 'Available' },
  'on-break': { bg: '#F8FAFC', color: '#475569', border: '#CBD5E1', solid: '#94A3B8', label: 'Under Maintenance' },
};

function cellClass(type) {
  if (type === 'accident' || type === 'broken') return 'adm-fleet-cell accident';
  if (type === 'delayed') return 'adm-fleet-cell delayed';
  if (type === 'dispatched' || type === 'assigned' || type === 'scheduled') return 'adm-fleet-cell dispatched';
  if (type === 'on-route' || type === 'accepted') return 'adm-fleet-cell on-route';
  if (type === 'arrived-pickup' || type === 'arrived_pickup') return 'adm-fleet-cell arrived-pickup';
  if (type === 'loading-cargo' || type === 'loading_cargo') return 'adm-fleet-cell loading-cargo';
  if (type === 'on-delivery' || type === 'out_for_delivery' || type === 'in_transit' || type === 'delivery') return 'adm-fleet-cell on-delivery';
  if (type === 'arrived-dropoff' || type === 'arrived_dropoff') return 'adm-fleet-cell arrived-dropoff';
  if (type === 'unloading-cargo' || type === 'unloading_cargo' || type === 'delivered') return 'adm-fleet-cell unloading-cargo';
  if (type === 'returning-hq' || type === 'returning_to_hq') return 'adm-fleet-cell returning-hq';
  if (type === 'complete' || type === 'completed') return 'adm-fleet-cell complete';
  if (type === 'available') return 'adm-fleet-cell available';
  if (type === 'break' || type === 'maintenance') return 'adm-fleet-cell on-break';
  return 'adm-fleet-cell empty';
}

function driverCode(id) {
  return `DR${String(id || 0).padStart(3, '0')}`;
}

function timeAgo(dateString) {
  if (!dateString) return 'Recently';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Recently';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hr${diffHour > 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

function getCurrentWeekDays(offsetWeeks = 0) {
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday + (offsetWeeks * 7));

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
    return {
      key,
      label: dayLabels[i],
      date: `${dayNum} ${monthStr}`,
      highlight: d.toDateString() === now.toDateString(),
      iso: `${yyyy}-${mm}-${dd}`,
    };
  });
}

function getWeekOffsetForDate(dateStr) {
  if (!dateStr) return 0;
  const targetDate = new Date(dateStr);
  const now = new Date();

  const currentDayOfWeek = now.getDay();
  const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const currentMonday = new Date(now);
  currentMonday.setDate(now.getDate() + distanceToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const targetDayOfWeek = targetDate.getDay();
  const targetDistanceToMonday = targetDayOfWeek === 0 ? -6 : 1 - targetDayOfWeek;
  const targetMonday = new Date(targetDate);
  targetMonday.setDate(targetDate.getDate() + targetDistanceToMonday);
  targetMonday.setHours(0, 0, 0, 0);

  const diffDays = Math.round((targetMonday.getTime() - currentMonday.getTime()) / (1000 * 60 * 60 * 24));
  return Math.round(diffDays / 7);
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

function formatShortDriver(fullName) {
  if (!fullName) return '';
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function getTodayIso() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDeliveryDateRange(d) {
  let startDate = '';
  if (d.request?.scheduled_date) {
    startDate = String(d.request.scheduled_date).slice(0, 10);
  } else if (d.trip_date) {
    startDate = String(d.trip_date).slice(0, 10);
  } else if (d.start_time) {
    startDate = String(d.start_time).slice(0, 10);
  } else if (d.created_at) {
    startDate = String(d.created_at).slice(0, 10);
  }

  if (!startDate) return null;

  let endDate = startDate;
  const isCompleted = ['completed', 'delivered'].includes(d.status);
  const isInTransit = ['out_for_delivery', 'in_transit'].includes(d.status);
  const isScheduled = Boolean(d.request?.is_scheduled || d.request?.scheduled_date);

  if (isCompleted) {
    if (d.end_time) {
      endDate = String(d.end_time).slice(0, 10);
    } else if (d.updated_at) {
      endDate = String(d.updated_at).slice(0, 10);
    }
    if (endDate < startDate) endDate = startDate;
  } else if (isScheduled && !isInTransit) {
    // Scheduled deliveries that have NOT physically departed yet are strictly anchored to their scheduled date
    endDate = startDate;
  } else if (isInTransit) {
    // Active in-transit trips on the road span from start date up to today (local time)
    const todayIso = getTodayIso();
    endDate = todayIso >= startDate ? todayIso : startDate;
  } else {
    // Standard assigned / accepted deliveries stay on their trip/start date until in transit
    endDate = startDate;
  }

  return { startDate, endDate, isCompleted, isActive: isInTransit || ['assigned', 'accepted', 'loading_cargo', 'arrived_pickup'].includes(d.status) };
}

function isIncidentResolved(inc) {
  if (!inc) return true;
  if (inc.resolved_at) return true;
  if (['resolved', 'closed', 'relief_dispatched', 'resolved_relief'].includes(inc.status)) return true;
  if (inc.delivery?.is_relief) return true;
  if (inc.resolution_action === 'dispatch_relief' || inc.resolution_action === 'mark_resolved') return true;
  if (inc.delivery?.driver_id && inc.delivery?.stranded_driver_id && Number(inc.delivery.driver_id) !== Number(inc.delivery.stranded_driver_id)) return true;
  if (inc.delivery?.vehicle_id && inc.delivery?.stranded_vehicle_id && Number(inc.delivery.vehicle_id) !== Number(inc.delivery.stranded_vehicle_id)) return true;
  return false;
}

function StaffDashboardPage() {
  const [currentDate, setCurrentDate] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekDays, setWeekDays] = useState(() => getCurrentWeekDays(0));
  const [fleetList, setFleetList] = useState([]);
  const [rawVehicles, setRawVehicles] = useState([]);
  const [rawDeliveries, setRawDeliveries] = useState([]);
  const [rawDrivers, setRawDrivers] = useState([]);
  const [rawMaintenances, setRawMaintenances] = useState([]);
  const [rawIncidents, setRawIncidents] = useState([]);
  const [actionItems, setActionItems] = useState([]);
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
  const [driversSummary, setDriversSummary] = useState({
    available: 0,
    onTrip: 0,
    onBreak: 0,
    offline: 0,
    total: 0,
  });
  const [summaryTab, setSummaryTab] = useState('both'); // 'both' | 'vehicles' | 'drivers'
  const [actionPage, setActionPage] = useState(1);
  const ACTION_PAGE_SIZE = 5;
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [stats, setStats] = useState({
    activeDeliveries: 0,
    scheduledDeliveries: 0,
    pendingRequests: 0,
    availableDrivers: 0,
    availableVehicles: 0,
  });
  const [selectedCell, setSelectedCell] = useState(null);

  const upcomingScheduledDeliveries = useMemo(() => {
    const list = [];
    const todayIso = getTodayIso();
    rawDeliveries.forEach((d) => {
      const sDate = d.request?.scheduled_date ? String(d.request.scheduled_date).slice(0, 10) : null;
      if (sDate && !['completed', 'cancelled'].includes(d.status)) {
        const isPastDue = sDate < todayIso;
        const isDelayed = Boolean(d.is_delayed || isPastDue);
        const delayDays = isPastDue
          ? Math.max(1, Math.round((new Date(todayIso).getTime() - new Date(sDate).getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        const dateObj = new Date(sDate);
        const shortDate = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : sDate;

        const isUnassigned = !d.vehicle_id;
        list.push({
          id: `DLV${String(d.delivery_id).padStart(4, '0')}`,
          deliveryId: d.delivery_id,
          date: sDate,
          shortDate,
          time: d.request?.scheduled_time_slot || 'Standard',
          driver: d.driver?.user?.full_name || (isUnassigned ? 'Awaiting Driver' : 'Assigned Driver'),
          vehicle: d.vehicle ? `${d.vehicle.model || d.vehicle.brand || 'Vehicle'} (${d.vehicle.plate_number})` : 'Awaiting Vehicle',
          vehicleId: d.vehicle_id,
          isUnassigned,
          destination: shortCity(d.request?.dropoff_address),
          item: d.request?.item_name || 'Cargo',
          status: d.status,
          isDelayed,
          delayDays,
          statusLabel: isUnassigned
            ? (isDelayed ? 'Delayed (Pending Dispatch)' : 'Pending Dispatch')
            : (DELIVERY_STAGE_LABELS[d.status] || 'Dispatched'),
        });
      }
    });

    list.sort((a, b) => {
      if (a.isDelayed && !b.isDelayed) return -1;
      if (!a.isDelayed && b.isDelayed) return 1;
      if (a.isDelayed && b.isDelayed) return b.delayDays - a.delayDays;
      return a.date.localeCompare(b.date);
    });

    return list;
  }, [rawDeliveries]);

  useEffect(() => {
    const update = () => setCurrentDate(new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const buildFleetSchedule = useCallback((vehiclesList, deliveriesList, driversList, maintenancesList, incidentsList, offset) => {
    const days = getCurrentWeekDays(offset);
    setWeekDays(days);

    if (!vehiclesList || vehiclesList.length === 0) {
      setFleetList([]);
      return;
    }

    const mappedFleet = vehiclesList.map((v, idx) => {
      const vehId = `VCL${String(v.vehicle_id || idx + 1).padStart(3, '0')}`;
      const model = v.model || v.brand || 'Truck';
      const plate = v.plate_number || 'XYZ 1213';
      const vehicleType = v.vehicle_type || 'Active Fleet';

      const vehicleDeliveries = (deliveriesList || []).filter((d) => Number(d.vehicle_id) === Number(v.vehicle_id));

      const schedule = days.map((day) => {
        // Multi-day date span matching: A delivery is active across all days in [startDate, endDate]
        const dayDeliveries = vehicleDeliveries.filter((d) => {
          const range = getDeliveryDateRange(d);
          if (!range) return false;
          return day.iso >= range.startDate && day.iso <= range.endDate;
        });

        // Check if there is an accident or breakdown report for this vehicle/day
        const todayIso = getTodayIso();
        const dayIncident = (incidentsList || []).find((inc) => {
          // If already resolved or relief assigned, ignore
          if (isIncidentResolved(inc)) return false;

          // Check if vehicle matches the broken vehicle (not relief truck)
          const brokenVehId = inc.vehicle_id || inc.delivery?.stranded_vehicle_id;
          const vehMatch = brokenVehId ? Number(brokenVehId) === Number(v.vehicle_id) : (Number(inc.delivery?.vehicle_id) === Number(v.vehicle_id));
          if (!vehMatch) return false;

          // Accidents never occur on future days
          if (day.iso > todayIso) return false;

          const incDate = inc.incident_date
            ? String(inc.incident_date).slice(0, 10)
            : (inc.reported_at ? String(inc.reported_at).slice(0, 10) : (inc.created_at ? String(inc.created_at).slice(0, 10) : ''));

          // 1. Matches the specific date of the accident report
          if (incDate === day.iso) return true;

          // 2. Or the vehicle is currently broken today and the incident is still under investigation/unresolved
          const isUnresolved = !inc.status || inc.status === 'investigating' || inc.status === 'pending';
          if (day.highlight && v.status === 'broken' && isUnresolved) return true;

          return false;
        });

        // Check if there is a maintenance record whose date range covers this day
        const dayMaintenance = (maintenancesList || []).find((m) => {
          if (Number(m.vehicle_id) !== Number(v.vehicle_id)) return false;
          if (m.status === 'cancelled') return false;
          const start = m.maintenance_date ? String(m.maintenance_date).slice(0, 10) : '';
          const end = m.next_maintenance_date ? String(m.next_maintenance_date).slice(0, 10) : (m.end_date ? String(m.end_date).slice(0, 10) : start);
          if (start && day.iso >= start && day.iso <= (end || start)) return true;
          if (['in_progress', 'scheduled', 'pending'].includes(m.status) && day.highlight && v.status === 'maintenance') return true;
          return false;
        });

        let cellType = 'available';
        let statusText = 'Available';
        let driverName = '';
        let routeText = '';
        let extraText = '';

        if (dayIncident && (v.status === 'broken' || ['accident', 'vehicle_breakdown', 'breakdown', 'damage', 'mechanical'].some((t) => (dayIncident.incident_type || '').toLowerCase().includes(t)))) {
          cellType = 'accident';
          statusText = '⚠️ Accident Reported';
          const incDriver = dayIncident.driver?.user?.full_name || dayDeliveries[0]?.driver?.user?.full_name;
          driverName = formatShortDriver(incDriver);
          const pAddr = dayDeliveries[0]?.request?.pickup_address || dayIncident.delivery?.request?.pickup_address;
          const dAddr = dayDeliveries[0]?.request?.dropoff_address || dayIncident.delivery?.request?.dropoff_address;
          routeText = formatRoute(pAddr, dAddr);
        } else if (dayDeliveries.length > 0) {
          const activeDel = dayDeliveries.find((d) =>
            ['assigned', 'accepted', 'arrived_pickup', 'loading_cargo', 'out_for_delivery', 'in_transit', 'arrived_dropoff', 'unloading_cargo', 'delivered', 'returning_to_hq'].includes(d.status)
          );
          const scheduledDel = dayDeliveries.find((d) =>
            d.request?.is_scheduled || (d.request?.scheduled_date && String(d.request.scheduled_date).slice(0, 10) === day.iso)
          );

          if (activeDel) {
            const sDate = activeDel.request?.scheduled_date ? String(activeDel.request.scheduled_date).slice(0, 10) : null;
            const isPastDue = sDate && sDate < todayIso;
            const isDelayedOrOverdue = Boolean(
              activeDel.is_delayed ||
              (isPastDue && !['completed', 'delivered'].includes(activeDel.status))
            );

            const stageLabel = DELIVERY_STAGE_LABELS[activeDel.status] || 'Dispatched';
            const stageCellType = DELIVERY_STAGE_CELL_TYPES[activeDel.status] || 'on-delivery';

            if (isDelayedOrOverdue) {
              cellType = 'delayed';
              statusText = `Delayed (${stageLabel})`;
            } else {
              cellType = stageCellType;
              statusText = stageLabel;
            }

            driverName = formatShortDriver(activeDel.driver?.user?.full_name);
            routeText = formatRoute(activeDel.request?.pickup_address, activeDel.request?.dropoff_address);
            if (dayDeliveries.length > 1) {
              extraText = `+${dayDeliveries.length - 1} more trip`;
            }
          } else if (scheduledDel) {
            const sDate = scheduledDel.request?.scheduled_date ? String(scheduledDel.request.scheduled_date).slice(0, 10) : null;
            const isPastDue = sDate && sDate < todayIso;
            const isDelayedOrOverdue = Boolean(scheduledDel.is_delayed || isPastDue);

            const stageLabel = DELIVERY_STAGE_LABELS[scheduledDel.status] || 'Dispatched';
            const stageCellType = DELIVERY_STAGE_CELL_TYPES[scheduledDel.status] || 'dispatched';

            if (isDelayedOrOverdue) {
              cellType = 'delayed';
              statusText = `Delayed (${stageLabel})`;
            } else {
              cellType = stageCellType;
              statusText = stageLabel;
            }

            driverName = formatShortDriver(scheduledDel.driver?.user?.full_name);
            routeText = formatRoute(scheduledDel.request?.pickup_address, scheduledDel.request?.dropoff_address);
            if (dayDeliveries.length > 1) {
              extraText = `+${dayDeliveries.length - 1} more trip`;
            }
          } else {
            cellType = 'complete';
            const firstDel = dayDeliveries[0];
            statusText = 'Complete';
            driverName = formatShortDriver(firstDel.driver?.user?.full_name);
            routeText = formatRoute(firstDel.request?.pickup_address, firstDel.request?.dropoff_address);
            if (dayDeliveries.length > 1) {
              extraText = `${dayDeliveries.length} Trips Done`;
            }
          }
        } else if (dayMaintenance) {
          cellType = 'break';
          statusText = 'Under Maintenance';
          routeText = dayMaintenance.maintenance_type || dayMaintenance.service_type || 'Preventive Service';
        } else if (day.key === 'sat' || day.key === 'sun') {
          cellType = 'empty';
          statusText = '–';
        } else {
          cellType = 'available';
          statusText = 'Available';
        }

        let cellLabel = statusText;
        if (driverName) cellLabel += `\n👤 ${driverName}`;
        if (routeText) cellLabel += `\n${routeText}`;
        if (extraText) cellLabel += `\n${extraText}`;

        return {
          day: day.key,
          label: cellLabel,
          statusText,
          driverName,
          routeText,
          extraText,
          type: cellType,
          deliveries: dayDeliveries,
          incident: dayIncident,
          maintenance: dayMaintenance,
        };
      });

      return { id: vehId, model, plate, vehicleType, schedule, photo_url: v.photo_url, rawVehicle: v };
    });

    setFleetList(mappedFleet);
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      let deliveries = [];
      let requests = [];
      let drivers = [];
      let vehicles = [];
      let maintenances = [];
      let incidents = [];
      let systemLogs = [];

      try {
        // Fast single endpoint
        const res = await api.get('/dashboard/overview');
        if (res.data) {
          deliveries = res.data.deliveries || [];
          requests = res.data.requests || [];
          drivers = res.data.drivers || [];
          vehicles = res.data.vehicles || [];
          maintenances = res.data.maintenances || [];
          incidents = res.data.incidents || [];
          systemLogs = res.data.system_logs || [];
        }
      } catch (_) {
        // Fallback to individual endpoints if needed
        const [delRes, reqRes, drvRes, vehRes, mntRes, incRes, logRes] = await Promise.all([
          api.get('/deliveries').catch(() => ({ data: [] })),
          api.get('/delivery-requests').catch(() => ({ data: [] })),
          api.get('/drivers').catch(() => ({ data: [] })),
          api.get('/vehicles').catch(() => ({ data: [] })),
          api.get('/vehicle-maintenances').catch(() => ({ data: [] })),
          api.get('/incident-reports').catch(() => ({ data: [] })),
          api.get('/system-logs').catch(() => ({ data: [] })),
        ]);
        deliveries = Array.isArray(delRes.data) ? delRes.data : [];
        requests = Array.isArray(reqRes.data) ? reqRes.data : [];
        drivers = Array.isArray(drvRes.data) ? drvRes.data : [];
        vehicles = Array.isArray(vehRes.data) ? vehRes.data : [];
        maintenances = Array.isArray(mntRes.data) ? mntRes.data : [];
        incidents = Array.isArray(incRes.data) ? incRes.data : [];
        systemLogs = Array.isArray(logRes.data) ? logRes.data : [];
      }

      const activeDel = deliveries.filter((d) => ['assigned', 'accepted', 'out_for_delivery', 'in_transit', 'loading_cargo', 'arrived_pickup'].includes(d.status)).length;
      const scheduledDelCount = deliveries.filter(
        (d) => (d.request?.is_scheduled || d.request?.scheduled_date) && !['completed', 'cancelled'].includes(d.status)
      ).length + requests.filter(
        (r) => (r.is_scheduled || r.scheduled_date) && ['pending', 'approved'].includes(r.status) && !deliveries.some((d) => Number(d.request_id) === Number(r.request_id))
      ).length;
      const pendingReq = requests.filter((r) => r.status === 'pending').length;
      const availDrivers = drivers.filter((d) => (d.status === 'active' || d.status === 'available') && d.availability_status !== 'busy').length;
      const availVehicles = vehicles.filter((v) => (v.status === 'available' || v.status === 'active')).length;

      setStats({
        activeDeliveries: activeDel,
        scheduledDeliveries: scheduledDelCount,
        pendingRequests: pendingReq,
        availableDrivers: availDrivers,
        availableVehicles: availVehicles,
      });

      // ── Action Required (Aggregates Overdue & Delayed Deliveries, Incidents, and Requests) ──
      const todayIso = getTodayIso();
      const actionItemsList = [];

      // 1. Delayed & Overdue Deliveries
      deliveries.forEach((d) => {
        if (['completed', 'cancelled'].includes(d.status)) return;
        const sDate = d.request?.scheduled_date ? String(d.request.scheduled_date).slice(0, 10) : null;
        const isPastDue = sDate && sDate < todayIso;
        const isDelayed = Boolean(d.is_delayed || isPastDue);

        if (isDelayed || (['assigned', 'accepted', 'pending'].includes(d.status) && (Date.now() - new Date(d.created_at || d.updated_at).getTime()) / (1000 * 60 * 60 * 24) >= 2)) {
          const delayDays = isPastDue
            ? Math.max(1, Math.round((new Date(todayIso).getTime() - new Date(sDate).getTime()) / (1000 * 60 * 60 * 24)))
            : Math.max(1, Math.round((Date.now() - new Date(d.created_at || d.updated_at).getTime()) / (1000 * 60 * 60 * 24)));

          const isUnassigned = !d.vehicle_id;
          const stageLabel = isUnassigned
            ? (d.status === 'pending' ? 'Pending Dispatch' : 'Awaiting Unit')
            : (DELIVERY_STAGE_LABELS[d.status] || 'Dispatched');
          const stageCellType = isUnassigned ? 'dispatched' : (DELIVERY_STAGE_CELL_TYPES[d.status] || 'dispatched');

          actionItemsList.push({
            id: `DLV${String(d.delivery_id).padStart(4, '0')}`,
            type: 'delivery',
            rawId: d.delivery_id,
            customer: d.request?.customer?.full_name || 'Customer',
            item: d.request?.item_name || 'Cargo',
            route: formatRoute(d.request?.pickup_address, d.request?.dropoff_address),
            driver: d.driver?.user?.full_name || (isUnassigned ? 'Unassigned Driver' : 'Assigned Driver'),
            vehicle: d.vehicle ? `${d.vehicle.model || d.vehicle.brand || 'Unit'} (${d.vehicle.plate_number})` : 'Unassigned Unit',
            date: sDate || String(d.created_at).slice(0, 10),
            urgency: 'delayed',
            delayDays,
            isUnassigned,
            statusKey: d.status,
            statusLabel: `Delayed (${stageLabel})`,
            stageType: stageCellType,
            targetOffset: sDate ? getWeekOffsetForDate(sDate) : 0,
            createdTime: new Date(d.created_at || Date.now()).getTime(),
            rawDelivery: d,
          });
        }
      });

      // 2. Incident & Breakdown reports requiring action
      incidents.forEach((inc) => {
        if (isIncidentResolved(inc)) return;

        actionItemsList.push({
          id: `INC${String(inc.incident_id || 1).padStart(4, '0')}`,
          type: 'incident',
          rawId: inc.incident_id,
          deliveryId: inc.delivery_id || inc.delivery?.delivery_id || null,
          customer: inc.delivery?.request?.customer?.full_name || inc.driver?.user?.full_name || 'Customer / Driver',
          item: (inc.incident_type || 'Vehicle Breakdown').replace(/_/g, ' ').toUpperCase(),
          route: formatRoute(inc.delivery?.request?.pickup_address, inc.delivery?.request?.dropoff_address),
          driver: inc.delivery?.driver?.user?.full_name || inc.driver?.user?.full_name || 'Assigned Driver',
          vehicle: inc.delivery?.vehicle ? `${inc.delivery.vehicle.model || inc.delivery.vehicle.brand} (${inc.delivery.vehicle.plate_number})` : (inc.vehicle ? `${inc.vehicle.model || inc.vehicle.brand} (${inc.vehicle.plate_number})` : 'Vehicle'),
          date: String(inc.incident_date || inc.reported_at || inc.created_at || todayIso).slice(0, 10),
          urgency: 'critical',
          statusLabel: 'Accident Reported',
          stageType: 'accident',
          targetOffset: 0,
          createdTime: new Date(inc.created_at || Date.now()).getTime(),
          rawIncident: inc,
        });
      });

      // 3. Pending & Overdue Requests
      requests.forEach((r) => {
        if (r.status !== 'pending') return;
        const created = new Date(r.created_at);
        const daysOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        const isOver = daysOld >= 2 || (r.scheduled_date && String(r.scheduled_date).slice(0, 10) < todayIso);

        actionItemsList.push({
          id: `REQ${String(r.request_id).padStart(4, '0')}`,
          type: 'request',
          rawId: r.request_id,
          customer: r.customer?.full_name || 'Customer',
          item: r.item_name || r.cargo_type || 'Cargo',
          route: formatRoute(r.pickup_address, r.dropoff_address),
          driver: 'Unassigned',
          vehicle: 'Unassigned',
          date: created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          urgency: isOver ? 'overdue' : 'pending',
          daysOld: Math.floor(daysOld),
          statusLabel: isOver ? 'Overdue Request' : 'Pending Dispatch',
          stageType: isOver ? 'delayed' : 'dispatched',
          targetOffset: r.scheduled_date ? getWeekOffsetForDate(r.scheduled_date) : 0,
          createdTime: created.getTime(),
          rawRequest: r,
        });
      });

      // Priority sort: delayed dispatches & critical incidents first, then overdue requests, then standard requests
      actionItemsList.sort((a, b) => {
        const order = { delayed: 1, critical: 2, overdue: 3, pending: 4 };
        const diff = (order[a.urgency] || 5) - (order[b.urgency] || 5);
        if (diff !== 0) return diff;
        return a.createdTime - b.createdTime;
      });

      setActionItems(actionItemsList);

      // ── Connected Dynamic Vehicles Summary ──
      const activeDeliveryVehIds = new Set(
        deliveries
          .filter((d) => ['assigned', 'accepted', 'out_for_delivery', 'in_transit', 'loading_cargo', 'arrived_pickup'].includes(d.status))
          .map((d) => Number(d.vehicle_id))
          .filter(Boolean)
      );

      // ── Dynamic Vehicles Summary (100% In Sync with Vehicle Management) ──
      const maintenanceCount = vehicles.filter((v) => ['maintenance', 'broken', 'in_shop', 'under_maintenance'].includes(v.status?.toLowerCase())).length;
      const inTransitCount = vehicles.filter((v) => !['maintenance', 'broken', 'in_shop'].includes(v.status?.toLowerCase()) && (activeDeliveryVehIds.has(Number(v.vehicle_id)) || v.status === 'in_use')).length;
      const onBreakCount = vehicles.filter((v) => {
        return !activeDeliveryVehIds.has(Number(v.vehicle_id)) && (v.status === 'on_break' || v.status === 'standby');
      }).length;

      const availableCount = Math.max(0, vehicles.length - inTransitCount - maintenanceCount - onBreakCount);

      setVehiclesSummary({
        available: availableCount,
        inTransit: inTransitCount,
        onBreak: onBreakCount,
        underMaintenance: maintenanceCount,
        total: vehicles.length,
      });

      // ── Dynamic Drivers Summary ──
      const activeDeliveryDriverIds = new Set(
        deliveries
          .filter((d) => ['assigned', 'accepted', 'out_for_delivery', 'in_transit', 'loading_cargo', 'arrived_pickup'].includes(d.status))
          .map((d) => Number(d.driver_id))
          .filter(Boolean)
      );

      const driversOnTrip = drivers.filter((dr) => activeDeliveryDriverIds.has(Number(dr.driver_id))).length;
      const driversOnBreak = drivers.filter((dr) => !activeDeliveryDriverIds.has(Number(dr.driver_id)) && (dr.availability_status === 'busy' || dr.availability_status === 'on_break')).length;
      const driversAvailable = Math.max(0, drivers.length - driversOnTrip - driversOnBreak);

      setDriversSummary({
        available: driversAvailable,
        onTrip: driversOnTrip,
        onBreak: driversOnBreak,
        total: drivers.length,
      });

      // ── Connected Dynamic Activity Feed ──
      const dynamicActivities = [];

      // 1. Deliveries Activity
      deliveries.forEach((d) => {
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
            time: timeAgo(rawTime),
            timeMs,
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

      // 3. Driver Availability (Only show 'on break' if not on an active delivery)
      const activeDriverIds = new Set(
        deliveries
          .filter((d) => ['assigned', 'accepted', 'out_for_delivery', 'in_transit', 'loading_cargo', 'arrived_pickup'].includes(d.status))
          .map((d) => Number(d.driver_id))
      );

      drivers.forEach((dr) => {
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
            time: timeAgo(rawTime),
            timeMs: rawTime ? new Date(rawTime).getTime() : 0,
          });
        } else if (dr.availability_status === 'busy' && !isAssigned) {
          dynamicActivities.push({
            id: `drv-${dr.driver_id}`,
            category: 'fleet',
            icon: 'fas fa-coffee',
            color: '#F59E0B',
            title: `Driver ${dr.user?.full_name || 'Driver'} (${driverCode(dr.driver_id)}) is on break.`,
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

      // 5. Incident Reports (Deduplicated and accurate timestamp)
      const seenIncidents = new Set();
      incidents.forEach((inc) => {
        const incId = inc.incident_id || inc.report_id || inc.id;
        if (!incId || seenIncidents.has(incId)) return;
        seenIncidents.add(incId);

        const rawTime = inc.reported_at || inc.created_at || inc.incident_date;
        const timeMs = rawTime ? new Date(rawTime).getTime() : 0;
        dynamicActivities.push({
          id: `inc-${incId}`,
          category: 'fleet',
          icon: 'fas fa-exclamation-circle',
          color: '#EF4444',
          title: `Incident: ${(inc.incident_type || 'Issue reported').replace(/_/g, ' ')}`,
          sub: inc.description || 'Reported during trip',
          time: timeAgo(rawTime),
          timeMs,
        });
      });

      // 6. System Logs (Latest audit records, newest first)
      const seenLogs = new Set();
      (systemLogs || []).forEach((log) => {
        const logId = log.log_id || log.id;
        if (!logId || seenLogs.has(logId)) return;
        seenLogs.add(logId);

        const rawTime = log.timestamp || log.created_at;
        const timeMs = rawTime ? new Date(rawTime).getTime() : 0;
        dynamicActivities.push({
          id: `log-${logId}`,
          category: 'system',
          icon: 'fas fa-shield-alt',
          color: '#8B5CF6',
          title: `${log.user?.full_name || 'Staff User'}: ${log.action}`,
          sub: 'System audit log',
          time: timeAgo(rawTime),
          timeMs,
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

      setRawVehicles(vehicles);
      setRawDeliveries(deliveries);
      setRawDrivers(drivers);
      setRawMaintenances(maintenances);
      setRawIncidents(incidents);

      buildFleetSchedule(vehicles, deliveries, drivers, maintenances, incidents, weekOffset);
    } finally {
      setLoadingCalendar(false);
    }
  }, [buildFleetSchedule, weekOffset]);

  useEffect(() => {
    if (rawVehicles.length > 0) {
      buildFleetSchedule(rawVehicles, rawDeliveries, rawDrivers, rawMaintenances, rawIncidents, weekOffset);
    }
  }, [weekOffset, rawVehicles, rawDeliveries, rawDrivers, rawMaintenances, rawIncidents, buildFleetSchedule]);

  useEffect(() => {
    loadDashboardData();

    // Instant real-time updates via Laravel Reverb WebSocket
    const unsub1 = reverb.subscribe('deliveries', 'delivery.updated', () => {
      loadDashboardData();
    });
    const unsub2 = reverb.subscribe('system-notifications', 'notification.created', () => {
      loadDashboardData();
    });
    const unsub3 = reverb.subscribe('system-activities', 'activity.created', () => {
      loadDashboardData();
    });

    const interval = setInterval(loadDashboardData, 15000);
    return () => {
      clearInterval(interval);
      unsub1();
      unsub2();
      unsub3();
    };
  }, [loadDashboardData]);

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
          <div
            className="adm-stat-card purple"
            onClick={() => {
              if (upcomingScheduledDeliveries.length > 0) {
                const firstSched = upcomingScheduledDeliveries[0];
                const offset = getWeekOffsetForDate(firstSched.date);
                setWeekOffset(offset);
              }
            }}
            style={{ cursor: upcomingScheduledDeliveries.length > 0 ? 'pointer' : 'default' }}
            title={upcomingScheduledDeliveries.length > 0 ? 'Click to view scheduled deliveries in calendar' : ''}
          >
            <div className="adm-stat-icon"><i className="fas fa-calendar-alt"></i></div>
            <div className="adm-stat-body">
              <span className="adm-stat-num">{stats.scheduledDeliveries}</span>
              <span className="adm-stat-label">Scheduled Deliveries</span>
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
          <div className="adm-card adm-fleet-card" id="fleet-calendar-card">
            <div className="adm-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="adm-card-title">FLEET MONITORING</span>
                {weekOffset !== 0 && (
                  <span style={{ fontSize: '11px', background: '#FEE2E2', color: '#B91C1C', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    {weekOffset > 0 ? `+${weekOffset} Wk` : `${weekOffset} Wk`}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>
                  {weekDays[0]?.date} – {weekDays[6]?.date}
                </span>

                <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #D1D5DB' }}>
                  <button
                    type="button"
                    onClick={() => setWeekOffset((prev) => prev - 1)}
                    style={{ padding: '4px 9px', background: '#fff', border: 'none', borderRight: '1px solid #E5E7EB', cursor: 'pointer', fontSize: '12px', color: '#374151' }}
                    title="Previous Week"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekOffset(0)}
                    style={{
                      padding: '4px 10px',
                      background: weekOffset === 0 ? '#F3F4F6' : '#fff',
                      border: 'none',
                      borderRight: '1px solid #E5E7EB',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: weekOffset === 0 ? '700' : '500',
                      color: weekOffset === 0 ? '#111827' : '#6B7280',
                    }}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekOffset((prev) => prev + 1)}
                    style={{ padding: '4px 9px', background: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#374151' }}
                    title="Next Week"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>

                {/* Adaptive Dropdown */}
                {(() => {
                  const selectedOptionText = (() => {
                    if (weekOffset === 0) return 'This Week (Current)';
                    if (weekOffset === 1) return 'Next Week';
                    const match = upcomingScheduledDeliveries.find((sd) => getWeekOffsetForDate(sd.date) === weekOffset);
                    if (match) return `${match.isDelayed ? '⚠️ ' : ''}${match.date} (${match.item})`;
                    return weekOffset > 0 ? `+${weekOffset} Wk` : `${weekOffset} Wk`;
                  })();

                  return (
                    <select
                      value={weekOffset}
                      onChange={(e) => setWeekOffset(Number(e.target.value))}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '6px',
                        border: '1px solid #D1D5DB',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                        fontWeight: 500,
                        width: `${Math.max(16, selectedOptionText.length + 3)}ch`,
                        maxWidth: '280px',
                      }}
                    >
                      <option value={0}>This Week (Current)</option>
                      <option value={1}>Next Week</option>
                      {upcomingScheduledDeliveries.map((sd) => {
                        const offset = getWeekOffsetForDate(sd.date);
                        return (
                          <option key={sd.id} value={offset}>
                            {sd.isDelayed ? `⚠️ DELAYED (${sd.delayDays}d overdue) • ` : '📅 '}
                            {sd.date} ({sd.item} • {sd.time})
                          </option>
                        );
                      })}
                    </select>
                  );
                })()}
              </div>
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
                            <img
                              src={row.photo_url || '/images/trucknisiya.png'}
                              alt="truck"
                              className="adm-veh-img"
                              onError={(e) => { e.currentTarget.src = '/images/trucknisiya.png'; }}
                            />
                            <div>
                              <div className="adm-veh-model">{row.model}</div>
                              <div className="adm-veh-plate">{row.plate}</div>
                            </div>
                          </div>
                        </td>
                        {row.schedule.map((cell, ci) => (
                          <td
                            key={ci}
                            className={cellClass(cell.type)}
                            onClick={() => setSelectedCell({ cell, row, day: weekDays[ci] })}
                            title="Click to view trips and location details"
                          >
                            {cell.type === 'available' ? (
                              <span style={{ fontWeight: 600 }}>Available</span>
                            ) : cell.type === 'empty' ? (
                              <span>–</span>
                            ) : (
                              <>
                                <span style={{ fontWeight: 700, display: 'block', lineHeight: 1.25 }}>
                                  {cell.statusText || cell.label}
                                </span>
                                {cell.driverName && (
                                  <span style={{ fontSize: '10px', color: '#1e293b', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                                    <i className="fas fa-user-circle" style={{ fontSize: '9px', marginRight: '3px', opacity: 0.75 }}></i>
                                    {cell.driverName}
                                  </span>
                                )}
                                {cell.routeText && (
                                  <span style={{ fontSize: '9.5px', opacity: 0.85, display: 'block', marginTop: '1px' }}>
                                    {cell.routeText}
                                  </span>
                                )}
                                {cell.extraText && (
                                  <span style={{ fontSize: '9px', opacity: 0.75, display: 'block', marginTop: '1px' }}>
                                    {cell.extraText}
                                  </span>
                                )}
                              </>
                            )}
                            {cell.deliveries && cell.deliveries.length > 0 && (
                              <span style={{ fontSize: '9px', marginTop: '3px', opacity: 0.85, display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                <i className="fas fa-search-location"></i> Details
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="adm-fleet-legend" style={{ flexWrap: 'wrap', gap: '8px 16px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot dispatched"></span> Dispatched</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot on-route"></span> On Route</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot arrived-pickup"></span> Arrived at Pickup</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot loading-cargo"></span> Loading Cargo</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot on-delivery"></span> On Delivery</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot arrived-dropoff"></span> Arrived at Drop-off</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot unloading-cargo"></span> Unloading Cargo</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot returning-hq"></span> Returning to HQ</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot complete"></span> Complete</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot delayed adm-alert-pulse-dot" style={{ verticalAlign: 'middle' }}></span> Delayed / Overdue</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot available"></span> Available</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot maintenance"></span> Under Maintenance</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}><span className="adm-legend-dot accident"></span> Accident Reported</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Live Weather Card Widget (matching design specification) */}
            <StaffWeatherCard />

            <div className="adm-card adm-activity-card" style={{ flex: 1 }}>
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
        </div>

        {/* ── Bottom row: Action Required + Vehicles Summary ── */}
        <div className="adm-bottom-row">
          <div className="adm-card adm-priority-card">
            <div className="adm-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span className="adm-card-title" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <i className="fas fa-exclamation-circle" style={{ color: actionItems.length > 0 ? '#DC2626' : '#10B981', marginRight: '6px' }}></i>
                Action Required
                <span className={`adm-priority-badge ${actionItems.length === 0 ? 'zero' : 'critical'}`}>
                  {actionItems.length}
                </span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {actionItems.filter(i => i.urgency === 'delayed' || i.urgency === 'critical').length > 0 && (
                  <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700 }}>
                    ⚠️ {actionItems.filter(i => i.urgency === 'delayed' || i.urgency === 'critical').length} Delayed / Urgent
                  </span>
                )}
                <Link to="/delivery" className="adm-view-all">Monitoring</Link>
                <span style={{ color: '#E2E8F0' }}>|</span>
                <Link to="/requests" className="adm-view-all">Requests</Link>
              </div>
            </div>
            <table className="adm-priority-table" style={{ width: '100%', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '90px', whiteSpace: 'nowrap' }}>Reference</th>
                  <th style={{ minWidth: '150px' }}>Details &amp; Cargo</th>
                  <th style={{ minWidth: '150px' }}>Vehicle / Driver</th>
                  <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Schedule / Date</th>
                  <th style={{ width: '165px', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ textAlign: 'right', width: '175px', whiteSpace: 'nowrap' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingCalendar ? (
                  <TableSkeleton rows={4} columns={6} />
                ) : actionItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px 16px', color: '#6B7280', fontSize: '13px' }}>
                      <i className="far fa-check-circle" style={{ fontSize: '22px', color: '#10B981', display: 'block', marginBottom: '8px' }}></i>
                      You currently don't have any overdue deliveries or requests requiring action.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const totalActionPages = Math.max(1, Math.ceil(actionItems.length / ACTION_PAGE_SIZE));
                    const safePage = Math.min(actionPage, totalActionPages);
                    const pagedActionItems = actionItems.slice((safePage - 1) * ACTION_PAGE_SIZE, safePage * ACTION_PAGE_SIZE);

                    return pagedActionItems.map((item) => (
                      <tr key={`${item.type}-${item.id}`}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span className={`adm-action-badge-tag ${item.type}`}>
                              {item.type === 'delivery' ? <i className="fas fa-truck"></i> : item.type === 'incident' ? <i className="fas fa-exclamation-triangle"></i> : <i className="fas fa-file-invoice"></i>}
                              {item.type}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '12px', color: '#1E293B' }}>{item.id}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '12px' }}>{item.item}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{item.customer}</div>
                          {item.route && <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '1px' }}>{item.route}</div>}
                        </td>
                        <td>
                          {item.vehicle && item.vehicle !== 'Unassigned' ? (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '11.5px', color: '#334155' }}>{item.vehicle}</div>
                              <div style={{ fontSize: '10.5px', color: '#64748B' }}>{item.driver}</div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>{item.date}</div>
                          {item.urgency === 'delayed' && (
                            <span style={{ fontSize: '10.5px', color: '#DC2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <i className="fas fa-exclamation-triangle"></i> {item.delayDays}d delayed
                            </span>
                          )}
                          {item.urgency === 'overdue' && (
                            <span style={{ fontSize: '10.5px', color: '#EA580C', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <i className="fas fa-clock"></i> Overdue ({item.daysOld}d)
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: DELIVERY_STAGE_COLORS[item.stageType]?.bg || '#F3F4F6',
                              color: DELIVERY_STAGE_COLORS[item.stageType]?.color || '#374151',
                              border: `1px solid ${DELIVERY_STAGE_COLORS[item.stageType]?.border || '#D1D5DB'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {item.urgency === 'delayed' && <i className="fas fa-exclamation-triangle" style={{ fontSize: '9px', color: '#DC2626' }}></i>}
                            {item.statusLabel}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {item.type === 'delivery' ? (
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              {item.isUnassigned && (
                                <Link
                                  to={`/dispatch?delivery_id=${item.rawId}`}
                                  className="adm-action-btn primary"
                                  title="Assign Vehicle and Driver in Dispatch"
                                >
                                  <i className="fas fa-truck-loading"></i> Assign
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setWeekOffset(item.targetOffset);
                                  const el = document.getElementById('fleet-calendar-card');
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                                className={`adm-action-btn ${item.isUnassigned ? '' : 'primary'}`}
                                title="Jump to scheduled date in calendar"
                              >
                                <i className="fas fa-calendar-alt"></i> Calendar
                              </button>
                              <Link
                                to={`/delivery?delivery_id=${item.rawId}`}
                                className="adm-action-btn"
                                title={`Open details modal for ${item.id}`}
                              >
                                <i className="fas fa-eye"></i> View
                              </Link>
                            </div>
                          ) : item.type === 'incident' ? (
                            <Link
                              to={item.deliveryId ? `/delivery?delivery_id=${item.deliveryId}` : '/delivery'}
                              className="adm-action-btn primary"
                              title="Assist and view incident monitoring"
                            >
                              <i className="fas fa-wrench"></i> Assist
                            </Link>
                          ) : (
                            <Link
                              to={`/requests?request_id=${item.rawId}`}
                              className="adm-action-btn primary"
                              title="Review and dispatch request"
                            >
                              <i className="fas fa-clipboard-check"></i> Dispatch
                            </Link>
                          )}
                        </td>
                      </tr>
                    ));
                  })()
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {actionItems.length > 0 && (() => {
              const totalActionPages = Math.max(1, Math.ceil(actionItems.length / ACTION_PAGE_SIZE));
              const safePage = Math.min(actionPage, totalActionPages);
              const startIdx = (safePage - 1) * ACTION_PAGE_SIZE + 1;
              const endIdx = Math.min(safePage * ACTION_PAGE_SIZE, actionItems.length);

              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 16px',
                    borderTop: '1px solid #F1F5F9',
                    background: '#FAFAFA',
                    fontSize: '11.5px',
                    color: '#64748B',
                  }}
                >
                  <div>
                    Showing <strong style={{ color: '#0F172A' }}>{startIdx}–{endIdx}</strong> of <strong style={{ color: '#0F172A' }}>{actionItems.length}</strong> items
                  </div>
                  {totalActionPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        disabled={safePage <= 1}
                        onClick={() => setActionPage((p) => Math.max(1, p - 1))}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '5px',
                          border: '1px solid #CBD5E1',
                          background: safePage <= 1 ? '#F1F5F9' : '#FFFFFF',
                          color: safePage <= 1 ? '#94A3B8' : '#334155',
                          cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        <i className="fas fa-chevron-left" style={{ fontSize: '9px', marginRight: '3px' }}></i> Prev
                      </button>

                      {Array.from({ length: totalActionPages }, (_, i) => i + 1).map((pg) => (
                        <button
                          key={pg}
                          type="button"
                          onClick={() => setActionPage(pg)}
                          style={{
                            minWidth: '26px',
                            height: '24px',
                            padding: '0 6px',
                            fontSize: '11px',
                            borderRadius: '5px',
                            border: pg === safePage ? '1px solid #2563EB' : '1px solid #CBD5E1',
                            background: pg === safePage ? '#2563EB' : '#FFFFFF',
                            color: pg === safePage ? '#FFFFFF' : '#334155',
                            cursor: 'pointer',
                            fontWeight: pg === safePage ? 700 : 500,
                          }}
                        >
                          {pg}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={safePage >= totalActionPages}
                        onClick={() => setActionPage((p) => Math.min(totalActionPages, p + 1))}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '5px',
                          border: '1px solid #CBD5E1',
                          background: safePage >= totalActionPages ? '#F1F5F9' : '#FFFFFF',
                          color: safePage >= totalActionPages ? '#94A3B8' : '#334155',
                          cursor: safePage >= totalActionPages ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Next <i className="fas fa-chevron-right" style={{ fontSize: '9px', marginLeft: '3px' }}></i>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── Switchable Summary Card (Vehicles / Drivers / Both) ── */}
          <div className="adm-card adm-vsummary-card">
            <div className="adm-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <span className="adm-card-title" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.3px' }}>
                {summaryTab === 'vehicles' ? 'VEHICLES SUMMARY' : summaryTab === 'drivers' ? 'DRIVERS SUMMARY' : 'FLEET & CREW'}
              </span>
              <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '2px', borderRadius: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSummaryTab('vehicles')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    background: summaryTab === 'vehicles' ? '#FFFFFF' : 'transparent',
                    color: summaryTab === 'vehicles' ? '#1E293B' : '#64748B',
                    boxShadow: summaryTab === 'vehicles' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  Vehicles
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryTab('drivers')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    background: summaryTab === 'drivers' ? '#FFFFFF' : 'transparent',
                    color: summaryTab === 'drivers' ? '#1E293B' : '#64748B',
                    boxShadow: summaryTab === 'drivers' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  Drivers
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryTab('both')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    background: summaryTab === 'both' ? '#FFFFFF' : 'transparent',
                    color: summaryTab === 'both' ? '#1E293B' : '#64748B',
                    boxShadow: summaryTab === 'both' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  Both
                </button>
              </div>
            </div>

            {summaryTab === 'vehicles' && (
              <table className="adm-vsummary-table">
                <tbody>
                  <tr>
                    <td><span className="adm-legend-dot available" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6 }}></span> Available</td>
                    <td className="adm-vsummary-count">{vehiclesSummary.available}</td>
                  </tr>
                  <tr>
                    <td><span className="adm-legend-dot delivery" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6 }}></span> In Transit / On Delivery</td>
                    <td className="adm-vsummary-count">{vehiclesSummary.inTransit}</td>
                  </tr>
                  <tr>
                    <td><span className="adm-legend-dot break" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6 }}></span> On Break</td>
                    <td className="adm-vsummary-count">{vehiclesSummary.onBreak}</td>
                  </tr>
                  <tr>
                    <td><span className="adm-legend-dot maintenance" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6 }}></span> Under Maintenance</td>
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
            )}

            {summaryTab === 'drivers' && (
              <table className="adm-vsummary-table">
                <tbody>
                  <tr>
                    <td><span className="adm-legend-dot available" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6 }}></span> Available for Trip</td>
                    <td className="adm-vsummary-count">{driversSummary.available}</td>
                  </tr>
                  <tr>
                    <td><span className="adm-legend-dot delivery" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6 }}></span> On Trip / Delivering</td>
                    <td className="adm-vsummary-count">{driversSummary.onTrip}</td>
                  </tr>
                  <tr>
                    <td><span className="adm-legend-dot break" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 6 }}></span> On Break / Standby</td>
                    <td className="adm-vsummary-count">{driversSummary.onBreak}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="adm-vsummary-total">
                    <td>Total Drivers</td>
                    <td className="adm-vsummary-count">{driversSummary.total}</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {summaryTab === 'both' && (
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span><i className="fas fa-truck" style={{ marginRight: '4px' }}></i> Vehicles</span>
                    <span style={{ color: '#0F172A' }}>{vehiclesSummary.total} Total</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                      <span style={{ color: '#16A34A', fontWeight: 600 }}>Available</span>
                      <strong style={{ color: '#0F172A' }}>{vehiclesSummary.available}</strong>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                      <span style={{ color: '#2563EB', fontWeight: 600 }}>In Transit</span>
                      <strong style={{ color: '#0F172A' }}>{vehiclesSummary.inTransit}</strong>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                      <span style={{ color: '#D97706', fontWeight: 600 }}>On Break</span>
                      <strong style={{ color: '#0F172A' }}>{vehiclesSummary.onBreak}</strong>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                      <span style={{ color: '#DC2626', fontWeight: 600 }}>Maintenance</span>
                      <strong style={{ color: '#0F172A' }}>{vehiclesSummary.underMaintenance}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span><i className="fas fa-id-badge" style={{ marginRight: '4px' }}></i> Drivers</span>
                    <span style={{ color: '#0F172A' }}>{driversSummary.total} Total</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', textAlign: 'center' }}>
                      <span style={{ color: '#16A34A', fontWeight: 600 }}>Available</span>
                      <strong style={{ color: '#0F172A', fontSize: '13px', marginTop: '2px' }}>{driversSummary.available}</strong>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', textAlign: 'center' }}>
                      <span style={{ color: '#2563EB', fontWeight: 600 }}>On Trip</span>
                      <strong style={{ color: '#0F172A', fontSize: '13px', marginTop: '2px' }}>{driversSummary.onTrip}</strong>
                    </div>
                    <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', textAlign: 'center' }}>
                      <span style={{ color: '#D97706', fontWeight: 600 }}>On Break</span>
                      <strong style={{ color: '#0F172A', fontSize: '13px', marginTop: '2px' }}>{driversSummary.onBreak}</strong>
                    </div>
                  </div>
                </div>

                {/* Operational Readiness & Fleet Utilization (Eliminates empty space) */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><i className="fas fa-chart-pie" style={{ marginRight: '4px', color: '#2563EB' }}></i> Readiness &amp; Utilization</span>
                    <span style={{ fontSize: '10.5px', color: '#16A34A', fontWeight: 700 }}>
                      {vehiclesSummary.total > 0 ? Math.round((vehiclesSummary.inTransit / vehiclesSummary.total) * 100) : 0}% Active
                    </span>
                  </div>

                  {/* Vehicle Utilization Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748B', marginBottom: '3px' }}>
                      <span>Fleet Deployed</span>
                      <strong>{vehiclesSummary.inTransit} of {vehiclesSummary.total} Trucks</strong>
                    </div>
                    <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${vehiclesSummary.total > 0 ? Math.min(100, Math.round((vehiclesSummary.inTransit / vehiclesSummary.total) * 100)) : 0}%`,
                          background: 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)',
                          borderRadius: '3px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Driver Allocation Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748B', marginBottom: '3px' }}>
                      <span>Crew on Duty</span>
                      <strong>{driversSummary.onTrip} of {driversSummary.total} Drivers</strong>
                    </div>
                    <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${driversSummary.total > 0 ? Math.min(100, Math.round((driversSummary.onTrip / driversSummary.total) * 100)) : 0}%`,
                          background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                          borderRadius: '3px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Quick Dispatch Link */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <Link
                      to="/dispatch"
                      style={{
                        fontSize: '11px',
                        color: '#2563EB',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        padding: '4px 10px',
                        borderRadius: '6px',
                      }}
                    >
                      <i className="fas fa-truck-loading"></i> Go to Dispatch &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}
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

      {/* ── Trip Details & Locations Modal ── */}
      {selectedCell && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setSelectedCell(null)}
        >
          <div
            className="modal-content"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src={selectedCell.row.photo_url || '/images/trucknisiya.png'}
                  alt="Vehicle"
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '10px',
                    objectFit: 'cover',
                    background: '#ffffff',
                    border: '2px solid rgba(255,255,255,0.2)',
                  }}
                  onError={(e) => { e.currentTarget.src = '/images/trucknisiya.png'; }}
                />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.3px' }}>
                    {selectedCell.row.model}{' '}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
                      ({selectedCell.row.plate})
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px' }}>
                    <span><i className="fas fa-truck" style={{ marginRight: '4px' }}></i> {selectedCell.row.vehicleType || 'Active Unit'}</span>
                    <span>•</span>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                      <i className="far fa-calendar-alt" style={{ marginRight: '4px' }}></i>
                      {selectedCell.day.label}, {selectedCell.day.date}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  color: '#ffffff',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Summary Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  background: selectedCell.cell.deliveries?.length > 0 ? '#eff6ff' : '#f8fafc',
                  border: selectedCell.cell.deliveries?.length > 0 ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Day Status:
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '16px',
                      background: DELIVERY_STAGE_COLORS[selectedCell.cell.type]?.bg || '#f1f5f9',
                      color: DELIVERY_STAGE_COLORS[selectedCell.cell.type]?.color || '#334155',
                      border: `1px solid ${DELIVERY_STAGE_COLORS[selectedCell.cell.type]?.border || '#cbd5e1'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {selectedCell.cell.type === 'delayed' && <i className="fas fa-exclamation-triangle" style={{ fontSize: '10px' }}></i>}
                    {selectedCell.cell.statusText || DELIVERY_STAGE_COLORS[selectedCell.cell.type]?.label || 'Available'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  <i className="fas fa-route" style={{ marginRight: '6px', color: '#2563eb' }}></i>
                  {selectedCell.cell.deliveries?.length || 0} Trip{selectedCell.cell.deliveries?.length === 1 ? '' : 's'} on this Date
                </div>
              </div>

              {/* Incident Alert Banner if Accident */}
              {(selectedCell.cell.type === 'accident' || selectedCell.cell.incident) && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #f87171',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 700, fontSize: '14px' }}>
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '16px' }}></i>
                    Incident / Accident Flagged
                  </div>
                  <div style={{ fontSize: '13px', color: '#7f1d1d', marginTop: '6px', lineHeight: '1.5' }}>
                    <strong>Type:</strong> {(selectedCell.cell.incident?.incident_type || 'Vehicle Accident / Damage').replace(/_/g, ' ').toUpperCase()}
                    <br />
                    <strong>Description:</strong> {selectedCell.cell.incident?.description || 'Vehicle reported in incident or disabled.'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '8px', fontWeight: 600 }}>
                    ⚠️ Unit is flagged as broken. Immediate maintenance or repair scheduling required in Fleet Management.
                  </div>
                </div>
              )}

              {/* Maintenance Details Banner if Under Maintenance */}
              {selectedCell.cell.type === 'break' && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fcd34d',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700, fontSize: '14px' }}>
                    <i className="fas fa-wrench" style={{ fontSize: '16px' }}></i>
                    Scheduled Maintenance Service
                  </div>
                  <div style={{ fontSize: '13px', color: '#92400e', marginTop: '6px', lineHeight: '1.5' }}>
                    <strong>Service:</strong> {selectedCell.cell.maintenance?.maintenance_type || selectedCell.cell.maintenance?.service_type || 'General Maintenance & Inspection'}
                    <br />
                    <strong>Provider:</strong> {selectedCell.cell.maintenance?.service_provider || 'External Service Center'}
                    <br />
                    <strong>Window:</strong> {selectedCell.cell.maintenance?.maintenance_date ? String(selectedCell.cell.maintenance.maintenance_date).slice(0, 10) : 'Active'}
                    {selectedCell.cell.maintenance?.next_maintenance_date ? ` to ${String(selectedCell.cell.maintenance.next_maintenance_date).slice(0, 10)}` : ''}
                  </div>
                </div>
              )}

              {/* Trips List or Empty State */}
              {!selectedCell.cell.deliveries || selectedCell.cell.deliveries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      fontSize: '26px',
                      color: '#94a3b8',
                    }}
                  >
                    <i className="fas fa-calendar-check"></i>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                    No Trips Scheduled
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', maxWidth: '420px', marginInline: 'auto', lineHeight: '1.5' }}>
                    {selectedCell.row.model} ({selectedCell.row.plate}) had no delivery dispatches recorded on{' '}
                    <strong>{selectedCell.day.label} {selectedCell.day.date}</strong>. The vehicle was marked as{' '}
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>{selectedCell.cell.label}</span>.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {selectedCell.cell.deliveries.map((del, idx) => {
                    const req = del.request || {};
                    const customer = req.customer || {};
                    const isCompleted = ['completed', 'delivered'].includes(del.status);
                    const isDelOverdue = del.is_delayed || (
                      req.is_scheduled &&
                      req.scheduled_date &&
                      String(req.scheduled_date).slice(0, 10) < getTodayIso() &&
                      ['assigned', 'accepted'].includes(del.status)
                    );
                    const startTime = formatTime12(del.start_time || del.created_at);
                    const endTime = formatTime12(del.end_time);

                    return (
                      <div
                        key={del.delivery_id || idx}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '18px 20px',
                          background: '#ffffff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        }}
                      >
                        {/* Trip Item Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #f1f5f9',
                            paddingBottom: '12px',
                            marginBottom: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                              Trip #{idx + 1} • DLV{String(del.delivery_id).padStart(4, '0')}
                            </span>
                            {isDelOverdue ? (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '3px 9px',
                                  borderRadius: '12px',
                                  background: '#FEF2F2',
                                  color: '#DC2626',
                                  border: '1px solid #FCA5A5',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <i className="fas fa-exclamation-triangle"></i> Delayed ({DELIVERY_STAGE_LABELS[del.status] || 'Dispatched'})
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '3px 9px',
                                  borderRadius: '12px',
                                  background: DELIVERY_STAGE_COLORS[DELIVERY_STAGE_CELL_TYPES[del.status]]?.bg || (isCompleted ? '#dcfce7' : '#f1f5f9'),
                                  color: DELIVERY_STAGE_COLORS[DELIVERY_STAGE_CELL_TYPES[del.status]]?.color || (isCompleted ? '#16a34a' : '#64748b'),
                                  border: `1px solid ${DELIVERY_STAGE_COLORS[DELIVERY_STAGE_CELL_TYPES[del.status]]?.border || '#cbd5e1'}`,
                                }}
                              >
                                {DELIVERY_STAGE_LABELS[del.status] || del.status?.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                            <i className="far fa-clock" style={{ marginRight: '4px' }}></i>
                            {startTime ? `${startTime}${endTime ? ` – ${endTime}` : ''}` : 'Time N/A'}
                          </div>
                        </div>

                        {/* Overdue Stalled Dispatch Warning Notice */}
                        {isDelOverdue && (
                          <div
                            style={{
                              background: '#fff7ed',
                              border: '1px solid #fdba74',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              marginBottom: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '12px',
                              color: '#9a3412',
                              gap: '10px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i className="fas fa-clock" style={{ fontSize: '14px', color: '#ea580c', flexShrink: 0 }}></i>
                              <span>
                                <strong>Departure Overdue:</strong> Scheduled for {req.scheduled_date ? String(req.scheduled_date).slice(0, 10) : 'Sep 23'} at {req.scheduled_time_slot || '09:30 AM'}, but vehicle has not departed.
                              </span>
                            </div>
                            <Link
                              to="/deliveries"
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#c2410c',
                                textDecoration: 'none',
                                background: '#ffedd5',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #fed7aa',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Manage in Deliveries →
                            </Link>
                          </div>
                        )}

                        {/* Driver Assigned for this specific Trip */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: '#f8fafc',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            marginBottom: '14px',
                          }}
                        >
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#475569',
                              fontSize: '15px',
                              overflow: 'hidden',
                              flexShrink: 0,
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            {del.driver?.user?.profile_photo_url ? (
                              <img
                                src={del.driver.user.profile_photo_url}
                                alt="Driver"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <i className="fas fa-user"></i>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                              ASSIGNED DRIVER
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span>{del.driver?.user?.full_name || 'Driver Not Assigned'}</span>
                              {del.driver?.license_number && (
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                                  • Lic: {del.driver.license_number}
                                </span>
                              )}
                            </div>
                          </div>
                          {del.driver?.user?.phone && (
                            <a
                              href={`tel:${del.driver.user.phone}`}
                              style={{
                                fontSize: '11.5px',
                                color: '#2563eb',
                                textDecoration: 'none',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 9px',
                                background: '#eff6ff',
                                borderRadius: '6px',
                                border: '1px solid #bfdbfe',
                              }}
                            >
                              <i className="fas fa-phone-alt" style={{ fontSize: '10px' }}></i> {del.driver.user.phone}
                            </a>
                          )}
                        </div>

                        {/* Location Details Section */}
                        <div
                          style={{
                            background: '#f8fafc',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            border: '1px solid #e2e8f0',
                            marginBottom: '14px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.6px',
                              color: '#64748b',
                              marginBottom: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <i className="fas fa-map-marked-alt" style={{ color: '#2563eb' }}></i>
                            DELIVERY LOCATION DETAILS
                          </div>

                          {/* Pick-up */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: '#dcfce7',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                flexShrink: 0,
                                marginTop: '1px',
                              }}
                            >
                              <i className="fas fa-box"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', marginBottom: '2px' }}>
                                PICK-UP LOCATION
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', lineHeight: '1.4' }}>
                                {req.pickup_address || 'Address not specified'}
                              </div>
                            </div>
                          </div>

                          {/* Drop-off */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: '#fee2e2',
                                color: '#dc2626',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                flexShrink: 0,
                                marginTop: '1px',
                              }}
                            >
                              <i className="fas fa-map-marker-alt"></i>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', marginBottom: '2px' }}>
                                DROP-OFF DESTINATION
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', lineHeight: '1.4' }}>
                                {req.dropoff_address || 'Address not specified'}
                              </div>
                            </div>
                          </div>

                          {/* Distance */}
                          {req.distance_km && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                color: '#475569',
                                paddingTop: '10px',
                                borderTop: '1px dashed #e2e8f0',
                                marginTop: '10px',
                              }}
                            >
                              <i className="fas fa-road" style={{ color: '#2563eb' }}></i>
                              <span>Total Estimated Distance: <strong>{req.distance_km} kilometers</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Customer & Cargo Grid */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '10px 18px',
                            fontSize: '12.5px',
                            marginBottom: '12px',
                          }}
                        >
                          <div>
                            <span style={{ color: '#64748b' }}>Customer:</span>{' '}
                            <strong style={{ color: '#0f172a' }}>{customer.full_name || 'Customer'}</strong>
                          </div>
                          {customer.phone && (
                            <div>
                              <span style={{ color: '#64748b' }}>Contact:</span>{' '}
                              <strong style={{ color: '#0f172a' }}>{customer.phone}</strong>
                            </div>
                          )}
                          <div>
                            <span style={{ color: '#64748b' }}>Cargo:</span>{' '}
                            <strong style={{ color: '#0f172a' }}>{req.item_name || req.cargo_type || 'Goods'}</strong>
                            {req.weight ? ` (${req.weight} kg)` : ''}
                          </div>
                          {del.trip_cost && (
                            <div>
                              <span style={{ color: '#64748b' }}>Trip Price:</span>{' '}
                              <strong style={{ color: '#16a34a' }}>₱{Number(del.trip_cost).toLocaleString()}</strong>
                            </div>
                          )}
                        </div>

                        {/* Telemetry (if recorded) */}
                        {(del.starting_odometer || del.fuel_issued || del.fuel_consumed) && (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '14px',
                              background: '#f8fafc',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontSize: '11.5px',
                              color: '#64748b',
                              marginBottom: '10px',
                            }}
                          >
                            {del.starting_odometer && (
                              <span>
                                <i className="fas fa-tachometer-alt" style={{ marginRight: '4px' }}></i>
                                Odometer: {Number(del.starting_odometer).toLocaleString()} km
                                {del.ending_odometer ? ` → ${Number(del.ending_odometer).toLocaleString()} km` : ''}
                              </span>
                            )}
                            {del.fuel_issued && (
                              <span>
                                <i className="fas fa-gas-pump" style={{ marginRight: '4px' }}></i>
                                Fuel Issued: {del.fuel_issued} {del.fuel_unit || 'L'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Open in Delivery Monitoring / Dispatch Assign */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                          {!del.vehicle_id && (
                            <Link
                              to="/dispatch"
                              style={{
                                fontSize: '12px',
                                color: '#ffffff',
                                background: '#2563eb',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <i className="fas fa-truck-loading"></i> Assign Vehicle & Driver
                            </Link>
                          )}
                          <Link
                            to={`/delivery?delivery_id=${del.delivery_id}`}
                            style={{
                              fontSize: '12px',
                              color: '#2563eb',
                              fontWeight: 600,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            View in Delivery Monitoring <i className="fas fa-arrow-right"></i>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                background: '#f8fafc',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                style={{
                  padding: '9px 24px',
                  background: '#e2e8f0',
                  color: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffDashboardPage;
