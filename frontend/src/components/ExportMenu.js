import { useState, useRef, useEffect } from 'react';
import { exportStyledExcel, exportStructuredCsv } from '../utils/reportExport';

/**
 * Reusable Export button with a clean minimalist dropdown for:
 *  - Formatted Excel (.xlsx) — executive layout, auto-fitted columns, zero ###
 *  - Structured CSV (.csv) — UTF-8 BOM, full metadata + totals
 */
function ExportMenu({
  getSpec,
  label = 'Export',
  className = '',
  style = undefined,
  disabled = false,
  title = 'Export report as Excel or CSV',
  align = 'right',
  iconClass = 'fas fa-file-export',
}) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleAction = async (format) => {
    setOpen(false);
    if (disabled || exporting) return;
    const spec = typeof getSpec === 'function' ? getSpec() : null;
    if (!spec) return;
    setExporting(true);
    try {
      if (format === 'xlsx') {
        await exportStyledExcel(spec);
      } else {
        exportStructuredCsv(spec);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        className={className}
        style={style}
        disabled={disabled || exporting}
        title={title}
        onClick={() => setOpen((v) => !v)}
      >
        <i className={exporting ? 'fas fa-spinner fa-spin' : iconClass}></i>
        <span>{exporting ? 'Exporting...' : label}</span>
        <i
          className="fas fa-chevron-down"
          style={{ fontSize: 10, marginLeft: 4, opacity: 0.75 }}
        ></i>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            ...(align === 'left' ? { left: 0 } : { right: 0 }),
            minWidth: 225,
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.14)',
            padding: 6,
            zIndex: 1600,
            textAlign: 'left',
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction('xlsx')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '9px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: 7,
              cursor: 'pointer',
              textAlign: 'left',
              color: '#0f172a',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <i className="fas fa-file-excel" style={{ color: '#15803d', fontSize: 16, marginTop: 2 }}></i>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Excel (.xlsx)</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                Clean layout, auto-fitted columns &amp; totals
              </div>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction('csv')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '9px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: 7,
              cursor: 'pointer',
              textAlign: 'left',
              color: '#0f172a',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <i className="fas fa-file-csv" style={{ color: '#475569', fontSize: 16, marginTop: 2 }}></i>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>CSV (.csv)</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                Structured plain text (UTF-8) for raw import
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportMenu;
