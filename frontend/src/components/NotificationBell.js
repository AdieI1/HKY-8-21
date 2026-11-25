import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api-client';
import reverb from '../utils/reverb';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingRead, setMarkingRead] = useState(false);
  const panelRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications', { skipCache: true });
      const list = res.data.notifications || [];
      setNotifications(list);
      setUnreadCount(res.data.unread_count || 0);
      window.dispatchEvent(new CustomEvent('hjy:notifications-updated', { detail: { notifications: list } }));
    } catch (err) {
      // Fallback silently if unauthenticated or network issue
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Real-time notification updates via Laravel Reverb WebSocket
    const unsubscribe1 = reverb.subscribe('system-notifications', 'notification.created', () => {
      loadNotifications();
    });
    const unsubscribe2 = reverb.subscribe('system-activities', 'activity.created', () => {
      loadNotifications();
    });

    // Smart, lightweight polling: runs every 4s ONLY if user is actively viewing the tab
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadNotifications();
      }
    }, 4000);

    // Instant update whenever user switches back to this browser tab/window
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadNotifications();
      }
    };

    // Instant update whenever any user mutation (approve, dispatch, update) occurs
    const handleDataMutated = () => {
      loadNotifications();
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('app:data-mutated', handleDataMutated);

    return () => {
      clearInterval(interval);
      unsubscribe1();
      unsubscribe2();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('app:data-mutated', handleDataMutated);
    };
  }, [loadNotifications]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    if (target?.is_read) return;
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const handleMarkAllRead = async (e) => {
    e?.stopPropagation();
    if (unreadCount === 0 || markingRead) return;
    setMarkingRead(true);
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all read error:', err);
    } finally {
      setMarkingRead(false);
    }
  };

  const handleToggleBell = () => {
    setOpen((prev) => !prev);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const diffMs = Date.now() - new Date(timeStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="notification-bell-wrapper" ref={panelRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={handleToggleBell}
        aria-label="Notifications"
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '50%',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          transition: 'all 0.2s',
        }}
      >
        <i className="fas fa-bell" style={{ fontSize: '17px', color: '#475569' }}></i>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: '#ef4444',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              minWidth: '19px',
              height: '19px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notification-dropdown-panel"
          style={{
            position: 'absolute',
            top: '50px',
            right: 0,
            width: '360px',
            maxHeight: '480px',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#fafbfc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-bell" style={{ color: '#d32f2f' }}></i>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0284c7',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markingRead}
              title="Mark all notifications as read"
              style={{
                border: unreadCount === 0 ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                background: unreadCount === 0 ? '#f8fafc' : '#eff6ff',
                color: unreadCount === 0 ? '#94a3b8' : '#1d4ed8',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                cursor: unreadCount === 0 || markingRead ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <i className="fas fa-check-double" style={{ fontSize: '10px' }}></i>
              {markingRead ? 'Updating...' : 'Mark as Read'}
            </button>
          </div>

          {/* List */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              maxHeight: '380px',
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '14px',
                }}
              >
                <i className="far fa-bell-slash" style={{ fontSize: '32px', marginBottom: '10px', display: 'block', color: '#cbd5e1' }}></i>
                No notifications at this time
              </div>
            ) : (
              notifications.map((n) => {
                const isNew = !n.is_read;
                return (
                  <Link
                    key={n.id}
                    to={n.link || '#'}
                    onClick={() => {
                      handleMarkAsRead(n.id);
                      setOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      borderLeft: isNew ? '4px solid #2563eb' : '4px solid transparent',
                      background: isNew ? '#f0f9ff' : '#ffffff',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = isNew ? '#e0f2fe' : '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isNew ? '#f0f9ff' : '#ffffff')}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: n.color ? `${n.color}18` : '#e0e7ff',
                        color: n.color || '#4f46e5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '15px',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <i className={n.icon || 'fas fa-info-circle'}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: isNew ? 700 : 600,
                              color: isNew ? '#0f172a' : '#334155',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {n.title}
                          </span>
                          {isNew && (
                            <span
                              style={{
                                background: '#dbeafe',
                                color: '#1d4ed8',
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.4px',
                              }}
                            >
                              New
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>
                          {formatTime(n.time)}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: '12px',
                          color: isNew ? '#475569' : '#64748b',
                          lineHeight: '1.4',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {n.message}
                      </p>
                    </div>
                    {isNew && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#2563eb',
                          flexShrink: 0,
                          marginTop: '6px',
                        }}
                      ></span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
