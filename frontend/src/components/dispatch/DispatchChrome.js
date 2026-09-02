import Sidebar from '../Sidebar';
import NotificationBell from '../NotificationBell';

export function DispatchSidebar() {
  return <Sidebar activePage="dispatch" />;
}

export function DispatchHeader({ currentDate }) {
  return (
    <header className="header">
      <div className="page-info">
        <span className="breadcrumb">Page/Dispatch</span>
        <h1 className="page-title">DISPATCH MANAGEMENT</h1>
      </div>
      <div className="header-actions">
        <div className="date-picker">
          <span>{currentDate}</span>
          <i className="far fa-calendar-alt"></i>
        </div>
        <NotificationBell />
      </div>
    </header>
  );
}
