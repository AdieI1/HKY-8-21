import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import NotificationBell from '../components/NotificationBell';
import reverb from '../utils/reverb';

function cellClass(type) {
  if (type === 'accident' || type === 'broken') return 'adm-fleet-cell accident';
  if (type === 'delayed') return 'adm-fleet-cell delayed';
  if (type === 'scheduled') return 'adm-fleet-cell scheduled';
  if (type === 'delivery') return 'adm-fleet-cell delivery';
  if (type === 'completed') return 'adm-fleet-cell completed';
  if (type === 'available') return 'adm-fleet-cell available';
  if (type === 'break') return 'adm-fleet-cell on-break';
  return 'adm-fleet-cell empty';
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
  const [priorityRequests, setPriorityRequests] = useState([]);
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
    rawDeliveries.forEach((d) => {
      const sDate = d.request?.scheduled_date ? String(d.request.scheduled_date).slice(0, 10) : null;
      if (sDate && !['completed', 'cancelled'].includes(d.status)) {
        list.push({
          id: `DLV${String(d.delivery_id).padStart(4, '0')}`,
          deliveryId: d.delivery_id,
          date: sDate,
          time: d.request?.scheduled_time_slot || 'Standard',
          driver: d.driver?.user?.full_name || 'Assigned Driver',
          vehicle: d.vehicle ? `${d.vehicle.model || d.vehicle.brand || 'Vehicle'} (${d.vehicle.plate_number})` : 'Assigned Unit',
          vehicleId: d.vehicle_id,
          destination: shortCity(d.request?.dropoff_address),
          item: d.request?.item_name || 'Cargo',
        });
      }
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
          const vehMatch = Number(inc.vehicle_id) === Number(v.vehicle_id) || Number(inc.delivery?.vehicle_id) === Number(v.vehicle_id);
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
            ['assigned', 'accepted', 'out_for_delivery', 'in_transit', 'loading_cargo', 'arrived_pickup'].includes(d.status)
          );
          const scheduledDel = dayDeliveries.find((d) =>
            d.request?.is_scheduled || (d.request?.scheduled_date && String(d.request.scheduled_date).slice(0, 10) === day.iso)
          );

          if (activeDel) {
            const isScheduledTrip = activeDel.request?.is_scheduled || (activeDel.request?.scheduled_date && String(activeDel.request.scheduled_date).slice(0, 10) === day.iso);
            const isInTransit = ['out_for_delivery', 'in_transit'].includes(activeDel.status);
            const isDelayedOrOverdue = isScheduledTrip && (
              activeDel.is_delayed ||
              (activeDel.request?.scheduled_date && String(activeDel.request.scheduled_date).slice(0, 10) < todayIso && ['assigned', 'accepted'].includes(activeDel.status))
            );

            if (isDelayedOrOverdue) {
              cellType = 'delayed';
            } else if (isScheduledTrip && !isInTransit) {
              cellType = 'scheduled';
            } else {
              cellType = 'delivery';
            }

            const rawSlot = activeDel.request?.scheduled_time_slot || '';
            const timeOnly = rawSlot.includes('(') ? rawSlot.split(' ')[0] : rawSlot;

            if (isDelayedOrOverdue) {
              statusText = timeOnly ? `Delayed (${timeOnly})` : '⚠️ Delayed';
            } else if (isScheduledTrip && !isInTransit) {
              statusText = timeOnly ? `Scheduled (${timeOnly})` : 'Scheduled';
            } else {
              const range = getDeliveryDateRange(activeDel);
              const isContinuation = range && range.startDate !== day.iso;
              statusText = isContinuation
                ? 'In Transit (En Route)'
                : activeDel.status === 'in_transit'
                  ? 'In Transit'
                  : activeDel.status === 'assigned'
                    ? 'Assigned'
                    : 'Delivery';
            }

            driverName = formatShortDriver(activeDel.driver?.user?.full_name);
            routeText = formatRoute(activeDel.request?.pickup_address, activeDel.request?.dropoff_address);
            if (dayDeliveries.length > 1) {
              extraText = `+${dayDeliveries.length - 1} more trip`;
            }
          } else if (scheduledDel) {
            const isDelayedOrOverdue = scheduledDel.is_delayed || (scheduledDel.request?.scheduled_date && String(scheduledDel.request.scheduled_date).slice(0, 10) < todayIso);
            cellType = isDelayedOrOverdue ? 'delayed' : 'scheduled';
            const rawSlot = scheduledDel.request?.scheduled_time_slot || '';
            const timeOnly = rawSlot.includes('(') ? rawSlot.split(' ')[0] : rawSlot;
            statusText = isDelayedOrOverdue
              ? (timeOnly ? `Delayed (${timeOnly})` : '⚠️ Delayed')
              : (timeOnly ? `Scheduled (${timeOnly})` : 'Scheduled');
            driverName = formatShortDriver(scheduledDel.driver?.user?.full_name);
            routeText = formatRoute(scheduledDel.request?.pickup_address, scheduledDel.request?.dropoff_address);
            if (dayDeliveries.length > 1) {
              extraText = `+${dayDeliveries.length - 1} more trip`;
            }
          } else {
            cellType = 'completed';
            const firstDel = dayDeliveries[0];
            const range = getDeliveryDateRange(firstDel);
            const isFinalDay = range && range.endDate === day.iso;
            statusText = isFinalDay ? 'Trip Completed' : 'In Transit';
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

      // ── Connected Dynamic Priority Requests ──
      const pendingRequestsList = requests
        .filter((r) => r.status === 'pending')
        .map((r) => {
          const created = new Date(r.created_at);
          const daysOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
          const isOver = daysOld >= 2;
          return {
            id: `REQ${String(r.request_id).padStart(4, '0')}`,
            customer: r.customer?.full_name || 'Customer',
            date: created.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
            status: isOver ? 'Overdue' : 'Pending',
            overdue: isOver,
            createdTime: created.getTime(),
          };
        })
        .sort((a, b) => (a.overdue !== b.overdue ? (a.overdue ? -1 : 1) : a.createdTime - b.createdTime));

      setPriorityRequests(pendingRequestsList.slice(0, 5));

      // ── Connected Dynamic Vehicles Summary ──
      const activeDeliveryVehIds = new Set(
        deliveries
          .filter((d) => ['assigned', 'accepted', 'out_for_delivery', 'in_transit', 'loading_cargo', 'arrived_pickup'].includes(d.status))
          .map((d) => Number(d.vehicle_id))
          .filter(Boolean)
      );

      const maintenanceVehIds = new Set([
        ...vehicles.filter((v) => ['maintenance', 'broken', 'in_shop'].includes(v.status?.toLowerCase())).map((v) => Number(v.vehicle_id)),
        ...maintenances.filter((m) => ['pending', 'in_progress', 'scheduled'].includes(m.status?.toLowerCase())).map((m) => Number(m.vehicle_id)),
      ]);

      const inTransitCount = vehicles.filter((v) => activeDeliveryVehIds.has(Number(v.vehicle_id))).length;
      const maintenanceCount = vehicles.filter((v) => maintenanceVehIds.has(Number(v.vehicle_id)) && !activeDeliveryVehIds.has(Number(v.vehicle_id))).length;
      const onBreakCount = vehicles.filter((v) => {
        return !activeDeliveryVehIds.has(Number(v.vehicle_id)) && !maintenanceVehIds.has(Number(v.vehicle_id)) && (v.status === 'on_break' || v.status === 'standby');
      }).length;

      const availableCount = Math.max(0, vehicles.length - inTransitCount - maintenanceCount - onBreakCount);

      setVehiclesSummary({
        available: availableCount,
        inTransit: inTransitCount,
        onBreak: onBreakCount,
        underMaintenance: maintenanceCount,
        total: vehicles.length,
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

      // 5. Incident Reports
      incidents.forEach((inc) => {
        const rawTime = inc.created_at;
        dynamicActivities.push({
          id: `inc-${inc.report_id}`,
          category: 'fleet',
          icon: 'fas fa-exclamation-circle',
          color: '#EF4444',
          title: `Incident: ${inc.incident_type || 'Issue reported'}`,
          sub: inc.description || 'Reported during trip',
          time: timeAgo(rawTime),
          timeMs: rawTime ? new Date(rawTime).getTime() : 0,
        });
      });

      // 6. System Logs
      systemLogs.slice(-5).forEach((log) => {
        const rawTime = log.timestamp || log.created_at;
        dynamicActivities.push({
          id: `log-${log.log_id}`,
          category: 'system',
          icon: 'fas fa-shield-alt',
          color: '#8B5CF6',
          title: `${log.user?.full_name || 'Staff User'}: ${log.action}`,
          sub: 'System audit log',
          time: timeAgo(rawTime),
          timeMs: rawTime ? new Date(rawTime).getTime() : 0,
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

    const interval = setInterval(loadDashboardData, 60000);
    return () => {
      clearInterval(interval);
      unsub1();
      unsub2();
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
          <div className="adm-card adm-fleet-card">
            <div className="adm-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="adm-card-title">FLEET MONITORING</span>
                {weekOffset !== 0 && (
                  <span style={{ fontSize: '11px', background: '#FEE2E2', color: '#B91C1C', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    {weekOffset > 0 ? `+${weekOffset} Wk` : `${weekOffset} Wk`}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                  }}
                >
                  <option value={0}>This Week (Current)</option>
                  <option value={1}>Next Week</option>
                  {upcomingScheduledDeliveries.map((sd) => {
                    const offset = getWeekOffsetForDate(sd.date);
                    return (
                      <option key={sd.id} value={offset}>
                        📅 {sd.date} ({sd.item} • {sd.time})
                      </option>
                    );
                  })}
                </select>

                {upcomingScheduledDeliveries.length > 0 && weekOffset !== getWeekOffsetForDate(upcomingScheduledDeliveries[0].date) && (
                  <button
                    type="button"
                    onClick={() => setWeekOffset(getWeekOffsetForDate(upcomingScheduledDeliveries[0].date))}
                    style={{
                      padding: '4px 9px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: '1px solid #FCD34D',
                      background: '#FFFBEB',
                      color: '#B45309',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Jump to scheduled delivery in calendar"
                  >
                    <i className="fas fa-calendar-alt"></i> Jump to Sep 23
                  </button>
                )}
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
            <div className="adm-fleet-legend">
              <span className="adm-legend-dot scheduled"></span> Scheduled Delivery
              <span className="adm-legend-dot delayed"></span> Delayed / Overdue
              <span className="adm-legend-dot delivery"></span> Delivery / In Transit
              <span className="adm-legend-dot completed"></span> Completed Trip
              <span className="adm-legend-dot available"></span> Available
              <span className="adm-legend-dot break"></span> On Break / Maintenance
              <span className="adm-legend-dot accident"></span> Broken / Accident Reported
            </div>
          </div>

          <div className="adm-card adm-activity-card">
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

        {/* ── Bottom row: Priority Requests + Vehicles Summary ── */}
        <div className="adm-bottom-row">
          <div className="adm-card adm-priority-card">
            <div className="adm-card-header">
              <span className="adm-card-title">
                <i className="far fa-clock" style={{ marginRight: '6px' }}></i>
                Priority Requests
                <span className={`adm-priority-badge ${priorityRequests.length === 0 ? 'zero' : ''}`}>{priorityRequests.length}</span>
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
                {priorityRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px 16px', color: '#6B7280', fontSize: '13px' }}>
                      <i className="far fa-check-circle" style={{ fontSize: '22px', color: '#10B981', display: 'block', marginBottom: '8px' }}></i>
                      You currently don't have any overdue requests.
                    </td>
                  </tr>
                ) : (
                  priorityRequests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.overdue && <i className="fas fa-exclamation-triangle adm-warn-icon"></i>}
                        <Link to="/requests" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
                          {r.id}
                        </Link>
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="adm-card adm-vsummary-card">
            <div className="adm-card-header">
              <span className="adm-card-title">VEHICLES SUMMARY</span>
            </div>
            <table className="adm-vsummary-table">
              <tbody>
                <tr>
                  <td>Available</td>
                  <td className="adm-vsummary-count">{vehiclesSummary.available}</td>
                </tr>
                <tr>
                  <td>In Transit/On Delivery</td>
                  <td className="adm-vsummary-count">{vehiclesSummary.inTransit}</td>
                </tr>
                <tr>
                  <td>On Break</td>
                  <td className="adm-vsummary-count">{vehiclesSummary.onBreak}</td>
                </tr>
                <tr>
                  <td>Under Maintenance</td>
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
                      background:
                        selectedCell.cell.type === 'accident'
                          ? '#fee2e2'
                          : selectedCell.cell.type === 'delivery'
                          ? '#fee2e2'
                          : selectedCell.cell.type === 'scheduled'
                          ? '#fdf4ff'
                          : selectedCell.cell.type === 'completed'
                          ? '#dbeafe'
                          : selectedCell.cell.type === 'break'
                          ? '#fef3c7'
                          : '#dcfce7',
                      color:
                        selectedCell.cell.type === 'accident'
                          ? '#991b1b'
                          : selectedCell.cell.type === 'delivery'
                          ? '#dc2626'
                          : selectedCell.cell.type === 'scheduled'
                          ? '#a21caf'
                          : selectedCell.cell.type === 'completed'
                          ? '#1d4ed8'
                          : selectedCell.cell.type === 'break'
                          ? '#d97706'
                          : '#16a34a',
                      border: selectedCell.cell.type === 'accident' ? '1px solid #fca5a5' : 'none',
                    }}
                  >
                    {selectedCell.cell.type === 'accident'
                      ? '⚠️ Broken / Accident Reported'
                      : selectedCell.cell.type === 'delivery'
                      ? 'Active Delivery'
                      : selectedCell.cell.type === 'scheduled'
                      ? 'Scheduled Delivery'
                      : selectedCell.cell.type === 'completed'
                      ? 'Trip(s) Completed'
                      : selectedCell.cell.type === 'break'
                      ? 'Under Maintenance'
                      : 'Available for Dispatch'}
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
                    const isActive = ['assigned', 'accepted', 'out_for_delivery', 'in_transit'].includes(del.status);
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
                                  background: '#ffedd5',
                                  color: '#c2410c',
                                  border: '1px solid #fed7aa',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <i className="fas fa-exclamation-triangle"></i> Delayed / Overdue
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  padding: '3px 9px',
                                  borderRadius: '12px',
                                  background: isCompleted ? '#dcfce7' : isActive ? '#fee2e2' : '#f1f5f9',
                                  color: isCompleted ? '#16a34a' : isActive ? '#dc2626' : '#64748b',
                                }}
                              >
                                {del.status?.replace(/_/g, ' ')}
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

                        {/* Open in Delivery Monitoring */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
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
