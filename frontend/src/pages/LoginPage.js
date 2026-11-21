import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api-client';

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('login_account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OWASP First-login Password Rotation State
  const [showSecuritySetup, setShowSecuritySetup] = useState(false);
  const [tempPasswordUsed, setTempPasswordUsed] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    if (token && user?.role?.role_name && !user?.must_change_password) {
      if (user.role.role_name.toLowerCase().includes('admin')) {
        navigate('/overview');
      } else {
        navigate('/dashboard');
      }
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [navigate]);

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/login', { email, password });
      const { user, token, must_change_password } = response.data;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_last_login', new Date().toISOString());

      // OWASP First-Login Password Rotation Enforced
      if (must_change_password || user?.must_change_password) {
        setTempPasswordUsed(password);
        setShowSecuritySetup(true);
        return;
      }

      const roleName = user?.role?.role_name || '';
      if (roleName.toLowerCase().includes('admin')) {
        navigate('/overview');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response && err.response.status === 422) {
        const firstError = Object.values(err.response.data.errors || {})[0];
        setError(firstError ? firstError[0] : 'Invalid credentials.');
      } else if (err.response) {
        setError(err.response.data.message || 'Login failed. Please try again.');
      } else {
        setError('Could not reach the server. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    setSecurityError('');

    if (!newPassword.trim()) {
      setSecurityError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setSecurityError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setSecurityError('Passwords do not match.');
      return;
    }

    setSavingSecurity(true);
    try {
      const res = await api.post('/user/change-password', {
        current_password: tempPasswordUsed,
        new_password: newPassword,
        new_password_confirmation: confirmNewPassword,
      });

      const updatedUser = res.data?.user || JSON.parse(localStorage.getItem('auth_user') || '{}');
      updatedUser.must_change_password = false;
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      setShowSecuritySetup(false);

      const roleName = updatedUser?.role?.role_name || '';
      if (roleName.toLowerCase().includes('admin')) {
        navigate('/overview');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) {
        const first = Object.values(errors)[0];
        setSecurityError(Array.isArray(first) ? first[0] : first);
      } else {
        setSecurityError(err.response?.data?.message || 'Failed to update permanent password.');
      }
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleCancelSecurity = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_last_login');
    setShowSecuritySetup(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setSecurityError('');
  };

  return (
    <>
      <div className="login-container">
              <div className="logo-container">
                  <img src="/images/HJY LOGO 2 1.png" alt="HJY Trucking Services Logo" />
              </div>
              <div className="main-content">
                  <div className="form-wrapper">


                      <div className="login-form">
                          <div className="tabs">

                              <button type="button" className={`tab${activeTab === "login_account" ? " active" : ""}`} id="login_account" onClick={() => setActiveTab("login_account")}>
                                  <i className="fa-solid fa-user-check"></i> <span>Login Account</span>
                              </button>
                          </div>

                          <form className="form" onSubmit={handleSubmit}>
                              {error && (
                                  <div className="form-error" style={{ color: '#d32f2f', marginBottom: '12px', fontSize: '14px' }}>
                                      {error}
                                  </div>
                              )}
                              <div className="input-box">
                                  <h6>Email</h6>
                                  <input
                                      type="email"
                                      id="email"
                                      name="email"
                                      placeholder="Enter Email..."
                                      value={email}
                                      onChange={(e) => setEmail(e.target.value)}
                                      required
                                  />
                                  <i className="fa-regular fa-user"></i>
                              </div>
                              <div className="input-box">
                                  <h6>Password</h6>
                                  <input
                                      type={showPassword ? "text" : "password"}
                                      id="password"
                                      name="password"
                                      placeholder="Enter Password..."
                                      value={password}
                                      onChange={(e) => setPassword(e.target.value)}
                                      required
                                  />
                                  <i className="fa-solid fa-key" style={{ left: '12px', right: 'auto' }}></i>
                        <img src={showPassword ? "/images/view.png" : "/images/hide.png"} id="eyeicon" className="eyeicon" alt="Toggle password visibility" onClick={togglePassword} role="button" />
                              </div>
                              <button type="submit" className="submit_btn" disabled={loading}>
                                  {loading ? 'Logging in...' : 'Submit'}
                              </button>
                          </form>
                      </div>
                      <div className="truck-image">
                          <img src="/images/truck kun 1.png" alt="Truck illustration" />
                      </div>
                  </div>
              </div>
          </div>

      {/* OWASP Enforced Security Setup Modal for First-Login Rotation */}
      {showSecuritySetup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.78)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: 20,
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            maxWidth: 440,
            width: '100%',
            padding: '28px 26px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                marginBottom: 12,
                border: '2px solid #fecaca'
              }}>
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3 style={{ margin: '0 0 6px', color: '#1e293b', fontSize: 19, fontWeight: 700 }}>
                Security Setup Required
              </h3>
              <span style={{
                background: '#16a34a',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                OWASP ASVS Standard
              </span>
              <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
                You signed in with a temporary password. For your account security, you must choose a new permanent password before accessing your dashboard.
              </p>
            </div>

            {securityError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <i className="fas fa-exclamation-circle"></i>
                <span>{securityError}</span>
              </div>
            )}

            <form onSubmit={handleSecuritySubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  New Permanent Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min. 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13.5,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    required
                  />
                  <i
                    className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                    onClick={() => setShowNewPassword((p) => !p)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  ></i>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Confirm Permanent Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    placeholder="Repeat new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13.5,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    required
                  />
                  <i
                    className={`fas ${showConfirmNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                    onClick={() => setShowConfirmNewPassword((p) => !p)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  ></i>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleCancelSecurity}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSecurity}
                  style={{
                    flex: 1.5,
                    padding: '11px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(220,38,38,0.25)',
                  }}
                >
                  {savingSecurity ? 'Saving...' : 'Activate & Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default LoginPage;