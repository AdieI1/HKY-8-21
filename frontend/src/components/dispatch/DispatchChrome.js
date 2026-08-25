import Sidebar from '../Sidebar';

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
        <div className="notification">
          <div className="bell-container"><div className="bell"></div></div>
        </div>
      </div>
    </header>
  );
}
