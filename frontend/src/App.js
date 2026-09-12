import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

// Route-based code splitting for maximum initial load performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const StaffDashboardPage = lazy(() => import('./pages/StaffDashboardPage'));
const RequestsPage = lazy(() => import('./pages/RequestsPage'));
const DispatchPage = lazy(() => import('./pages/DispatchPage'));
const DeliveryPage = lazy(() => import('./pages/DeliveryPage'));
const DriversPage = lazy(() => import('./pages/DriversPage'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const FuelInventoryPage = lazy(() => import('./pages/FuelInventoryPage'));
const PartsInventoryPage = lazy(() => import('./pages/PartsInventoryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      flexDirection: 'column',
      gap: '14px',
      color: '#8b949e',
      fontFamily: 'inherit'
    }}>
      <div style={{
        width: '38px',
        height: '38px',
        border: '3px solid rgba(235, 100, 37, 0.2)',
        borderTop: '3px solid #eb6425',
        borderRadius: '50%',
        animation: 'hjy-spin 0.7s linear infinite'
      }} />
      <style>{`
        @keyframes hjy-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function App() {
  useEffect(() => {
    if (localStorage.getItem('pref_theme') === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/overview" element={<ProtectedRoute allowedRoles={['admin']}><OverviewPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['staff', 'admin']}><StaffDashboardPage /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><RequestsPage /></ProtectedRoute>} />
            <Route path="/dispatch" element={<ProtectedRoute><DispatchPage /></ProtectedRoute>} />
            <Route path="/delivery" element={<ProtectedRoute><DeliveryPage /></ProtectedRoute>} />
            <Route path="/drivers" element={<ProtectedRoute><DriversPage /></ProtectedRoute>} />
            <Route path="/vehicles" element={<ProtectedRoute><VehiclesPage /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
            <Route path="/fuel-inventory" element={<ProtectedRoute><FuelInventoryPage /></ProtectedRoute>} />
            <Route path="/parts-inventory" element={<ProtectedRoute><PartsInventoryPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;