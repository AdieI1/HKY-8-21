import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api-client';

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

// Status label/classes are driven off the real `status` enum
// (available | low_stock | out_of_stock) from spare_parts, not thresholds
// guessed on the frontend.
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
    const dash  = (d.pct / 100) * circ;
    const gap   = circ - dash;
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
      <text x={cx} y={cy - 8}  textAnchor="middle" className="pi-donut-total-num">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="pi-donut-total-lbl">Total Parts</text>
    </svg>
  );
}

/* ── Part Information Side Panel ─────────────────────────── */
function PartPanel({ part, onClose, onEdit }) {
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
          <i className="fas fa-times" onClick={onClose} title="Close"></i>
        </div>

        {part && (
          <div className="pi-side-panel-content">
            <div className="pi-panel-hero">
              <div className="pi-panel-part-icon">
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

/* ── Recent Parts Usage Full List Modal ──────────────────── */
function RecentUsageModal({ usages, onClose }) {
  const [page, setPage] = useState(1);
  const rowsPerPage = 8;
  const totalPages  = Math.max(1, Math.ceil(usages.length / rowsPerPage));
  const rows        = usages.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="ru-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Recent Parts Usage Full List">
      <div className="ru-wrapper" onClick={(e) => e.stopPropagation()}>
        <div className="ru-modal">
          <div className="ru-title-bar">
            <span className="ru-title">RECENT PARTS USAGE – FULL LIST</span>
            <button className="ru-export-btn" type="button"><i className="fas fa-file-export"></i> Export Report</button>
          </div>

          <div className="ru-table-wrap">
            <table className="data-table ru-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Part</th>
                  <th>Part Number</th>
                  <th>Vehicle</th>
                  <th>Qty Used</th>
                  <th>Used By</th>
                  <th>Purpose / Description</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.usage_id}>
                    <td>{formatDateTime(r.used_date)}</td>
                    <td>{r.part?.part_name || '—'}</td>
                    <td>{r.part ? partCode(r.part.part_id) : '—'}</td>
                    <td>{r.permit?.vehicle?.plate_number || '—'}</td>
                    <td>{r.quantity_used} {r.part?.unit || ''}</td>
                    <td>{r.permit?.issuer?.full_name || '—'}</td>
                    <td>{r.purpose || '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: 20 }}>No usage records yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ru-footer">
            <span className="ru-entries">
              Showing {usages.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, usages.length)} of {usages.length} entries
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
  const totalPages  = Math.max(1, Math.ceil(parts.length / rowsPerPage));
  const rows        = parts.slice((page - 1) * rowsPerPage, page * rowsPerPage);

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
            <button className="ls-export-btn" type="button"><i className="fas fa-file-export"></i> Export Report</button>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.part_id}>
                    <td className="ls-part-number">{partCode(r.part_id)}</td>
                    <td>{r.part_name}</td>
                    <td>{r.category || '—'}</td>
                    <td className="ls-qty-red">{r.quantity_in_stock}</td>
                    <td className="ls-qty-red">{r.reorder_level}</td>
                    <td>{r.unit || 'pcs'}</td>
                    <td>{money(r.unit_price)}</td>
                    <td>{money(Number(r.quantity_in_stock || 0) * Number(r.unit_price || 0))}</td>
                    <td><span className="ls-status-badge"><i className="fas fa-circle"></i> {statusLabel(r.status)}</span></td>
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

          <div className="ls-notes">
            <div className="ls-notes-title">NOTES</div>
            <ul>
              <li>Parts with stock quantity less than or equal to reorder level are shown above.</li>
              <li>Please process purchase order to avoid stock out.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Add / Edit Part Modal ────────────────────────────────
   Same modal handles both: pass `part` to edit, omit it to create.
   Edit + a new image goes out as multipart POST with `_method=PUT`
   (Laravel's spoofing convention) since PHP doesn't populate $_FILES
   on a real PUT/PATCH request body. Edit with no new image goes out
   as a plain JSON PATCH. ─────────────────────────────────── */
function PartFormModal({ part, suppliers, onClose, onSaved }) {
  const isEdit = !!part;

  const [form, setForm] = useState({
    part_name: part?.part_name || '',
    category: part?.category || '',
    description: part?.description || '',
    brand: part?.brand || '',
    model_part_code: part?.model_part_code || '',
    warranty: part?.warranty || '',
    unit: part?.unit || '',
    unit_price: part?.unit_price ?? '',
    quantity_in_stock: part?.quantity_in_stock ?? '',
    reorder_level: part?.reorder_level ?? '',
    status: part?.status || '',
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
    const qty   = parseFloat(form.quantity_in_stock) || 0;
    return money(price * qty);
  })();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const applyImageFile = (file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setForm((f) => ({ ...f, image: file, imagePreview: preview }));
  };

  const handleImage = (e) => applyImageFile(e.target.files[0]);
  const handleDrop = (e) => { e.preventDefault(); applyImageFile(e.dataTransfer.files[0]); };

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
      status: form.status,
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
          ? await api.patch(`/spare-parts/${part.part_id}`, fields)
          : await api.post('/spare-parts', fields);
        saved = res.data;
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      setError(errors ? Object.values(errors)[0][0] : message || 'Could not save this part.');
      console.error('Save part failed:', err.response?.data || err);
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
                <textarea placeholder="Enter part description..." value={form.description} onChange={set('description')} rows={4} />
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
                  <option>18 months</option>
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
                  <option value="">Select unit</option>
                  <option>pcs</option>
                  <option>set</option>
                  <option>box</option>
                  <option>liter</option>
                  <option>kg</option>
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
              <div className="ap-field">
                <label>Status <span className="ap-req">*</span></label>
                <select value={form.status} onChange={set('status')} required>
                  <option value="">Select status</option>
                  <option value="available">Normal</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>

            <div className="ap-col">
              <div className="ap-section-title">SUPPLIER INFORMATION</div>

              <div className="ap-field">
                <label>Supplier <span className="ap-req">*</span></label>
                <input
                  list="pi-supplier-list"
                  type="text"
                  placeholder="Select or type a supplier"
                  value={form.supplier_name}
                  onChange={set('supplier_name')}
                  required
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
                <textarea placeholder="Enter address..." value={form.supplier_address} onChange={set('supplier_address')} rows={4} />
              </div>

              <div className="ap-section-title ap-section-title--gap">
                UPLOAD IMAGE <span className="ap-optional">(Optional)</span>
              </div>

              <div
                className="ap-upload-zone"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById('apImageInput').click()}
              >
                {form.imagePreview ? (
                  <img src={form.imagePreview} alt="Preview" className="ap-image-preview" />
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt ap-upload-icon"></i>
                    <span className="ap-upload-label">Upload Part Image</span>
                    <span className="ap-upload-hint">JPG, PNG (Max. 2MB)</span>
                  </>
                )}
                <input
                  id="apImageInput"
                  type="file"
                  accept="image/jpeg,image/png"
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

function PartsInventoryPage() {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [parts, setParts] = useState([]);
  const [usages, setUsages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All Categories');
  const [stockStatus, setStockStatus] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedPart, setSelectedPart]     = useState(null);
  const [formModal, setFormModal]           = useState(null); // { mode: 'add' } | { mode: 'edit', part }
  const [lowStockOpen, setLowStockOpen]     = useState(false);
  const [recentUsageOpen, setRecentUsageOpen] = useState(false);
  const rowsPerPage = 8;

  // Mirror the dispatch page: shift main content when a side panel is open
  useEffect(() => {
    document.body.classList.toggle('panel-open', !!selectedPart);
    return () => document.body.classList.remove('panel-open');
  }, [selectedPart]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [partsRes, usagesRes] = await Promise.all([
        api.get('/spare-parts'),
        api.get('/spare-parts-usage'),
      ]);
      setParts(partsRes.data);
      setUsages(usagesRes.data);
    } catch (err) {
      setLoadError('Could not load parts inventory. Is the backend running and are you logged in?');
      console.error('Load parts inventory failed:', err.response?.data || err);
    } finally {
      setLoading(false);
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
  const pageRows   = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const totalParts      = useMemo(() => parts.reduce((s, p) => s + Number(p.quantity_in_stock || 0), 0), [parts]);
  const totalStockValue = useMemo(() => parts.reduce((s, p) => s + Number(p.quantity_in_stock || 0) * Number(p.unit_price || 0), 0), [parts]);
  const lowStockCount   = useMemo(() => parts.filter((p) => p.status === 'low_stock').length, [parts]);
  const outOfStockCount = useMemo(() => parts.filter((p) => p.status === 'out_of_stock').length, [parts]);

  // "Running low" = at or under reorder level — matches the note text at
  // the bottom of the full Low Stock modal, and stays correct even if a
  // part's `status` field hasn't been manually updated to match.
  const lowStockFull = useMemo(
    () => parts
      .filter((p) => Number(p.quantity_in_stock || 0) <= Number(p.reorder_level || 0))
      .sort((a, b) => Number(a.quantity_in_stock) - Number(b.quantity_in_stock)),
    [parts]
  );
  const lowStockAlerts = lowStockFull.slice(0, 5);

  const usagesSorted = useMemo(
    () => [...usages].sort((a, b) => new Date(b.used_date) - new Date(a.used_date)),
    [usages]
  );
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

  const handleSaved = (savedPart) => {
    setParts((prev) => {
      const exists = prev.some((p) => p.part_id === savedPart.part_id);
      return exists ? prev.map((p) => (p.part_id === savedPart.part_id ? savedPart : p)) : [savedPart, ...prev];
    });
    if (selectedPart && selectedPart.part_id === savedPart.part_id) {
      setSelectedPart(savedPart);
    }
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center' }}>Loading parts inventory...</div>;
  }

  return (
    <>
      {recentUsageOpen && <RecentUsageModal usages={usagesSorted} onClose={() => setRecentUsageOpen(false)} />}
      {lowStockOpen && <LowStockModal parts={lowStockFull} onClose={() => setLowStockOpen(false)} />}
      {formModal && (
        <PartFormModal
          part={formModal.mode === 'edit' ? formModal.part : null}
          suppliers={supplierOptions}
          onClose={() => setFormModal(null)}
          onSaved={handleSaved}
        />
      )}
      <PartPanel
        part={selectedPart}
        onClose={() => setSelectedPart(null)}
        onEdit={(p) => { setSelectedPart(null); setFormModal({ mode: 'edit', part: p }); }}
      />

      <div className="dashboard-container">
        <div className="sidebar">
          <div className="logo">
            <img src="images/HJY LOGO 2 1.png" alt="HJY Trucking Services Logo" />
          </div>
          <nav className="navigation">
            <ul>
              <li><Link to="/overview"><i className="fas fa-chart-pie"></i> Overview</Link></li>
              <li><Link to="/requests"><i className="fas fa-clipboard-list"></i> Requests Management</Link></li>
              <li><Link to="/dispatch"><i className="fas fa-route"></i> Dispatch Management</Link></li>
              <li><Link to="/delivery"><i className="fas fa-truck-loading"></i> Delivery Monitoring</Link></li>
              <li><Link to="/drivers"><i className="fas fa-id-card"></i> Drivers</Link></li>
              <li><Link to="/vehicles"><i className="fas fa-truck"></i> Vehicles</Link></li>
              <li className="nav-group expanded active">
                <span className="nav-group-label">
                  <i className="fas fa-boxes"></i> Inventory
                </span>
                <ul className="nav-submenu">
                  <li><Link to="/fuel-inventory"><i className="fas fa-gas-pump"></i> Fuel Inventory</Link></li>
                  <li className="active"><Link to="/parts-inventory"><i className="fas fa-tools"></i> Parts Inventory</Link></li>
                </ul>
              </li>
              <li><Link to="/analytics"><i className="fas fa-chart-bar"></i> Analytics</Link></li>
              <li><Link to="/customers"><i className="fas fa-users"></i> Customers</Link></li>
            </ul>
          </nav>
          <div className="user-profile" onClick={() => setProfileMenuOpen((o) => !o)}>
            <img src="images/brucednegrow.png" alt="Admin" className="user-avatar" />
            <div className="user-info">
              <span className="user-name">{JSON.parse(localStorage.getItem('auth_user') || '{}').full_name || 'Admin'}</span>
              <span className="user-role">Admin <span className="status-online"></span></span>
            </div>
            {profileMenuOpen && (
              <div className="profile-dropdown" onClick={(e) => e.stopPropagation()}>
                <Link to="/profile" className="dropdown-item">
                  <i className="fas fa-user"></i><span>Profile</span>
                  <i className="fas fa-chevron-right dropdown-arrow"></i>
                </Link>
                <Link to="/settings" className="dropdown-item">
                  <i className="fas fa-cog"></i><span>Settings</span>
                  <i className="fas fa-chevron-right dropdown-arrow"></i>
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
              <span className="breadcrumb">Page / Inventory / Parts Inventory</span>
              <h1 className="page-title">VEHICLE PARTS INVENTORY MANAGEMENT</h1>
              <p className="page-subtitle">Manage spare parts stock, suppliers and usage.</p>
            </div>
            <div className="header-actions">
              <div className="date-picker">
                <span>{new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <i className="far fa-calendar-alt"></i>
              </div>
              <div className="notification">
                <div className="bell-container"><div className="bell"></div></div>
              </div>
            </div>
          </header>

          {loadError && <div className="form-error" style={{ margin: '16px 0', color: '#d32f2f' }}>{loadError}</div>}

          <section className="pi-stats-grid">
            <article className="pi-stat-card">
              <div className="pi-stat-icon red"><i className="fas fa-cubes"></i></div>
              <div className="pi-stat-body">
                <strong className="pi-stat-value">{totalParts}</strong>
                <span className="pi-stat-label">TOTAL PARTS</span>
                <span className="pi-stat-sub">Part Items</span>
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
                <span className="pi-stat-sub">Need Reorder</span>
              </div>
            </article>
            <article className="pi-stat-card">
              <div className="pi-stat-icon orange"><i className="fas fa-times-circle"></i></div>
              <div className="pi-stat-body">
                <strong className="pi-stat-value orange-text">{outOfStockCount}</strong>
                <span className="pi-stat-label">OUT OF STOCK</span>
                <span className="pi-stat-sub">Items</span>
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
                    placeholder="Search part name, category or part number..."
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
              <div className="pi-toolbar-right">
                <button className="btn-add-part" type="button" onClick={() => setFormModal({ mode: 'add' })}>
                  <i className="fas fa-plus"></i> Add Part
                </button>
                <button className="btn-print-report" type="button">
                  <i className="fas fa-print"></i> Print Report
                </button>
                <button className="btn-more-options" type="button" aria-label="More options">
                  <i className="fas fa-ellipsis-v"></i>
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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.part_id}>
                      <td className="pi-part-number">{partCode(row.part_id)}</td>
                      <td>{row.part_name}</td>
                      <td>{row.category || '—'}</td>
                      <td>{row.supplier_name || '—'}</td>
                      <td>{row.unit || 'pcs'}</td>
                      <td className={qtyClass(row.status)}>{row.quantity_in_stock}</td>
                      <td>{money(row.unit_price)}</td>
                      <td>{money(Number(row.quantity_in_stock || 0) * Number(row.unit_price || 0))}</td>
                      <td>
                        <span className={statusClass(row.status)}>
                          <i className="fas fa-circle"></i> {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="pi-action-cell">
                        <button className="btn-edit" type="button" onClick={() => setFormModal({ mode: 'edit', part: row })}>Edit</button>
                        <button className="btn-view-red" type="button" onClick={() => setSelectedPart(row)}>View</button>
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
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
                  <i className="fas fa-clipboard-list pi-clip-icon"></i> RECENT PARTS USAGE
                </h2>
                <button type="button" className="pi-view-all" onClick={() => setRecentUsageOpen(true)}>View all</button>
              </div>
              <table className="data-table pi-usage-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Part</th>
                    <th>Vehicle</th>
                    <th>Qty Used</th>
                    <th>Used By</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsage.map((u) => (
                    <tr key={u.usage_id}>
                      <td>{formatDateTime(u.used_date)}</td>
                      <td>{u.part?.part_name || '—'}</td>
                      <td>{u.permit?.vehicle?.plate_number || '—'}</td>
                      <td>{u.quantity_used}</td>
                      <td>{u.permit?.issuer?.full_name || '—'}</td>
                    </tr>
                  ))}
                  {recentUsage.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 12 }}>No usage recorded yet.</td></tr>
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