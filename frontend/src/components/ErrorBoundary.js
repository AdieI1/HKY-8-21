import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('Unhandled UI error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    try {
      const authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
      const roleName = (authUser?.role?.role_name || '').toLowerCase();
      if (roleName.includes('admin')) {
        window.location.href = '/overview';
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#f8fafc',
          color: '#1e293b',
          fontFamily: 'Segoe UI, Arial, sans-serif',
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '36px 32px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '28px',
            }}>
              <i className="fas fa-exclamation-triangle" />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px', color: '#0f172a' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: '24px' }}>
              An unexpected error occurred while loading this section. You can try refreshing the page or returning to the dashboard.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#9E1E21',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <i className="fas fa-redo-alt" /> Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <i className="fas fa-home" /> Dashboard
              </button>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details style={{ marginTop: '24px', textAlign: 'left', background: '#f1f5f9', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                <summary style={{ cursor: 'pointer', color: '#64748b', fontWeight: 600 }}>Error Details</summary>
                <pre style={{ marginTop: '8px', overflowX: 'auto', whiteSpace: 'pre-wrap', color: '#dc2626' }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
