import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import StaffDashboardPage from './pages/StaffDashboardPage';
import RequestsPage from './pages/RequestsPage';
import DispatchPage from './pages/DispatchPage';
import DeliveryPage from './pages/DeliveryPage';
import DriversPage from './pages/DriversPage';
import VehiclesPage from './pages/VehiclesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CustomersPage from './pages/CustomersPage';
import FuelInventoryPage from './pages/FuelInventoryPage';
import PartsInventoryPage from './pages/PartsInventoryPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

function App() {
  useEffect(() => {
    if (localStorage.getItem('pref_theme') === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/dashboard" element={<StaffDashboardPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/dispatch" element={<DispatchPage />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/fuel-inventory" element={<FuelInventoryPage />} />
        <Route path="/parts-inventory" element={<PartsInventoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


export default App;