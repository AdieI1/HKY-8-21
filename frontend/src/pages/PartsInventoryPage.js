import { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';
import NotificationBell from '../components/NotificationBell';

/* ── Helpers ─────────────────────────────────────────────── */
function partCode(partId) {
  return `PT-${String(partId).padStart(5, '0')}`;
}

const CATEGORY_COLORS = {
  Engine: '#3b82f6',
  Electrical: '#6366f1',
  'Braking System': '#f97316',
  Transmission: '#eab308',
  Suspension: '#22c55e',
};
const FALLBACK_CATEGORY_COLOR = '#9ca3af';
const colorForCategory = (name) => CATEGORY_COLORS[name] || FALLBACK_CATEGORY_COLOR;

function statusLabel(status) {
  if (status === 'low_stock') return 'Low Stock';
  if (status === 'out_of_stock') return 'Out of Stock';
  return 'Normal';
}
function statusClass(status) {
  if (status === 'low_stock') return 'pi-status low';
  if (status === 'out_of_stock') return 'pi-status out';
  return 'pi-status normal';
}
function qtyClass(status) {
  if (status === 'out_of_stock') return 'pi-qty out';
  if (status === 'low_stock') return 'pi-qty low';
  return 'pi-qty normal';
}
function money(n) {
  return Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}
function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('en-PH', {
    month: '2-digit', day: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── Donut chart ─────────────────────────────────────────── */
function DonutChart({ data, total }) {
  const r = 70, cx = 90, cy = 90;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.map((d) => {
    const dash = (d.pct / 100) * circ;
    const gap = circ - dash;
    const slice = { ...d, dash, gap, offset };
    offset += dash;
    return slice;
  });

  return (
    <svg viewBox="0 0 180 180" className="pi-donut-svg" aria-label="Parts by category donut chart">
      {slices.map((s) => (
        <circle
          key={s.name}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="30"
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset + circ / 4}
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
      ))}
      <text x={cx} y={cy - 8} textAnchor="middle" className="pi-donut-total-num">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="pi-donut-total-lbl">Total Parts</text>
    </svg>
  );
}

/* ── Part Information Side Panel ─────────────────────────── */
function PartPanel({ part, onClose, onEdit, onStockIn, onStockOut }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const totalValue = part ? Number(part.quantity_in_stock || 0) * Number(part.unit_price || 0) : 0;

  return (
    <>
      <div className={`pi-panel-overlay${part ? ' active' : ''}`} onClick={onClose} />
      <div className={`pi-side-panel${part ? ' active' : ''}`} role="complementary" aria-label="Part Information">
        <div className="pi-side-panel-header">
          <span>PART INFORMATION</span>
          <i className="fas fa-times" onClick={onClose} title="Close" style={{ cursor: 'pointer' }}></i>
        </div>

        {part && (
          <div className="pi-side-panel-content">
            <div className="pi-panel-hero">
              <div className="pi-panel-part-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {part.image_url ? (
                  <img src={part.image_url} alt={part.part_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                ) : (
                  <i className="fas fa-cog"></i>
                )}
              </div>
              <div className="pi-panel-hero-info">
                <div className="pi-panel-part-name">{part.part_name}</div>
                <div className="pi-panel-part-number">{partCode(part.part_id)}</div>
                <span className={statusClass(part.status)}>
                  <i className="fas fa-circle"></i> {statusLabel(part.status)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, margin: '14px 0' }}>
              <button
                type="button"
                onClick={() => { onClose(); onStockIn(part); }}
                style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', padding: '8px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
              >
                <i className="fas fa-plus-circle"></i> Parts In
              </button>
              <button
                type="button"
                onClick={() => { onClose(); onStockOut(part); }}
                style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none', padding: '8px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
              >
                <i className="fas fa-minus-circle"></i> Parts Out
              </button>
            </div>

            <div className="pi-panel-section-title">
              <i className="fas fa-info-circle"></i> PART DETAILS
            </div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Part Name</span><span className="pi-panel-detail-value">{part.part_name}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Part Number</span><span className="pi-panel-detail-value">{partCode(part.part_id)}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Category</span><span className="pi-panel-detail-value">{part.category || '—'}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Supplier</span><span className="pi-panel-detail-value pi-panel-bold">{part.supplier_name || '—'}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Unit</span><span className="pi-panel-detail-value">{part.unit || 'pcs'}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Unit Price</span><span className="pi-panel-detail-value">₱ {money(part.unit_price)}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Stock Quantity</span><span className="pi-panel-detail-value">{part.quantity_in_stock} {part.unit || 'pcs'}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Reorder Level</span><span className="pi-panel-detail-value">{part.reorder_level} {part.unit || 'pcs'}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Total Value</span><span className="pi-panel-detail-value pi-panel-bold">₱ {money(totalValue)}</span></div>
            <div className="pi-panel-detail pi-panel-status-row">
              <span className="pi-panel-detail-label">Status</span>
              <span className={statusClass(part.status)}><i className="fas fa-circle"></i> {statusLabel(part.status)}</span>
            </div>

            <div className="pi-panel-divider" />

            <div className="pi-panel-section-title dark">DESCRIPTION</div>
            <p className="pi-panel-description">{part.description || 'No description provided.'}</p>

            <div className="pi-panel-divider" />

            <div className="pi-panel-section-title dark">ADDITIONAL INFORMATION</div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Brand</span><span className="pi-panel-detail-value">{part.brand || '—'}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Model / Part Code</span><span className="pi-panel-detail-value">{part.model_part_code || '—'}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Warranty</span><span className="pi-panel-detail-value">{part.warranty || '—'}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Supplier Contact</span><span className="pi-panel-detail-value">{part.supplier_contact || '—'}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Supplier Address</span><span className="pi-panel-detail-value">{part.supplier_address || '—'}</span></div>
            <div className="pi-panel-detail"><span className="pi-panel-detail-label">Date Added</span><span className="pi-panel-detail-value">{formatDateTime(part.created_at)}</span></div>

            <button className="pi-panel-edit-btn" type="button" onClick={() => onEdit(part)}>Edit Part</button>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Transaction Details Modal (Photo, Specs, Destination, Log) ───────── */
function TransactionDetailModal({ usage, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!usage) return null;

  const isIn = usage.transaction_type === 'in';
  const part = usage.part || {};
  const vehicle = usage.vehicle || usage.maintenance?.vehicle || usage.permit?.vehicle || null;
  const unitPrice = usage.unit_price || part.unit_price || 0;
  const totalValue = usage.total_value || (Number(usage.quantity_used || 0) * Number(unitPrice || 0));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        padding: 16,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          background: '#ffffff',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: isIn ? '#15803d' : '#b91c1c',
            color: '#ffffff',
            padding: '16px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className={`fas ${isIn ? 'fa-arrow-down' : 'fa-arrow-up'}`} style={{ fontSize: 18, color: '#fef08a' }}></i>
            <h3 style={{ margin: 0, color: '#ffffff', fontSize: 17, fontWeight: 800, letterSpacing: '0.4px' }}>
              {isIn ? 'PARTS IN (STOCK RECEIPT) DETAILS' : 'PARTS OUT (ISSUANCE) DETAILS'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Top Hero Section: Part Photo + Quantity & Value */}
          <div
            style={{
              display: 'flex',
              gap: 18,
              alignItems: 'center',
              background: '#f8fafc',
              padding: 16,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Part Photo */}
            <div
              style={{
                width: 110,
                height: 90,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              }}
            >
              {part.image_url ? (
                <img
                  src={part.image_url}
                  alt={part.part_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <i className="fas fa-cog" style={{ fontSize: 42, color: '#94a3b8' }}></i>
              )}
            </div>

            {/* Part Main Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  {part.part_name || 'Spare Part'}
                </h4>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    background: isIn ? '#dcfce7' : '#fee2e2',
                    color: isIn ? '#15803d' : '#b91c1c',
                  }}
                >
                  {isIn ? '● Stock In' : '● Parts Out'}
                </span>
              </div>
              <p style={{ margin: '4px 0 2px', fontSize: 13, color: '#64748b' }}>
                Code: <strong>{partCode(part.part_id || usage.part_id)}</strong> · Category: <strong>{part.category || 'General'}</strong>
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                Brand / Model: <strong>{part.brand || part.model_part_code || '—'}</strong>
              </p>
            </div>

            {/* Quantity Badge */}
            <div
              style={{
                textAlign: 'right',
                background: '#ffffff',
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                {isIn ? 'Quantity Added' : 'Quantity Issued'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: isIn ? '#16a34a' : '#dc2626' }}>
                {isIn ? `+${usage.quantity_used}` : `-${usage.quantity_used}`} {part.unit || 'pcs'}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Box 1: Financial & Valuation */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                <i className="fas fa-coins" style={{ color: '#eab308', marginRight: 6 }}></i> Valuation
              </h5>
              <p style={{ margin: '4px 0', fontSize: 13 }}>
                <strong>Unit Price:</strong> ₱{money(unitPrice)}
              </p>
              <p style={{ margin: '4px 0', fontSize: 13 }}>
                <strong>Total Value:</strong> <span style={{ fontWeight: 800, color: '#0f172a' }}>₱{money(totalValue)}</span>
              </p>
              <p style={{ margin: '4px 0', fontSize: 13 }}>
                <strong>Current In-Stock:</strong> {part.quantity_in_stock ?? '—'} {part.unit || 'pcs'}
              </p>
            </div>

            {/* Box 2: Timing & Author */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                <i className="far fa-clock" style={{ color: '#3b82f6', marginRight: 6 }}></i> Transaction Log
              </h5>
              <p style={{ margin: '4px 0', fontSize: 13 }}>
                <strong>Date &amp; Time:</strong> {formatDateTime(usage.used_date || usage.created_at)}
              </p>
              <p style={{ margin: '4px 0', fontSize: 13 }}>
                <strong>Logged By:</strong> {usage.user?.full_name || 'System / Admin'}
              </p>
              <p style={{ margin: '4px 0', fontSize: 13 }}>
                <strong>Ref ID:</strong> <span style={{ fontFamily: 'monospace', color: '#64748b' }}>TX-PRT-{String(usage.usage_id).padStart(5, '0')}</span>
              </p>
            </div>
          </div>

          {/* Destination / Purpose Card */}
          <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <h5 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              <i className={`fas ${isIn ? 'fa-truck-loading' : 'fa-truck'}`} style={{ color: isIn ? '#16a34a' : '#ea580c', marginRight: 6 }}></i>
              {isIn ? 'Supplier Information' : 'Vehicle Assignment & Purpose'}
            </h5>

            {isIn ? (
              <div>
                <p style={{ margin: '4px 0', fontSize: 13 }}>
                  <strong>Supplier Name:</strong> {usage.supplier_name || part.supplier_name || '—'}
                </p>
                {part.supplier_contact && (
                  <p style={{ margin: '4px 0', fontSize: 13 }}>
                    <strong>Contact:</strong> {part.supplier_contact}
                  </p>
                )}
                {part.supplier_address && (
                  <p style={{ margin: '4px 0', fontSize: 13 }}>
                    <strong>Address:</strong> {part.supplier_address}
                  </p>
                )}
                <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                  <strong>Purpose / Note:</strong> {usage.purpose || 'Stock replenishment'}
                </p>
              </div>
            ) : (
              <div>
                {vehicle ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, background: '#ffffff', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <i className="fas fa-truck" style={{ fontSize: 20, color: '#f59e0b' }}></i>
                    <div>
                      <strong style={{ fontSize: 14, color: '#0f172a' }}>{vehicle.model}</strong>
                      <span style={{ margin: '0 6px', color: '#cbd5e1' }}>|</span>
                      <span style={{ fontSize: 13, color: '#475569' }}>Plate: <strong>{vehicle.plate_number}</strong></span>
                      {vehicle.vehicle_type && <span style={{ fontSize: 12, color: '#64748b' }}> ({vehicle.vehicle_type})</span>}
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: '4px 0', fontSize: 13, color: '#64748b' }}>
                    <strong>Assigned Vehicle:</strong> General / Facility Maintenance
                  </p>
                )}

                {usage.maintenance && (
                  <p style={{ margin: '4px 0', fontSize: 13 }}>
                    <strong>Maintenance Task:</strong> {usage.maintenance.maintenance_type}
                    {usage.maintenance.maintained_by_name ? ` (Provider: ${usage.maintenance.maintained_by_name})` : ''}
                  </p>
                )}

                <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                  <strong>Purpose / Reason:</strong> {usage.purpose || 'Truck repair / parts replacement'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#f8fafc',
            padding: '12px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              background: '#475569',
              color: '#ffffff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Full Transactions / Usage History Modal ─────────────── */
function RecentUsageModal({ usages, onClose, onSelectTransaction }) {
  const [filterType, setFilterType] = useState('all'); // all | in | out
  const [page, setPage] = useState(1);
  const rowsPerPage = 8;

  const filteredUsages = useMemo(() => {
    if (filterType === 'all') return usages;
    return usages.filter((u) => (u.transaction_type || 'out') === filterType);
  }, [usages, filterType]);

  const totalPages = Math.max(1, Math.ceil(filteredUsages.length / rowsPerPage));
  const rows = filteredUsages.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="ru-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Parts Transactions History">
      <div className="ru-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="ru-modal" style={{ maxWidth: 950 }}>
          <div className="ru-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="ru-title">PARTS TRANSACTIONS HISTORY (IN &amp; OUT)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {['all', 'in', 'out'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setFilterType(t); setPage(1); }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 4,
                    border: '1px solid #fff',
                    background: filterType === t ? '#fff' : 'transparent',
                    color: filterType === t ? '#0f172a' : '#fff',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {t === 'all' ? 'All' : t === 'in' ? 'Parts In (+)' : 'Parts Out (-)'}
                </button>
              ))}
            </div>
          </div>

          <div className="ru-table-wrap">
            <table className="data-table ru-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Type</th>
                  <th>Part</th>
                  <th>Part Number</th>
                  <th>Quantity</th>
                  <th>Vehicle / Supplier</th>
                  <th>Person Responsible</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isIn = r.transaction_type === 'in';
                  return (
                    <tr
                      key={r.usage_id}
                      className="clickable-usage-row"
                      onClick={() => onSelectTransaction && onSelectTransaction(r)}
                      title="Click to view full transaction & part details"
                    >
                      <td>{formatDateTime(r.created_at || r.used_date)}</td>

                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: isIn ? '#dcfce7' : '#fee2e2',
                          color: isIn ? '#16a34a' : '#dc2626',
                        }}>
                          {isIn ? 'Parts In' : 'Parts Out'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.part?.part_name || '—'}</td>
                      <td>{r.part ? partCode(r.part.part_id) : '—'}</td>
                      <td style={{ fontWeight: 700, color: isIn ? '#16a34a' : '#dc2626' }}>
                        {isIn ? `+${r.quantity_used}` : `-${r.quantity_used}`} {r.part?.unit || 'pcs'}
                      </td>
                      <td>{isIn ? (r.supplier_name || r.part?.supplier_name || 'Supplier') : (r.vehicle ? `${r.vehicle.model} (${r.vehicle.plate_number})` : r.permit?.vehicle?.plate_number || 'General')}</td>
                      <td>{r.user?.full_name || r.permit?.issuer?.full_name || 'Staff'}</td>
                      <td style={{ fontSize: 13, color: '#64748b' }}>{r.purpose || '—'}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>No transaction records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ru-footer">
            <span className="ru-entries">
              Showing {filteredUsages.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, filteredUsages.length)} of {filteredUsages.length} entries
            </span>
            <div className="ru-pagination">
              <span className="ru-page-label">Page</span>
              <button className="ru-btn-page" type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <i className="fas fa-chevron-left"></i>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" className={`ru-btn-num${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="ru-btn-page" type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Low Stock Alert Full List Modal ─────────────────────── */
function LowStockModal({ parts, onClose }) {
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(parts.length / rowsPerPage));
  const rows = parts.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="ls-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Low Stock Alert Full List">
      <div className="ls-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="ls-modal">
          <div className="ls-title-bar">LOW STOCK ALERT – FULL LIST</div>

          <div className="ls-banner">
            <span><i className="fas fa-exclamation-triangle ls-banner-icon"></i> These parts are running low and may require reordering soon.</span>
          </div>

          <div className="ls-table-wrap">
            <table className="data-table ls-table">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Part Name</th>
                  <th>Category</th>
                  <th>Stock Qty</th>
                  <th>Reorder Level</th>
                  <th>Unit</th>
                  <th>Unit Price (₱)</th>
                  <th>Total Value (₱)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.part_id}>
                    <td className="ls-part-number">{partCode(r.part_id)}</td>
                    <td style={{ fontWeight: 600 }}>{r.part_name}</td>
                    <td>{r.category || '—'}</td>
                    <td className="ls-qty-red">{r.quantity_in_stock}</td>
                    <td className="ls-qty-red">{r.reorder_level}</td>
                    <td>{r.unit || 'pcs'}</td>
                    <td>{money(r.unit_price)}</td>
                    <td>{money(Number(r.quantity_in_stock || 0) * Number(r.unit_price || 0))}</td>
                    <td><span className={statusClass(r.status)}><i className="fas fa-circle"></i> {statusLabel(r.status)}</span></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan="9" style={{ textAlign: 'center', padding: 20 }}>Nothing is running low right now.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ls-footer">
            <span className="ls-entries">Showing {parts.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, parts.length)} of {parts.length} entries</span>
            <div className="ls-pagination">
              <span className="ls-page-label">Page</span>
              <button className="ls-btn-page" type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><i className="fas fa-chevron-left"></i></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" className={`ls-btn-num${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="ls-btn-page" type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}><i className="fas fa-chevron-right"></i></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Add / Edit Part Modal ──────────────────────────────── */
function PartFormModal({ part, suppliers, onClose, onSaved }) {
  const isEdit = !!part;

  const [form, setForm] = useState({
    part_name: part?.part_name || '',
    category: part?.category || '',
    description: part?.description || '',
    brand: part?.brand || '',
    model_part_code: part?.model_part_code || '',
    warranty: part?.warranty || '',
    unit: part?.unit || 'pcs',
    unit_price: part?.unit_price ?? '',
    quantity_in_stock: part?.quantity_in_stock ?? '',
    reorder_level: part?.reorder_level ?? '10',
    supplier_name: part?.supplier_name || '',
    supplier_contact: part?.supplier_contact || '',
    supplier_address: part?.supplier_address || '',
    image: null,
    imagePreview: part?.image_url || null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const totalValue = (() => {
    const price = parseFloat(form.unit_price) || 0;
    const qty = parseFloat(form.quantity_in_stock) || 0;
    return money(price * qty);
  })();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const applyImageFile = (file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setForm((f) => ({ ...f, image: file, imagePreview: preview }));
  };

  const handleImage = (e) => applyImageFile(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fields = {
      part_name: form.part_name,
      category: form.category,
      description: form.description,
      brand: form.brand,
      model_part_code: form.model_part_code,
      warranty: form.warranty,
      unit: form.unit,
      unit_price: form.unit_price,
      quantity_in_stock: form.quantity_in_stock,
      reorder_level: form.reorder_level,
      supplier_name: form.supplier_name,
      supplier_contact: form.supplier_contact,
      supplier_address: form.supplier_address,
    };

    try {
      let saved;
      if (form.image) {
        const body = new FormData();
        Object.entries(fields).forEach(([k, v]) => body.append(k, v ?? ''));
        body.append('image', form.image);
        if (isEdit) body.append('_method', 'PUT');

        const res = isEdit
          ? await api.post(`/spare-parts/${part.part_id}`, body)
          : await api.post('/spare-parts', body);
        saved = res.data;
      } else {
        const res = isEdit
          ? await api.put(`/spare-parts/${part.part_id}`, fields)
          : await api.post('/spare-parts', fields);
        saved = res.data;
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      setError(errors ? Object.values(errors)[0][0] : message || 'Could not save this part.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ap-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Part' : 'Add New Part'}>
      <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ap-header">
          <span>{isEdit ? 'EDIT PART' : 'ADD NEW PART'}</span>
          <button className="ap-close" onClick={onClose} type="button" aria-label="Close"><i className="fas fa-times"></i></button>
        </div>

        <form className="ap-form" onSubmit={handleSubmit}>
          <div className="ap-body">
            <div className="ap-col">
              <div className="ap-section-title">PART INFORMATION</div>

              <div className="ap-field">
                <label>Part Name <span className="ap-req">*</span></label>
                <input type="text" placeholder="Enter part name" value={form.part_name} onChange={set('part_name')} required />
              </div>
              <div className="ap-field">
                <label>Category <span className="ap-req">*</span></label>
                <select value={form.category} onChange={set('category')} required>
                  <option value="">Select category</option>
                  <option>Engine</option>
                  <option>Electrical</option>
                  <option>Braking System</option>
                  <option>Transmission</option>
                  <option>Suspension</option>
                  <option>Others</option>
                </select>
              </div>
              <div className="ap-field">
                <label>Description</label>
                <textarea placeholder="Enter part description..." value={form.description} onChange={set('description')} rows={3} />
              </div>

              <div className="ap-section-title ap-section-title--gap">SPECIFICATIONS</div>
              <div className="ap-field">
                <label>Brand</label>
                <input type="text" placeholder="Enter brand" value={form.brand} onChange={set('brand')} />
              </div>
              <div className="ap-field">
                <label>Model / Part Code</label>
                <input type="text" placeholder="Enter model or part code" value={form.model_part_code} onChange={set('model_part_code')} />
              </div>
              <div className="ap-field">
                <label>Warranty</label>
                <select value={form.warranty} onChange={set('warranty')}>
                  <option value="">Select warranty</option>
                  <option>3 months</option>
                  <option>6 months</option>
                  <option>12 months</option>
                  <option>24 months</option>
                  <option>No warranty</option>
                </select>
              </div>
            </div>

            <div className="ap-col">
              <div className="ap-section-title">STOCK &amp; PRICING</div>

              <div className="ap-field">
                <label>Unit <span className="ap-req">*</span></label>
                <select value={form.unit} onChange={set('unit')} required>
                  <option value="pcs">pcs</option>
                  <option value="set">set</option>
                  <option value="box">box</option>
                  <option value="liter">liter</option>
                  <option value="kg">kg</option>
                </select>
              </div>
              <div className="ap-field">
                <label>Unit Price (₱) <span className="ap-req">*</span></label>
                <input type="number" min="0" step="0.01" placeholder="Enter unit price" value={form.unit_price} onChange={set('unit_price')} required />
              </div>
              <div className="ap-field">
                <label>Stock Quantity <span className="ap-req">*</span></label>
                <input type="number" min="0" placeholder="Enter stock quantity" value={form.quantity_in_stock} onChange={set('quantity_in_stock')} required />
              </div>
              <div className="ap-field">
                <label>Reorder Level <span className="ap-req">*</span></label>
                <input type="number" min="0" placeholder="Enter reorder level" value={form.reorder_level} onChange={set('reorder_level')} required />
              </div>
              <div className="ap-field">
                <label>Total Value (Auto)</label>
                <div className="ap-auto-value">₱ {totalValue}</div>
              </div>
            </div>

            <div className="ap-col">
              <div className="ap-section-title">SUPPLIER INFORMATION</div>

              <div className="ap-field">
                <label>Supplier Name</label>
                <input
                  list="pi-supplier-list"
                  type="text"
                  placeholder="Select or type a supplier"
                  value={form.supplier_name}
                  onChange={set('supplier_name')}
                />
                <datalist id="pi-supplier-list">
                  {suppliers.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="ap-field">
                <label>Supplier Contact</label>
                <input type="text" placeholder="Enter contact number" value={form.supplier_contact} onChange={set('supplier_contact')} />
              </div>
              <div className="ap-field">
                <label>Supplier Address</label>
                <textarea placeholder="Enter address..." value={form.supplier_address} onChange={set('supplier_address')} rows={3} />
              </div>

              <div className="ap-section-title ap-section-title--gap">
                UPLOAD IMAGE <span className="ap-optional">(Optional)</span>
              </div>

              <div
                className="ap-upload-zone"
                onClick={() => document.getElementById('apImageInput').click()}
                style={{ cursor: 'pointer' }}
              >
                {form.imagePreview ? (
                  <img src={form.imagePreview} alt="Preview" className="ap-image-preview" />
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt ap-upload-icon"></i>
                    <span className="ap-upload-label">Upload Part Image</span>
                    <span className="ap-upload-hint">JPG, PNG (Max 5MB)</span>
                  </>
                )}
                <input
                  id="apImageInput"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleImage}
                />
              </div>
            </div>
          </div>

          {error && <div className="form-error" style={{ color: '#d32f2f', padding: '0 24px' }}>{error}</div>}

          <div className="ap-footer">
            <button type="button" className="ap-btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="ap-btn-save" disabled={saving}>{saving ? 'Saving...' : 'Save Part'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Parts In (Receive) Modal ────────────────────────────── */
function PartsInModal({ part, partsList, onClose, onSaved }) {
  const [targetPart, setTargetPart] = useState(part || (partsList[0] || null));
  const [quantity, setQuantity] = useState('');
  const [supplierName, setSupplierName] = useState(part?.supplier_name || '');
  const [unitPrice, setUnitPrice] = useState(part?.unit_price || '');
  const [purpose, setPurpose] = useState('Stock replenishment / Parts In');
  const [usedDate, setUsedDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetPart) {
      setError('Please select a spare part.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/spare-parts/${targetPart.part_id}/stock-in`, {
        quantity: qty,
        supplier_name: supplierName,
        unit_price: unitPrice ? parseFloat(unitPrice) : undefined,
        purpose,
        used_date: usedDate,
      });
      onSaved(res.data.part, res.data.transaction);
      onClose();

    } catch (err) {
      setError(err.response?.data?.message || 'Could not record parts in.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ap-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ap-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="ap-header" style={{ background: '#16a34a' }}>
          <span><i className="fas fa-arrow-circle-down"></i> RECEIVE STOCK (PARTS IN)</span>
          <button className="ap-close" onClick={onClose} type="button"><i className="fas fa-times"></i></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!part ? (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Select Part *</label>
                <select
                  value={targetPart?.part_id || ''}
                  onChange={(e) => {
                    const p = partsList.find((x) => String(x.part_id) === e.target.value);
                    setTargetPart(p || null);
                    if (p) {
                      setSupplierName(p.supplier_name || '');
                      setUnitPrice(p.unit_price || '');
                    }
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                  required
                >
                  <option value="">-- Choose Part --</option>
                  {partsList.map((p) => (
                    <option key={p.part_id} value={p.part_id}>{p.part_name} (Current: {p.quantity_in_stock} {p.unit || 'pcs'})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <h4 style={{ margin: '0 0 4px', color: '#166534' }}>{part.part_name}</h4>
                <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>
                  Current Stock: <strong>{part.quantity_in_stock} {part.unit || 'pcs'}</strong>
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Quantity Received *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 20"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Unit Price (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 450.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Supplier Name</label>
              <input
                type="text"
                placeholder="e.g. AutoParts Direct"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Reason / Purpose</label>
              <input
                type="text"
                placeholder="e.g. Purchase order PO-2026-001"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Date Received</label>
              <input
                type="date"
                value={usedDate}
                onChange={(e) => setUsedDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Processing...' : 'Confirm Parts In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Parts Out (Issue / Use) Modal ───────────────────────── */
function PartsOutModal({ part, partsList, vehiclesList, onClose, onSaved }) {
  const [targetPart, setTargetPart] = useState(part || (partsList[0] || null));
  const [quantity, setQuantity] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [purpose, setPurpose] = useState('Truck repair / replacement');
  const [usedDate, setUsedDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetPart) {
      setError('Please select a spare part.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }
    if (qty > targetPart.quantity_in_stock) {
      setError(`Insufficient stock available! Current stock: ${targetPart.quantity_in_stock} ${targetPart.unit || 'pcs'}, requested: ${qty}`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/spare-parts/${targetPart.part_id}/stock-out`, {
        quantity: qty,
        vehicle_id: vehicleId || null,
        purpose,
        used_date: usedDate,
      });
      onSaved(res.data.part, res.data.transaction);
      onClose();

    } catch (err) {
      setError(err.response?.data?.message || 'Could not record parts out.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ap-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ap-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="ap-header" style={{ background: '#2563eb' }}>
          <span><i className="fas fa-arrow-circle-up"></i> ISSUE / USE PARTS (PARTS OUT)</span>
          <button className="ap-close" onClick={onClose} type="button"><i className="fas fa-times"></i></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 14 }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!part ? (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Select Part *</label>
                <select
                  value={targetPart?.part_id || ''}
                  onChange={(e) => {
                    const p = partsList.find((x) => String(x.part_id) === e.target.value);
                    setTargetPart(p || null);
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
                  required
                >
                  <option value="">-- Choose Part --</option>
                  {partsList.map((p) => (
                    <option key={p.part_id} value={p.part_id}>{p.part_name} (Available: {p.quantity_in_stock} {p.unit || 'pcs'})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ background: '#eff6ff', padding: 12, borderRadius: 8, border: '1px solid #bfdbfe' }}>
                <h4 style={{ margin: '0 0 4px', color: '#1e40af' }}>{part.part_name}</h4>
                <p style={{ margin: 0, fontSize: 13, color: '#2563eb' }}>
                  Available in Stock: <strong>{part.quantity_in_stock} {part.unit || 'pcs'}</strong>
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Quantity to Use *</label>
                <input
                  type="number"
                  min="1"
                  max={targetPart ? targetPart.quantity_in_stock : undefined}
                  placeholder={`Max: ${targetPart ? targetPart.quantity_in_stock : ''}`}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Vehicle (Optional)</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="">-- General / No Vehicle --</option>
                  {vehiclesList.map((v) => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>{v.model} ({v.plate_number})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Purpose / Reason</label>
              <input
                type="text"
                placeholder="e.g. Brake pad replacement for scheduled maintenance"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Date Issued / Used</label>
              <input
                type="date"
                value={usedDate}
                onChange={(e) => setUsedDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Processing...' : 'Confirm Parts Out'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PartsInventoryPage() {
  const [parts, setParts] = useState([]);
  const [usages, setUsages] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [stockStatus, setStockStatus] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedPart, setSelectedPart] = useState(null);
  const [formModal, setFormModal] = useState(null); // { mode: 'add' } | { mode: 'edit', part }
  const [stockInModal, setStockInModal] = useState(null); // { part } | null
  const [stockOutModal, setStockOutModal] = useState(null); // { part } | null

  const [lowStockOpen, setLowStockOpen] = useState(false);
  const [recentUsageOpen, setRecentUsageOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [toast, setToast] = useState(null);
  const rowsPerPage = 8;

  useEffect(() => {
    document.body.classList.toggle('panel-open', !!selectedPart);
    return () => document.body.classList.remove('panel-open');
  }, [selectedPart]);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setLoadError('');
    try {
      const [partsRes, usagesRes, vehiclesRes] = await Promise.all([
        api.get('/spare-parts'),
        api.get('/spare-parts-usage'),
        api.get('/vehicles'),
      ]);
      setParts(partsRes.data);
      setUsages(usagesRes.data);
      setVehicles(vehiclesRes.data);
    } catch (err) {
      setLoadError('Could not load parts inventory. Is the backend running and are you logged in?');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(parts.map((p) => p.category).filter(Boolean))).sort(),
    [parts]
  );
  const supplierOptions = useMemo(
    () => Array.from(new Set(parts.map((p) => p.supplier_name).filter(Boolean))).sort(),
    [parts]
  );

  const filtered = useMemo(() => parts.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = search === '' ||
      (p.part_name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      partCode(p.part_id).toLowerCase().includes(q);
    const matchCat = category === 'All Categories' || p.category === category;
    const matchStatus =
      stockStatus === 'All Status' ||
      (stockStatus === 'Normal' && p.status === 'available') ||
      (stockStatus === 'Low Stock' && p.status === 'low_stock') ||
      (stockStatus === 'Out of Stock' && p.status === 'out_of_stock');
    return matchSearch && matchCat && matchStatus;
  }), [parts, search, category, stockStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRows = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const totalParts = useMemo(() => parts.reduce((s, p) => s + Number(p.quantity_in_stock || 0), 0), [parts]);
  const totalStockValue = useMemo(() => parts.reduce((s, p) => s + Number(p.quantity_in_stock || 0) * Number(p.unit_price || 0), 0), [parts]);
  const lowStockCount = useMemo(() => parts.filter((p) => p.status === 'low_stock').length, [parts]);
  const outOfStockCount = useMemo(() => parts.filter((p) => p.status === 'out_of_stock').length, [parts]);

  const lowStockFull = useMemo(
    () => parts
      .filter((p) => Number(p.quantity_in_stock || 0) <= Number(p.reorder_level || 0))
      .sort((a, b) => Number(a.quantity_in_stock) - Number(b.quantity_in_stock)),
    [parts]
  );
  const lowStockAlerts = lowStockFull.slice(0, 5);

  const usagesSorted = useMemo(() => {
    return [...usages].sort((a, b) => {
      const timeB = new Date(b.created_at || b.used_date || 0).getTime();
      const timeA = new Date(a.created_at || a.used_date || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.usage_id || 0) - (a.usage_id || 0);
    });
  }, [usages]);
  const recentUsage = usagesSorted.slice(0, 5);

  const categoryData = useMemo(() => {
    const totals = {};
    parts.forEach((p) => {
      const cat = p.category || 'Others';
      totals[cat] = (totals[cat] || 0) + Number(p.quantity_in_stock || 0);
    });
    const total = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / total) * 100),
        color: colorForCategory(name),
      }));
  }, [parts]);

  const handleSaved = (savedPart, newTransaction) => {
    if (savedPart && savedPart.part_id) {
      setParts((prev) => {
        const exists = prev.some((p) => p.part_id === savedPart.part_id);
        return exists ? prev.map((p) => (p.part_id === savedPart.part_id ? savedPart : p)) : [savedPart, ...prev];
      });
      if (selectedPart && selectedPart.part_id === savedPart.part_id) {
        setSelectedPart(savedPart);
      }
    }
    if (newTransaction && newTransaction.usage_id) {
      setUsages((prev) => [
        newTransaction,
        ...prev.filter((u) => u.usage_id !== newTransaction.usage_id),
      ]);
    }
    loadData(false);
    if (savedPart?.part_name) {
      setToast({ message: `Inventory updated successfully for ${savedPart.part_name}.` });
      setTimeout(() => setToast(null), 5000);
    }
  };


  return (
    <>
      {selectedTransaction && (
        <TransactionDetailModal
          usage={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
      {recentUsageOpen && (
        <RecentUsageModal
          usages={usagesSorted}
          onClose={() => setRecentUsageOpen(false)}
          onSelectTransaction={(t) => setSelectedTransaction(t)}
        />
      )}
      {lowStockOpen && <LowStockModal parts={lowStockFull} onClose={() => setLowStockOpen(false)} />}
      {formModal && (
        <PartFormModal
          part={formModal.mode === 'edit' ? formModal.part : null}
          suppliers={supplierOptions}
          onClose={() => setFormModal(null)}
          onSaved={handleSaved}
        />
      )}
      {stockInModal && (
        <PartsInModal
          part={stockInModal.part}
          partsList={parts}
          onClose={() => setStockInModal(null)}
          onSaved={handleSaved}
        />
      )}
      {stockOutModal && (
        <PartsOutModal
          part={stockOutModal.part}
          partsList={parts}
          vehiclesList={vehicles}
          onClose={() => setStockOutModal(null)}
          onSaved={handleSaved}
        />
      )}
      <PartPanel
        part={selectedPart}
        onClose={() => setSelectedPart(null)}
        onEdit={(p) => { setSelectedPart(null); setFormModal({ mode: 'edit', part: p }); }}
        onStockIn={(p) => setStockInModal({ part: p })}
        onStockOut={(p) => setStockOutModal({ part: p })}
      />

      {toast && (
        <div className="toast-notification show">
          <div className="toast-content">
            <span className="toast-message"><i className="fas fa-check-circle"></i> {toast.message}</span>
          </div>
        </div>
      )}

      <div className="dashboard-container">
        <Sidebar activePage="parts-inventory" />

        <div className="main-content">
          <header className="header">
            <div className="page-info">
              <span className="breadcrumb">Page / Inventory / Parts Inventory</span>
              <h1 className="page-title">VEHICLE PARTS INVENTORY MANAGEMENT</h1>
              <p className="page-subtitle">Track spare parts stock, auto stock status, Parts In and Parts Out transactions.</p>
            </div>
            <div className="header-actions">
              <div className="date-picker">
                <span>{new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <i className="far fa-calendar-alt"></i>
              </div>
              <NotificationBell />
            </div>
          </header>

          {loadError && <div className="form-error" style={{ margin: '16px 0', color: '#d32f2f' }}>{loadError}</div>}

          <section className="pi-stats-grid">
            <article className="pi-stat-card">
              <div className="pi-stat-icon red"><i className="fas fa-cubes"></i></div>
              <div className="pi-stat-body">
                <strong className="pi-stat-value">{totalParts}</strong>
                <span className="pi-stat-label">TOTAL PARTS IN STOCK</span>
                <span className="pi-stat-sub">Across all categories</span>
              </div>
            </article>
            <article className="pi-stat-card">
              <div className="pi-stat-icon blue"><i className="fas fa-boxes"></i></div>
              <div className="pi-stat-body">
                <strong className="pi-stat-value blue-text">₱{money(totalStockValue)}</strong>
                <span className="pi-stat-label">TOTAL STOCK VALUE</span>
                <span className="pi-stat-sub">Current Value</span>
              </div>
            </article>
            <article className="pi-stat-card">
              <div className="pi-stat-icon green"><i className="fas fa-exclamation-circle"></i></div>
              <div className="pi-stat-body">
                <strong className="pi-stat-value green-text">{lowStockCount}</strong>
                <span className="pi-stat-label">LOW STOCK ITEMS</span>
                <span className="pi-stat-sub">Below Reorder Level</span>
              </div>
            </article>
            <article className="pi-stat-card">
              <div className="pi-stat-icon orange"><i className="fas fa-times-circle"></i></div>
              <div className="pi-stat-body">
                <strong className="pi-stat-value orange-text">{outOfStockCount}</strong>
                <span className="pi-stat-label">OUT OF STOCK</span>
                <span className="pi-stat-sub">Items at 0 qty</span>
              </div>
            </article>
          </section>

          <div className="content-section pi-table-section">
            <div className="pi-toolbar">
              <div className="pi-toolbar-left">
                <div className="search-bar">
                  <i className="fas fa-search"></i>
                  <input
                    type="text"
                    placeholder="Search part name, category or code..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <div className="pi-filter-group">
                  <label>Category</label>
                  <select value={category} onChange={(e) => { setCategory(e.target.value); setCurrentPage(1); }}>
                    <option>All Categories</option>
                    {categoryOptions.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="pi-filter-group">
                  <label>Stock Status</label>
                  <select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value); setCurrentPage(1); }}>
                    <option>All Status</option>
                    <option>Normal</option>
                    <option>Low Stock</option>
                    <option>Out of Stock</option>
                  </select>
                </div>
              </div>
              <div className="pi-toolbar-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="btn-add-part"
                  type="button"
                  onClick={() => setStockInModal({ part: null })}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxSizing: 'border-box',
                  }}
                >
                  <i className="fas fa-plus-circle"></i> Parts In
                </button>
                <button
                  className="btn-add-part"
                  type="button"
                  onClick={() => setStockOutModal({ part: null })}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxSizing: 'border-box',
                  }}
                >
                  <i className="fas fa-minus-circle"></i> Parts Out
                </button>
                <button
                  className="btn-add-part"
                  type="button"
                  onClick={() => setFormModal({ mode: 'add' })}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxSizing: 'border-box',
                  }}
                >
                  <i className="fas fa-plus"></i> Add New Part
                </button>
              </div>
            </div>

            <div className="section-content">
              <table className="data-table pi-parts-table">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Part Name</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th>Unit</th>
                    <th>Stock Qty</th>
                    <th>Unit Price (₱)</th>
                    <th>Total Value (₱)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.part_id}>
                      <td className="pi-part-number">{partCode(row.part_id)}</td>
                      <td style={{ fontWeight: 600 }}>{row.part_name}</td>
                      <td>{row.category || '—'}</td>
                      <td>{row.supplier_name || '—'}</td>
                      <td>{row.unit || 'pcs'}</td>
                      <td className={qtyClass(row.status)} style={{ fontWeight: 700 }}>{row.quantity_in_stock}</td>
                      <td>{money(row.unit_price)}</td>
                      <td style={{ fontWeight: 600 }}>{money(Number(row.quantity_in_stock || 0) * Number(row.unit_price || 0))}</td>
                      <td>
                        <span className={statusClass(row.status)}>
                          <i className="fas fa-circle"></i> {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="pi-action-cell" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setStockInModal({ part: row })}
                            title="Receive Stock (Parts In)"
                            style={{
                              width: '52px',
                              height: '28px',
                              background: '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 5,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              boxSizing: 'border-box',
                            }}
                          >
                            + In
                          </button>
                          <button
                            type="button"
                            onClick={() => setStockOutModal({ part: row })}
                            title="Issue Parts (Parts Out)"
                            style={{
                              width: '52px',
                              height: '28px',
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 5,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              boxSizing: 'border-box',
                            }}
                          >
                            - Out
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormModal({ mode: 'edit', part: row })}
                            title="Edit Part"
                            style={{
                              width: '52px',
                              height: '28px',
                              background: '#475569',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 5,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              boxSizing: 'border-box',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPart(row)}
                            title="View Part Details"
                            style={{
                              width: '52px',
                              height: '28px',
                              background: '#dc2626',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 5,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              boxSizing: 'border-box',
                            }}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {loading && (
                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: 24, color: '#888' }}>Loading parts inventory...</td></tr>
                  )}
                  {!loading && pageRows.length === 0 && (
                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: 24 }}>No parts match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pi-table-footer">
              <span className="entries-info">
                Showing {filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length} entries
              </span>
              <div className="pi-pagination">
                <span className="pi-page-label">Page</span>
                <button className="btn-page" type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  <i className="fas fa-chevron-left"></i>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} type="button" className={`btn-page-num${p === currentPage ? ' active' : ''}`} onClick={() => setCurrentPage(p)}>
                    {p}
                  </button>
                ))}
                <button className="btn-page" type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="pi-bottom-grid">
            <section className="content-section pi-alert-panel">
              <div className="pi-panel-header">
                <h2 className="pi-panel-title">
                  <i className="fas fa-bell pi-bell-icon"></i> LOW STOCK ALERT
                </h2>
                <button type="button" className="pi-view-all" onClick={() => setLowStockOpen(true)}>View all</button>
              </div>
              <ul className="pi-alert-list">
                {lowStockAlerts.map((p) => (
                  <li key={p.part_id} className="pi-alert-row">
                    <span className="pi-alert-name">{p.part_name}</span>
                    <span className="pi-alert-qty">{p.quantity_in_stock} {p.unit || 'pcs'} left</span>
                    <span className={statusClass(p.status)}><i className="fas fa-circle"></i> {statusLabel(p.status)}</span>
                  </li>
                ))}
                {lowStockAlerts.length === 0 && (
                  <li className="pi-alert-row"><span className="pi-alert-name">Nothing running low right now.</span></li>
                )}
              </ul>
            </section>

            <section className="content-section pi-usage-panel">
              <div className="pi-panel-header">
                <h2 className="pi-panel-title">
                  <i className="fas fa-clipboard-list pi-clip-icon"></i> RECENT TRANSACTIONS
                </h2>
                <button type="button" className="pi-view-all" onClick={() => setRecentUsageOpen(true)}>View all</button>
              </div>
              <table className="data-table pi-usage-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Part</th>
                    <th>Qty</th>
                    <th>Vehicle / Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsage.map((u) => {
                    const isIn = u.transaction_type === 'in';
                    return (
                      <tr
                        key={u.usage_id}
                        className="clickable-usage-row"
                        onClick={() => setSelectedTransaction(u)}
                        title="Click to view full transaction & part details"
                      >
                        <td>{formatDateTime(u.created_at || u.used_date)}</td>

                        <td>
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: 3,
                            fontSize: 10,
                            fontWeight: 700,
                            background: isIn ? '#dcfce7' : '#fee2e2',
                            color: isIn ? '#16a34a' : '#dc2626',
                          }}>
                            {isIn ? 'In' : 'Out'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{u.part?.part_name || '—'}</td>
                        <td style={{ fontWeight: 700, color: isIn ? '#16a34a' : '#dc2626' }}>
                          {isIn ? `+${u.quantity_used}` : `-${u.quantity_used}`}
                        </td>
                        <td>{isIn ? (u.supplier_name || u.part?.supplier_name || 'Supplier') : (u.vehicle ? `${u.vehicle.model}` : u.permit?.vehicle?.plate_number || 'General')}</td>
                      </tr>
                    );
                  })}
                  {recentUsage.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 12 }}>No transactions recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="content-section pi-category-panel">
              <div className="pi-panel-header">
                <h2 className="pi-panel-title">
                  <i className="fas fa-chart-pie pi-pie-icon"></i> PARTS BY CATEGORY
                </h2>
              </div>
              <div className="pi-category-body">
                <div className="pi-donut-wrap">
                  <DonutChart data={categoryData} total={totalParts} />
                </div>
                <ul className="pi-category-legend">
                  {categoryData.map((c) => (
                    <li key={c.name} className="pi-legend-row">
                      <span className="pi-legend-dot" style={{ background: c.color }}></span>
                      <span className="pi-legend-name">{c.name}</span>
                      <span className="pi-legend-count">{c.count} ({c.pct}%)</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default PartsInventoryPage;