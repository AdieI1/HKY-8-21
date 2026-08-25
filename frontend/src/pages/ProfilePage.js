import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api/api-client';

function ProfilePage() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('auth_user') || '{}'));
  const [totalAdmins, setTotalAdmins] = useState(1);
  const [currentDate, setCurrentDate] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', username: '' });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passData, setPassData] = useState({ newPassword: '', confirmPassword: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  const [themeOn, setThemeOn] = useState(() => localStorage.getItem('pref_theme') === 'dark');
  const [twoFactor, setTwoFactor] = useState(() => localStorage.getItem('pref_2fa') === 'true');
  const [notifOn, setNotifOn] = useState(() => localStorage.getItem('pref_notif') !== 'false');
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('pref_sound') !== 'false');
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem('pref_date_format') || 'MM/DD/YY');

  const roleName = user?.role?.role_name || '';
  const isAdmin = roleName.toLowerCase().includes('admin');
  const lastLogin = localStorage.getItem('auth_last_login') || new Date().toISOString();

  useEffect(() => {
    const update = () => setCurrentDate(new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const [meRes, usersRes] = await Promise.all([api.get('/me').catch(() => null), api.get('/users').catch(() => ({ data: [] }))]);
      const currentUser = meRes?.data || JSON.parse(localStorage.getItem('auth_user') || '{}');
      if (currentUser && currentUser.user_id) {
        setUser(currentUser);
        localStorage.setItem('auth_user', JSON.stringify(currentUser));
        const names = (currentUser.full_name || '').split(' ');
        setFormData({ firstName: names[0] || '', lastName: names.slice(1).join(' ') || '', email: currentUser.email || '', phone: currentUser.phone || '', username: currentUser.username || '' });
      }
      if (Array.isArray(usersRes.data)) {
        const admins = usersRes.data.filter((u) => u.role?.role_name?.toLowerCase().includes('admin')).length;
        setTotalAdmins(admins || 1);
      }
    } catch { /* Keep cached */ }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setErrorMsg('Image size must be under 5MB.'); return; }
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  const handleSaveProfile = async () => {
    if (!isEditing) { setIsEditing(true); return; }
    if (!formData.firstName.trim() || !formData.email.trim()) { setErrorMsg('First name and email are required.'); return; }
    setSaving(true);
    setErrorMsg('');
    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      const payload = new FormData();
      payload.append('full_name', fullName);
      payload.append('email', formData.email.trim());
      payload.append('phone', formData.phone.trim());
      if (formData.username.trim()) payload.append('username', formData.username.trim());
      if (selectedPhoto) payload.append('photo', selectedPhoto);

      const res = await api.post(`/users/${user.user_id}?_method=PUT`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      const updated = { ...user, ...res.data };
      setUser(updated);
      localStorage.setItem('auth_user', JSON.stringify(updated));
      setIsEditing(false);
      setSelectedPhoto(null);
      setSaveSuccess('Profile updated successfully!');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passData.newPassword || passData.newPassword.length < 6) { setPassError('Password must be at least 6 characters.'); return; }
    if (passData.newPassword !== passData.confirmPassword) { setPassError('Passwords do not match.'); return; }
    setSaving(true);
    setPassError('');
    try {
      await api.put(`/users/${user.user_id}`, { password: passData.newPassword });
      setPassSuccess('Password changed successfully!');
      setTimeout(() => { setShowPasswordModal(false); setPassSuccess(''); setPassData({ newPassword: '', confirmPassword: '' }); }, 1500);
    } catch (err) {
      setPassError(err.response?.data?.message || 'Failed to update password.');
    } finally { setSaving(false); }
  };

  const toggleTheme = () => {
    const next = !themeOn;
    setThemeOn(next);
    localStorage.setItem('pref_theme', next ? 'dark' : 'light');
    if (next) { document.body.classList.add('dark-theme'); } else { document.body.classList.remove('dark-theme'); }
  };

  const toggleSetting = (key, val, setter) => { setter(val); localStorage.setItem(key, String(val)); };

  const formatLastLogin = (val) => {
    if (!val) return 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const now = new Date();
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return `Today, ${timeStr}`;
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return `Yesterday, ${timeStr}`;
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${timeStr}`;
  };

  const createdFormatted = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, ' – ')
    : '09 – 16 – 2024';

  return (
    <div className={`dashboard-container ${themeOn ? 'dark-theme' : ''}`}>
      <Sidebar activePage="profile" />

      <div className="main-content">
        <header className="header">
          <div className="page-info">
            <span className="breadcrumb">Page / Profile</span>
            <h1 className="page-title pf-page-title">Account Profile</h1>
          </div>
          <div className="header-actions">
            <div className="date-picker">
              <span>{currentDate || 'Fri, 29 March 2026'}</span>
              <i className="far fa-calendar-alt"></i>
            </div>
            <div className="notification">
              <div className="bell-container"><div className="bell"></div></div>
            </div>
          </div>
        </header>

        {saveSuccess && <div style={{ background: '#D1FAE5', color: '#065F46', padding: '10px 16px', borderRadius: 8, marginBottom: 16 }}>{saveSuccess}</div>}
        {errorMsg && <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 16px', borderRadius: 8, marginBottom: 16 }}>{errorMsg}</div>}

        {/* ── Hero Card ── */}
        <section className="pf-hero-card">
          <div className="pf-hero-banner"></div>
          <div className="pf-hero-body">
            <div className="pf-avatar-ring" style={{ position: 'relative' }}>
              <img src={photoPreview || user.profile_photo_url || '/images/brucednegrow.png'} alt={user.full_name || 'User'} className="pf-avatar" />
              {isEditing && (
                <label htmlFor="pf-photo-upload" style={{ position: 'absolute', bottom: -2, right: -2, background: '#D1000C', color: '#fff', width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} title="Change Photo">
                  <i className="fas fa-camera" style={{ fontSize: 11 }}></i>
                </label>
              )}
              <input type="file" id="pf-photo-upload" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>

            <div className="pf-identity">
              <div className="pf-name-row">
                <h2 className="pf-name">{user.full_name || 'Admin User'}</h2>
                <span className="pf-role-badge"><i className={`fas ${isAdmin ? 'fa-crown' : 'fa-user-tie'} pf-crown`}></i> {isAdmin ? 'Admin' : 'Staff'}</span>
              </div>
              <p className="pf-access-label">{isAdmin ? 'Full System Control' : 'Operations & Logistics Control'}</p>

              <div className="pf-meta-row">
                <div className="pf-meta-item">
                  <i className="fas fa-id-badge pf-meta-icon"></i>
                  <div className="pf-meta-text"><span className="pf-meta-label">{isAdmin ? 'Admin ID' : 'Staff ID'}</span><span className="pf-meta-value">{isAdmin ? 'ADM' : 'STF'}{String(user.user_id || 1).padStart(3, '0')}</span></div>
                </div>
                <span className="pf-meta-sep"></span>
                <div className="pf-meta-item">
                  <i className="far fa-calendar-alt pf-meta-icon"></i>
                  <div className="pf-meta-text"><span className="pf-meta-label">Account Created</span><span className="pf-meta-value">{createdFormatted}</span></div>
                </div>
                <span className="pf-meta-sep"></span>
                <div className="pf-meta-item">
                  <i className="fas fa-clock pf-meta-icon"></i>
                  <div className="pf-meta-text"><span className="pf-meta-label">Last Login</span><span className="pf-meta-value">{formatLastLogin(lastLogin)}</span></div>
                </div>
              </div>
            </div>

            <button className="pf-edit-btn" onClick={handleSaveProfile} disabled={saving}>
              <i className={isEditing ? 'fas fa-check' : 'far fa-edit'}></i> {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
            </button>
          </div>
        </section>

        {/* ── Two Column Grid ── */}
        <div className="pf-bottom-grid">
          {/* Left Column */}
          <div className="pf-left-col">
            <section className="pf-panel">
              <h3 className="pf-panel-title"><i className="fas fa-user-circle pf-panel-icon"></i> Account Information</h3>
              <div className="pf-panel-body">
                <div className="pf-field-grid">
                  <div className="pf-field"><label className="pf-label">First Name</label><input className="pf-input" type="text" value={formData.firstName} readOnly={!isEditing} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} /></div>
                  <div className="pf-field"><label className="pf-label">Last Name</label><input className="pf-input" type="text" value={formData.lastName} readOnly={!isEditing} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} /></div>
                  <div className="pf-field pf-full"><label className="pf-label">Email Address</label><input className="pf-input" type="email" value={formData.email} readOnly={!isEditing} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                  <div className="pf-field"><label className="pf-label">Contact Number</label><input className="pf-input" type="text" value={formData.phone} maxLength={11} readOnly={!isEditing} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} /></div>
                  <div className="pf-field"><label className="pf-label">Username</label><input className="pf-input" type="text" value={formData.username} readOnly={!isEditing} onChange={(e) => setFormData({ ...formData, username: e.target.value })} /></div>
                </div>
              </div>
            </section>

            <section className="pf-panel">
              <div className="pf-qs-header"><h3 className="pf-panel-title pf-no-mb" style={{ flex: 1 }}><i className="fas fa-cog pf-panel-icon"></i> Quick Settings</h3><Link to="/settings" className="pf-open-settings">Open Settings</Link></div>
              <div className="pf-qs-list">
                <div className="pf-qs-row"><div className="pf-qs-left"><i className="fas fa-adjust pf-qs-icon"></i><span><strong>Theme:</strong>&nbsp; {themeOn ? 'Dark' : 'Light'}</span></div><label className="pf-toggle"><input type="checkbox" checked={themeOn} onChange={toggleTheme} /><span className="pf-toggle-track"></span></label></div>
                <div className="pf-qs-row"><div className="pf-qs-left"><i className="fas fa-bell pf-qs-icon"></i><span><strong>Notifications:</strong>&nbsp; {notifOn ? 'On' : 'Off'}</span></div><label className="pf-toggle"><input type="checkbox" checked={notifOn} onChange={() => toggleSetting('pref_notif', !notifOn, setNotifOn)} /><span className="pf-toggle-track"></span></label></div>
                <div className="pf-qs-row"><div className="pf-qs-left"><i className="fas fa-volume-up pf-qs-icon"></i><span><strong>Sound Effects:</strong>&nbsp; {soundOn ? 'On' : 'Off'}</span></div><label className="pf-toggle"><input type="checkbox" checked={soundOn} onChange={() => toggleSetting('pref_sound', !soundOn, setSoundOn)} /><span className="pf-toggle-track"></span></label></div>
                <div className="pf-qs-row pf-qs-row-last"><div className="pf-qs-left"><i className="far fa-calendar pf-qs-icon"></i><span><strong>Date Format:</strong>&nbsp; {dateFormat}</span></div><select className="pf-date-select" value={dateFormat} onChange={(e) => toggleSetting('pref_date_format', e.target.value, setDateFormat)}><option>MM/DD/YY</option><option>DD/MM/YY</option><option>YY/MM/DD</option></select></div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="pf-right-col">
            <section className="pf-panel">
              <h3 className="pf-panel-title"><i className="fas fa-shield-alt pf-panel-icon"></i> Security</h3>
              <div className="pf-security-list">
                <div className="pf-sec-row"><div className="pf-sec-left"><div className="pf-sec-icon-wrap pf-sec-icon-gray"><i className="fas fa-lock"></i></div><div className="pf-sec-info"><span className="pf-sec-field-label">Password</span><span className="pf-sec-dots">••••••••••</span></div></div><button className="pf-change-pw-btn" onClick={() => setShowPasswordModal(true)}>Change Password</button></div>
                <div className="pf-sec-row"><div className="pf-sec-left"><div className="pf-2fa-badge">2FA</div><div className="pf-sec-info"><span className="pf-sec-field-label">Two-Factor Authentication</span><span className="pf-sec-sub">Add an extra layer of security</span></div></div><div className="pf-sec-toggle-group"><label className="pf-toggle"><input type="checkbox" checked={twoFactor} onChange={() => toggleSetting('pref_2fa', !twoFactor, setTwoFactor)} /><span className="pf-toggle-track"></span></label><span className="pf-2fa-on-label">{twoFactor ? 'On' : 'Off'}</span></div></div>
                <div className="pf-sec-row pf-sec-row-last"><div className="pf-sec-left"><div className="pf-sec-icon-wrap pf-sec-icon-gray"><i className="far fa-calendar-check"></i></div><div className="pf-sec-info"><span className="pf-sec-field-label">Last Password Update</span><span className="pf-sec-sub">Active</span></div></div><button className="pf-update-btn" onClick={() => setShowPasswordModal(true)}><i className="fas fa-key"></i> Update</button></div>
              </div>
            </section>

            <section className="pf-panel">
              <h3 className="pf-panel-title"><i className="fas fa-chart-bar pf-panel-icon"></i> Activity Summary</h3>
              <div className="pf-activity-list">
                <div className="pf-act-row-card"><p className="pf-act-row-label">Last Action</p><p className="pf-act-row-action">Logged in to {isAdmin ? 'Admin Portal' : 'Staff Dashboard'}</p><p className="pf-act-row-time"><i className="far fa-clock"></i>&nbsp; Active Session</p></div>
                <div className="pf-act-two-col">
                  <div className="pf-act-stat-card pf-act-stat-blue"><div><p className="pf-act-stat-label">Active Users</p><p className="pf-act-stat-count">{totalAdmins}</p><p className="pf-act-stat-sub">Role: {isAdmin ? 'Admin' : 'Staff'}</p></div><div className="pf-act-stat-icon pf-act-icon-blue"><i className="fas fa-user-shield"></i></div></div>
                  <div className="pf-act-stat-card pf-act-stat-red"><div><p className="pf-act-stat-label">Status</p><p className="pf-act-stat-count" style={{ fontSize: 18 }}>Active</p><p className="pf-act-stat-sub">Online</p></div><div className="pf-act-stat-icon pf-act-icon-red"><i className="fas fa-check-circle"></i></div></div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal" style={{ display: 'flex', position: 'fixed', inset: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: themeOn ? '#41365e' : '#fff', color: themeOn ? '#F8FAFC' : '#1F2937', borderRadius: 10, padding: 24, width: '100%', maxWidth: 400, border: themeOn ? '1px solid #D1000C' : 'none' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: themeOn ? '#F8FAFC' : '#1F2937' }}>Change Password</h3>
            {passError && <div style={{ color: '#ff6b6b', marginBottom: 12, fontSize: 13 }}>{passError}</div>}
            {passSuccess && <div style={{ color: '#34D399', marginBottom: 12, fontSize: 13 }}>{passSuccess}</div>}
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: themeOn ? '#E2E8F0' : '#374151' }}>New Password</label>
                <input type="password" style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #352a4f', boxSizing: 'border-box', background: themeOn ? '#1A1A2E' : '#fff', color: themeOn ? '#F8FAFC' : '#333' }} value={passData.newPassword} onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })} required minLength={6} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: themeOn ? '#E2E8F0' : '#374151' }}>Confirm New Password</label>
                <input type="password" style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #352a4f', boxSizing: 'border-box', background: themeOn ? '#1A1A2E' : '#fff', color: themeOn ? '#F8FAFC' : '#333' }} value={passData.confirmPassword} onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })} required minLength={6} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowPasswordModal(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #352a4f', background: themeOn ? '#1A1A2E' : '#fff', color: themeOn ? '#E2E8F0' : '#333', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#D1000C', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{saving ? 'Updating...' : 'Update Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;