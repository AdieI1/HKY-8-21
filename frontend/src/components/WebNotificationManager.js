import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api-client';
import reverb from '../utils/reverb';

const MAX_VISIBLE_POPUPS = 3;
const AUTO_DISMISS_MS = 7000;

function getSessionSeenKey() {
  try {
    const user = JSON.parse(localStorage.getItem('auth_user') || 'null');
    const uid = user?.user_id || user?.id || 'anon';
    return `hjy_seen_notif_ids_${uid}`;
  } catch {
    return 'hjy_seen_notif_ids_anon';
  }
}

function loadSeenIds() {
  try {
    const raw = sessionStorage.getItem(getSessionSeenKey());
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : null;
  } catch {
    return null;
  }
}

function saveSeenIds(set) {
  try {
    // Keep the most recent 200 IDs so sessionStorage stays tiny
    const arr = Array.from(set).slice(-200);
    sessionStorage.setItem(getSessionSeenKey(), JSON.stringify(arr));
  } catch {
    // Ignore storage quota errors
  }
}

export default function WebNotificationManager() {
  const location = useLocation();
  const navigate = useNavigate();
  const [popups, setPopups] = useState([]);
  const seenIdsRef = useRef(null);
  const initializedRef = useRef(false);
  const timersRef = useRef(new Map());
  const hoveredRef = useRef(new Set());

  const isAuthPage = location.pathname === '/';

  const dismissPopup = useCallback((id) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
    hoveredRef.current.delete(id);
    setPopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const scheduleAutoDismiss = useCallback(
    (id) => {
      const existing = timersRef.current.get(id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        if (!hoveredRef.current.has(id)) {
          dismissPopup(id);
        }
      }, AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);
    },
    [dismissPopup]
  );

  const processNotifications = useCallback(
    (list) => {
      if (!Array.isArray(list)) return;

      // Seed baseline on first load so historical notifications never spam pop-ups
      if (!initializedRef.current) {
        const stored = loadSeenIds();
        const baseline = stored || new Set();
        list.forEach((n) => {
          if (n?.id != null) baseline.add(n.id);
        });
        seenIdsRef.current = baseline;
        saveSeenIds(baseline);
        initializedRef.current = true;
        return;
      }

      const seen = seenIdsRef.current || new Set();
      const newlyArrived = [];

      for (const n of list) {
        if (!n || n.id == null) continue;
        if (!seen.has(n.id)) {
          seen.add(n.id);
          if (!n.is_read) {
            newlyArrived.push(n);
          }
        }
      }

      if (newlyArrived.length === 0) return;

      seenIdsRef.current = seen;
      saveSeenIds(seen);

      // Show up to 3 most recent new notifications
      const batch = newlyArrived.slice(0, MAX_VISIBLE_POPUPS);

      setPopups((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const additions = batch.filter((n) => !existingIds.has(n.id));
        if (additions.length === 0) return prev;
        additions.forEach((n) => scheduleAutoDismiss(n.id));
        return [...additions, ...prev].slice(0, MAX_VISIBLE_POPUPS);
      });
    },
    [scheduleAutoDismiss]
  );

  // Reset baseline on logout / login switch
  useEffect(() => {
    if (isAuthPage) {
      initializedRef.current = false;
      seenIdsRef.current = null;
      setPopups([]);
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    }
  }, [isAuthPage]);

  useEffect(() => {
    if (isAuthPage) return undefined;
    const token = localStorage.getItem('auth_token');
    if (!token) return undefined;

    const handleBellUpdate = (e) => {
      const list = e?.detail?.notifications;
      if (Array.isArray(list)) {
        processNotifications(list);
      }
    };

    const fetchAndProcess = async () => {
      if (!localStorage.getItem('auth_token')) return;
      try {
        const res = await api.get('/notifications', { skipCache: true });
        processNotifications(res.data?.notifications || []);
      } catch {
        // Silent ignore
      }
    };

    window.addEventListener('hjy:notifications-updated', handleBellUpdate);

    // Reverb subscription so OS pop-ups fire immediately even when tab is hidden
    const unsubNotif = reverb.subscribe('system-notifications', 'notification.created', () => {
      fetchAndProcess();
    });

    // Background-tab fallback poll (runs ONLY when tab is hidden, since NotificationBell pauses when hidden)
    const hiddenPoll = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        fetchAndProcess();
      }
    }, 8000);

    // Initial baseline seed in case a page doesn't render NotificationBell
    const seedTimer = setTimeout(() => {
      if (!initializedRef.current) {
        fetchAndProcess();
      }
    }, 1500);

    return () => {
      window.removeEventListener('hjy:notifications-updated', handleBellUpdate);
      unsubNotif();
      clearInterval(hiddenPoll);
      clearTimeout(seedTimer);
    };
  }, [isAuthPage, processNotifications]);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  if (isAuthPage || popups.length === 0) return null;

  const handlePopupClick = (notif) => {
    dismissPopup(notif.id);
    api.post(`/notifications/${notif.id}/read`).catch(() => {});
    if (notif.link && notif.link !== '#') {
      navigate(notif.link);
    }
  };

  return (
    <>
      <style>{`
        @keyframes hjyPopupSlideIn {
          from {
            opacity: 0;
            transform: translateX(28px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 22,
          right: 22,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          width: 360,
          maxWidth: 'calc(100vw - 32px)',
          pointerEvents: 'none',
        }}
      >
        {popups.map((n) => {
          const accent = n.color || '#C53030';
          return (
            <div
              key={n.id}
              role="status"
              onClick={() => handlePopupClick(n)}
              onMouseEnter={() => {
                hoveredRef.current.add(n.id);
                const t = timersRef.current.get(n.id);
                if (t) clearTimeout(t);
              }}
              onMouseLeave={() => {
                hoveredRef.current.delete(n.id);
                scheduleAutoDismiss(n.id);
              }}
              style={{
                pointerEvents: 'auto',
                cursor: n.link && n.link !== '#' ? 'pointer' : 'default',
                background: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                borderLeft: `4px solid ${accent}`,
                boxShadow: '0 14px 32px rgba(15, 23, 42, 0.16), 0 3px 10px rgba(15, 23, 42, 0.08)',
                padding: '13px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                animation: 'hjyPopupSlideIn 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: `${accent}18`,
                  color: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <i className={n.icon || 'fas fa-bell'}></i>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: '#0F172A',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {n.title || 'New Notification'}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: '#94A3B8', flexShrink: 0 }}>
                    Just now
                  </span>
                </div>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 12.2,
                    color: '#475569',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {n.message}
                </p>
                {n.link && n.link !== '#' && (
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: accent }}>
                    Click to open <i className="fas fa-arrow-right" style={{ fontSize: 9.5, marginLeft: 3 }}></i>
                  </div>
                )}
              </div>

              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissPopup(n.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: 15,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
