import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';
import api from '../api/api-client';
import './OfficialReportsPage.css';

const TIMEFRAMES = [
  { key: 'week', label: 'Weekly (7 Days)' },
  { key: 'month', label: 'Monthly' },
  { key: 'quarter', label: 'Quarterly' },
  { key: 'year', label: 'Annually' },
  { key: 'all', label: 'All Time' },
];

const REPORT_TYPES = [
  { key: 'revenue', title: 'Revenue & Billing', sub: 'Earnings, paid vs pending & top clients', icon: 'fas fa-coins', code: 'REV' },
  { key: 'performance', title: 'Company Performance', sub: 'Trips, completion rate, ratings & distance', icon: 'fas fa-chart-line', code: 'PERF' },
  { key: 'drivers', title: 'Driver Reports', sub: 'Driver trips, ratings, status & incidents', icon: 'fas fa-id-card', code: 'DRV' },
  { key: 'vehicles', title: 'Vehicle & Fleet', sub: 'Utilization, odometer & maintenance logs', icon: 'fas fa-truck', code: 'VEH' },
  { key: 'inventory', title: 'Inventory & Flags', sub: 'Fuel & spare parts low/out-of-stock flags', icon: 'fas fa-boxes', code: 'INV' },
  { key: 'issues', title: 'Issues & Incidents', sub: 'Road incidents, severity & resolution logs', icon: 'fas fa-exclamation-triangle', code: 'INC' },
];

function formatMoney(amount) {
  return '₱' + Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function deliveryCode(id) {
  return `DLV${String(id || 0).padStart(4, '0')}`;
}

function isWithinTimeframe(dateStr, timeframe, now) {
  if (timeframe === 'all') return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  if (timeframe === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return d >= start && d <= now;
  }
  if (timeframe === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (timeframe === 'quarter') {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const itemQuarter = Math.floor(d.getMonth() / 3);
    return d.getFullYear() === now.getFullYear() && itemQuarter === currentQuarter;
  }
  if (timeframe === 'year') {
    return d.getFullYear() === now.getFullYear();
  }
  return true;
}

function getPeriodRangeLabel(timeframe, now) {
  if (timeframe === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return `Weekly (${formatDate(start)} – ${formatDate(now)})`;
  }
  if (timeframe === 'month') {
    return `Monthly (${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;
  }
  if (timeframe === 'quarter') {
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `Quarterly (Q${q} ${now.getFullYear()})`;
  }
  if (timeframe === 'year') {
    return `Annually (FY ${now.getFullYear()})`;
  }
  return 'All Time';
}

function resolveFuelStatus(fuel) {
  const stock = Number(fuel.current_stock || 0);
  const reorder = Number(fuel.reorder_level || 0);
  if (stock <= 0) return { label: 'Empty', flagged: true, cls: 'red' };
  if (stock <= reorder) return { label: 'Low Stock', flagged: true, cls: 'amber' };
  return { label: 'Normal', flagged: false, cls: 'green' };
}

function resolvePartStatus(part) {
  const qty = Number(part.quantity_in_stock ?? 0);
  const min = Number(part.reorder_level ?? part.minimum_stock ?? 5);
  if (part.status === 'out_of_stock' || qty <= 0) return { label: 'Out of Stock', flagged: true, cls: 'red' };
  if (part.status === 'low_stock' || qty <= min) return { label: 'Low Stock', flagged: true, cls: 'amber' };
  return { label: 'Normal', flagged: false, cls: 'green' };
}

const ROWS_PER_PAGE = 10;

function ReportPagination({ totalItems, currentPage, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / ROWS_PER_PAGE));
  if (totalItems <= ROWS_PER_PAGE) return null;

  const startItem = (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ROWS_PER_PAGE, totalItems);
  const pages = Array.from({ length: totalPages }, (_, idx) => idx + 1);

  return (
    <div className="or-pagination or-no-print">
      <span>
        Showing <strong>{startItem}–{endItem}</strong> of <strong>{totalItems}</strong> records
      </span>
      <div className="or-pagination-btns">
        <button
          type="button"
          className="or-page-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`or-page-btn${p === currentPage ? ' active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="or-page-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function OfficialReportsPage() {
  const [selectedReport, setSelectedReport] = useState('revenue');
  const [timeframe, setTimeframe] = useState('month');
  const [tablePages, setTablePages] = useState({});
  const [isPrinting, setIsPrinting] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const getPage = (tableKey) => tablePages[tableKey] || 1;
  const setPage = (tableKey, nextPage) => {
    setTablePages((prev) => ({ ...prev, [tableKey]: nextPage }));
  };
  const paginateRows = (rows, tableKey) => {
    if (isPrinting) return rows;
    const page = getPage(tableKey);
    const start = (page - 1) * ROWS_PER_PAGE;
    return rows.slice(start, start + ROWS_PER_PAGE);
  };

  useEffect(() => {
    setTablePages({});
  }, [selectedReport, timeframe]);

  useEffect(() => {
    const onBeforePrint = () => setIsPrinting(true);
    const onAfterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, []);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 60);
  };

  const [deliveries, setDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [fuels, setFuels] = useState([]);
  const [fuelIssuances, setFuelIssuances] = useState([]);
  const [spareParts, setSpareParts] = useState([]);

  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const adminName = authUser.full_name || authUser.name || authUser.username || 'System Administrator';
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    const update = () =>
      setCurrentDate(
        new Date().toLocaleDateString('en-PH', {
          weekday: 'short',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  const loadAllReportData = useCallback(async (skipCache = false) => {
    setLoading(true);
    setLoadError('');
    const cfg = skipCache ? { skipCache: true } : {};
    try {
      const [delRes, drvRes, vehRes, mntRes, incRes, revRes, fuelRes, issRes, partRes] = await Promise.all([
        api.get('/deliveries', cfg).catch(() => ({ data: [] })),
        api.get('/drivers', cfg).catch(() => ({ data: [] })),
        api.get('/vehicles', cfg).catch(() => ({ data: [] })),
        api.get('/vehicle-maintenances', cfg).catch(() => ({ data: [] })),
        api.get('/incident-reports', cfg).catch(() => ({ data: [] })),
        api.get('/reviews', cfg).catch(() => ({ data: [] })),
        api.get('/fuel-inventory', cfg).catch(() => ({ data: [] })),
        api.get('/fuel-issuances', cfg).catch(() => ({ data: [] })),
        api.get('/spare-parts', cfg).catch(() => ({ data: [] })),
      ]);

      setDeliveries(Array.isArray(delRes.data) ? delRes.data : []);
      setDrivers(Array.isArray(drvRes.data) ? drvRes.data : []);
      setVehicles(Array.isArray(vehRes.data) ? vehRes.data : []);
      setMaintenances(Array.isArray(mntRes.data) ? mntRes.data : []);
      setIncidents(Array.isArray(incRes.data) ? incRes.data : []);
      setReviews(Array.isArray(revRes.data) ? revRes.data : []);
      setFuels(Array.isArray(fuelRes.data) ? fuelRes.data : []);
      setFuelIssuances(Array.isArray(issRes.data) ? issRes.data : []);
      setSpareParts(Array.isArray(partRes.data) ? partRes.data : []);
    } catch {
      setLoadError('Unable to load report data. Please verify the backend server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllReportData(false);
  }, [loadAllReportData]);

  // Filtered datasets by timeframe
  const periodDeliveries = useMemo(
    () => deliveries.filter((d) => isWithinTimeframe(d.trip_date || d.created_at, timeframe, now)),
    [deliveries, timeframe, now]
  );

  const periodMaintenances = useMemo(
    () => maintenances.filter((m) => isWithinTimeframe(m.maintenance_date || m.created_at, timeframe, now)),
    [maintenances, timeframe, now]
  );

  const periodIncidents = useMemo(
    () => incidents.filter((i) => isWithinTimeframe(i.reported_at || i.created_at, timeframe, now)),
    [incidents, timeframe, now]
  );

  const periodReviews = useMemo(
    () => reviews.filter((r) => isWithinTimeframe(r.created_at, timeframe, now)),
    [reviews, timeframe, now]
  );

  const periodFuelIssuances = useMemo(
    () =>
      fuelIssuances.filter(
        (f) =>
          String(f.transaction_type || 'out').toLowerCase() !== 'in' &&
          isWithinTimeframe(f.issued_at || f.issue_date || f.created_at, timeframe, now)
      ),
    [fuelIssuances, timeframe, now]
  );

  // 1. Revenue Metrics
  const revenueData = useMemo(() => {
    const billable = periodDeliveries.filter((d) => d.status !== 'rejected');
    const getAmount = (d) => Number(d.trip_cost || d.request?.total_price || 0);
    const gross = billable.reduce((s, d) => s + getAmount(d), 0);
    const approved = billable
      .filter((d) => d.payment_verification === 'approved' || d.status === 'completed')
      .reduce((s, d) => s + getAmount(d), 0);
    const pending = Math.max(0, gross - approved);
    const avg = billable.length > 0 ? gross / billable.length : 0;

    const customerMap = new Map();
    billable.forEach((d) => {
      const cust = d.request?.customer;
      const key = cust?.user_id || d.request?.customer_id || 'unknown';
      const name = cust?.full_name || d.request?.receiver_name || 'Customer';
      const prev = customerMap.get(key) || { name, trips: 0, revenue: 0 };
      prev.trips += 1;
      prev.revenue += getAmount(d);
      customerMap.set(key, prev);
    });
    const topCustomers = Array.from(customerMap.values()).sort((a, b) => b.revenue - a.revenue);

    return { billable, gross, approved, pending, avg, topCustomers, getAmount };
  }, [periodDeliveries]);

  // 2. Company Performance Metrics
  const performanceData = useMemo(() => {
    const total = periodDeliveries.length;
    const completed = periodDeliveries.filter((d) => d.status === 'completed').length;
    const delayed = periodDeliveries.filter((d) => d.is_delayed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalDistance = periodDeliveries.reduce(
      (s, d) => s + Number(d.distance_travelled || d.request?.distance_km || 0),
      0
    );
    const totalFuel = periodDeliveries.reduce((s, d) => s + Number(d.fuel_consumed || d.fuel_issued || 0), 0);
    const avgRating =
      periodReviews.length > 0
        ? (
            periodReviews.reduce((s, r) => s + Number(r.overall_rating || r.driver_rating || 0), 0) /
            periodReviews.length
          ).toFixed(1)
        : '—';

    return { total, completed, delayed, completionRate, totalDistance, totalFuel, avgRating };
  }, [periodDeliveries, periodReviews]);

  // 3. Driver Metrics
  const driverReportRows = useMemo(() => {
    return drivers.map((drv) => {
      const drvDeliveries = periodDeliveries.filter((d) => Number(d.driver_id) === Number(drv.driver_id));
      const completed = drvDeliveries.filter((d) => d.status === 'completed').length;
      const drvDelIds = new Set(drvDeliveries.map((d) => Number(d.delivery_id)));
      const drvReviews = periodReviews.filter((r) => drvDelIds.has(Number(r.delivery_id)));
      const rating =
        drvReviews.length > 0
          ? (
              drvReviews.reduce((s, r) => s + Number(r.driver_rating || r.overall_rating || 0), 0) /
              drvReviews.length
            ).toFixed(1)
          : '—';
      const drvIncidents = periodIncidents.filter(
        (inc) => Number(inc.reported_by) === Number(drv.user_id) || drvDelIds.has(Number(inc.delivery_id))
      ).length;

      return {
        driverId: drv.driver_id,
        name: drv.user?.full_name || 'Driver',
        license: drv.license_number || '—',
        status: drv.availability_status || drv.status || 'available',
        totalTrips: drvDeliveries.length,
        completedTrips: completed,
        rating,
        incidents: drvIncidents,
      };
    });
  }, [drivers, periodDeliveries, periodReviews, periodIncidents]);

  // 4. Vehicle & Fleet Metrics
  const vehicleReportRows = useMemo(() => {
    return vehicles.map((veh) => {
      const vehDeliveries = periodDeliveries.filter((d) => Number(d.vehicle_id) === Number(veh.vehicle_id));
      const distance = vehDeliveries.reduce(
        (s, d) => s + Number(d.distance_travelled || d.request?.distance_km || 0),
        0
      );
      const vehMaint = periodMaintenances.filter((m) => Number(m.vehicle_id) === Number(veh.vehicle_id));
      return {
        vehicleId: veh.vehicle_id,
        plate: veh.plate_number || '—',
        model: [veh.brand, veh.model].filter(Boolean).join(' ') || veh.vehicle_type || veh.type || 'Truck',
        status: veh.status || 'available',
        odometer: veh.odometer_reading != null ? `${Number(veh.odometer_reading).toLocaleString()} km` : '—',
        trips: vehDeliveries.length,
        distance: `${distance.toFixed(1)} km`,
        maintCount: vehMaint.length,
      };
    });
  }, [vehicles, periodDeliveries, periodMaintenances]);

  // 5. Inventory & Flags Metrics
  const inventoryData = useMemo(() => {
    const fuelRows = fuels.map((f) => ({
      category: 'Fuel',
      name: f.fuel_type || 'Fuel',
      supplier: f.supplier_name || '—',
      stock: `${Number(f.current_stock || 0).toLocaleString()} ${f.unit || 'Liters'}`,
      reorder: `${Number(f.reorder_level || 0).toLocaleString()} ${f.unit || 'Liters'}`,
      unitPrice: formatMoney(f.unit_price),
      ...resolveFuelStatus(f),
    }));

    const partRows = spareParts.map((p) => ({
      category: p.category || 'Spare Part',
      name: p.part_name || 'Part',
      supplier: p.supplier_name || p.supplier || '—',
      stock: `${Number(p.quantity_in_stock ?? 0).toLocaleString()} ${p.unit || 'pcs'}`,
      reorder: `${Number(p.reorder_level ?? p.minimum_stock ?? 5).toLocaleString()} ${p.unit || 'pcs'}`,
      unitPrice: formatMoney(p.unit_price),
      ...resolvePartStatus(p),
    }));

    const flaggedFuel = fuelRows.filter((r) => r.flagged);
    const flaggedParts = partRows.filter((r) => r.flagged);
    const allFlagged = [...flaggedFuel, ...flaggedParts];
    const totalFuelLiters = fuels.reduce((s, f) => s + Number(f.current_stock || 0), 0);
    const totalFuelIssued = periodFuelIssuances.reduce((s, i) => s + Number(i.liters || i.quantity || 0), 0);

    return { fuelRows, partRows, flaggedFuel, flaggedParts, allFlagged, totalFuelLiters, totalFuelIssued };
  }, [fuels, spareParts, periodFuelIssuances]);

  // 6. Issues & Incidents Metrics
  const issuesData = useMemo(() => {
    const high = periodIncidents.filter((i) => String(i.severity || '').toLowerCase() === 'high').length;
    const resolved = periodIncidents.filter((i) => String(i.status || '').toLowerCase() === 'resolved').length;
    const open = periodIncidents.length - resolved;
    return { high, resolved, open };
  }, [periodIncidents]);

  const activeReportMeta = REPORT_TYPES.find((r) => r.key === selectedReport) || REPORT_TYPES[0];
  const periodLabel = getPeriodRangeLabel(timeframe, now);
  const docRef = `REP-${activeReportMeta.code}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  // CSV Export tailored to the active report
  const handleExportCsv = () => {
    let headers = [];
    let rows = [];

    if (selectedReport === 'revenue') {
      headers = ['Delivery ID', 'Date', 'Customer', 'Cargo', 'Amount (PHP)', 'Payment Status'];
      rows = revenueData.billable.map((d) => [
        deliveryCode(d.delivery_id),
        formatDate(d.trip_date || d.created_at),
        d.request?.customer?.full_name || 'Customer',
        d.request?.item_name || d.request?.cargo_type || 'Cargo',
        revenueData.getAmount(d).toFixed(2),
        (d.payment_verification || 'pending').toUpperCase(),
      ]);
    } else if (selectedReport === 'performance') {
      headers = ['Delivery ID', 'Date', 'Driver', 'Vehicle', 'Distance (km)', 'Status'];
      rows = periodDeliveries.map((d) => [
        deliveryCode(d.delivery_id),
        formatDate(d.trip_date || d.created_at),
        d.driver?.user?.full_name || 'Driver',
        d.vehicle?.plate_number || '—',
        Number(d.distance_travelled || d.request?.distance_km || 0).toFixed(1),
        String(d.status || '').replace(/_/g, ' ').toUpperCase(),
      ]);
    } else if (selectedReport === 'drivers') {
      headers = ['Driver', 'License #', 'Status', 'Total Trips', 'Completed Trips', 'Avg Rating', 'Incidents'];
      rows = driverReportRows.map((r) => [
        r.name,
        r.license,
        r.status,
        r.totalTrips,
        r.completedTrips,
        r.rating,
        r.incidents,
      ]);
    } else if (selectedReport === 'vehicles') {
      headers = ['Plate #', 'Vehicle Model', 'Status', 'Odometer', 'Trips', 'Distance', 'Maintenance Logs'];
      rows = vehicleReportRows.map((r) => [
        r.plate,
        r.model,
        r.status,
        r.odometer,
        r.trips,
        r.distance,
        r.maintCount,
      ]);
    } else if (selectedReport === 'inventory') {
      headers = ['Category', 'Item Name', 'Supplier', 'Current Stock', 'Reorder Level', 'Unit Price', 'Status'];
      rows = [...inventoryData.fuelRows, ...inventoryData.partRows].map((r) => [
        r.category,
        r.name,
        r.supplier,
        r.stock,
        r.reorder,
        r.unitPrice,
        r.label,
      ]);
    } else if (selectedReport === 'issues') {
      headers = ['Incident ID', 'Date', 'Type', 'Severity', 'Delivery', 'Description', 'Status'];
      rows = periodIncidents.map((inc) => [
        `INC-${String(inc.incident_id || 0).padStart(5, '0')}`,
        formatDate(inc.reported_at || inc.created_at),
        String(inc.incident_type || 'other').replace(/_/g, ' '),
        String(inc.severity || 'medium').toUpperCase(),
        inc.delivery_id ? deliveryCode(inc.delivery_id) : '—',
        inc.description || '—',
        String(inc.status || 'pending').toUpperCase(),
      ]);
    }

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HJY-${activeReportMeta.code}-Report-${timeframe}-${now.toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-container">
      <Sidebar activePage="reports" />

      <div className="main-content">
        <header className="header">
          <div className="page-info">
            <span className="breadcrumb">Page / Official Reports</span>
            <h1>OFFICIAL REPORTS</h1>
          </div>
          <div className="header-actions">
            <div className="date-display">
              <span className="date-text">{currentDate}</span>
              <i className="far fa-calendar-alt"></i>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Timeframe Selector Bar */}
        <div className="or-controls-bar">
          <div className="or-timeframe-group">
            <span className="or-timeframe-label">
              <i className="far fa-calendar-check" style={{ marginRight: 6, color: '#991b1b' }}></i>
              Report Period:
            </span>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.key}
                type="button"
                className={`or-period-btn${timeframe === tf.key ? ' active' : ''}`}
                onClick={() => setTimeframe(tf.key)}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="or-refresh-btn"
            onClick={() => loadAllReportData(true)}
            disabled={loading}
          >
            <i className={`fas fa-sync-alt${loading ? ' fa-spin' : ''}`}></i>
            <span>Refresh Data</span>
          </button>
        </div>

        {/* 6 Report Category Selector Cards */}
        <div className="or-category-grid">
          {REPORT_TYPES.map((rep) => {
            let badgeText = '';
            let badgeAlert = false;
            if (rep.key === 'inventory' && inventoryData.allFlagged.length > 0) {
              badgeText = `${inventoryData.allFlagged.length} Flagged`;
              badgeAlert = true;
            } else if (rep.key === 'issues' && issuesData.open > 0) {
              badgeText = `${issuesData.open} Open`;
              badgeAlert = true;
            } else if (rep.key === 'drivers') {
              badgeText = `${drivers.length}`;
            } else if (rep.key === 'vehicles') {
              badgeText = `${vehicles.length}`;
            }

            return (
              <button
                key={rep.key}
                type="button"
                className={`or-cat-card${selectedReport === rep.key ? ' active' : ''}`}
                onClick={() => setSelectedReport(rep.key)}
              >
                <div className="or-cat-top">
                  <div className="or-cat-icon">
                    <i className={rep.icon}></i>
                  </div>
                  {badgeText && (
                    <span className={`or-cat-badge${badgeAlert ? ' alert' : ''}`}>{badgeText}</span>
                  )}
                </div>
                <div className="or-cat-title">{rep.title}</div>
                <div className="or-cat-sub">{rep.sub}</div>
              </button>
            );
          })}
        </div>

        {loadError && (
          <div className="or-no-print" style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
            {loadError}
          </div>
        )}

        {/* Dedicated Inline Official Report Document */}
        <section className="or-document-shell">
          <div className="or-doc-toolbar">
            <div className="or-doc-toolbar-title">
              <i className="fas fa-file-pdf" style={{ color: '#f87171', fontSize: 16 }}></i>
              <span>Official {activeReportMeta.title} Report — {periodLabel}</span>
            </div>

            <div className="or-doc-toolbar-actions">
              <button type="button" className="or-btn-csv" onClick={handleExportCsv}>
                <i className="fas fa-file-csv"></i>
                <span>Export CSV</span>
              </button>
              <button type="button" className="or-btn-print" onClick={handlePrint}>
                <i className="fas fa-print"></i>
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>

          <div className="or-paper">
            {/* Official Letterhead */}
            <div className="or-paper-header">
              <div>
                <h2 className="or-brand-name">HJY TRUCKING &amp; LOGISTICS SERVICES</h2>
                <div className="or-brand-sub">Official {activeReportMeta.title} Report</div>
                <div className="or-brand-addr">
                  Mindanao Regional Operations Center • Puntod, Cagayan de Oro City, Philippines
                </div>
              </div>
              <div className="or-meta-box">
                <div><strong>Doc Ref:</strong> {docRef}</div>
                <div><strong>Generated:</strong> {currentDate}</div>
                <div><strong>Period:</strong> {periodLabel}</div>
                <div><strong>Classification:</strong> Verified Administrative Copy</div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                Compiling official report data...
              </div>
            ) : (
              <>
                {/* ── 1. REVENUE & BILLING REPORT ── */}
                {selectedReport === 'revenue' && (
                  <>
                    <div className="or-kpi-grid">
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Gross Revenue</div>
                        <div className="or-kpi-val">{formatMoney(revenueData.gross)}</div>
                        <div className="or-kpi-sub">{revenueData.billable.length} billable trips</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Collected / Verified</div>
                        <div className="or-kpi-val" style={{ color: '#15803d' }}>{formatMoney(revenueData.approved)}</div>
                        <div className="or-kpi-sub">Approved or completed billing</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Pending Billing</div>
                        <div className="or-kpi-val" style={{ color: '#b45309' }}>{formatMoney(revenueData.pending)}</div>
                        <div className="or-kpi-sub">Awaiting verification</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Average Trip Value</div>
                        <div className="or-kpi-val">{formatMoney(revenueData.avg)}</div>
                        <div className="or-kpi-sub">Mean revenue per delivery</div>
                      </div>
                    </div>

                    <div className="or-section-title">Top Revenue Clients ({revenueData.topCustomers.slice(0, 5).length})</div>
                    <div className="or-table-wrap">
                      <table className="or-table">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Customer Name</th>
                            <th>Deliveries</th>
                            <th>Total Billing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {revenueData.topCustomers.length === 0 ? (
                            <tr><td colSpan="4" className="or-empty-cell">No billable client records for this period.</td></tr>
                          ) : (
                            revenueData.topCustomers.slice(0, 5).map((c, i) => (
                              <tr key={`${c.name}-${i}`}>
                                <td><strong>#{i + 1}</strong></td>
                                <td>{c.name}</td>
                                <td>{c.trips}</td>
                                <td><strong>{formatMoney(c.revenue)}</strong></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="or-section-title">Itemized Revenue &amp; Billing Ledger ({revenueData.billable.length} Records)</div>
                    <div className="or-table-wrap">
                      <table className="or-table">
                        <thead>
                          <tr>
                            <th>Tracking #</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Cargo</th>
                            <th>Amount</th>
                            <th>Payment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {revenueData.billable.length === 0 ? (
                            <tr><td colSpan="6" className="or-empty-cell">No delivery revenue recorded for this period.</td></tr>
                          ) : (
                            paginateRows(revenueData.billable, 'revenue_ledger').map((d) => (
                              <tr key={d.delivery_id}>
                                <td><strong>{deliveryCode(d.delivery_id)}</strong></td>
                                <td>{formatDate(d.trip_date || d.created_at)}</td>
                                <td>{d.request?.customer?.full_name || 'Customer'}</td>
                                <td>{d.request?.item_name || d.request?.cargo_type || 'Cargo'}</td>
                                <td><strong>{formatMoney(revenueData.getAmount(d))}</strong></td>
                                <td>
                                  <span className={`or-pill ${d.payment_verification === 'approved' ? 'green' : 'amber'}`}>
                                    {(d.payment_verification || 'pending').toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <ReportPagination
                      totalItems={revenueData.billable.length}
                      currentPage={getPage('revenue_ledger')}
                      onPageChange={(p) => setPage('revenue_ledger', p)}
                    />
                  </>
                )}

                {/* ── 2. COMPANY PERFORMANCE REPORT ── */}
                {selectedReport === 'performance' && (
                  <>
                    <div className="or-kpi-grid">
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Total Deliveries</div>
                        <div className="or-kpi-val">{performanceData.total}</div>
                        <div className="or-kpi-sub">{performanceData.completed} completed</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Completion Rate</div>
                        <div className="or-kpi-val" style={{ color: '#15803d' }}>{performanceData.completionRate}%</div>
                        <div className="or-kpi-sub">{performanceData.delayed} flagged delayed</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Customer Satisfaction</div>
                        <div className="or-kpi-val">{performanceData.avgRating}{performanceData.avgRating !== '—' ? ' ★' : ''}</div>
                        <div className="or-kpi-sub">{periodReviews.length} customer reviews</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Distance &amp; Fuel</div>
                        <div className="or-kpi-val">{performanceData.totalDistance.toFixed(1)} km</div>
                        <div className="or-kpi-sub">{performanceData.totalFuel.toFixed(1)} L fuel issued/used</div>
                      </div>
                    </div>

                    <div className="or-section-title">Delivery Operations Summary ({periodDeliveries.length} Trips)</div>
                    <div className="or-table-wrap">
                      <table className="or-table">
                        <thead>
                          <tr>
                            <th>Tracking #</th>
                            <th>Date</th>
                            <th>Driver</th>
                            <th>Vehicle</th>
                            <th>Distance</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {periodDeliveries.length === 0 ? (
                            <tr><td colSpan="6" className="or-empty-cell">No deliveries recorded for this period.</td></tr>
                          ) : (
                            paginateRows(periodDeliveries, 'performance_trips').map((d) => (
                              <tr key={d.delivery_id}>
                                <td><strong>{deliveryCode(d.delivery_id)}</strong></td>
                                <td>{formatDate(d.trip_date || d.created_at)}</td>
                                <td>{d.driver?.user?.full_name || 'Unassigned'}</td>
                                <td>{d.vehicle?.plate_number || '—'}</td>
                                <td>{Number(d.distance_travelled || d.request?.distance_km || 0).toFixed(1)} km</td>
                                <td>
                                  <span className={`or-pill ${d.status === 'completed' ? 'green' : d.status === 'rejected' ? 'red' : 'blue'}`}>
                                    {String(d.status || 'pending').replace(/_/g, ' ')}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <ReportPagination
                      totalItems={periodDeliveries.length}
                      currentPage={getPage('performance_trips')}
                      onPageChange={(p) => setPage('performance_trips', p)}
                    />
                  </>
                )}

                {/* ── 3. DRIVER REPORTS ── */}
                {selectedReport === 'drivers' && (
                  <>
                    <div className="or-kpi-grid">
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Total Drivers</div>
                        <div className="or-kpi-val">{drivers.length}</div>
                        <div className="or-kpi-sub">Registered fleet drivers</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Available Drivers</div>
                        <div className="or-kpi-val" style={{ color: '#15803d' }}>
                          {driverReportRows.filter((r) => String(r.status).toLowerCase() === 'available').length}
                        </div>
                        <div className="or-kpi-sub">Ready for dispatch</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Trips Completed</div>
                        <div className="or-kpi-val">
                          {driverReportRows.reduce((s, r) => s + r.completedTrips, 0)}
                        </div>
                        <div className="or-kpi-sub">Across selected period</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Incidents Logged</div>
                        <div className="or-kpi-val" style={{ color: periodIncidents.length > 0 ? '#b91c1c' : '#15803d' }}>
                          {periodIncidents.length}
                        </div>
                        <div className="or-kpi-sub">Driver / road reports</div>
                      </div>
                    </div>

                    <div className="or-section-title">Driver Performance &amp; Compliance Audit ({driverReportRows.length} Drivers)</div>
                    <div className="or-table-wrap">
                      <table className="or-table">
                        <thead>
                          <tr>
                            <th>Driver Name</th>
                            <th>License #</th>
                            <th>Status</th>
                            <th>Assigned Trips</th>
                            <th>Completed</th>
                            <th>Avg Rating</th>
                            <th>Incidents</th>
                          </tr>
                        </thead>
                        <tbody>
                          {driverReportRows.length === 0 ? (
                            <tr><td colSpan="7" className="or-empty-cell">No drivers registered.</td></tr>
                          ) : (
                            paginateRows(driverReportRows, 'drivers_list').map((r) => (
                              <tr key={r.driverId}>
                                <td><strong>{r.name}</strong></td>
                                <td>{r.license}</td>
                                <td>
                                  <span className={`or-pill ${String(r.status).toLowerCase() === 'available' ? 'green' : 'blue'}`}>
                                    {String(r.status).replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td>{r.totalTrips}</td>
                                <td>{r.completedTrips}</td>
                                <td>{r.rating}{r.rating !== '—' ? ' ★' : ''}</td>
                                <td>
                                  <span className={`or-pill ${r.incidents > 0 ? 'red' : 'slate'}`}>
                                    {r.incidents}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <ReportPagination
                      totalItems={driverReportRows.length}
                      currentPage={getPage('drivers_list')}
                      onPageChange={(p) => setPage('drivers_list', p)}
                    />
                  </>
                )}

                {/* ── 4. VEHICLE & FLEET REPORTS ── */}
                {selectedReport === 'vehicles' && (
                  <>
                    <div className="or-kpi-grid">
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Total Fleet Units</div>
                        <div className="or-kpi-val">{vehicles.length}</div>
                        <div className="or-kpi-sub">Registered trucks</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Available Units</div>
                        <div className="or-kpi-val" style={{ color: '#15803d' }}>
                          {vehicleReportRows.filter((v) => String(v.status).toLowerCase() === 'available').length}
                        </div>
                        <div className="or-kpi-sub">Operational &amp; ready</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Maintenance / Offline</div>
                        <div className="or-kpi-val" style={{ color: '#b45309' }}>
                          {vehicleReportRows.filter((v) => !['available', 'in_use', 'on_delivery'].includes(String(v.status).toLowerCase())).length}
                        </div>
                        <div className="or-kpi-sub">Under service or inactive</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Maintenance Records</div>
                        <div className="or-kpi-val">{periodMaintenances.length}</div>
                        <div className="or-kpi-sub">Scheduled/logged in period</div>
                      </div>
                    </div>

                    <div className="or-section-title">Fleet Utilization &amp; Odometer Audit ({vehicleReportRows.length} Vehicles)</div>
                    <div className="or-table-wrap">
                      <table className="or-table">
                        <thead>
                          <tr>
                            <th>Plate Number</th>
                            <th>Vehicle Model</th>
                            <th>Status</th>
                            <th>Current Odometer</th>
                            <th>Trips</th>
                            <th>Distance</th>
                            <th>Maintenance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vehicleReportRows.length === 0 ? (
                            <tr><td colSpan="7" className="or-empty-cell">No vehicles registered.</td></tr>
                          ) : (
                            paginateRows(vehicleReportRows, 'vehicles_list').map((v) => (
                              <tr key={v.vehicleId}>
                                <td><strong>{v.plate}</strong></td>
                                <td>{v.model}</td>
                                <td>
                                  <span className={`or-pill ${String(v.status).toLowerCase() === 'available' ? 'green' : String(v.status).toLowerCase().includes('maint') ? 'amber' : 'blue'}`}>
                                    {String(v.status).replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td>{v.odometer}</td>
                                <td>{v.trips}</td>
                                <td>{v.distance}</td>
                                <td>{v.maintCount}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <ReportPagination
                      totalItems={vehicleReportRows.length}
                      currentPage={getPage('vehicles_list')}
                      onPageChange={(p) => setPage('vehicles_list', p)}
                    />

                    <div className="or-section-title">Vehicle Maintenance Logs ({periodMaintenances.length} Records)</div>
                    <div className="or-table-wrap">
                      <table className="or-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Vehicle</th>
                            <th>Maintenance Type / Notes</th>
                            <th>Cost</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {periodMaintenances.length === 0 ? (
                            <tr><td colSpan="5" className="or-empty-cell">No maintenance logs recorded in this period.</td></tr>
                          ) : (
                            paginateRows(periodMaintenances, 'vehicles_maint').map((m, idx) => (
                              <tr key={m.maintenance_id || idx}>
                                <td>{formatDate(m.maintenance_date || m.created_at)}</td>
                                <td><strong>{m.vehicle?.plate_number || `Vehicle #${m.vehicle_id || '—'}`}</strong></td>
                                <td>{m.maintenance_type || m.description || 'General Maintenance'}</td>
                                <td>{formatMoney(m.total_cost ?? m.maintenance_cost ?? m.cost ?? 0)}</td>
                                <td>
                                  <span className={`or-pill ${String(m.status || '').toLowerCase() === 'completed' ? 'green' : 'amber'}`}>
                                    {String(m.status || 'scheduled').toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <ReportPagination
                      totalItems={periodMaintenances.length}
                      currentPage={getPage('vehicles_maint')}
                      onPageChange={(p) => setPage('vehicles_maint', p)}
                    />
                  </>
                )}

                {/* ── 5. INVENTORY & FLAGS REPORT ── */}
                {selectedReport === 'inventory' && (
                  <>
                    <div className="or-kpi-grid">
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Flagged Items</div>
                        <div className="or-kpi-val" style={{ color: inventoryData.allFlagged.length > 0 ? '#b91c1c' : '#15803d' }}>
                          {inventoryData.allFlagged.length}
                        </div>
                        <div className="or-kpi-sub">Low stock or out of stock</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Total Fuel Stock</div>
                        <div className="or-kpi-val">{inventoryData.totalFuelLiters.toLocaleString()} L</div>
                        <div className="or-kpi-sub">{inventoryData.flaggedFuel.length} fuel type(s) flagged</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Fuel Issued (Period)</div>
                        <div className="or-kpi-val">{inventoryData.totalFuelIssued.toLocaleString()} L</div>
                        <div className="or-kpi-sub">{periodFuelIssuances.length} issuance transactions</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Spare Parts SKUs</div>
                        <div className="or-kpi-val">{spareParts.length}</div>
                        <div className="or-kpi-sub">{inventoryData.flaggedParts.length} part(s) flagged</div>
                      </div>
                    </div>

                    <div className="or-section-title">Inventory Flags — Reorder &amp; Critical Stock Alerts ({inventoryData.allFlagged.length})</div>
                    <div className="or-table-wrap">
                      <table className="or-table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Item Name</th>
                            <th>Supplier</th>
                            <th>Current Stock</th>
                            <th>Reorder Level</th>
                            <th>Flag Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryData.allFlagged.length === 0 ? (
                            <tr><td colSpan="6" className="or-empty-cell">All fuel and spare parts stock levels are currently healthy (0 flags).</td></tr>
                          ) : (
                            paginateRows(inventoryData.allFlagged, 'inventory_flags').map((item, idx) => (
                              <tr key={`flag-${idx}`}>
                                <td>{item.category}</td>
                                <td><strong>{item.name}</strong></td>
                                <td>{item.supplier}</td>
                                <td><strong>{item.stock}</strong></td>
                                <td>{item.reorder}</td>
                                <td><span className={`or-pill ${item.cls}`}>{item.label}</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <ReportPagination
                      totalItems={inventoryData.allFlagged.length}
                      currentPage={getPage('inventory_flags')}
                      onPageChange={(p) => setPage('inventory_flags', p)}
                    />

                    <div className="or-section-title">Complete Inventory Audit ({inventoryData.fuelRows.length + inventoryData.partRows.length} Items)</div>
                    <div className="or-table-wrap">
                      <table className="or-table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Item Name</th>
                            <th>Stock On Hand</th>
                            <th>Reorder Level</th>
                            <th>Unit Price</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...inventoryData.fuelRows, ...inventoryData.partRows].length === 0 ? (
                            <tr><td colSpan="6" className="or-empty-cell">No inventory records available.</td></tr>
                          ) : (
                            paginateRows([...inventoryData.fuelRows, ...inventoryData.partRows], 'inventory_all').map((item, idx) => (
                              <tr key={`inv-${idx}`}>
                                <td>{item.category}</td>
                                <td><strong>{item.name}</strong></td>
                                <td>{item.stock}</td>
                                <td>{item.reorder}</td>
                                <td>{item.unitPrice}</td>
                                <td><span className={`or-pill ${item.cls}`}>{item.label}</span></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <ReportPagination
                      totalItems={inventoryData.fuelRows.length + inventoryData.partRows.length}
                      currentPage={getPage('inventory_all')}
                      onPageChange={(p) => setPage('inventory_all', p)}
                    />
                  </>
                )}

                {/* ── 6. ISSUES & INCIDENTS REPORT ── */}
                {selectedReport === 'issues' && (
                  <>
                    <div className="or-kpi-grid">
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Total Incidents</div>
                        <div className="or-kpi-val">{periodIncidents.length}</div>
                        <div className="or-kpi-sub">Reported in period</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">High Severity</div>
                        <div className="or-kpi-val" style={{ color: '#b91c1c' }}>{issuesData.high}</div>
                        <div className="or-kpi-sub">Critical / accident alerts</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Open / Pending</div>
                        <div className="or-kpi-val" style={{ color: '#b45309' }}>{issuesData.open}</div>
                        <div className="or-kpi-sub">Awaiting resolution</div>
                      </div>
                      <div className="or-kpi-box">
                        <div className="or-kpi-label">Resolved</div>
                        <div className="or-kpi-val" style={{ color: '#15803d' }}>{issuesData.resolved}</div>
                        <div className="or-kpi-sub">Closed incident reports</div>
                      </div>
                    </div>

                    <div className="or-section-title">Issues &amp; Incident Encounter Log ({periodIncidents.length} Records)</div>
                    <div className="or-table-wrap">
                      <table className="or-table">
                        <thead>
                          <tr>
                            <th>Incident #</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Severity</th>
                            <th>Delivery</th>
                            <th>Description / Location</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {periodIncidents.length === 0 ? (
                            <tr><td colSpan="7" className="or-empty-cell">No incidents or operational issues reported in this period.</td></tr>
                          ) : (
                            paginateRows(periodIncidents, 'issues_list').map((inc) => {
                              const sev = String(inc.severity || 'medium').toLowerCase();
                              const st = String(inc.status || 'pending').toLowerCase();
                              return (
                                <tr key={inc.incident_id}>
                                  <td><strong>INC-{String(inc.incident_id).padStart(5, '0')}</strong></td>
                                  <td>{formatDate(inc.reported_at || inc.created_at)}</td>
                                  <td style={{ textTransform: 'capitalize' }}>{String(inc.incident_type || 'other').replace(/_/g, ' ')}</td>
                                  <td>
                                    <span className={`or-pill ${sev === 'high' ? 'red' : sev === 'low' ? 'green' : 'amber'}`}>
                                      {sev.toUpperCase()}
                                    </span>
                                  </td>
                                  <td>{inc.delivery_id ? deliveryCode(inc.delivery_id) : '—'}</td>
                                  <td>
                                    <div>{inc.description || '—'}</div>
                                    {inc.location_address && (
                                      <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>
                                        {inc.location_address}
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <span className={`or-pill ${st === 'resolved' ? 'green' : 'amber'}`}>
                                      {st.toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    <ReportPagination
                      totalItems={periodIncidents.length}
                      currentPage={getPage('issues_list')}
                      onPageChange={(p) => setPage('issues_list', p)}
                    />
                  </>
                )}

                {/* Official Administrative Sign-off Block */}
                <div className="or-signoff">
                  <div>
                    <div className="or-signoff-label">Prepared &amp; Verified By:</div>
                    <div className="or-signoff-line"></div>
                    <div className="or-signoff-name">{adminName}</div>
                    <div className="or-signoff-role">System Administrator — HJY Trucking Services</div>
                    <div className="or-signoff-date">Date: {currentDate}</div>
                  </div>
                  <div>
                    <div className="or-signoff-label">Approved &amp; Noted By:</div>
                    <div className="or-signoff-line"></div>
                    <div className="or-signoff-name">Operations Director</div>
                    <div className="or-signoff-role">HJY Trucking &amp; Logistics Services — Mindanao Region</div>
                    <div className="or-signoff-date">Signature &amp; Official Company Stamp</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
