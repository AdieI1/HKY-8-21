import { useState } from 'react';
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

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/login', { email, password });
      const { user, token } = response.data;

      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));

      navigate('/overview');
    } catch (err) {
      if (err.response && err.response.status === 422) {
        // Laravel validation error format: { errors: { email: [...] } }
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
    </>
  );
}

export default LoginPage;