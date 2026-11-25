import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import NotificationBell from '../components/NotificationBell';
import Pagination from '../components/Pagination';
import TableSkeleton from '../components/TableSkeleton';
import PrintableIncidentModal from '../components/driver/PrintableIncidentModal';
import InspectionActivitiesSection from '../components/delivery/InspectionActivitiesSection';
import reverb from '../utils/reverb';
import {
  validatePlateNumber,
  formatPlateInput,
  formatNameInput,
  validateEngineNumber,
  formatEngineNumberInput,
  getEngineNumberFeedback,
  validateChassisNumber,
  formatChassisNumberInput,
  getChassisNumberFeedback,
  validateDateSequence,
  validatePositiveNumber,
  validatePolicyNumber,
  formatPolicyNumberInput,
  getPolicyNumberFeedback,
  validateOrNumber,
  formatOrNumberInput,
  getOrNumberFeedback,
  validateCrNumber,
  formatCrNumberInput,
  getCrNumberFeedback,
  formatLocalDateIso,
  getTodayIso,
  getTomorrowIso,
  isStrictlyFutureDate,
} from '../utils/validation';

const ACTIVE_DELIVERY_STATUSES = [
  'assigned',
  'accepted',
  'arrived_pickup',
  'loading_cargo',
  'out_for_delivery',
  'arrived_dropoff',
  'unloading_cargo',
  'returning_to_hq',
];

const SERVICE_TYPES = [
  'Preventive Maintenance',
  'Corrective Maintenance',
  'Predictive Maintenance',
  'Emergency Maintenance',
  'Routine Maintenance',
  'Major Maintenance',
];

const PAGE_SIZE = 10;

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

function vehicleCode(id) {
  return `VCL${String(id).padStart(3, '0')}`;
}

function formatVehicleName(vehicle) {
  if (!vehicle) return '—';
  const brand = (vehicle.brand || '').trim();
  const model = (vehicle.model || '').trim();
  if (brand && model) {
    if (model.toLowerCase().startsWith(brand.toLowerCase())) {
      return model;
    }
    return `${brand} - ${model}`;
  }
  return model || brand || '—';
}

function statusLabel(status) {
  const map = {
    available: 'Available',
    in_use: 'In Use',
    maintenance: 'Under Maintenance',
    waiting_part_confirmation: 'Waiting for Part Confirmation',
    broken: 'Broken',
    decommissioned: 'Decommissioned',
  };
  return map[status] || status;
}

function statusClass(status) {
  const map = { available: 'available', in_use: 'in-use', maintenance: 'maintenance', waiting_part_confirmation: 'maintenance', broken: 'broken', decommissioned: 'decommissioned' };
  return map[status] || '';
}

const VEHICLE_COLOR_MAP = {
  white: '#ffffff',
  black: '#000000',
  silver: '#c0c0c0',
  gray: '#808080',
  grey: '#808080',
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#eab308',
  orange: '#f97316',
  brown: '#78350f',
  gold: '#d97706',
  navy: '#1e3a8a',
  maroon: '#800000',
  purple: '#9333ea',
  beige: '#f5f5dc',
  bronze: '#cd7f32',
  charcoal: '#334155',
  teal: '#0d9488',
  cyan: '#06b6d4',
  pink: '#ec4899',
};

const HEX_TO_COLOR_NAME = {
  '#ffffff': 'White',
  '#000000': 'Black',
  '#c0c0c0': 'Silver',
  '#808080': 'Gray',
  '#dc2626': 'Red',
  '#ff0000': 'Red',
  '#ef4444': 'Red',
  '#2563eb': 'Blue',
  '#0000ff': 'Blue',
  '#3b82f6': 'Blue',
  '#16a34a': 'Green',
  '#008000': 'Green',
  '#22c55e': 'Green',
  '#eab308': 'Yellow',
  '#ffff00': 'Yellow',
  '#f97316': 'Orange',
  '#ffa500': 'Orange',
  '#78350f': 'Brown',
  '#a52a2a': 'Brown',
  '#d97706': 'Gold',
  '#ffd700': 'Gold',
  '#1e3a8a': 'Navy Blue',
  '#000080': 'Navy Blue',
  '#800000': 'Maroon',
  '#9333ea': 'Purple',
  '#800080': 'Purple',
  '#f5f5dc': 'Beige',
  '#cd7f32': 'Bronze',
  '#334155': 'Charcoal',
  '#0d9488': 'Teal',
  '#06b6d4': 'Cyan',
  '#ec4899': 'Pink',
};

function parseColorToHex(input) {
  if (!input) return null;
  const str = String(input).trim().toLowerCase();
  if (/^#([0-9a-f]{6})$/i.test(str)) {
    return str.toLowerCase();
  }
  if (/^#([0-9a-f]{3})$/i.test(str)) {
    return ('#' + str[1] + str[1] + str[2] + str[2] + str[3] + str[3]).toLowerCase();
  }
  if (VEHICLE_COLOR_MAP[str]) {
    return VEHICLE_COLOR_MAP[str];
  }
  if (typeof document !== 'undefined') {
    try {
      const opt = new Option();
      opt.style.color = str;
      if (opt.style.color) {
        const d = document.createElement('div');
        d.style.color = str;
        document.body.appendChild(d);
        const rgb = window.getComputedStyle(d).color;
        document.body.removeChild(d);
        const m = rgb.match(/\d+/g);
        if (m && m.length >= 3) {
          const r = parseInt(m[0], 10).toString(16).padStart(2, '0');
          const g = parseInt(m[1], 10).toString(16).padStart(2, '0');
          const b = parseInt(m[2], 10).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`;
        }
      }
    } catch {}
  }
  return null;
}

function isColorDark(hex) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 128;
}

const EMPTY_FORM = {
  model: '',
  brand: '',
  year_model: '',
  plate_number: '',
  engine_number: '',
  chassis_number: '',
  color: '',
  vehicle_type: '10-Wheeler Truck',
  classification: 'Private (PVT)',
  vehicle_category: 'N2',
  body_type: 'Truck Tractor Head',
  piston_displacement: '',
  fuel_type: 'diesel',
  gross_weight: '',
  net_weight: '',
  passenger_capacity: '',
  odometer_reading: '',
  registration_valid_from: '',
  registration_valid_until: '',
  status: 'available',
  condition: 'Good',
  last_maintenance_date: '',
  next_maintenance_date: '',
  // Insurance Information (Screenshot 2)
  insurance_provider: '',
  insurance_policy_number: '',
  insurance_coverage_type: 'Comprehensive',
  insurance_valid_from: '',
  insurance_valid_until: '',
  // Registration Info (Screenshot 2)
  or_number: '',
  cr_number: '',
  registration_date: '',
  expiration_date: '',
  // Emission Information
  emission_date: '',
};

function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const [view, setView] = useState('list'); // 'list' | 'archives' | 'incidents'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('vehicle-id');

  // Vehicle incident reports & inspections state
  const [incidents, setIncidents] = useState([]);
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState('All');
  const [incidentSeverityFilter, setIncidentSeverityFilter] = useState('All');
  const [incidentPage, setIncidentPage] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidentSubTab, setIncidentSubTab] = useState('inspections'); // 'inspections' | 'incidents'
  const [selectedInspectionDelivery, setSelectedInspectionDelivery] = useState(null);

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleDetailsData, setVehicleDetailsData] = useState(null);

  // Add / Edit vehicle
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState(null);
  const vehicleFileInputRef = useRef(null);

  // Document requirement files (Screenshot 2)
  const [orFile, setOrFile] = useState(null);
  const [crFile, setCrFile] = useState(null);
  const [insuranceFile, setInsuranceFile] = useState(null);
  const [emissionFile, setEmissionFile] = useState(null);

  const orFileInputRef = useRef(null);
  const crFileInputRef = useRef(null);
  const insuranceFileInputRef = useRef(null);
  const emissionFileInputRef = useRef(null);

  // Document Viewer / Missing File Modal
  const [docModal, setDocModal] = useState(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Schedule Maintenance Modal (Matches Reference Image)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingVehicle, setSchedulingVehicle] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    maintenance_date: getTodayIso(),
    maintenance_type: 'Preventive Maintenance',
    maintenance_cost: '',
    maintained_by_name: '',
    notes: '',
    part_id: '',
    quantity_used: '',
    status: 'Scheduled',
  });
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  // Decommission / Restore
  const [showDecommissionModal, setShowDecommissionModal] = useState(false);
  const [decommissioningVehicle, setDecommissioningVehicle] = useState(null);
  const [toast, setToast] = useState(null);

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

  // Auto-dismiss SweetAlert popup notification after 5 seconds
  useEffect(() => {
    if (formError) {
      const timer = setTimeout(() => setFormError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [formError]);

  useEffect(() => {
    if (scheduleError) {
      const timer = setTimeout(() => setScheduleError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [scheduleError]);

  const getAlertTitle = (msg) => {
    if (!msg) return 'Validation Notice';
    const lower = String(msg).toLowerCase();
    if (lower.includes('required') || lower.includes('fill in')) return 'Incomplete Required Fields';
    if (lower.includes('plate number') || lower.includes('plate')) return 'Invalid Plate Number';
    if (lower.includes('policy')) return 'Invalid Policy Number';
    if (lower.includes('or number') || lower.includes('official receipt')) return 'Invalid OR Number';
    if (lower.includes('cr number') || lower.includes('certificate of registration')) return 'Invalid CR Number';
    if (lower.includes('date') || lower.includes('expiry') || lower.includes('expiration')) return 'Invalid Date Sequence';
    if (lower.includes('weight')) return 'Invalid Weight';
    if (lower.includes('displacement')) return 'Invalid Piston Displacement';
    if (lower.includes('capacity')) return 'Invalid Capacity';
    return 'Validation Notice';
  };

  const handleFormFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const getFieldStyle = (fieldName, extraStyles = {}) => {
    const hasErr = Boolean(formErrors[fieldName]);
    return {
      padding: '9px 12px',
      borderRadius: 6,
      border: hasErr ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
      background: hasErr ? '#fff5f5' : '#fff',
      boxShadow: hasErr ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
      fontSize: 13,
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
      ...extraStyles,
    };
  };

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setLoadError('');
    }
    try {
      const [vehiclesRes, deliveriesRes, partsRes, incidentsRes] = await Promise.all([
        api.get('/vehicles', { skipCache: true }),
        api.get('/deliveries', { skipCache: true }),
        isSilent ? Promise.resolve(null) : api.get('/spare-parts'),
        api.get('/incident-reports', { skipCache: true }).catch(() => ({ data: [] })),
      ]);
      setVehicles(Array.isArray(vehiclesRes?.data) ? vehiclesRes.data : (vehiclesRes?.data?.data || []));
      setDeliveries(Array.isArray(deliveriesRes?.data) ? deliveriesRes.data : (deliveriesRes?.data?.data || []));
      if (partsRes) {
        setSpareParts(Array.isArray(partsRes?.data) ? partsRes.data : (partsRes?.data?.data || []));
      }
      setIncidents(Array.isArray(incidentsRes?.data) ? incidentsRes.data : (incidentsRes?.data?.data || []));
    } catch (err) {
      if (!isSilent) {
        setLoadError('Could not load vehicle data. Is the backend running and are you logged in?');
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

  const assignedDriverFor = useCallback(
    (vehicleId) => {
      if (!Array.isArray(deliveries)) return null;
      const active = deliveries
        .filter((d) => d.vehicle_id === vehicleId && ACTIVE_DELIVERY_STATUSES.includes(d.status) && d.driver)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return active[0]?.driver || null;
    },
    [deliveries]
  );

  const listedVehicles = useMemo(
    () => (Array.isArray(vehicles) ? vehicles.filter((v) => v.status !== 'decommissioned') : []),
    [vehicles]
  );
  const archivedVehicles = useMemo(
    () => (Array.isArray(vehicles) ? vehicles.filter((v) => v.status === 'decommissioned') : []),
    [vehicles]
  );

  const stats = useMemo(
    () => ({
      available: listedVehicles.filter((v) => v.status === 'available').length,
      inUse: listedVehicles.filter((v) => v.status === 'in_use').length,
      maintenance: listedVehicles.filter((v) => v.status === 'maintenance' || v.status === 'waiting_part_confirmation').length,
      broken: archivedVehicles.length,
    }),
    [listedVehicles, archivedVehicles]
  );

  const inspectionLogs = useMemo(() => {
    const safeDeliveries = Array.isArray(deliveries) ? deliveries : [];
    const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
    const logs = [];

    safeDeliveries.forEach((del) => {
      const chks = Array.isArray(del.checklists) ? del.checklists : [];
      if (chks.length === 0) return;
      const veh = del.vehicle || safeVehicles.find((v) => v.vehicle_id === del.vehicle_id);
      chks.forEach((chk) => {
        const entries = chk.items && typeof chk.items === 'object' ? Object.entries(chk.items) : [];
        const passed = entries.filter(([, v]) => Boolean(v)).length;
        const defects = entries.length - passed;
        const photos = Array.isArray(chk.photo_urls) && chk.photo_urls.length > 0
          ? chk.photo_urls
          : (Array.isArray(chk.photos) ? chk.photos : []);

        logs.push({
          ...chk,
          resolvedVehicle: veh,
          resolvedDelivery: del,
          passedCount: passed,
          totalCount: entries.length,
          defectCount: defects,
          photoCount: photos.length,
        });
      });
    });

    return logs.sort((a, b) => {
      const tA = new Date(a.completed_at || a.created_at || 0).getTime();
      const tB = new Date(b.completed_at || b.created_at || 0).getTime();
      return tB - tA;
    });
  }, [deliveries, vehicles]);

  const filteredInspectionLogs = useMemo(() => {
    const term = incidentSearch.toLowerCase().trim();
    if (!term) return inspectionLogs;
    return inspectionLogs.filter((log) => {
      const v = log.resolvedVehicle;
      const hay = [
        v?.model,
        v?.plate_number,
        v?.vehicle_id ? `VCL${String(v.vehicle_id).padStart(3, '0')}` : '',
        log.delivery_id ? `DLV${String(log.delivery_id).padStart(4, '0')}` : '',
        log.inspector_name || log.inspector?.full_name,
        log.type,
        log.remarks,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [inspectionLogs, incidentSearch]);

  const vehicleIncidents = useMemo(() => {
    const safeIncidents = Array.isArray(incidents) ? incidents : [];
    const safeDeliveries = Array.isArray(deliveries) ? deliveries : [];
    const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
    return safeIncidents.map((inc) => {
      const del = inc.delivery || safeDeliveries.find((d) => d.delivery_id === inc.delivery_id);
      const veh = del?.vehicle || safeVehicles.find((v) => v.vehicle_id === del?.vehicle_id);
      return {
        ...inc,
        resolvedVehicle: veh,
        resolvedDelivery: del,
      };
    });
  }, [incidents, deliveries, vehicles]);

  const filteredVehicleIncidents = useMemo(() => {
    let list = [...vehicleIncidents];
    const term = incidentSearch.toLowerCase().trim();
    if (term) {
      list = list.filter((inc) => {
        const v = inc.resolvedVehicle;
        const vModel = v?.model || '';
        const vPlate = v?.plate_number || '';
        const vCode = v?.vehicle_id ? `VCL${String(v.vehicle_id).padStart(3, '0')}` : '';
        const inspector =
          inc.resolvedDelivery?.checklists?.[0]?.inspector_name ||
          inc.reporter?.full_name ||
          '';
        const incCode = `INC-${String(inc.incident_id).padStart(5, '0')}`;
        const desc = inc.description || '';
        const rawType = inc.incident_type || '';
        const type = typeof rawType === 'string'
          ? rawType.replace(/_/g, ' ')
          : Array.isArray(rawType)
          ? rawType.join(' ').replace(/_/g, ' ')
          : '';
        return (
          vModel.toLowerCase().includes(term) ||
          vPlate.toLowerCase().includes(term) ||
          vCode.toLowerCase().includes(term) ||
          inspector.toLowerCase().includes(term) ||
          incCode.toLowerCase().includes(term) ||
          desc.toLowerCase().includes(term) ||
          type.toLowerCase().includes(term)
        );
      });
    }

    if (incidentTypeFilter !== 'All') {
      const target = incidentTypeFilter.toLowerCase().replace(/\s+/g, '_');
      list = list.filter((inc) => {
        const rawType = inc.incident_type || '';
        const typeStr = typeof rawType === 'string'
          ? rawType.toLowerCase()
          : Array.isArray(rawType)
          ? rawType.join(' ').toLowerCase()
          : '';
        return typeStr.includes(target) || typeStr.includes(incidentTypeFilter.toLowerCase());
      });
    }

    if (incidentSeverityFilter !== 'All') {
      list = list.filter((inc) => (inc.severity || '').toLowerCase() === incidentSeverityFilter.toLowerCase());
    }

    return list;
  }, [vehicleIncidents, incidentSearch, incidentTypeFilter, incidentSeverityFilter]);

  const totalIncidentPages = Math.ceil(filteredVehicleIncidents.length / PAGE_SIZE) || 1;
  const paginatedIncidents = useMemo(() => {
    const start = (incidentPage - 1) * PAGE_SIZE;
    return filteredVehicleIncidents.slice(start, start + PAGE_SIZE);
  }, [filteredVehicleIncidents, incidentPage]);

  const filteredVehicles = useMemo(() => {
    let list = [...listedVehicles];
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((v) => `${v.model || ''} ${v.plate_number || ''} ${v.brand || ''}`.toLowerCase().includes(term));
    }
    if (statusFilter !== 'all') {
      list = list.filter((v) => v.status === statusFilter);
    }
    if (conditionFilter !== 'all') {
      list = list.filter((v) => (v.condition || '').toLowerCase() === conditionFilter);
    }
    if (sortBy === 'vehicle-id') {
      list.sort((a, b) => a.vehicle_id - b.vehicle_id);
    } else if (sortBy === 'status') {
      list.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
    }
    return list;
  }, [listedVehicles, search, statusFilter, conditionFilter, sortBy]);

  // Pagination states
  const [vehiclePage, setVehiclePage] = useState(1);
  const [archivePage, setArchivePage] = useState(1);
  const [maintenancePage, setMaintenancePage] = useState(1);

  useEffect(() => {
    setVehiclePage(1);
  }, [search, statusFilter, conditionFilter, sortBy]);

  const totalVehiclePages = Math.ceil(filteredVehicles.length / PAGE_SIZE) || 1;
  const paginatedVehicles = useMemo(() => {
    const start = (vehiclePage - 1) * PAGE_SIZE;
    return filteredVehicles.slice(start, start + PAGE_SIZE);
  }, [filteredVehicles, vehiclePage]);

  const totalArchivePages = Math.ceil(archivedVehicles.length / PAGE_SIZE) || 1;
  const paginatedArchivedVehicles = useMemo(() => {
    const start = (archivePage - 1) * PAGE_SIZE;
    return archivedVehicles.slice(start, start + PAGE_SIZE);
  }, [archivedVehicles, archivePage]);

  // Load detailed vehicle info with maintenances
  const openVehicleDetails = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setMaintenancePage(1);
    try {
      const res = await api.get(`/vehicles/${vehicle.vehicle_id}`);
      setVehicleDetailsData(res.data);
    } catch (err) {
      setVehicleDetailsData(vehicle);
    }
  };

  // ----- Add / Edit -----
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Image size exceeds 5MB limit.');
        return;
      }
      setVehiclePhotoFile(file);
      setVehiclePhotoPreview(URL.createObjectURL(file));
      setFormError('');
      if (formErrors.photo) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.photo;
          return next;
        });
      }
    }
  };

  const handleDocFileSelect = (file, docType) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFormError('Document file size exceeds 10MB limit.');
      return;
    }
    if (docType === 'or') {
      setOrFile(file);
      if (formErrors.orFile) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.orFile;
          return next;
        });
      }
    }
    if (docType === 'cr') {
      setCrFile(file);
      if (formErrors.crFile) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.crFile;
          return next;
        });
      }
    }
    if (docType === 'insurance') {
      setInsuranceFile(file);
      if (formErrors.insuranceFile) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.insuranceFile;
          return next;
        });
      }
    }
    if (docType === 'emission') {
      setEmissionFile(file);
      if (formErrors.emissionFile) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next.emissionFile;
          return next;
        });
      }
    }
    setFormError('');
  };

  const handleViewDocFile = (title, urlOrItems, vehicle = null) => {
    const targetVehicle = vehicle || vehicleDetailsData || selectedVehicle;
    const docs = Array.isArray(urlOrItems)
      ? urlOrItems.filter((item) => Boolean(item?.url))
      : urlOrItems
      ? [{ label: title, url: urlOrItems }]
      : [];
    setDocModal({
      isOpen: true,
      title,
      docs,
      activeIndex: 0,
      url: docs[0]?.url || null,
      vehicle: targetVehicle,
    });
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    setForm(EMPTY_FORM);
    setVehiclePhotoFile(null);
    setVehiclePhotoPreview(null);
    setOrFile(null);
    setCrFile(null);
    setInsuranceFile(null);
    setEmissionFile(null);
    setFormError('');
    setFormErrors({});
    setShowFormModal(true);
  };

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      model: vehicle.model || '',
      brand: vehicle.brand || '',
      year_model: vehicle.year_model != null ? String(vehicle.year_model) : '',
      plate_number: vehicle.plate_number || '',
      engine_number: vehicle.engine_number || '',
      chassis_number: vehicle.chassis_number || '',
      color: vehicle.color || '',
      vehicle_type: vehicle.vehicle_type || '10-Wheeler Truck',
      classification: vehicle.classification || 'Private (PVT)',
      vehicle_category: vehicle.vehicle_category || 'N2',
      body_type: vehicle.body_type || 'Truck Tractor Head',
      piston_displacement: vehicle.piston_displacement != null ? String(vehicle.piston_displacement) : '',
      fuel_type: vehicle.fuel_type || 'diesel',
      gross_weight: vehicle.gross_weight != null ? String(vehicle.gross_weight) : '',
      net_weight: vehicle.net_weight != null ? String(vehicle.net_weight) : '',
      passenger_capacity: vehicle.passenger_capacity != null ? vehicle.passenger_capacity : '',
      odometer_reading: vehicle.odometer_reading || '',
      registration_valid_from: vehicle.registration_valid_from || '',
      registration_valid_until: vehicle.registration_valid_until || '',
      status: vehicle.status || 'available',
      condition: vehicle.condition || 'Good',
      last_maintenance_date: vehicle.last_maintenance_date || '',
      next_maintenance_date: vehicle.next_maintenance_date || '',
      // Insurance
      insurance_provider: vehicle.insurance_provider || '',
      insurance_policy_number: vehicle.insurance_policy_number || '',
      insurance_coverage_type: vehicle.insurance_coverage_type || 'Comprehensive',
      insurance_valid_from: vehicle.insurance_valid_from || '',
      insurance_valid_until: vehicle.insurance_valid_until || '',
      // Registration Info
      or_number: vehicle.or_number || '',
      cr_number: vehicle.cr_number || '',
      registration_date: vehicle.registration_date || '',
      expiration_date: vehicle.expiration_date || '',
      // Emission
      emission_date: vehicle.emission_date || '',
    });
    setVehiclePhotoFile(null);
    setVehiclePhotoPreview(vehicle.photo_url || null);
    setOrFile(null);
    setCrFile(null);
    setInsuranceFile(null);
    setEmissionFile(null);
    setFormError('');
    setFormErrors({});
    setShowFormModal(true);
  };

  const saveVehicle = async () => {
    const errors = {};

    // Section 1: Vehicle Information
    if (!form.model || !form.model.trim()) {
      errors.model = 'Vehicle Model is required';
    }
    if (!form.brand || !form.brand.trim()) {
      errors.brand = 'Brand / Make is required';
    }
    if (form.year_model !== '' && form.year_model != null) {
      const yr = Number(form.year_model);
      const maxYear = new Date().getFullYear() + 1;
      if (!/^\d{4}$/.test(String(form.year_model).trim()) || yr < 1901 || yr > maxYear) {
        errors.year_model = `Model Year must be between 1901 and ${maxYear}`;
      }
    }
    if (!form.plate_number || !form.plate_number.trim()) {
      errors.plate_number = 'Plate Number is required';
    } else if (!validatePlateNumber(form.plate_number)) {
      errors.plate_number = 'Format must be ABC-1234 or legacy ABC-123';
    }
    if (!editingVehicle && (!form.engine_number || !form.engine_number.trim())) {
      errors.engine_number = 'Engine Number is required';
    } else if (form.engine_number?.trim() && !validateEngineNumber(form.engine_number)) {
      errors.engine_number = 'Use truck engine format (e.g. 8M22-025168, 10–14 chars)';
    }
    if (!editingVehicle && (!form.chassis_number || !form.chassis_number.trim())) {
      errors.chassis_number = 'Chassis Number is required';
    } else if (form.chassis_number?.trim() && !validateChassisNumber(form.chassis_number)) {
      errors.chassis_number = 'Use truck chassis format (e.g. FV50LH-520103) or 17-char VIN';
    }
    if (!form.color || !form.color.trim()) {
      errors.color = 'Color is required';
    }
    if (!form.vehicle_type) {
      errors.vehicle_type = 'Vehicle Type is required';
    }
    if (!form.fuel_type) {
      errors.fuel_type = 'Fuel Type is required';
    }

    // Section 2: Specifications & Vehicle Photo
    const grossValid = form.gross_weight !== '' && form.gross_weight != null && validatePositiveNumber(form.gross_weight);
    const netValid = form.net_weight !== '' && form.net_weight != null && validatePositiveNumber(form.net_weight);
    if (form.gross_weight === '' || form.gross_weight == null) {
      errors.gross_weight = 'Gross Weight is required';
    } else if (!validatePositiveNumber(form.gross_weight)) {
      errors.gross_weight = 'Gross Weight must be a positive number';
    }
    if (form.net_weight === '' || form.net_weight == null) {
      errors.net_weight = 'Net Weight is required';
    } else if (!validatePositiveNumber(form.net_weight)) {
      errors.net_weight = 'Net Weight must be a positive number';
    } else if (grossValid && netValid && Number(form.net_weight) > Number(form.gross_weight)) {
      errors.net_weight = 'Net Weight cannot exceed Gross Weight';
    }
    if (form.passenger_capacity !== '' && form.passenger_capacity != null) {
      const pax = Number(form.passenger_capacity);
      if (!Number.isInteger(pax) || pax < 1 || pax > 60) {
        errors.passenger_capacity = 'Passenger capacity must be a whole number (1–60)';
      }
    }
    if (form.piston_displacement !== '' && form.piston_displacement != null) {
      if (!validatePositiveNumber(form.piston_displacement)) {
        errors.piston_displacement = 'Piston Displacement must be a positive number';
      }
    }
    if (!form.status) {
      errors.status = 'Status is required';
    }
    if (!form.condition || !form.condition.trim()) {
      errors.condition = 'Condition is required';
    }
    if (!vehiclePhotoFile && (!editingVehicle || !editingVehicle.photo_url)) {
      errors.photo = 'Vehicle Photo is required';
    }

    // Section 3: Insurance Information
    if (!form.insurance_provider || !form.insurance_provider.trim()) {
      errors.insurance_provider = 'Provider is required';
    }
    if (!form.insurance_policy_number || !form.insurance_policy_number.trim()) {
      errors.insurance_policy_number = 'Policy Number is required';
    } else if (!validatePolicyNumber(form.insurance_policy_number)) {
      errors.insurance_policy_number = 'Use valid truck policy format (e.g. MC-CV-26-0014614)';
    }
    if (!form.insurance_coverage_type) {
      errors.insurance_coverage_type = 'Coverage Type is required';
    }
    if (!form.insurance_valid_from) {
      errors.insurance_valid_from = 'Valid From date is required';
    }
    if (!form.insurance_valid_until) {
      errors.insurance_valid_until = 'Valid Until date is required';
    } else if (!isStrictlyFutureDate(form.insurance_valid_until)) {
      errors.insurance_valid_until = 'Valid Until must be strictly after today (tomorrow onward)';
    } else if (form.insurance_valid_from && !validateDateSequence(form.insurance_valid_from, form.insurance_valid_until)) {
      errors.insurance_valid_until = 'Valid Until must be on or after Valid From date';
    }

    // Section 4: Registration Info
    if (!form.or_number || !form.or_number.trim()) {
      errors.or_number = 'OR Number is required';
    } else if (!validateOrNumber(form.or_number)) {
      errors.or_number = 'Use LTO OR format (e.g. 038925000007757 or 1001-000000222188)';
    }
    if (!form.cr_number || !form.cr_number.trim()) {
      errors.cr_number = 'CR Number is required';
    } else if (!validateCrNumber(form.cr_number)) {
      errors.cr_number = 'Use LTO CR format (e.g. 0098260263, 29254032-3, or 1001-24-699000111)';
    }
    if (!form.registration_date) {
      errors.registration_date = 'Registration Date is required';
    }
    if (!form.last_maintenance_date) {
      errors.last_maintenance_date = 'Last Maintenance Date is required';
    }

    // Section 5: Documents Requirements & File Uploads
    if (!orFile && (!editingVehicle || !editingVehicle.official_receipt_url)) {
      errors.orFile = 'Official Receipt document file is required';
    }
    if (!crFile && (!editingVehicle || !editingVehicle.certificate_of_registration_url)) {
      errors.crFile = 'Certificate of Registration document file is required';
    }
    if (!insuranceFile && (!editingVehicle || !editingVehicle.insurance_policy_url)) {
      errors.insuranceFile = 'Insurance Policy document file is required';
    }
    if (!form.emission_date) {
      errors.emission_date = 'Emission Test Date is required';
    }
    if (!emissionFile && (!editingVehicle || !editingVehicle.emission_certificate_url)) {
      errors.emissionFile = 'Emission Certificate document file is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormError('Please fill in all required fields and upload all required documents.');
      return;
    }
    setSaving(true);
    setFormError('');
    setFormErrors({});
    try {
      const formData = new FormData();
      formData.append('model', form.model);
      if (form.brand) formData.append('brand', form.brand);
      if (form.year_model !== '' && form.year_model != null) {
        formData.append('year_model', String(form.year_model).trim());
      } else if (editingVehicle) {
        formData.append('year_model', '');
      }
      formData.append('plate_number', form.plate_number);
      if (form.engine_number) formData.append('engine_number', form.engine_number);
      if (form.chassis_number) formData.append('chassis_number', form.chassis_number);
      formData.append('color', form.color);
      formData.append('vehicle_type', form.vehicle_type);
      if (form.classification) formData.append('classification', form.classification);
      if (form.vehicle_category) formData.append('vehicle_category', form.vehicle_category);
      if (form.body_type) formData.append('body_type', form.body_type);
      if (form.piston_displacement !== '' && form.piston_displacement != null) {
        formData.append('piston_displacement', form.piston_displacement);
      } else if (editingVehicle) {
        formData.append('piston_displacement', '');
      }
      formData.append('fuel_type', form.fuel_type);
      if (form.gross_weight !== '' && form.gross_weight != null) formData.append('gross_weight', form.gross_weight);
      if (form.net_weight !== '' && form.net_weight != null) formData.append('net_weight', form.net_weight);
      if (form.passenger_capacity !== '' && form.passenger_capacity != null) {
        formData.append('passenger_capacity', form.passenger_capacity);
      }
      if (form.odometer_reading) formData.append('odometer_reading', form.odometer_reading);
      if (form.registration_valid_from) formData.append('registration_valid_from', form.registration_valid_from);
      if (form.status) formData.append('status', form.status);
      if (form.condition) formData.append('condition', form.condition);
      if (form.last_maintenance_date) formData.append('last_maintenance_date', form.last_maintenance_date);
      if (form.next_maintenance_date) formData.append('next_maintenance_date', form.next_maintenance_date);

      // Insurance fields
      if (form.insurance_provider) formData.append('insurance_provider', form.insurance_provider);
      if (form.insurance_policy_number) formData.append('insurance_policy_number', form.insurance_policy_number);
      if (form.insurance_coverage_type) formData.append('insurance_coverage_type', form.insurance_coverage_type);
      if (form.insurance_valid_from) formData.append('insurance_valid_from', form.insurance_valid_from);
      if (form.insurance_valid_until) formData.append('insurance_valid_until', form.insurance_valid_until);

      // Registration fields
      if (form.or_number) formData.append('or_number', form.or_number);
      if (form.cr_number) formData.append('cr_number', form.cr_number);
      if (form.registration_date) formData.append('registration_date', form.registration_date);

      // Emission date
      if (form.emission_date) formData.append('emission_date', form.emission_date);

      // Document Files
      if (vehiclePhotoFile) formData.append('photo', vehiclePhotoFile);
      if (orFile) formData.append('official_receipt_file', orFile);
      if (crFile) formData.append('certificate_of_registration_file', crFile);
      if (insuranceFile) formData.append('insurance_policy_file', insuranceFile);
      if (emissionFile) formData.append('emission_certificate_file', emissionFile);

      if (editingVehicle) {
        await api.post(`/vehicles/${editingVehicle.vehicle_id}?_method=PUT`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/vehicles', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setShowFormModal(false);
      await loadData();
      if (selectedVehicle && editingVehicle && selectedVehicle.vehicle_id === editingVehicle.vehicle_id) {
        await openVehicleDetails(editingVehicle);
      }
      setToast({ message: editingVehicle ? `Vehicle ${form.model} updated successfully.` : `Vehicle ${form.model} added successfully.` });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      if (backendErrors && typeof backendErrors === 'object') {
        const mapped = {};
        Object.entries(backendErrors).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setFormErrors((prev) => ({ ...prev, ...mapped }));
        setFormError(Object.values(backendErrors)[0]?.[0] || 'Please fix the errors below.');
      } else {
        setFormError(message || 'Could not save vehicle.');
      }
      console.error('Save vehicle failed:', err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  const location = useLocation();
  const navigate = useNavigate();
  const handledScheduleQueryRef = useRef(false);

  // ----- Schedule Maintenance Modal (Matches Reference Image) -----
  const openScheduleMaintenanceModal = useCallback((vehicle, e, suggestedTypeOverride = null) => {
    e?.stopPropagation();
    const isInUse = vehicle?.status === 'in_use';
    const startDate = isInUse ? getTomorrowIso() : getTodayIso();
    const completionDateObj = new Date();
    completionDateObj.setDate(completionDateObj.getDate() + (isInUse ? 3 : 2));
    const defaultCompletion = formatLocalDateIso(completionDateObj);
    setSchedulingVehicle(vehicle);
    setScheduleForm({
      maintenance_date: startDate,
      next_maintenance_date: defaultCompletion,
      maintenance_type: suggestedTypeOverride || (vehicle.status === 'broken' ? 'Emergency Maintenance' : 'Preventive Maintenance'),
      maintenance_cost: '',
      maintained_by_name: '',
      part_id: '',
      quantity_used: '',
      status: 'Scheduled',
    });
    setScheduleError(
      isInUse
        ? 'Note: This vehicle is currently in use on a delivery, so the suggested start date defaults to tomorrow.'
        : ''
    );
    setShowScheduleModal(true);
  }, []);

  useEffect(() => {
    if (loading || !vehicles.length || handledScheduleQueryRef.current) return;
    const params = new URLSearchParams(location.search);
    if (params.get('scheduleMaintenance') !== '1') return;

    const targetId = params.get('vehicleId');
    const suggestedType = params.get('suggestedType');
    const targetVehicle = vehicles.find((v) => String(v.vehicle_id) === String(targetId));
    handledScheduleQueryRef.current = true;

    if (targetVehicle) {
      openScheduleMaintenanceModal(targetVehicle, null, suggestedType || null);
    }
    navigate('/vehicles', { replace: true });
  }, [loading, vehicles, location.search, navigate, openScheduleMaintenanceModal]);

  const selectedPart = useMemo(() => {
    if (!scheduleForm.part_id) return null;
    return spareParts.find((p) => String(p.part_id) === String(scheduleForm.part_id)) || null;
  }, [scheduleForm.part_id, spareParts]);

  const handleScheduleMaintenance = async () => {
    if (!scheduleForm.maintenance_date || !scheduleForm.maintenance_type) {
      setScheduleError('Please select schedule date and service type.');
      return;
    }

    if (scheduleForm.part_id && scheduleForm.quantity_used) {
      const qty = parseInt(scheduleForm.quantity_used, 10);
      if (selectedPart && qty > selectedPart.quantity_in_stock) {
        setScheduleError(`Insufficient stock for ${selectedPart.part_name}. Available: ${selectedPart.quantity_in_stock} ${selectedPart.unit || 'pcs'}.`);
        return;
      }
    }

    setScheduling(true);
    setScheduleError('');
    try {
      await api.post('/vehicle-maintenance', {
        vehicle_id: schedulingVehicle.vehicle_id,
        maintenance_type: scheduleForm.maintenance_type,
        maintenance_date: scheduleForm.maintenance_date,
        next_maintenance_date: scheduleForm.next_maintenance_date || null,
        maintenance_cost: scheduleForm.maintenance_cost ? parseFloat(scheduleForm.maintenance_cost) : 0,
        maintained_by_name: scheduleForm.maintained_by_name,
        status: scheduleForm.status,
        part_id: scheduleForm.part_id || null,
        quantity_used: scheduleForm.quantity_used ? parseInt(scheduleForm.quantity_used, 10) : null,
      });

      setShowScheduleModal(false);
      await loadData();
      if (selectedVehicle && selectedVehicle.vehicle_id === schedulingVehicle.vehicle_id) {
        await openVehicleDetails(schedulingVehicle);
      }
      const hadParts = Boolean(scheduleForm.part_id && scheduleForm.quantity_used);
      setToast({
        message: hadParts
          ? `Maintenance scheduled for ${schedulingVehicle.model} (${vehicleCode(schedulingVehicle.vehicle_id)}) — Waiting for Part Confirmation in Parts Inventory.`
          : `Maintenance started for ${schedulingVehicle.model} (${vehicleCode(schedulingVehicle.vehicle_id)}) — vehicle is now Under Maintenance.`,
      });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to schedule maintenance.';
      setScheduleError(msg);
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelPendingMaintenance = async (maintenanceRecord) => {
    if (!maintenanceRecord?.maintenance_id) return;
    try {
      await api.post(`/vehicle-maintenance/${maintenanceRecord.maintenance_id}/cancel`);
      await loadData();
      if (selectedVehicle) {
        await openVehicleDetails(selectedVehicle);
      }
      setToast({
        message: `Cancelled pending maintenance (${maintenanceRecord.maintenance_type}). History kept for audit and vehicle returned to Available.`,
      });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Could not cancel pending maintenance.',
      });
      setTimeout(() => setToast(null), 5000);
    }
  };

  // ----- Decommission / Restore -----
  const openDecommissionModal = (vehicle, e) => {
    e?.stopPropagation();
    setDecommissioningVehicle(vehicle);
    setShowDecommissionModal(true);
  };

  const confirmDecommission = async () => {
    const vehicle = decommissioningVehicle;
    try {
      await api.patch(`/vehicles/${vehicle.vehicle_id}`, { status: 'decommissioned' });
      setShowDecommissionModal(false);
      setSelectedVehicle(null);
      await loadData();
      setToast({ message: `${vehicle.model} (${vehicleCode(vehicle.vehicle_id)}) decommissioned.`, undoId: vehicle.vehicle_id });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setShowDecommissionModal(false);
    }
  };

  const undoDecommission = async () => {
    if (!toast?.undoId) return;
    try {
      await api.patch(`/vehicles/${toast.undoId}`, { status: 'available' });
      await loadData();
    } finally {
      setToast(null);
    }
  };

  const restoreVehicle = async (vehicle) => {
    try {
      await api.patch(`/vehicles/${vehicle.vehicle_id}`, { status: 'available' });
      await loadData();
    } catch (err) {
      console.error('Failed to restore vehicle:', err);
    }
  };

  return (
    <>
      <div className="dashboard-container">
        <Sidebar activePage="vehicles" />

        <div className="main-content">
          <header className="header">
            <div className="page-info">
              <span className="breadcrumb">Page/Vehicles</span>
              <h1 className="page-title">VEHICLE MANAGEMENT</h1>
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

          {/* KPI Cards Row */}
          <div className="vehicle-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div
              className={`stat-card${statusFilter === 'available' ? ' active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (view !== 'list') setView('list');
                setStatusFilter((prev) => (prev === 'available' ? 'all' : 'available'));
              }}
              title="Click to filter Available vehicles"
            >
              <div className="vehicle-stat-badge green">{stats.available}</div>
              <span className="vehicle-stat-label">Available<br /><small>Ready for Dispatch</small></span>
            </div>

            <div
              className={`stat-card${statusFilter === 'in_use' ? ' active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (view !== 'list') setView('list');
                setStatusFilter((prev) => (prev === 'in_use' ? 'all' : 'in_use'));
              }}
              title="Click to filter In Use vehicles"
            >
              <div className="vehicle-stat-badge blue">{stats.inUse}</div>
              <span className="vehicle-stat-label">In Use</span>
            </div>

            <div
              className={`stat-card${statusFilter === 'maintenance' ? ' active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (view !== 'list') setView('list');
                setStatusFilter((prev) => (prev === 'maintenance' ? 'all' : 'maintenance'));
              }}
              title="Click to filter Under Maintenance vehicles"
            >
              <div className="vehicle-stat-badge orange">{stats.maintenance}</div>
              <span className="vehicle-stat-label">Under Maintenance</span>
            </div>

            <div
              className={`stat-card${view === 'archives' ? ' active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                if (view === 'archives') {
                  setView('list');
                } else {
                  setView('archives');
                  setStatusFilter('all');
                }
              }}
              title="Click to view Decommissioned / Archived vehicles"
            >
              <div className="vehicle-stat-badge red">{stats.broken}</div>
              <span className="vehicle-stat-label">Broken<br /><small>Out of Service</small></span>
            </div>
          </div>

          {view === 'list' && (
            <div className="content-section vehicles-section">
              <div className="vehicles-toolbar" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, margin: '16px 0' }}>
                <div className="vehicles-toolbar-left" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div className="search-bar">
                    <i className="fas fa-search"></i>
                    <input type="text" placeholder="Search vehicles..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="vehicles-filter">
                    <span>Sort by</span>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="vehicle-id">Vehicle ID</option>
                      <option value="status">Status</option>
                    </select>
                  </div>
                  <div className="vehicles-filter">
                    <span>Filter by</span>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="all">All Status</option>
                      <option value="available">Available</option>
                      <option value="in_use">In Use</option>
                      <option value="maintenance">Under Maintenance</option>
                      <option value="waiting_part_confirmation">Waiting for Part Confirmation</option>
                      <option value="broken">Broken</option>
                    </select>
                  </div>
                  <div className="vehicles-filter">
                    <span>Condition</span>
                    <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)}>
                      <option value="all">All</option>
                      <option value="good">Good</option>
                      <option value="need repair">Need Repair</option>
                      <option value="irreparable">Irreparable</option>
                    </select>
                  </div>
                </div>
                <div className="vehicles-toolbar-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-incidents"
                    onClick={() => setView('incidents')}
                  >
                    <i className="fas fa-triangle-exclamation"></i>
                    <span>Incidents</span>
                  </button>
                  <button type="button" className="btn-archives" onClick={() => setView('archives')}>Archives</button>
                  <button type="button" className="btn-add-vehicle" onClick={openAddModal}><i className="fas fa-plus"></i> Add Vehicle</button>
                </div>
              </div>

              <div className="section-content vehicles-table-wrap">
                <table className="data-table vehicles-table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Vehicle ID</th>
                      <th>Plate Number</th>
                      <th>Status</th>
                      <th>Condition</th>
                      <th>Last Maintenance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={5} columns={7} />
                    ) : paginatedVehicles.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: 24 }}>No vehicles found.</td></tr>
                    ) : (
                      paginatedVehicles.map((vehicle) => (
                        <tr key={vehicle.vehicle_id} className="vehicle-row" onClick={() => openVehicleDetails(vehicle)}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <img
                                src={vehicle.photo_url || '/images/default-truck.png'}
                                alt={vehicle.model}
                                style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', flexShrink: 0 }}
                                onError={(e) => { e.currentTarget.src = '/images/default-truck.png'; }}
                              />
                              <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{formatVehicleName(vehicle)}</span>
                            </div>
                          </td>
                          <td className="vehicle-id" style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>{vehicleCode(vehicle.vehicle_id)}</td>
                          <td style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', letterSpacing: '0.3px' }}>{vehicle.plate_number}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <span className={`vehicle-status ${statusClass(vehicle.status)}`} style={{ fontSize: 14, fontWeight: 600 }}>
                                <i className="fas fa-circle" style={{ fontSize: 9 }}></i> {statusLabel(vehicle.status)}
                              </span>
                              {vehicle.status === 'broken' && (
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    color: '#991b1b',
                                    background: '#fee2e2',
                                    border: '1px solid #fca5a5',
                                    padding: '4px 8px',
                                    borderRadius: 5,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    whiteSpace: 'nowrap',
                                    width: 'fit-content',
                                  }}
                                  title="Vehicle disabled due to an incident/accident. Please schedule maintenance immediately."
                                >
                                  <i className="fas fa-triangle-exclamation"></i> Accident Reported — Schedule Maintenance ASAP
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>{vehicle.condition || '—'}</td>
                          <td style={{ fontSize: 14, fontWeight: 500, color: '#334155' }}>{formatDate(vehicle.last_maintenance_date)}</td>
                          <td className="action-cell" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const isAvailable = vehicle.status === 'available';
                              const isBroken = vehicle.status === 'broken';
                              const isInUse = vehicle.status === 'in_use';
                              const isWaitingParts = vehicle.status === 'waiting_part_confirmation';
                              const isMaintenance = vehicle.status === 'maintenance' || isWaitingParts;
                              const canSchedule = isAvailable || isBroken;
                              const canDecommission = isAvailable;
                              const canEdit = isAvailable;

                              return (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap' }}>
                                  <button
                                    className="btn-action-schedule"
                                    onClick={(e) => canSchedule && openScheduleMaintenanceModal(vehicle, e)}
                                    disabled={!canSchedule}
                                    title={
                                      isInUse
                                        ? 'Cannot schedule maintenance: vehicle is currently active in a delivery trip.'
                                        : isWaitingParts
                                        ? 'Locked: vehicle is waiting for maintenance parts confirmation.'
                                        : isMaintenance
                                        ? 'Vehicle is already under active maintenance.'
                                        : isBroken
                                        ? 'Schedule urgent repair for broken vehicle'
                                        : 'Schedule Maintenance'
                                    }
                                    style={{
                                      background: !canSchedule ? '#cbd5e1' : (isBroken ? '#dc2626' : '#f97316'),
                                      color: !canSchedule ? '#64748b' : '#fff',
                                      border: 'none',
                                      padding: '8px 14px',
                                      borderRadius: 6,
                                      fontSize: 13,
                                      fontWeight: 700,
                                      cursor: !canSchedule ? 'not-allowed' : 'pointer',
                                      opacity: !canSchedule ? 0.55 : 1,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      whiteSpace: 'nowrap',
                                      boxShadow: isBroken ? '0 0 10px rgba(220, 38, 38, 0.4)' : 'none',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    <i className={isBroken ? 'fas fa-wrench' : 'fas fa-tools'} style={{ fontSize: 12 }}></i>
                                    {isBroken ? 'Schedule Repair' : 'Schedule'}
                                  </button>
                                  <button
                                    className="btn-danger btn-decommission"
                                    onClick={(e) => canDecommission && openDecommissionModal(vehicle, e)}
                                    disabled={!canDecommission}
                                    title={
                                      isInUse
                                        ? 'Cannot decommission vehicle: currently in use on a trip.'
                                        : !isAvailable
                                        ? 'Only available vehicles can be decommissioned.'
                                        : 'Decommission Vehicle'
                                    }
                                    style={{
                                      background: !canDecommission ? '#fca5a5' : '#ef4444',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '8px 14px',
                                      borderRadius: 6,
                                      fontSize: 13,
                                      fontWeight: 700,
                                      cursor: !canDecommission ? 'not-allowed' : 'pointer',
                                      opacity: !canDecommission ? 0.45 : 1,
                                      whiteSpace: 'nowrap',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    Decommission
                                  </button>
                                  <button
                                    className="btn-edit"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (canEdit) openEditModal(vehicle);
                                    }}
                                    disabled={!canEdit}
                                    title={
                                      isInUse
                                        ? 'Cannot edit specifications: vehicle is currently active on a trip.'
                                        : !isAvailable
                                        ? 'Vehicle must be available to edit specifications.'
                                        : 'Edit Vehicle Information'
                                    }
                                    style={{
                                      background: !canEdit ? '#94a3b8' : '#475569',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '8px 14px',
                                      borderRadius: 6,
                                      fontSize: 13,
                                      fontWeight: 700,
                                      cursor: !canEdit ? 'not-allowed' : 'pointer',
                                      opacity: !canEdit ? 0.45 : 1,
                                      whiteSpace: 'nowrap',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    Edit
                                  </button>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <Pagination
                  currentPage={vehiclePage}
                  totalPages={totalVehiclePages}
                  totalItems={filteredVehicles.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setVehiclePage}
                  showAlways={true}
                />
                <p className="vehicles-table-hint" style={{ marginTop: 10, color: '#dc2626', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-info-circle" style={{ color: '#dc2626' }}></i> Click any Vehicle row to view full Vehicle Specifications &amp; Maintenance History.
                </p>
              </div>
            </div>
          )}

          {view === 'archives' && (
            <div className="content-section vehicles-section">
              <div className="vehicles-toolbar" style={{ display: 'flex', justifyContent: 'space-between', margin: '16px 0' }}>
                <h2 className="vehicle-archives-title">Vehicle Archives</h2>
                <button className="btn-return-vehicles" onClick={() => setView('list')}>Return <i className="fas fa-reply"></i></button>
              </div>
              <table className="data-table vehicles-table">
                <thead><tr><th>Vehicle</th><th>Vehicle ID</th><th>Condition</th><th>Action</th></tr></thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton rows={4} columns={4} />
                  ) : paginatedArchivedVehicles.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: 24 }}>No archived vehicles yet.</td></tr>
                  ) : (
                    paginatedArchivedVehicles.map((vehicle) => (
                      <tr key={vehicle.vehicle_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <img
                              src={vehicle.photo_url || '/images/default-truck.png'}
                              alt=""
                              style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}
                              onError={(e) => { e.currentTarget.src = '/images/default-truck.png'; }}
                            />
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{formatVehicleName(vehicle)}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, fontSize: 14, color: '#334155' }}>{vehicleCode(vehicle.vehicle_id)}</td>
                        <td style={{ fontSize: 14, color: '#334155' }}>{vehicle.condition || '—'}</td>
                        <td>
                          <button
                            className="btn-edit"
                            onClick={() => restoreVehicle(vehicle)}
                            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: 6 }}
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <Pagination
                currentPage={archivePage}
                totalPages={totalArchivePages}
                totalItems={archivedVehicles.length}
                pageSize={PAGE_SIZE}
                onPageChange={setArchivePage}
                showAlways={true}
              />
            </div>
          )}

          {view === 'incidents' && (
            <div className="content-section vehicles-section" id="vehicleIncidentsSection">
              <div className="vehicles-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0', flexWrap: 'wrap', gap: 12 }}>
                <h2 className="section-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-triangle-exclamation" style={{ color: '#F59E0B' }}></i>
                  Vehicle Incident Reports &amp; Inspections
                </h2>
                <button
                  type="button"
                  className="btn-return-vehicles"
                  onClick={() => setView('list')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#B91C1C',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <span>Return to Vehicles</span>
                  <i className="fas fa-reply"></i>
                </button>
              </div>

              {/* Sub-tab Switcher: Inspections vs Incident Reports */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setIncidentSubTab('inspections')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: incidentSubTab === 'inspections' ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
                    background: incidentSubTab === 'inspections' ? '#0284C7' : '#FFFFFF',
                    color: incidentSubTab === 'inspections' ? '#FFFFFF' : '#334155',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <i className="fas fa-clipboard-check"></i>
                  <span>Inspection Checklists &amp; Photos ({inspectionLogs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentSubTab('incidents')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: incidentSubTab === 'incidents' ? '1.5px solid #B91C1C' : '1px solid #CBD5E1',
                    background: incidentSubTab === 'incidents' ? '#B91C1C' : '#FFFFFF',
                    color: incidentSubTab === 'incidents' ? '#FFFFFF' : '#334155',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <i className="fas fa-triangle-exclamation"></i>
                  <span>Incident Reports ({vehicleIncidents.length})</span>
                </button>
              </div>

              {/* Incidents / Inspections Search & Filter Bar */}
              <div className="incidents-controls" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '14px 0', alignItems: 'center' }}>
                <div className="search-bar" style={{ width: 300 }}>
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Search vehicle, plate, inspector, delivery..."
                    value={incidentSearch}
                    onChange={(e) => {
                      setIncidentSearch(e.target.value);
                      setIncidentPage(1);
                    }}
                  />
                </div>

                {incidentSubTab === 'incidents' && (
                  <>

                {/* Filter Pills */}
                <div className="incident-tabs" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['All', 'Breakdown', 'Flat Tire', 'Engine', 'Brake', 'Body Damage', 'Accident', 'Other'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`incident-tab${incidentTypeFilter === t ? ' active' : ''}`}
                      onClick={() => {
                        setIncidentTypeFilter(t);
                        setIncidentPage(1);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        border: incidentTypeFilter === t ? '1.5px solid #b91c1c' : '1px solid #cbd5e1',
                        background: incidentTypeFilter === t ? '#b91c1c' : '#fff',
                        color: incidentTypeFilter === t ? '#fff' : '#475569',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Severity Dropdown */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Severity:</span>
                  <select
                    value={incidentSeverityFilter}
                    onChange={(e) => {
                      setIncidentSeverityFilter(e.target.value);
                      setIncidentPage(1);
                    }}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1e293b',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="All">All Severities</option>
                    <option value="high">High Severity</option>
                    <option value="medium">Medium Severity</option>
                    <option value="low">Low Severity</option>
                  </select>
                </div>
                  </>
                )}
              </div>

              {incidentSubTab === 'inspections' ? (
                <>
                  <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, margin: '8px 0 14px' }}>
                    Showing {filteredInspectionLogs.length} of {inspectionLogs.length} recorded inspection activities.
                  </p>
                  <div className="section-content vehicles-table-wrap">
                    <table className="data-table vehicles-table">
                      <thead>
                        <tr>
                          <th>Delivery #</th>
                          <th>Vehicle</th>
                          <th>Inspection Type</th>
                          <th>Inspected By</th>
                          <th>Date &amp; Time</th>
                          <th>Checklist &amp; Photos</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <TableSkeleton rows={4} columns={7} />
                        ) : filteredInspectionLogs.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: 28, color: '#6B7280' }}>
                              No completed inspection checklists found yet.
                            </td>
                          </tr>
                        ) : (
                          filteredInspectionLogs.map((log) => {
                            const veh = log.resolvedVehicle;
                            const delCode = `DLV${String(log.delivery_id).padStart(4, '0')}`;
                            const inspectorName = log.inspector_name || log.inspector?.full_name || 'Staff Inspector';
                            const inspectorPhoto = log.inspector?.profile_photo_url || '/images/defaultavatar.png';
                            return (
                              <tr key={`${log.delivery_id}-${log.checklist_id || log.type}`}>
                                <td style={{ fontWeight: 800, color: '#2563EB', fontFamily: 'monospace' }}>{delCode}</td>
                                <td>
                                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0F172A' }}>{formatVehicleName(veh)}</div>
                                  <div style={{ fontSize: 12, color: '#64748B' }}>{veh?.plate_number || '—'}</div>
                                </td>
                                <td>
                                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#E0F2FE', color: '#0369A1', textTransform: 'capitalize' }}>
                                    {String(log.type || '').replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <img
                                      src={inspectorPhoto}
                                      alt=""
                                      style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                                      onError={(e) => { e.currentTarget.src = '/images/defaultavatar.png'; }}
                                    />
                                    <span style={{ fontWeight: 600, fontSize: 13, color: '#1E293B' }}>{inspectorName}</span>
                                  </div>
                                </td>
                                <td style={{ fontSize: 12.5, color: '#475569' }}>
                                  {formatDateTime(log.completed_at || log.created_at)}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <span
                                      style={{
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        padding: '2px 7px',
                                        borderRadius: 10,
                                        background: log.defectCount > 0 ? '#FEF2F2' : '#DCFCE7',
                                        color: log.defectCount > 0 ? '#DC2626' : '#15803D',
                                      }}
                                    >
                                      {log.passedCount}/{log.totalCount} Passed
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        padding: '2px 7px',
                                        borderRadius: 10,
                                        background: log.photoCount > 0 ? '#EFF6FF' : '#F1F5F9',
                                        color: log.photoCount > 0 ? '#1D4ED8' : '#64748B',
                                      }}
                                    >
                                      <i className="fas fa-camera" style={{ marginRight: 4 }}></i>
                                      {log.photoCount} Photo{log.photoCount === 1 ? '' : 's'}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedInspectionDelivery(log.resolvedDelivery)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      background: '#0284C7',
                                      color: '#fff',
                                      border: 'none',
                                      padding: '7px 12px',
                                      borderRadius: 6,
                                      fontSize: 12,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    <i className="fas fa-images"></i>
                                    <span>View Inspection</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
              <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, margin: '8px 0 14px' }}>
                Showing {filteredVehicleIncidents.length} of {vehicleIncidents.length} vehicle incident reports.
              </p>

              {/* Table */}
              <div className="section-content vehicles-table-wrap">
                <table className="data-table vehicles-table">
                  <thead>
                    <tr>
                      <th>Incident #</th>
                      <th>Vehicle</th>
                      <th>Inspected / Reported By</th>
                      <th>Date &amp; Time</th>
                      <th>Issue Type</th>
                      <th>Details &amp; Defects</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={4} columns={7} />
                    ) : paginatedIncidents.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: 28, color: '#6B7280' }}>
                          No vehicle incident or inspection reports found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedIncidents.map((inc) => {
                        const veh = inc.resolvedVehicle;
                        const inspectorName =
                          inc.resolvedDelivery?.checklists?.[0]?.inspector_name ||
                          inc.reporter?.full_name ||
                          'Staff Inspector';
                        const inspectorPhoto =
                          inc.resolvedDelivery?.checklists?.[0]?.inspector?.profile_photo_url ||
                          inc.reporter?.profile_photo_url ||
                          '/images/defaultavatar.png';
                        const inspectorRole = inc.reporter?.role?.role_name || 'Staff Inspector';
                        const incCode = `INC-${String(inc.incident_id).padStart(5, '0')}`;
                        const dateStr = inc.reported_at || inc.resolvedDelivery?.checklists?.[0]?.completed_at || inc.created_at;

                        return (
                          <tr key={inc.incident_id}>
                            {/* Incident ID with Severity */}
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontWeight: 800, color: '#DC2626', fontSize: 14 }}>{incCode}</span>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: 'fit-content',
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: 4,
                                    textTransform: 'uppercase',
                                    background:
                                      inc.severity === 'high'
                                        ? '#FEE2E2'
                                        : inc.severity === 'low'
                                        ? '#DCFCE7'
                                        : '#FEF3C7',
                                    color:
                                      inc.severity === 'high'
                                        ? '#DC2626'
                                        : inc.severity === 'low'
                                        ? '#15803D'
                                        : '#D97706',
                                  }}
                                >
                                  {(inc.severity || 'medium').toUpperCase()}
                                </span>
                              </div>
                            </td>

                            {/* Vehicle Details */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <img
                                  src={veh?.photo_url || '/images/default-truck.png'}
                                  alt=""
                                  style={{
                                    width: 56,
                                    height: 42,
                                    objectFit: 'cover',
                                    borderRadius: 6,
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                                    flexShrink: 0,
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.src = '/images/default-truck.png';
                                  }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                                    {formatVehicleName(veh)}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                    {veh?.plate_number || 'No Plate'} • {vehicleCode(veh?.vehicle_id || inc.resolvedDelivery?.vehicle_id || 0)}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Inspected By */}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <img
                                  src={inspectorPhoto}
                                  alt=""
                                  style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                                  onError={(e) => {
                                    e.currentTarget.src = '/images/defaultavatar.png';
                                  }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1e293b' }}>
                                    {inspectorName}
                                  </div>
                                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                                    {inspectorRole}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Date & Time */}
                            <td>
                              <div style={{ fontWeight: 600, color: '#1F2937', fontSize: 13 }}>
                                {formatDateTime(dateStr)}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                Inspection Log
                              </div>
                            </td>

                            {/* Issue Type */}
                            <td>
                              <span
                                style={{
                                  textTransform: 'capitalize',
                                  fontWeight: 700,
                                  color: '#B91C1C',
                                  fontSize: 13,
                                  background: '#FEF2F2',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  display: 'inline-block',
                                }}
                              >
                                {(inc.incident_type || 'Other').replace(/_/g, ' ')}
                              </span>
                            </td>

                            {/* Details & Defects */}
                            <td style={{ maxWidth: 260 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {inc.description || 'No defect description provided.'}
                              </div>
                              {inc.resolvedDelivery?.starting_odometer && (
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                  <i className="fas fa-gauge" style={{ marginRight: 4 }}></i>
                                  Odometer: {Number(inc.resolvedDelivery.starting_odometer).toLocaleString()} km
                                </div>
                              )}
                            </td>

                            {/* Action */}
                            <td>
                              <button
                                type="button"
                                className="btn-print-incident"
                                onClick={() => setSelectedIncident(inc)}
                                title="View Detailed Inspection & Operational Report"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  background: '#334155',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '7px 14px',
                                  borderRadius: 6,
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#1e293b')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = '#334155')}
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
                  totalItems={filteredVehicleIncidents.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setIncidentPage}
                  showAlways={true}
                />
              </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification show">
          <div className="toast-content">
            <span className="toast-message"><i className="fas fa-check-circle"></i> {toast.message}</span>
            {toast.undoId && <button className="btn-undo" onClick={undoDecommission}><i className="fa fa-undo"></i> Undo</button>}
          </div>
        </div>
      )}

      {/* SweetAlert-style Pop-up Toast for Vehicle Form Validation */}
      {formError && (
        <div className="sweet-alert-popup" role="alert">
          <div className="sweet-alert-icon">
            <i className="fas fa-exclamation"></i>
          </div>
          <div className="sweet-alert-body">
            <h4 className="sweet-alert-title">{getAlertTitle(formError)}</h4>
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

      {/* SweetAlert-style Pop-up Toast for Maintenance Scheduling */}
      {scheduleError && (
        <div className="sweet-alert-popup" role="alert">
          <div className="sweet-alert-icon">
            <i className="fas fa-exclamation"></i>
          </div>
          <div className="sweet-alert-body">
            <h4 className="sweet-alert-title">Maintenance Notice</h4>
            <p className="sweet-alert-desc">{scheduleError}</p>
          </div>
          <button
            type="button"
            className="sweet-alert-close"
            onClick={() => setScheduleError('')}
            aria-label="Dismiss alert"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Decommission confirmation */}
      {showDecommissionModal && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content" style={{ maxWidth: 450, borderRadius: 10 }}>
            <div className="modal-body" style={{ padding: 24 }}>
              <h3 style={{ color: '#dc2626', margin: '0 0 12px' }}>Decommission Vehicle</h3>
              <p>Are you sure you want to decommission <strong>{decommissioningVehicle?.model}</strong> ({vehicleCode(decommissioningVehicle?.vehicle_id)})?</p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 24px' }}>
              <button className="btn-cancel" onClick={() => setShowDecommissionModal(false)}>Cancel</button>
              <button className="btn-save" style={{ background: '#dc2626' }} onClick={confirmDecommission}>Decommission</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCHEDULE MAINTENANCE MODAL (MATCHING REFERENCE PHOTO EXACTLY)            */}
      {/* ========================================================================= */}
      {showScheduleModal && schedulingVehicle && (
        <div
          className="modal"
          style={{
            display: 'flex',
            position: 'fixed',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            zIndex: 1100,
            padding: 16,
          }}
        >
          <div
            className="modal-content"
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#ffffff',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            {/* Red banner header */}
            <div
              style={{
                background: '#d32f2f',
                color: '#ffffff',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px' }}>
                SCHEDULE MAINTENANCE
              </h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Vehicle card matching reference photo */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 14,
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  marginBottom: 20,
                }}
              >
                <img
                  src={schedulingVehicle.photo_url || '/images/default-truck.png'}
                  alt={schedulingVehicle.model}
                  style={{
                    width: 70,
                    height: 52,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                  }}
                  onError={(e) => { e.currentTarget.src = '/images/default-truck.png'; }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                      {schedulingVehicle.model || 'Truck'}
                    </h3>
                    <span
                      style={{
                        background: schedulingVehicle.status === 'available' ? '#dcfce7' : '#dbeafe',
                        color: schedulingVehicle.status === 'available' ? '#16a34a' : '#2563eb',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '2px 10px',
                        borderRadius: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      ● {statusLabel(schedulingVehicle.status)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 13, color: '#64748b' }}>
                    <span>{vehicleCode(schedulingVehicle.vehicle_id)}</span>
                    <span>Plate Number: <strong>{schedulingVehicle.plate_number}</strong></span>
                  </div>
                </div>
              </div>


              {/* Maintenance Details section */}
              <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: '#0f172a', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                MAINTENANCE DETAILS
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Schedule & Expected Completion Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Schedule Date:
                    </label>
                    <input
                      type="date"
                      value={scheduleForm.maintenance_date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, maintenance_date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Expected Completion Date:
                    </label>
                    <input
                      type="date"
                      min={scheduleForm.maintenance_date}
                      value={scheduleForm.next_maintenance_date || ''}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, next_maintenance_date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 14,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-clock" style={{ color: '#2563eb' }}></i>
                  <span><strong>Automated Return:</strong> The vehicle automatically returns to <strong>Available</strong> status and emits an alert once the completion date is reached.</span>
                </div>

                {/* Select Service Type (7 Required types) */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Select Service Type:
                  </label>
                  <select
                    value={scheduleForm.maintenance_type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, maintenance_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      background: '#fff',
                    }}
                  >
                    {SERVICE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Maintenance Cost */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Maintenance Cost:
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter Cost"
                    value={scheduleForm.maintenance_cost}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, maintenance_cost: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Maintained By */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    External Maintenance Provider / Shop:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Isuzu Motors / HJY Machine Shop"
                    value={scheduleForm.maintained_by_name}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, maintained_by_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Parts Used Selection (Skipped/Optional if Inspection) */}
                {scheduleForm.maintenance_type !== 'Inspection' ? (
                  <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                      Parts Required / Used (Optional):
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                      <select
                        value={scheduleForm.part_id}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, part_id: e.target.value, quantity_used: e.target.value ? (scheduleForm.quantity_used || '1') : '' })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          background: '#fff',
                        }}
                      >
                        <option value="">-- None / No Parts --</option>
                        {spareParts.map((p) => (
                          <option key={p.part_id} value={p.part_id}>
                            {p.part_name} ({p.quantity_in_stock} {p.unit || 'pcs'} in stock)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        disabled={!scheduleForm.part_id}
                        value={scheduleForm.quantity_used}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, quantity_used: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    {selectedPart ? (
                      <p style={{ margin: '6px 0 0', fontSize: 11.5, color: selectedPart.quantity_in_stock <= 0 ? '#ef4444' : '#b45309', fontWeight: 600 }}>
                        Stock: <strong>{selectedPart.quantity_in_stock} {selectedPart.unit || 'pcs'}</strong> — vehicle will move to <strong>Waiting for Part Confirmation</strong> until confirmed in Parts Inventory.
                      </p>
                    ) : (
                      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b' }}>
                        Leave blank to start maintenance right away (<strong>Under Maintenance</strong>), or pick a part to require Parts Inventory confirmation first.
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: '4px 0', fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                    <i className="fas fa-info-circle"></i> Inspection does not require spare parts deduction.
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={handleScheduleMaintenance}
                  disabled={scheduling}
                  style={{
                    width: '100%',
                    background: '#d32f2f',
                    color: '#ffffff',
                    padding: '12px 16px',
                    borderRadius: 6,
                    border: 'none',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)',
                  }}
                >
                  {scheduling ? 'Scheduling...' : 'Schedule Maintenance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VEHICLE DETAILS MODAL (FULL SPECS, DRIVER, MAINTENANCE & PARTS HISTORY)   */}
      {/* ========================================================================= */}
      {selectedVehicle && !showFormModal && !showScheduleModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            padding: 16,
          }}
          onClick={() => setSelectedVehicle(null)}
        >
          <div
            className="hide-scrollbar"
            style={{
              width: '100%',
              maxWidth: '1080px',
              maxHeight: '90vh',
              background: '#ffffff',
              borderRadius: 12,
              overflowY: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: '#1e293b',
                color: '#ffffff',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fas fa-truck" style={{ fontSize: 20, color: '#f59e0b' }}></i>
                <h2 style={{ margin: 0, color: '#ffffff', fontSize: 18, fontWeight: 800, letterSpacing: '0.5px' }}>
                  VEHICLE SPECIFICATIONS &amp; HISTORY
                </h2>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: 22,
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body Container */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Top 3-Card Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {/* Card 1: Vehicle Identity & Action Buttons */}
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div
                      onClick={() => handleViewDocFile(`${selectedVehicle.model || 'Vehicle'} Photo`, selectedVehicle.photo_url || '/images/default-truck.png', selectedVehicle)}
                      title="Click to enlarge vehicle photo"
                      style={{
                        width: '100%',
                        height: 196,
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        marginBottom: 12,
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      <img
                        src={selectedVehicle.photo_url || '/images/default-truck.png'}
                        alt={selectedVehicle.model}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => { e.currentTarget.src = '/images/default-truck.png'; }}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {selectedVehicle.model}
                        </h3>
                        <span className={`vehicle-status ${statusClass(selectedVehicle.status)}`} style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          ● {statusLabel(selectedVehicle.status)}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
                        <strong>{vehicleCode(selectedVehicle.vehicle_id)}</strong> · Plate: <strong>{selectedVehicle.plate_number}</strong>
                      </p>
                    </div>
                  </div>

                  {/* 3 Uniform Action Buttons */}
                  {(() => {
                    const isAvailable = selectedVehicle.status === 'available';
                    const isBroken = selectedVehicle.status === 'broken';
                    const isInUse = selectedVehicle.status === 'in_use';
                    const isWaitingParts = selectedVehicle.status === 'waiting_part_confirmation';
                    const isMaintenance = selectedVehicle.status === 'maintenance' || isWaitingParts;
                    const canSchedule = isAvailable || isBroken;
                    const canDecommission = isAvailable;
                    const canEdit = isAvailable;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        <button
                          onClick={(e) => canSchedule && openScheduleMaintenanceModal(selectedVehicle, e)}
                          disabled={!canSchedule}
                          title={
                            isInUse
                              ? 'Cannot schedule maintenance: vehicle is currently active in a delivery trip.'
                              : isWaitingParts
                              ? 'Locked: vehicle is waiting for maintenance parts confirmation.'
                              : isMaintenance
                              ? 'Vehicle is already under active maintenance.'
                              : isBroken
                              ? 'Schedule urgent repair for broken vehicle'
                              : 'Schedule Maintenance'
                          }
                          style={{
                            width: '100%',
                            height: '36px',
                            background: !canSchedule ? '#cbd5e1' : (isBroken ? '#dc2626' : '#f97316'),
                            color: !canSchedule ? '#64748b' : '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: !canSchedule ? 'not-allowed' : 'pointer',
                            opacity: !canSchedule ? 0.55 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            boxSizing: 'border-box',
                            boxShadow: isBroken ? '0 0 8px rgba(220, 38, 38, 0.4)' : 'none',
                          }}
                        >
                          <i className={isBroken ? 'fas fa-wrench' : 'fas fa-tools'}></i>{' '}
                          {isBroken ? 'Schedule Repair (Broken)' : 'Schedule Maintenance'}
                        </button>
                        <button
                          onClick={() => {
                            if (!canEdit) return;
                            const v = selectedVehicle;
                            setSelectedVehicle(null);
                            openEditModal(v);
                          }}
                          disabled={!canEdit}
                          title={
                            isInUse
                              ? 'Cannot edit vehicle info while vehicle is in use.'
                              : isMaintenance
                              ? 'Cannot edit vehicle info while under maintenance.'
                              : !isAvailable
                              ? 'Vehicle cannot be edited in current status.'
                              : 'Edit Vehicle Info'
                          }
                          style={{
                            width: '100%',
                            height: '36px',
                            background: !canEdit ? '#cbd5e1' : '#475569',
                            color: !canEdit ? '#64748b' : '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: !canEdit ? 'not-allowed' : 'pointer',
                            opacity: !canEdit ? 0.55 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            boxSizing: 'border-box',
                          }}
                        >
                          <i className="fas fa-edit"></i> Edit Info
                        </button>
                        <button
                          onClick={(e) => canDecommission && openDecommissionModal(selectedVehicle, e)}
                          disabled={!canDecommission}
                          title={
                            isInUse
                              ? 'Cannot decommission vehicle while active in delivery.'
                              : isMaintenance
                              ? 'Cannot decommission vehicle while under maintenance.'
                              : isBroken
                              ? 'Vehicle must be repaired or inspected before decommissioning.'
                              : !isAvailable
                              ? 'Vehicle cannot be decommissioned in current status.'
                              : 'Decommission Vehicle'
                          }
                          style={{
                            width: '100%',
                            height: '36px',
                            background: !canDecommission ? '#cbd5e1' : '#ef4444',
                            color: !canDecommission ? '#64748b' : '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: !canDecommission ? 'not-allowed' : 'pointer',
                            opacity: !canDecommission ? 0.55 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            boxSizing: 'border-box',
                          }}
                        >
                          <i className="fas fa-ban"></i> Decommission
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Card 2: Vehicle Specs */}
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#1e293b', fontSize: 14, fontWeight: 700, borderBottom: '1px solid #cbd5e1', paddingBottom: 6 }}>
                    Vehicle Specs
                  </h4>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Vehicle Type:</strong> {selectedVehicle.vehicle_type || '—'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Model Year:</strong> {selectedVehicle.year_model || '—'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Body Type:</strong> {selectedVehicle.body_type || '—'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Classification:</strong> {selectedVehicle.classification || '—'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Vehicle Category:</strong> {selectedVehicle.vehicle_category || '—'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Piston Displacement:</strong> {selectedVehicle.piston_displacement ? `${Number(selectedVehicle.piston_displacement).toLocaleString()} cc` : '—'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Engine No.:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedVehicle.engine_number || '—'}</span></p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Chassis No.:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedVehicle.chassis_number || '—'}</span></p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Fuel Type:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedVehicle.fuel_type || 'diesel'}</span></p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Gross Weight:</strong> {selectedVehicle.gross_weight ? `${selectedVehicle.gross_weight} kg` : '—'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Net Weight:</strong> {selectedVehicle.net_weight ? `${selectedVehicle.net_weight} kg` : '—'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Passenger Capacity:</strong> {selectedVehicle.passenger_capacity ? `${selectedVehicle.passenger_capacity} pax` : '—'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong>Color:</strong>
                    {selectedVehicle.color && parseColorToHex(selectedVehicle.color) && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: parseColorToHex(selectedVehicle.color),
                          border: '1px solid #cbd5e1',
                        }}
                      />
                    )}
                    <span>{selectedVehicle.color || '—'}</span>
                  </p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Condition:</strong> {selectedVehicle.condition || 'Good'}</p>
                  <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Registration Date:</strong> {formatDate(selectedVehicle.registration_date || selectedVehicle.registration_valid_from)}</p>
                </div>

                {/* Card 3: Assigned Driver & Usage */}
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#1e293b', fontSize: 14, fontWeight: 700, borderBottom: '1px solid #cbd5e1', paddingBottom: 6 }}>
                    Assigned Driver &amp; Usage
                  </h4>
                  {(() => {
                    const driver = assignedDriverFor(selectedVehicle.vehicle_id);
                    if (!driver) {
                      return <p style={{ color: '#64748b', fontSize: 13, margin: '6px 0' }}>No driver assigned to an active delivery right now.</p>;
                    }
                    return (
                      <>
                        <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Driver Name:</strong> {driver.user?.full_name || '—'}</p>
                        <p style={{ margin: '6px 0', fontSize: 13 }}><strong>Contact:</strong> {driver.user?.phone || '—'}</p>
                        <p style={{ margin: '6px 0', fontSize: 13 }}><strong>License No:</strong> {driver.license_number || '—'}</p>
                      </>
                    );
                  })()}
                  {(() => {
                    const todayIso = getTodayIso();
                    const maintenancesList = vehicleDetailsData?.maintenances || selectedVehicle?.maintenances || [];

                    // Active maintenance (currently in shop / waiting parts / scheduled)
                    const activeMaint = maintenancesList.find((m) =>
                      ['In Progress', 'Waiting for Part Confirmation', 'Scheduled'].includes(m.status)
                    );
                    const scheduledDate = activeMaint
                      ? (activeMaint.next_maintenance_date || activeMaint.maintenance_date)
                      : (selectedVehicle.next_maintenance_date && selectedVehicle.next_maintenance_date > todayIso
                        ? selectedVehicle.next_maintenance_date
                        : null);

                    // Past completed / elapsed maintenance
                    const pastMaintenances = maintenancesList.filter(
                      (m) => m.status === 'Completed' || (!['Cancelled', 'Waiting for Part Confirmation'].includes(m.status) && m.maintenance_date && m.maintenance_date <= todayIso)
                    );
                    const latestPastM = pastMaintenances[0];
                    const lastDate = latestPastM?.maintenance_date
                      || (selectedVehicle.last_maintenance_date && selectedVehicle.last_maintenance_date <= todayIso ? selectedVehicle.last_maintenance_date : null);

                    // If available with no active/scheduled entry, compute standard 3-month PM due date from Last Maintenance
                    let estimatedDueDate = null;
                    if (!scheduledDate && lastDate) {
                      const d = new Date(lastDate);
                      if (!isNaN(d.getTime())) {
                        d.setMonth(d.getMonth() + 3);
                        estimatedDueDate = formatLocalDateIso(d);
                      }
                    }

                    const displayDueDate = scheduledDate || estimatedDueDate;
                    const dueLabel = activeMaint && ['In Progress', 'Waiting for Part Confirmation'].includes(activeMaint.status)
                      ? 'Maintenance Due (Completion):'
                      : 'Maintenance Due:';

                    return (
                      <>
                        <p style={{ margin: '10px 0 6px', fontSize: 13, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                          <strong>Last Maintenance:</strong> {lastDate ? formatDate(lastDate) : '—'}
                        </p>
                        <p style={{ margin: '6px 0', fontSize: 13 }}>
                          <strong>{dueLabel}</strong> {displayDueDate ? (
                            <span style={{ color: scheduledDate ? '#d97706' : '#0369a1', fontWeight: 700 }}>
                              {formatDate(displayDueDate)}{' '}
                              {activeMaint
                                ? `(${activeMaint.status})`
                                : scheduledDate
                                ? '(Scheduled)'
                                : '(Est. 3-mo PM)'}
                            </span>
                          ) : '—'}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Three Cards Matching Screenshot 2: Insurance Information | Registration Info | Documents */}
              {(() => {
                const dv = vehicleDetailsData || selectedVehicle;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    {/* Card 1: Insurance Information */}
                    <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 14px', color: '#c53030', fontSize: 16, fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                          Insurance Information
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Provider</span>
                            <span style={{ color: '#64748b' }}>{dv.insurance_provider || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Policy Number</span>
                            <span style={{ color: '#64748b' }}>{dv.insurance_policy_number || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Coverage Type</span>
                            <span style={{ color: '#64748b' }}>{dv.insurance_coverage_type || 'Comprehensive'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Valid From</span>
                            <span style={{ color: '#64748b' }}>{formatDate(dv.insurance_valid_from)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Valid Until</span>
                            <span style={{ color: '#64748b' }}>{formatDate(dv.insurance_valid_until)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewDocFile('Insurance Policy', dv.insurance_policy_url, dv)}
                        style={{
                          marginTop: 18,
                          width: '100%',
                          padding: '9px 16px',
                          border: '1.5px solid #dc2626',
                          borderRadius: 8,
                          background: '#fff',
                          color: '#dc2626',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          transition: 'all 0.2s',
                        }}
                      >
                        <i className="far fa-file-alt"></i> View Document
                      </button>
                    </div>

                    {/* Card 2: Registration Info */}
                    <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 14px', color: '#c53030', fontSize: 16, fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                          Registration Info
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>OR Number</span>
                            <span style={{ color: '#64748b' }}>{dv.or_number || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>CR Number</span>
                            <span style={{ color: '#64748b' }}>{dv.cr_number || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Registration Date</span>
                            <span style={{ color: '#64748b' }}>{formatDate(dv.registration_date || dv.registration_valid_from)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleViewDocFile(
                            'Official Receipt & Registration (OR/CR)',
                            [
                              { label: 'Official Receipt (OR)', url: dv.official_receipt_url },
                              { label: 'Certificate of Registration (CR)', url: dv.certificate_of_registration_url },
                            ],
                            dv
                          )
                        }
                        style={{
                          marginTop: 18,
                          width: '100%',
                          padding: '9px 16px',
                          border: '1.5px solid #dc2626',
                          borderRadius: 8,
                          background: '#fff',
                          color: '#dc2626',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          transition: 'all 0.2s',
                        }}
                      >
                        <i className="far fa-file-alt"></i> View OR/CR
                      </button>
                    </div>

                    {/* Card 3: Documents */}
                    <div style={{ background: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 14px', color: '#c53030', fontSize: 16, fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                          Documents
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Official Receipt (OR)</span>
                            {dv.official_receipt_url ? (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Official Receipt (OR)', dv.official_receipt_url, dv)}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                View File
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Official Receipt (OR)', null, dv)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Not Uploaded
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Certification of Registration(CR)</span>
                            {dv.certificate_of_registration_url ? (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Certificate of Registration (CR)', dv.certificate_of_registration_url, dv)}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                View File
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Certificate of Registration (CR)', null, dv)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Not Uploaded
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Insurance Policy</span>
                            {dv.insurance_policy_url ? (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Insurance Policy', dv.insurance_policy_url, dv)}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                View File
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Insurance Policy', null, dv)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Not Uploaded
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>
                              Emission Date {dv.emission_date ? `(${formatDate(dv.emission_date)})` : ''}
                            </span>
                            {dv.emission_certificate_url ? (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Emission Certificate', dv.emission_certificate_url, dv)}
                                style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                View File
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleViewDocFile('Emission Certificate', null, dv)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                Not Uploaded
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Maintenance History Table Section */}
              <div>
                <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fas fa-history" style={{ color: '#d32f2f' }}></i> Maintenance History &amp; Parts Used
                </h4>
                <div style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 14px', fontSize: 13, color: '#c53030', fontWeight: 700 }}>Date</th>
                        <th style={{ padding: '12px 14px', fontSize: 13, color: '#c53030', fontWeight: 700 }}>Service Type</th>
                        <th style={{ padding: '12px 14px', fontSize: 13, color: '#c53030', fontWeight: 700 }}>Cost</th>
                        <th style={{ padding: '12px 14px', fontSize: 13, color: '#c53030', fontWeight: 700 }}>Provider / Maintained By</th>
                        <th style={{ padding: '12px 14px', fontSize: 13, color: '#c53030', fontWeight: 700 }}>Parts Used</th>
                        <th style={{ padding: '12px 14px', fontSize: 13, color: '#c53030', fontWeight: 700, textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const todayIso = getTodayIso();
                        const list = vehicleDetailsData?.maintenances || [];
                        const startIndex = (maintenancePage - 1) * 5;
                        const pageItems = list.slice(startIndex, startIndex + 5);
                        return pageItems.map((m) => {
                          const isPast = m.maintenance_date <= todayIso;
                          const isWaitingPartsRow = m.status === 'Waiting for Part Confirmation';
                          const isCancelledRow = m.status === 'Cancelled';
                          const displayStatus = isCancelledRow
                            ? 'Cancelled'
                            : isWaitingPartsRow
                            ? 'Waiting for Part Confirmation'
                            : m.status === 'Completed'
                            ? 'Completed'
                            : m.status === 'In Progress'
                            ? 'In Progress'
                            : isPast
                            ? 'Completed'
                            : m.status || 'Scheduled';
                          const isCompleted = displayStatus === 'Completed';

                          return (
                            <tr key={m.maintenance_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>{formatDate(m.maintenance_date)}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{m.maintenance_type}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>₱{Number(m.maintenance_cost || m.total_cost || 0).toLocaleString()}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>{m.maintained_by_name || m.maintainer?.full_name || 'Internal / Provider'}</td>
                              <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>
                                {m.parts_usages && m.parts_usages.length > 0 ? (
                                  m.parts_usages.map((pu, i) => (
                                    <div key={i} style={{ marginBottom: 2 }}>
                                      <span style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>
                                        {pu.part?.part_name} ({pu.quantity_used} {pu.part?.unit || 'pcs'})
                                      </span>
                                      {pu.status === 'confirmed' && (pu.transaction_no || m.parts_transaction_no) && (
                                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#047857', fontWeight: 700 }}>
                                          Issued · {pu.transaction_no || m.parts_transaction_no}
                                        </span>
                                      )}
                                      {pu.status === 'pending' && (
                                        <span style={{ fontSize: 11, color: '#b45309', fontWeight: 700 }}>
                                          Pending Parts Inventory confirmation
                                        </span>
                                      )}
                                      {pu.status === 'external' && (
                                        <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                                          External parts (no stock deducted)
                                        </span>
                                      )}
                                      {pu.status === 'cancelled' && (
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                          Cancelled (stock not deducted)
                                        </span>
                                      )}
                                    </div>
                                  ))
                                ) : m.part ? (
                                  <span style={{ fontSize: 12 }}>{m.part.part_name}</span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: 12 }}>None</span>
                                )}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <span style={{
                                    padding: '3px 10px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: isCompleted ? '#dcfce7' : isCancelledRow ? '#f1f5f9' : isWaitingPartsRow ? '#fef3c7' : '#dbeafe',
                                    color: isCompleted ? '#16a34a' : isCancelledRow ? '#64748b' : isWaitingPartsRow ? '#b45309' : '#1d4ed8',
                                  }}>
                                    {displayStatus}
                                  </span>
                                  {isWaitingPartsRow && (
                                    <button
                                      type="button"
                                      onClick={() => handleCancelPendingMaintenance(m)}
                                      title="Cancel pending maintenance (preserves record in history and unlocks vehicle)"
                                      style={{
                                        padding: '3px 8px',
                                        borderRadius: 4,
                                        border: '1px solid #fecaca',
                                        background: '#fff',
                                        color: '#b91c1c',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                      {(!vehicleDetailsData?.maintenances || vehicleDetailsData.maintenances.length === 0) && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13 }}>
                            No maintenance records found for this vehicle.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={maintenancePage}
                  totalPages={Math.ceil((vehicleDetailsData?.maintenances?.length || 0) / 5) || 1}
                  totalItems={vehicleDetailsData?.maintenances?.length || 0}
                  pageSize={5}
                  onPageChange={setMaintenancePage}
                  showAlways={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT VEHICLE MODAL (WITH PHOTO UPLOAD)                              */}
      {/* ========================================================================= */}
      {showFormModal && (
        <div
          className="modal"
          style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', zIndex: 1000, padding: 20 }}
        >
          <div className="modal-content hide-scrollbar" style={{ width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', background: '#fff', borderRadius: 14, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            {/* Modal Header */}
            <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
              <div>
                <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-truck-moving"></i> {editingVehicle ? 'Edit Vehicle Details' : 'Add New Vehicle'}
                </h2>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, display: 'block' }}>
                  Fleet Vehicle Registration, Insurance &amp; Compliance Documents
                </span>
              </div>
              <button
                className="modal-close"
                onClick={() => { setShowFormModal(false); setFormErrors({}); setFormError(''); }}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ padding: '24px 28px' }}>

              <form className="edit-form" onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Section 1: Basic Vehicle Information */}
                <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 14px', color: '#b91c1c', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <i className="fas fa-file-alt"></i> Vehicle Information
                  </h4>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.model ? '#dc2626' : '#334155', marginBottom: 4 }}>Vehicle Model <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Super Great / FJ 2823R"
                        value={form.model}
                        onChange={(e) => handleFormFieldChange('model', formatNameInput(e.target.value))}
                        style={getFieldStyle('model')}
                      />
                      {formErrors.model && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.model}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.brand ? '#dc2626' : '#334155', marginBottom: 4 }}>Brand / Make <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Mitsubishi Fuso / Isuzu / Hino"
                        value={form.brand}
                        onChange={(e) => handleFormFieldChange('brand', formatNameInput(e.target.value))}
                        style={getFieldStyle('brand')}
                      />
                      {formErrors.brand && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.brand}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.year_model ? '#dc2626' : '#334155', marginBottom: 4 }}>Model Year</label>
                      <input
                        type="number"
                        min={1901}
                        max={new Date().getFullYear() + 1}
                        placeholder="e.g. 2023"
                        value={form.year_model}
                        onChange={(e) => handleFormFieldChange('year_model', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        style={getFieldStyle('year_model')}
                      />
                      {formErrors.year_model && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.year_model}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.plate_number ? '#dc2626' : '#334155', marginBottom: 4 }}>Plate Number <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. ABC-1234"
                        maxLength={8}
                        value={form.plate_number}
                        onChange={(e) => handleFormFieldChange('plate_number', formatPlateInput(e.target.value))}
                        style={getFieldStyle('plate_number', { textTransform: 'uppercase', letterSpacing: 0.5 })}
                      />
                      {formErrors.plate_number && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.plate_number}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.color ? '#dc2626' : '#334155' }}>
                          Color <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        {parseColorToHex(form.color) && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                            Hex: <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, fontSize: 11, color: '#0f172a' }}>{parseColorToHex(form.color).toUpperCase()}</code>
                          </span>
                        )}
                      </div>

                      <div
                        style={getFieldStyle('color', {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '0 8px 0 12px',
                          height: 38,
                        })}
                      >
                        <input
                          type="text"
                          placeholder="e.g. White / Blue"
                          value={form.color}
                          onChange={(e) => handleFormFieldChange('color', e.target.value)}
                          style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            padding: 0,
                            fontSize: 13,
                            background: 'transparent',
                            minWidth: 0,
                          }}
                        />

                        {/* Interactive Color Swatch integrated inside the input */}
                        <div
                          style={{
                            position: 'relative',
                            width: 24,
                            height: 24,
                            flexShrink: 0,
                            borderRadius: '50%',
                            backgroundColor: parseColorToHex(form.color) || '#f1f5f9',
                            border: '1.5px solid #cbd5e1',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                          }}
                          title="Click to pick a color"
                        >
                          <input
                            type="color"
                            value={parseColorToHex(form.color) || '#3b82f6'}
                            onChange={(e) => {
                              const hex = e.target.value.toLowerCase();
                              const matchedName = HEX_TO_COLOR_NAME[hex];
                              handleFormFieldChange('color', matchedName || hex.toUpperCase());
                            }}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              opacity: 0,
                              cursor: 'pointer',
                              borderRadius: '50%',
                            }}
                          />
                          <i
                            className="fas fa-eye-dropper"
                            style={{
                              fontSize: 10,
                              color: isColorDark(parseColorToHex(form.color)) ? '#ffffff' : '#64748b',
                              pointerEvents: 'none',
                            }}
                          />
                        </div>
                      </div>
                      {formErrors.color && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.color}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.vehicle_type ? '#dc2626' : '#334155', marginBottom: 4 }}>Vehicle Type <span style={{ color: '#dc2626' }}>*</span></label>
                      <select
                        value={form.vehicle_type}
                        onChange={(e) => handleFormFieldChange('vehicle_type', e.target.value)}
                        style={getFieldStyle('vehicle_type')}
                      >
                        <option value="10-Wheeler Truck">10-Wheeler Truck</option>
                        <option value="6-Wheeler Truck">6-Wheeler Truck</option>
                        <option value="4-Wheeler Closed Van">4-Wheeler Closed Van</option>
                        <option value="Trailer Truck">Trailer Truck</option>
                      </select>
                      {formErrors.vehicle_type && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.vehicle_type}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.fuel_type ? '#dc2626' : '#334155', marginBottom: 4 }}>Fuel Type <span style={{ color: '#dc2626' }}>*</span></label>
                      <select
                        value={form.fuel_type}
                        onChange={(e) => handleFormFieldChange('fuel_type', e.target.value)}
                        style={getFieldStyle('fuel_type')}
                      >
                        <option value="diesel">Diesel</option>
                        <option value="gasoline">Gasoline</option>
                        <option value="electric">Electric</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                      {formErrors.fuel_type && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.fuel_type}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 14 }}>
                    {(() => {
                      const engFeedback = getEngineNumberFeedback(form.engine_number);
                      const hasLiveErr = engFeedback && !engFeedback.valid;
                      const isLiveValid = engFeedback && engFeedback.valid;
                      return (
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.engine_number || hasLiveErr ? '#dc2626' : '#334155', marginBottom: 4 }}>
                            Engine No. {!editingVehicle && <span style={{ color: '#dc2626' }}>*</span>}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 8M22-025168"
                            maxLength={14}
                            value={form.engine_number}
                            onChange={(e) => handleFormFieldChange('engine_number', formatEngineNumberInput(e.target.value))}
                            style={getFieldStyle('engine_number', hasLiveErr
                              ? { border: '1.5px solid #dc2626', background: '#fef2f2' }
                              : isLiveValid
                                ? { border: '1.5px solid #16a34a', background: '#f0fdf4' }
                                : {})}
                          />
                          {formErrors.engine_number ? (
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.engine_number}
                            </span>
                          ) : engFeedback ? (
                            <span style={{ fontSize: 11, color: isLiveValid ? '#15803d' : '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className={isLiveValid ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'} style={{ fontSize: 10 }}></i> {engFeedback.message}
                            </span>
                          ) : null}
                        </div>
                      );
                    })()}

                    {(() => {
                      const chFeedback = getChassisNumberFeedback(form.chassis_number);
                      const hasLiveErr = chFeedback && !chFeedback.valid;
                      const isLiveValid = chFeedback && chFeedback.valid;
                      return (
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.chassis_number || hasLiveErr ? '#dc2626' : '#334155', marginBottom: 4 }}>
                            Chassis No. {!editingVehicle && <span style={{ color: '#dc2626' }}>*</span>}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. FV50LH-520103"
                            maxLength={17}
                            value={form.chassis_number}
                            onChange={(e) => handleFormFieldChange('chassis_number', formatChassisNumberInput(e.target.value))}
                            style={getFieldStyle('chassis_number', hasLiveErr
                              ? { border: '1.5px solid #dc2626', background: '#fef2f2' }
                              : isLiveValid
                                ? { border: '1.5px solid #16a34a', background: '#f0fdf4' }
                                : {})}
                          />
                          {formErrors.chassis_number ? (
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.chassis_number}
                            </span>
                          ) : chFeedback ? (
                            <span style={{ fontSize: 11, color: isLiveValid ? '#15803d' : '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className={isLiveValid ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'} style={{ fontSize: 10 }}></i> {chFeedback.message}
                            </span>
                          ) : null}
                        </div>
                      );
                    })()}

                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Classification</label>
                      <select
                        value={form.classification}
                        onChange={(e) => handleFormFieldChange('classification', e.target.value)}
                        style={getFieldStyle('classification')}
                      >
                        <option value="Private (PVT)">Private (PVT)</option>
                        <option value="For Hire (TH)">For Hire (TH)</option>
                        <option value="Government (GOV)">Government (GOV)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Specifications & Photo */}
                <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 14px', color: '#b91c1c', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <i className="fas fa-truck"></i> Specifications &amp; Vehicle Photo
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 18 }}>
                    <div>
                      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Vehicle Category</label>
                          <input
                            type="text"
                            list="lto-vehicle-category-list"
                            placeholder="e.g. N2, N3, Truck, Tractor Head"
                            value={form.vehicle_category}
                            onChange={(e) => handleFormFieldChange('vehicle_category', e.target.value.toUpperCase())}
                            style={getFieldStyle('vehicle_category')}
                          />
                          <datalist id="lto-vehicle-category-list">
                            <option value="N1">N1 — Light Truck (≤3,500 kg)</option>
                            <option value="N2">N2 — Medium Truck (3,501–12,000 kg)</option>
                            <option value="N3">N3 — Heavy Truck (&gt;12,000 kg)</option>
                            <option value="O3">O3 — Medium Trailer</option>
                            <option value="O4">O4 — Heavy Trailer</option>
                            <option value="TRUCK">Truck</option>
                            <option value="TRACTOR HEAD">Tractor Head</option>
                            <option value="UTILITY VEHICLE">Utility Vehicle</option>
                          </datalist>
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Body Type</label>
                          <select
                            value={form.body_type}
                            onChange={(e) => handleFormFieldChange('body_type', e.target.value)}
                            style={getFieldStyle('body_type')}
                          >
                            <option value="Truck Tractor Head">Truck Tractor Head</option>
                            <option value="Wing Van">Wing Van</option>
                            <option value="Closed Van">Closed Van</option>
                            <option value="Dropside">Dropside</option>
                            <option value="Flatbed">Flatbed</option>
                            <option value="Stake">Stake</option>
                            <option value="Cargo Truck">Cargo Truck</option>
                            <option value="Dump Truck">Dump Truck</option>
                            <option value="Trailer">Trailer</option>
                            <option value="Reefer Van">Reefer Van</option>
                            <option value="Tanker">Tanker</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 14 }}>
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.gross_weight ? '#dc2626' : '#334155', marginBottom: 4 }}>Gross Weight (kg) <span style={{ color: '#dc2626' }}>*</span></label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g. 15000"
                            value={form.gross_weight}
                            onChange={(e) => handleFormFieldChange('gross_weight', e.target.value)}
                            style={getFieldStyle('gross_weight')}
                          />
                          {formErrors.gross_weight && (
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.gross_weight}
                            </span>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.net_weight ? '#dc2626' : '#334155', marginBottom: 4 }}>Net Weight (kg) <span style={{ color: '#dc2626' }}>*</span></label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g. 6500"
                            value={form.net_weight}
                            onChange={(e) => handleFormFieldChange('net_weight', e.target.value)}
                            style={getFieldStyle('net_weight')}
                          />
                          {formErrors.net_weight && (
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.net_weight}
                            </span>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.passenger_capacity ? '#dc2626' : '#334155', marginBottom: 4 }}>Passenger Capacity</label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            placeholder="e.g. 3"
                            value={form.passenger_capacity}
                            onChange={(e) => handleFormFieldChange('passenger_capacity', e.target.value)}
                            style={getFieldStyle('passenger_capacity')}
                          />
                          {formErrors.passenger_capacity && (
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.passenger_capacity}
                            </span>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.piston_displacement ? '#dc2626' : '#334155', marginBottom: 4 }}>Piston Displacement (cc)</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="e.g. 12882"
                            value={form.piston_displacement}
                            onChange={(e) => handleFormFieldChange('piston_displacement', e.target.value)}
                            style={getFieldStyle('piston_displacement')}
                          />
                          {formErrors.piston_displacement && (
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.piston_displacement}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.status ? '#dc2626' : '#334155', marginBottom: 4 }}>Status <span style={{ color: '#dc2626' }}>*</span></label>
                          <select
                            value={form.status}
                            onChange={(e) => handleFormFieldChange('status', e.target.value)}
                            style={getFieldStyle('status')}
                          >
                            <option value="available">Available</option>
                            <option value="in_use">In Use</option>
                            <option value="maintenance">Under Maintenance</option>
                            <option value="broken">Broken</option>
                          </select>
                          {formErrors.status && (
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.status}
                            </span>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.condition ? '#dc2626' : '#334155', marginBottom: 4 }}>Condition <span style={{ color: '#dc2626' }}>*</span></label>
                          <input
                            type="text"
                            placeholder="Good / Need Repair"
                            value={form.condition}
                            onChange={(e) => handleFormFieldChange('condition', e.target.value)}
                            style={getFieldStyle('condition')}
                          />
                          {formErrors.condition && (
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.condition}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Photo Upload */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: formErrors.photo ? '#dc2626' : '#334155', marginBottom: 4 }}>
                        Vehicle Photo <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="file"
                        ref={vehicleFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        style={{ display: 'none' }}
                        onChange={handlePhotoSelect}
                      />
                      <div
                        onClick={() => vehicleFileInputRef.current?.click()}
                        style={{
                          border: formErrors.photo ? '2px dashed #ef4444' : '2px dashed #cbd5e1',
                          borderRadius: 8,
                          padding: 14,
                          textAlign: 'center',
                          color: '#64748b',
                          cursor: 'pointer',
                          background: formErrors.photo ? '#fff5f5' : '#fff',
                          boxShadow: formErrors.photo ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 125,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#b91c1c';
                          e.currentTarget.style.background = '#fef2f2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = formErrors.photo ? '#ef4444' : '#cbd5e1';
                          e.currentTarget.style.background = formErrors.photo ? '#fff5f5' : '#fff';
                        }}
                      >
                        {vehiclePhotoPreview ? (
                          <div style={{ width: '100%' }}>
                            <img
                              src={vehiclePhotoPreview}
                              alt="Vehicle Preview"
                              style={{ width: '100%', maxHeight: 90, objectFit: 'contain', borderRadius: 6 }}
                              onError={(e) => { e.currentTarget.src = '/images/default-truck.png'; }}
                            />
                            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Click to change photo</p>
                          </div>
                        ) : (
                          <>
                            <i className="fas fa-camera" style={{ fontSize: 26, color: formErrors.photo ? '#dc2626' : '#94a3b8', marginBottom: 6 }}></i>
                            <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: formErrors.photo ? '#dc2626' : '#334155' }}>Upload Photo</p>
                            <p style={{ fontSize: 11, margin: 0, color: '#94a3b8' }}>Max 5MB (JPG, PNG)</p>
                          </>
                        )}
                      </div>
                      {formErrors.photo && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.photo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Insurance Information */}
                <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 14px', color: '#b91c1c', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <i className="fas fa-shield-alt"></i> Insurance Information
                  </h4>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.insurance_provider ? '#dc2626' : '#334155', marginBottom: 4 }}>Provider <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Malayan Insurance / Pioneer"
                        value={form.insurance_provider}
                        onChange={(e) => handleFormFieldChange('insurance_provider', e.target.value)}
                        style={getFieldStyle('insurance_provider')}
                      />
                      {formErrors.insurance_provider && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.insurance_provider}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const policyFeedback = getPolicyNumberFeedback(form.insurance_policy_number);
                      const hasLiveErr = policyFeedback && !policyFeedback.valid;
                      const isLiveValid = policyFeedback && policyFeedback.valid;
                      return (
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.insurance_policy_number || hasLiveErr ? '#dc2626' : '#334155', marginBottom: 4 }}>Policy Number <span style={{ color: '#dc2626' }}>*</span></label>
                          <input
                            type="text"
                            placeholder="e.g. MC-CV-26-0014614"
                            maxLength={30}
                            value={form.insurance_policy_number}
                            onChange={(e) => handleFormFieldChange('insurance_policy_number', formatPolicyNumberInput(e.target.value))}
                            style={getFieldStyle('insurance_policy_number', hasLiveErr
                              ? { border: '1.5px solid #dc2626', background: '#fef2f2' }
                              : isLiveValid
                                ? { border: '1.5px solid #16a34a', background: '#f0fdf4' }
                                : {})}
                          />
                          {formErrors.insurance_policy_number ? (
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.insurance_policy_number}
                            </span>
                          ) : policyFeedback ? (
                            <span style={{ fontSize: 11, color: isLiveValid ? '#15803d' : '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className={isLiveValid ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'} style={{ fontSize: 10 }}></i> {policyFeedback.message}
                            </span>
                          ) : null}
                        </div>
                      );
                    })()}
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.insurance_coverage_type ? '#dc2626' : '#334155', marginBottom: 4 }}>Coverage Type <span style={{ color: '#dc2626' }}>*</span></label>
                      <select
                        value={form.insurance_coverage_type}
                        onChange={(e) => handleFormFieldChange('insurance_coverage_type', e.target.value)}
                        style={getFieldStyle('insurance_coverage_type')}
                      >
                        <option value="Comprehensive">Comprehensive</option>
                        <option value="Third-Party Liability (TPL)">Third-Party Liability (TPL)</option>
                        <option value="Acts of Nature">Acts of Nature</option>
                        <option value="Collision & Damage">Collision &amp; Damage</option>
                      </select>
                      {formErrors.insurance_coverage_type && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.insurance_coverage_type}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.insurance_valid_from ? '#dc2626' : '#334155', marginBottom: 4 }}>Valid From <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="date"
                        value={form.insurance_valid_from || ''}
                        onChange={(e) => handleFormFieldChange('insurance_valid_from', e.target.value)}
                        style={getFieldStyle('insurance_valid_from')}
                      />
                      {formErrors.insurance_valid_from && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.insurance_valid_from}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.insurance_valid_until ? '#dc2626' : '#334155', marginBottom: 4 }}>Valid Until <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="date"
                        min={[getTomorrowIso(), form.insurance_valid_from].filter(Boolean).sort().pop()}
                        value={form.insurance_valid_until || ''}
                        onChange={(e) => handleFormFieldChange('insurance_valid_until', e.target.value)}
                        style={getFieldStyle('insurance_valid_until')}
                      />
                      {formErrors.insurance_valid_until && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.insurance_valid_until}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 4: Registration Info */}
                <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 14px', color: '#b91c1c', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <i className="fas fa-id-card"></i> Registration Info
                  </h4>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    {(() => {
                      const orFeedback = getOrNumberFeedback(form.or_number);
                      const hasLiveErr = orFeedback && !orFeedback.valid;
                      const isLiveValid = orFeedback && orFeedback.valid;
                      return (
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.or_number || hasLiveErr ? '#dc2626' : '#334155', marginBottom: 4 }}>OR Number (Official Receipt) <span style={{ color: '#dc2626' }}>*</span></label>
                          <input
                            type="text"
                            placeholder="e.g. 1001-000000222188"
                            maxLength={17}
                            value={form.or_number}
                            onChange={(e) => handleFormFieldChange('or_number', formatOrNumberInput(e.target.value))}
                            style={getFieldStyle('or_number', hasLiveErr
                              ? { border: '1.5px solid #dc2626', background: '#fef2f2' }
                              : isLiveValid
                                ? { border: '1.5px solid #16a34a', background: '#f0fdf4' }
                                : {})}
                          />
                          {formErrors.or_number ? (
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.or_number}
                            </span>
                          ) : orFeedback ? (
                            <span style={{ fontSize: 11, color: isLiveValid ? '#15803d' : '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className={isLiveValid ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'} style={{ fontSize: 10 }}></i> {orFeedback.message}
                            </span>
                          ) : null}
                        </div>
                      );
                    })()}
                    {(() => {
                      const crFeedback = getCrNumberFeedback(form.cr_number);
                      const hasLiveErr = crFeedback && !crFeedback.valid;
                      const isLiveValid = crFeedback && crFeedback.valid;
                      return (
                        <div className="form-group">
                          <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.cr_number || hasLiveErr ? '#dc2626' : '#334155', marginBottom: 4 }}>CR Number (Certificate of Registration) <span style={{ color: '#dc2626' }}>*</span></label>
                          <input
                            type="text"
                            placeholder="e.g. 29254032-3"
                            maxLength={17}
                            value={form.cr_number}
                            onChange={(e) => handleFormFieldChange('cr_number', formatCrNumberInput(e.target.value))}
                            style={getFieldStyle('cr_number', hasLiveErr
                              ? { border: '1.5px solid #dc2626', background: '#fef2f2' }
                              : isLiveValid
                                ? { border: '1.5px solid #16a34a', background: '#f0fdf4' }
                                : {})}
                          />
                          {formErrors.cr_number ? (
                            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.cr_number}
                            </span>
                          ) : crFeedback ? (
                            <span style={{ fontSize: 11, color: isLiveValid ? '#15803d' : '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className={isLiveValid ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'} style={{ fontSize: 10 }}></i> {crFeedback.message}
                            </span>
                          ) : null}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.registration_date ? '#dc2626' : '#334155', marginBottom: 4 }}>Registration Date <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="date"
                        value={form.registration_date || form.registration_valid_from || ''}
                        onChange={(e) => {
                          handleFormFieldChange('registration_date', e.target.value);
                          setForm((prev) => ({ ...prev, registration_valid_from: e.target.value }));
                        }}
                        style={getFieldStyle('registration_date')}
                      />
                      {formErrors.registration_date && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.registration_date}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, color: formErrors.last_maintenance_date ? '#dc2626' : '#334155', marginBottom: 4 }}>Last Maintenance Date <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="date"
                        value={form.last_maintenance_date || ''}
                        onChange={(e) => handleFormFieldChange('last_maintenance_date', e.target.value)}
                        style={getFieldStyle('last_maintenance_date')}
                      />
                      {formErrors.last_maintenance_date && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.last_maintenance_date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 5: Documents Requirements & File Uploads */}
                <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    <h4 style={{ margin: 0, color: '#b91c1c', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-folder-open"></i> Documents &amp; Requirements
                    </h4>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Upload PDF, JPG, PNG (Max 10MB each)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    {/* Document 1: Official Receipt (OR) */}
                    <div
                      style={{
                        background: formErrors.orFile ? '#fff5f5' : '#fff',
                        border: formErrors.orFile ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        boxShadow: formErrors.orFile ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
                        borderRadius: 8,
                        padding: 14,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: formErrors.orFile ? '#dc2626' : '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-receipt" style={{ color: '#b91c1c' }}></i> Official Receipt (OR) <span style={{ color: '#dc2626' }}>*</span>
                        </span>
                        {editingVehicle?.official_receipt_url && !orFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile('Official Receipt', editingVehicle.official_receipt_url, editingVehicle)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={orFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'or')}
                      />
                      {orFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {orFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setOrFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => orFileInputRef.current?.click()}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: formErrors.orFile ? '1.5px dashed #ef4444' : '1.5px dashed #cbd5e1',
                            borderRadius: 6,
                            background: formErrors.orFile ? '#fef2f2' : '#f8fafc',
                            color: formErrors.orFile ? '#dc2626' : '#475569',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: formErrors.orFile ? '#dc2626' : '#94a3b8' }}></i>
                          {editingVehicle?.official_receipt_url ? 'Replace OR File' : 'Upload OR File'}
                        </button>
                      )}
                      {formErrors.orFile && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.orFile}
                        </span>
                      )}
                    </div>

                    {/* Document 2: Certificate of Registration (CR) */}
                    <div
                      style={{
                        background: formErrors.crFile ? '#fff5f5' : '#fff',
                        border: formErrors.crFile ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        boxShadow: formErrors.crFile ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
                        borderRadius: 8,
                        padding: 14,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: formErrors.crFile ? '#dc2626' : '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-certificate" style={{ color: '#b91c1c' }}></i> Certificate of Registration (CR) <span style={{ color: '#dc2626' }}>*</span>
                        </span>
                        {editingVehicle?.certificate_of_registration_url && !crFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile('Certificate of Registration', editingVehicle.certificate_of_registration_url, editingVehicle)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={crFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'cr')}
                      />
                      {crFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {crFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCrFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => crFileInputRef.current?.click()}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: formErrors.crFile ? '1.5px dashed #ef4444' : '1.5px dashed #cbd5e1',
                            borderRadius: 6,
                            background: formErrors.crFile ? '#fef2f2' : '#f8fafc',
                            color: formErrors.crFile ? '#dc2626' : '#475569',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: formErrors.crFile ? '#dc2626' : '#94a3b8' }}></i>
                          {editingVehicle?.certificate_of_registration_url ? 'Replace CR File' : 'Upload CR File'}
                        </button>
                      )}
                      {formErrors.crFile && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.crFile}
                        </span>
                      )}
                    </div>

                    {/* Document 3: Insurance Policy */}
                    <div
                      style={{
                        background: formErrors.insuranceFile ? '#fff5f5' : '#fff',
                        border: formErrors.insuranceFile ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        boxShadow: formErrors.insuranceFile ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
                        borderRadius: 8,
                        padding: 14,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: formErrors.insuranceFile ? '#dc2626' : '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-shield-alt" style={{ color: '#b91c1c' }}></i> Insurance Policy <span style={{ color: '#dc2626' }}>*</span>
                        </span>
                        {editingVehicle?.insurance_policy_url && !insuranceFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile('Insurance Policy', editingVehicle.insurance_policy_url, editingVehicle)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={insuranceFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'insurance')}
                      />
                      {insuranceFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {insuranceFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setInsuranceFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => insuranceFileInputRef.current?.click()}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: formErrors.insuranceFile ? '1.5px dashed #ef4444' : '1.5px dashed #cbd5e1',
                            borderRadius: 6,
                            background: formErrors.insuranceFile ? '#fef2f2' : '#f8fafc',
                            color: formErrors.insuranceFile ? '#dc2626' : '#475569',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: formErrors.insuranceFile ? '#dc2626' : '#94a3b8' }}></i>
                          {editingVehicle?.insurance_policy_url ? 'Replace Policy File' : 'Upload Insurance Policy'}
                        </button>
                      )}
                      {formErrors.insuranceFile && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.insuranceFile}
                        </span>
                      )}
                    </div>

                    {/* Document 4: Emission Certificate & Date */}
                    <div
                      style={{
                        background: (formErrors.emission_date || formErrors.emissionFile) ? '#fff5f5' : '#fff',
                        border: (formErrors.emission_date || formErrors.emissionFile) ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        boxShadow: (formErrors.emission_date || formErrors.emissionFile) ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : 'none',
                        borderRadius: 8,
                        padding: 14,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: (formErrors.emission_date || formErrors.emissionFile) ? '#dc2626' : '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="fas fa-smog" style={{ color: '#b91c1c' }}></i> Emission Certificate <span style={{ color: '#dc2626' }}>*</span>
                        </span>
                        {editingVehicle?.emission_certificate_url && !emissionFile && (
                          <button
                            type="button"
                            onClick={() => handleViewDocFile('Emission Certificate', editingVehicle.emission_certificate_url, editingVehicle)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View File
                          </button>
                        )}
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: formErrors.emission_date ? '#dc2626' : '#475569', marginBottom: 4 }}>
                          Emission Test Date <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                          type="date"
                          value={form.emission_date || ''}
                          onChange={(e) => handleFormFieldChange('emission_date', e.target.value)}
                          style={getFieldStyle('emission_date', { width: '100%', padding: '7px 10px', fontSize: 12 })}
                          title="Emission Test Date"
                        />
                        {formErrors.emission_date && (
                          <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.emission_date}
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={emissionFileInputRef}
                        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleDocFileSelect(e.target.files?.[0], 'emission')}
                      />
                      {emissionFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', padding: '8px 10px', borderRadius: 6 }}>
                          <span style={{ fontSize: 12, color: '#166534', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                            <i className="fas fa-check-circle" style={{ color: '#16a34a', marginRight: 6 }}></i>
                            {emissionFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEmissionFile(null)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                            title="Remove file"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => emissionFileInputRef.current?.click()}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: formErrors.emissionFile ? '1.5px dashed #ef4444' : '1.5px dashed #cbd5e1',
                            borderRadius: 6,
                            background: formErrors.emissionFile ? '#fef2f2' : '#f8fafc',
                            color: formErrors.emissionFile ? '#dc2626' : '#475569',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <i className="fas fa-cloud-upload-alt" style={{ color: formErrors.emissionFile ? '#dc2626' : '#94a3b8' }}></i>
                          {editingVehicle?.emission_certificate_url ? 'Replace Emission File' : 'Upload Emission File'}
                        </button>
                      )}
                      {formErrors.emissionFile && (
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="fas fa-exclamation-circle" style={{ fontSize: 10 }}></i> {formErrors.emissionFile}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer (with clean visible Cancel button - NO invisible white box) */}
            <div className="modal-footer" style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                <span style={{ color: '#dc2626', fontWeight: 'bold' }}>*</span> Required fleet information
              </span>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => { setShowFormModal(false); setFormErrors({}); setFormError(''); }}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveVehicle}
                  disabled={saving}
                  style={{
                    padding: '9px 26px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#d32f2f',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 2px 8px rgba(211, 47, 47, 0.35)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = '#b71c1c'; }}
                  onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = '#d32f2f'; }}
                >
                  {saving ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Saving Vehicle...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i> {editingVehicle ? 'Update Vehicle' : 'Save Vehicle'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Document Viewer & Missing Document Modal (Replaces browser alert) */}
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
          {(() => {
            const activeDocs =
              docModal.docs && docModal.docs.length > 0
                ? docModal.docs
                : docModal.url
                ? [{ label: docModal.title, url: docModal.url }]
                : [];
            const activeIdx = Math.min(docModal.activeIndex || 0, Math.max(0, activeDocs.length - 1));
            const activeDoc = activeDocs[activeIdx] || null;
            const totalDocs = activeDocs.length;
            const setActiveDocIndex = (nextIdx) =>
              setDocModal((prev) =>
                prev ? { ...prev, activeIndex: (nextIdx + totalDocs) % totalDocs } : prev
              );

            if (!activeDoc) {
              return (
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

              {docModal.vehicle && (
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
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    <i className="fas fa-truck"></i>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {docModal.vehicle.model || 'Vehicle'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Plate: <span style={{ fontWeight: 600, color: '#334155' }}>{docModal.vehicle.plate_number || 'N/A'}</span>
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
                    const v = docModal.vehicle;
                    setDocModal(null);
                    if (v) {
                      openEditModal(v);
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
              );
            }

            return (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                        {totalDocs > 1 ? activeDoc.label : docModal.title}
                      </h3>
                      {totalDocs > 1 && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: '#fee2e2',
                            color: '#b91c1c',
                          }}
                        >
                          {activeIdx + 1} / {totalDocs}
                        </span>
                      )}
                    </div>
                    {docModal.vehicle && (
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {docModal.vehicle.model} • Plate: {docModal.vehicle.plate_number}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <a
                    href={activeDoc.url}
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

              {totalDocs > 1 && (
                <div
                  style={{
                    padding: '8px 24px',
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {activeDocs.map((docItem, idx) => (
                      <button
                        key={docItem.label}
                        type="button"
                        onClick={() => setActiveDocIndex(idx)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: idx === activeIdx ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                          background: idx === activeIdx ? '#fef2f2' : '#f8fafc',
                          color: idx === activeIdx ? '#dc2626' : '#475569',
                        }}
                      >
                        {idx + 1}. {docItem.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setActiveDocIndex(activeIdx - 1)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <i className="fas fa-chevron-left"></i> Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDocIndex(activeIdx + 1)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#dc2626',
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      Next Photo <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              )}

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
                {activeDoc.url.toLowerCase().includes('.pdf') ? (
                  <iframe
                    src={activeDoc.url}
                    title={activeDoc.label || docModal.title}
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#ffffff' }}
                  />
                ) : (
                  <img
                    src={activeDoc.url}
                    alt={activeDoc.label || docModal.title}
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
                  justifyContent: totalDocs > 1 ? 'space-between' : 'flex-end',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {totalDocs > 1 && (
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                    Viewing <strong>{activeDoc.label}</strong> ({activeIdx + 1} of {totalDocs})
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <a
                  href={activeDoc.url}
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
                    transition: 'all 0.2s',
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
            </div>
            );
          })()}
        </div>
      )}

      {selectedIncident && (
        <PrintableIncidentModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}

      {selectedInspectionDelivery && (
        <div
          className="modal"
          style={{
            display: 'flex',
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedInspectionDelivery(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 780,
              maxHeight: '88vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: 12,
              padding: 24,
              borderTop: '4px solid #0284C7',
              boxShadow: '0 20px 45px rgba(0,0,0,0.28)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                  Inspection Report &bull; {`DLV${String(selectedInspectionDelivery.delivery_id).padStart(4, '0')}`}
                </h3>
                <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                  Vehicle: {formatVehicleName(selectedInspectionDelivery.vehicle)} ({selectedInspectionDelivery.vehicle?.plate_number || '—'})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInspectionDelivery(null)}
                style={{ background: 'none', border: 'none', fontSize: 24, color: '#64748B', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
            <InspectionActivitiesSection
              checklists={selectedInspectionDelivery.checklists}
              deliveryCode={`DLV${String(selectedInspectionDelivery.delivery_id).padStart(4, '0')}`}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default VehiclesPage;