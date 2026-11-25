import React, { useState } from 'react';

const CHECKLIST_ITEM_LABELS = {
  // Vehicle Inspection (Pre-Trip & Post-Trip)
  exterior_condition: 'Vehicle body and exterior condition',
  mirrors_windows: 'Mirrors, windows and windshield',
  doors_locks: 'Doors and locks secured',
  tire_wheel_condition: 'Tire and wheel condition',
  tire_pressure: 'Tire pressure',
  wheel_components: 'Complete wheel components',
  headlights_exterior: 'Headlights and exterior lights functional',
  brake_signal_lights: 'Brake and signal lights working',
  hazard_reflectors: 'Functional hazard lights and reflectors',
  braking_system: 'Braking system functional',
  steering_suspension: 'Steering and suspension working',
  engine_performance: 'Good engine performance',
  no_noises_warning: 'No unusual noises, vibrations or warning indicators',
  no_fuel_leaks: 'No visible fuel leaks',
  fire_extinguisher: 'Fire extinguisher available',
  warning_triangle: 'Warning triangle, reflective equipment available',
  emergency_safety_equip: 'Emergency and safety equipment available',
  first_aid_kit: 'First aid kit available',
  cargo_area_secured: 'Cargo area secured',
  cargo_securing_equip: 'Cargo securing equipment on board',
  no_cargo_damage: 'No cargo area damage',
  // Driver Cargo Stage Checklists
  cargo_count_verified: 'Cargo quantity / item count verified',
  packaging_intact: 'Packaging and seals intact',
  handling_checked: 'Fragile / special handling requirements verified',
  load_balanced: 'Cargo evenly balanced and secured inside truck',
  cargo_protected: 'Fragile items protected and weather-covered',
  doors_sealed: 'Cargo doors locked and sealed cleanly',
  seal_intact: 'Truck seal intact and matches documents',
  cargo_unharmed: 'No cargo damage observed prior to unloading',
  unloading_area_safe: 'Drop-off unloading area safe and clear',
  all_cargo_unloaded: 'All cargo items completely unloaded',
  empty_compartment_checked: 'Cargo compartment inspected empty',
  receiver_confirmed: 'Consignee / receiver present to verify delivery',
};

const TYPE_META = {
  pre_trip: { label: 'Pre-Trip Vehicle Inspection', shortLabel: 'Pre-Trip', icon: 'fas fa-clipboard-check', color: '#0284C7', bg: '#E0F2FE' },
  post_trip: { label: 'Post-Trip Vehicle Inspection', shortLabel: 'Post-Trip', icon: 'fas fa-flag-checkered', color: '#16A34A', bg: '#DCFCE7' },
  pre_loading: { label: 'Pre-Loading Cargo Check', shortLabel: 'Pre-Load', icon: 'fas fa-box-open', color: '#7C3AED', bg: '#EDE9FE' },
  post_loading: { label: 'Post-Loading Cargo Check', shortLabel: 'Post-Load', icon: 'fas fa-truck-loading', color: '#2563EB', bg: '#DBEAFE' },
  pre_unloading: { label: 'Pre-Unloading Cargo Check', shortLabel: 'Pre-Unload', icon: 'fas fa-dolly', color: '#D97706', bg: '#FEF3C7' },
  post_unloading: { label: 'Post-Unloading Cargo Check', shortLabel: 'Post-Unload', icon: 'fas fa-check-double', color: '#059669', bg: '#D1FAE5' },
};

const API_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');

function resolvePhotoUrl(url) {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  const clean = url.replace(/^\/?storage\/?/, '');
  return `${API_ORIGIN}/storage/${clean}`;
}

function formatChecklistDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function humanizeKey(key) {
  return CHECKLIST_ITEM_LABELS[key] || String(key).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function InspectionActivitiesSection({
  checklists = [],
  deliveryCode = '',
  compact = false,
  dark = compact,
  summaryOnly = false,
  onOpenModal = null,
}) {
  const [expandedTypes, setExpandedTypes] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);

  const palette = dark
    ? {
        headingText: '#F8FAFC',
        headingIcon: '#F87171',
        cardBg: 'rgba(255, 255, 255, 0.05)',
        cardBorder: 'rgba(255, 255, 255, 0.12)',
        subSurfaceBg: 'rgba(255, 255, 255, 0.06)',
        subSurfaceBorder: 'rgba(255, 255, 255, 0.1)',
        titleText: '#FFFFFF',
        strongText: '#F1F5F9',
        mutedText: '#94A3B8',
        labelText: '#CBD5E1',
        btnBg: 'rgba(255, 255, 255, 0.08)',
        btnText: '#E2E8F0',
        btnBorder: 'rgba(255, 255, 255, 0.2)',
        passBg: 'rgba(34, 197, 94, 0.15)',
        passText: '#4ADE80',
        passBorder: 'rgba(74, 222, 128, 0.35)',
        defectBg: 'rgba(239, 68, 68, 0.15)',
        defectText: '#FCA5A5',
        defectBadgeText: '#F87171',
        defectBorder: 'rgba(248, 113, 113, 0.35)',
        photoTitleText: '#CBD5E1',
        photoIcon: '#38BDF8',
        photoBorder: 'rgba(255, 255, 255, 0.2)',
        emptyBg: 'rgba(255, 255, 255, 0.04)',
        emptyBorder: 'rgba(255, 255, 255, 0.16)',
        emptyText: '#CBD5E1',
        divider: 'rgba(255, 255, 255, 0.12)',
        iconTintOpacity: '26',
      }
    : {
        headingText: '#374151',
        headingIcon: '#C53030',
        cardBg: '#FFFFFF',
        cardBorder: '#E2E8F0',
        subSurfaceBg: '#F8FAFC',
        subSurfaceBorder: '#E2E8F0',
        titleText: '#0F172A',
        strongText: '#334155',
        mutedText: '#64748B',
        labelText: '#475569',
        btnBg: '#F1F5F9',
        btnText: '#334155',
        btnBorder: '#CBD5E1',
        passBg: '#DCFCE7',
        passText: '#15803D',
        passBorder: '#86EFAC',
        defectBg: '#FEF2F2',
        defectText: '#991B1B',
        defectBadgeText: '#DC2626',
        defectBorder: '#FECACA',
        photoTitleText: '#475569',
        photoIcon: '#0284C7',
        photoBorder: '#CBD5E1',
        emptyBg: '#F8FAFC',
        emptyBorder: '#CBD5E1',
        emptyText: '#64748B',
        divider: '#E2E8F0',
        iconTintOpacity: null,
      };

  const list = Array.isArray(checklists) ? checklists : [];
  if (list.length === 0) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: '12px 14px',
          borderRadius: 8,
          background: palette.emptyBg,
          border: `1px dashed ${palette.emptyBorder}`,
          fontSize: 12,
          color: palette.emptyText,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <i className="fas fa-clipboard-list" style={{ color: palette.mutedText, fontSize: 14 }}></i>
        <span>No inspection activities or photos recorded yet for this delivery.</span>
      </div>
    );
  }

  const orderedTypes = ['pre_trip', 'post_trip', 'pre_loading', 'post_loading', 'pre_unloading', 'post_unloading'];
  const sorted = [...list].sort((a, b) => {
    const idxA = orderedTypes.indexOf(a.type);
    const idxB = orderedTypes.indexOf(b.type);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  const toggleExpand = (key) => {
    setExpandedTypes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (summaryOnly) {
    const workflowOrder = ['pre_trip', 'pre_loading', 'post_loading', 'pre_unloading', 'post_unloading', 'post_trip'];
    const workflowSorted = [...list].sort((a, b) => {
      const idxA = workflowOrder.indexOf(a.type);
      const idxB = workflowOrder.indexOf(b.type);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    const totalPhotoCount = workflowSorted.reduce((sum, chk) => {
      const rawPhotos = Array.isArray(chk.photo_urls) && chk.photo_urls.length > 0
        ? chk.photo_urls
        : (Array.isArray(chk.photos) ? chk.photos : []);
      return sum + rawPhotos.map(resolvePhotoUrl).filter(Boolean).length;
    }, 0);

    const latestChk = [...workflowSorted].sort((a, b) => {
      const tA = new Date(a.completed_at || a.created_at || 0).getTime() || 0;
      const tB = new Date(b.completed_at || b.created_at || 0).getTime() || 0;
      return tB - tA;
    })[0];

    const latestMeta = TYPE_META[latestChk?.type] || { label: String(latestChk?.type || 'Inspection').replace(/_/g, ' ') };
    const latestItems = latestChk?.items && typeof latestChk.items === 'object' ? Object.entries(latestChk.items) : [];
    const latestPassed = latestItems.filter(([, v]) => Boolean(v)).length;
    const latestDefects = latestItems.length - latestPassed;
    const latestInspector = latestChk?.inspector_name || latestChk?.inspector?.full_name || 'Inspector';

    return (
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            border: `1px solid ${palette.cardBorder}`,
            borderRadius: 10,
            background: palette.cardBg,
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: palette.headingText, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                <i className="fas fa-clipboard-check" style={{ marginRight: 6, color: palette.headingIcon }}></i>
                Inspections ({workflowSorted.length})
              </span>
              {totalPhotoCount > 0 && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 10,
                    background: dark ? 'rgba(56, 189, 248, 0.16)' : '#E0F2FE',
                    color: dark ? '#38BDF8' : '#0369A1',
                    border: `1px solid ${dark ? 'rgba(56, 189, 248, 0.35)' : '#BAE6FD'}`,
                  }}
                >
                  <i className="fas fa-camera" style={{ marginRight: 4 }}></i>
                  {totalPhotoCount} {totalPhotoCount === 1 ? 'Photo' : 'Photos'}
                </span>
              )}
            </div>

            {onOpenModal && (
              <button
                type="button"
                onClick={onOpenModal}
                style={{
                  background: dark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF',
                  color: dark ? '#38BDF8' : '#1D4ED8',
                  border: `1px solid ${dark ? 'rgba(56, 189, 248, 0.38)' : '#BFDBFE'}`,
                  borderRadius: 6,
                  padding: '4px 9px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <i className="fas fa-expand-alt" style={{ fontSize: 10 }}></i>
                View Details &amp; Photos
              </button>
            )}
          </div>

          {latestChk && (
            <div style={{ marginTop: 7, fontSize: 11.5, color: palette.labelText, lineHeight: 1.4 }}>
              <span style={{ color: palette.mutedText }}>Latest: </span>
              <strong style={{ color: palette.titleText }}>{latestMeta.label}</strong>
              {latestItems.length > 0 && (
                <span style={{ color: latestDefects > 0 ? palette.defectBadgeText : palette.passText, fontWeight: 700 }}>
                  {' '}({latestPassed}/{latestItems.length}{latestDefects > 0 ? ` • ${latestDefects} Defect${latestDefects > 1 ? 's' : ''}` : ' Passed'})
                </span>
              )}
              <span style={{ color: palette.mutedText }}> • By {latestInspector} • {formatChecklistDate(latestChk.completed_at || latestChk.created_at)}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
            {workflowSorted.map((chk) => {
              const meta = TYPE_META[chk.type] || { shortLabel: String(chk.type || 'Check').replace(/_/g, ' ') };
              const items = chk.items && typeof chk.items === 'object' ? Object.entries(chk.items) : [];
              const hasDefect = items.some(([, v]) => !v);
              return (
                <button
                  key={chk.checklist_id || chk.type}
                  type="button"
                  onClick={onOpenModal || undefined}
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 10,
                    background: hasDefect ? palette.defectBg : palette.passBg,
                    color: hasDefect ? palette.defectBadgeText : palette.passText,
                    border: `1px solid ${hasDefect ? palette.defectBorder : palette.passBorder}`,
                    cursor: onOpenModal ? 'pointer' : 'default',
                  }}
                >
                  <i className={`fas ${hasDefect ? 'fa-exclamation-circle' : 'fa-check'}`} style={{ marginRight: 4, fontSize: 9.5 }}></i>
                  {meta.shortLabel || meta.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 800,
          color: palette.headingText,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>
          <i className="fas fa-clipboard-check" style={{ marginRight: 6, color: palette.headingIcon }}></i>
          Inspection Activities &amp; Photos ({sorted.length})
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((chk) => {
          const meta = TYPE_META[chk.type] || {
            label: String(chk.type || 'Inspection').replace(/_/g, ' '),
            icon: 'fas fa-clipboard-check',
            color: '#475569',
            bg: '#F1F5F9',
          };
          const itemsObj = chk.items && typeof chk.items === 'object' ? chk.items : {};
          const entries = Object.entries(itemsObj);
          const passedCount = entries.filter(([, v]) => Boolean(v)).length;
          const defectCount = entries.length - passedCount;
          const rawPhotos = Array.isArray(chk.photo_urls) && chk.photo_urls.length > 0
            ? chk.photo_urls
            : (Array.isArray(chk.photos) ? chk.photos : []);
          const photoUrls = rawPhotos.map(resolvePhotoUrl).filter(Boolean);
          const cardKey = chk.checklist_id || chk.type;
          const isExpanded = Boolean(expandedTypes[cardKey]);
          const inspectorLabel = chk.inspector_name || chk.inspector?.full_name || 'Authorized Inspector';
          const badgeBg = dark ? `${meta.color}${palette.iconTintOpacity}` : meta.bg;
          const badgeColor = dark ? (chk.type === 'post_trip' ? '#4ADE80' : chk.type === 'pre_trip' ? '#38BDF8' : meta.color) : meta.color;

          return (
            <div
              key={cardKey}
              style={{
                border: `1px solid ${palette.cardBorder}`,
                borderRadius: 10,
                background: palette.cardBg,
                padding: compact ? 12 : 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: badgeBg,
                      color: badgeColor,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    <i className={meta.icon}></i>
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: palette.titleText }}>{meta.label}</div>
                    <div style={{ fontSize: 11.5, color: palette.mutedText, marginTop: 1 }}>
                      By <strong style={{ color: palette.strongText }}>{inspectorLabel}</strong> &bull; {formatChecklistDate(chk.completed_at || chk.created_at)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: defectCount > 0 ? palette.defectBg : palette.passBg,
                      color: defectCount > 0 ? palette.defectBadgeText : palette.passText,
                      border: `1px solid ${defectCount > 0 ? palette.defectBorder : palette.passBorder}`,
                    }}
                  >
                    {passedCount}/{entries.length} Passed{defectCount > 0 ? ` • ${defectCount} Defect${defectCount > 1 ? 's' : ''}` : ''}
                  </span>
                  {entries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(cardKey)}
                      style={{
                        background: palette.btnBg,
                        color: palette.btnText,
                        border: `1px solid ${palette.btnBorder}`,
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {isExpanded ? 'Hide Items' : 'View Checklist'}
                    </button>
                  )}
                </div>
              </div>

              {(chk.starting_odometer != null || chk.ending_odometer != null || chk.starting_fuel != null || chk.ending_fuel != null) && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginTop: 8,
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: palette.subSurfaceBg,
                    border: dark ? `1px solid ${palette.subSurfaceBorder}` : 'none',
                    fontSize: 11.5,
                    color: palette.labelText,
                  }}
                >
                  {chk.starting_odometer != null && (
                    <span>Start Odo: <strong style={{ color: palette.titleText }}>{Number(chk.starting_odometer).toLocaleString()} km</strong></span>
                  )}
                  {chk.ending_odometer != null && (
                    <span>End Odo: <strong style={{ color: palette.titleText }}>{Number(chk.ending_odometer).toLocaleString()} km</strong></span>
                  )}
                  {chk.starting_fuel != null && (
                    <span>Start Fuel: <strong style={{ color: palette.titleText }}>{Number(chk.starting_fuel).toLocaleString()} L</strong></span>
                  )}
                  {chk.ending_fuel != null && (
                    <span>End Fuel: <strong style={{ color: palette.titleText }}>{Number(chk.ending_fuel).toLocaleString()} L</strong></span>
                  )}
                </div>
              )}

              {chk.remarks && (
                <div style={{ marginTop: 8, fontSize: 12, color: palette.labelText }}>
                  <strong style={{ color: palette.titleText }}>Remarks:</strong> {chk.remarks}
                </div>
              )}

              {photoUrls.length > 0 ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: palette.photoTitleText, marginBottom: 6 }}>
                    <i className="fas fa-camera" style={{ marginRight: 5, color: palette.photoIcon }}></i>
                    Inspection Photos ({photoUrls.length})
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {photoUrls.map((url, idx) => (
                      <button
                        key={`${url}-${idx}`}
                        type="button"
                        onClick={() => setLightboxImage({ url, title: `${meta.label}${deliveryCode ? ` • ${deliveryCode}` : ''}` })}
                        style={{
                          padding: 0,
                          border: `1px solid ${palette.photoBorder}`,
                          borderRadius: 8,
                          overflow: 'hidden',
                          width: 74,
                          height: 58,
                          cursor: 'pointer',
                          background: '#0F172A',
                        }}
                        title="Click to enlarge photo"
                      >
                        <img
                          src={url}
                          alt={`${meta.label} #${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 11.5, color: palette.mutedText, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-camera"></i>
                  <span>No photos stored for this checklist.</span>
                </div>
              )}

              {isExpanded && entries.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: `1px solid ${palette.divider}`,
                    display: 'grid',
                    gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(230px, 1fr))',
                    gap: 6,
                  }}
                >
                  {entries.map(([key, passed]) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '5px 8px',
                        borderRadius: 6,
                        background: passed ? palette.subSurfaceBg : palette.defectBg,
                        border: `1px solid ${passed ? palette.subSurfaceBorder : palette.defectBorder}`,
                        fontSize: 11.5,
                      }}
                    >
                      <span style={{ color: passed ? palette.labelText : palette.defectText, fontWeight: passed ? 500 : 700 }}>
                        {humanizeKey(key)}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 10.5,
                          color: passed ? palette.passText : palette.defectBadgeText,
                          flexShrink: 0,
                        }}
                      >
                        {passed ? 'PASS' : 'DEFECT'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.84)',
            zIndex: 1600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setLightboxImage(null)}
        >
          <div
            style={{
              maxWidth: 780,
              width: '100%',
              maxHeight: '90vh',
              background: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              borderTop: '3px solid #C53030',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#C53030', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-camera"></i>
                <span>{lightboxImage.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                style={{ background: 'none', border: 'none', fontSize: 24, color: '#64748B', cursor: 'pointer', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', textAlign: 'center', background: '#0F172A', borderRadius: 8, padding: 8 }}>
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                style={{ maxWidth: '100%', maxHeight: '72vh', objectFit: 'contain', display: 'block', margin: '0 auto' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
