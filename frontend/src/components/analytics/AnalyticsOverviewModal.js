import React, { useState, useMemo } from 'react';

const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₱ 0';
  return '₱ ' + Number(amount).toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

function AnalyticsOverviewModal({ isOpen, type, onClose, deliveries = [] }) {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth(); // 0-indexed

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [groupBy, setGroupBy] = useState('monthly'); // 'monthly' | 'quarterly' | 'weekly'

  // Available years from deliveries data or past 3 years
  const availableYears = useMemo(() => {
    const yearsSet = new Set([currentYear, currentYear - 1, currentYear - 2]);
    deliveries.forEach((d) => {
      const dateStr = d.trip_date || d.created_at;
      if (dateStr) {
        const y = new Date(dateStr).getFullYear();
        if (!isNaN(y) && y > 2000 && y < 2100) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [deliveries, currentYear]);

  // Compute breakdown data
  const tableData = useMemo(() => {
    if (!isOpen) return [];

    // Filter deliveries by selectedYear
    const yearDeliveries = deliveries.filter((d) => {
      const dateStr = d.trip_date || d.created_at;
      if (!dateStr) return false;
      const dYear = new Date(dateStr).getFullYear();
      return dYear === Number(selectedYear);
    });

    if (groupBy === 'monthly') {
      return MONTHS_FULL.map((monthName, idx) => {
        const isFuture =
          Number(selectedYear) > currentYear ||
          (Number(selectedYear) === currentYear && idx > currentMonthIdx);

        // Filter deliveries in this month
        const inMonth = yearDeliveries.filter((d) => {
          const dt = new Date(d.trip_date || d.created_at);
          return dt.getMonth() === idx;
        });

        if (isFuture && inMonth.length === 0) {
          return {
            period: monthName,
            value: 'N/A',
            rawValue: null,
            isFuture: true,
          };
        }

        if (type === 'revenue') {
          // Total revenue for this month
          const rev = inMonth
            .filter((d) => d.payment_verification === 'approved' || d.status === 'completed')
            .reduce((sum, d) => sum + Number(d.trip_cost || 0), 0);
          return {
            period: monthName,
            value: formatCurrency(rev),
            rawValue: rev,
            isFuture: false,
          };
        } else {
          // Total deliveries for this month
          const count = inMonth.length;
          return {
            period: monthName,
            value: count,
            rawValue: count,
            isFuture: false,
          };
        }
      });
    }

    if (groupBy === 'quarterly') {
      const quarters = [
        { label: 'Q1 (Jan - Mar)', months: [0, 1, 2] },
        { label: 'Q2 (Apr - Jun)', months: [3, 4, 5] },
        { label: 'Q3 (Jul - Sep)', months: [6, 7, 8] },
        { label: 'Q4 (Oct - Dec)', months: [9, 10, 11] },
      ];

      return quarters.map((q) => {
        const isFuture =
          Number(selectedYear) > currentYear ||
          (Number(selectedYear) === currentYear && q.months[0] > currentMonthIdx);

        const inQuarter = yearDeliveries.filter((d) => {
          const dt = new Date(d.trip_date || d.created_at);
          return q.months.includes(dt.getMonth());
        });

        if (isFuture && inQuarter.length === 0) {
          return {
            period: q.label,
            value: 'N/A',
            rawValue: null,
            isFuture: true,
          };
        }

        if (type === 'revenue') {
          const rev = inQuarter
            .filter((d) => d.payment_verification === 'approved' || d.status === 'completed')
            .reduce((sum, d) => sum + Number(d.trip_cost || 0), 0);
          return {
            period: q.label,
            value: formatCurrency(rev),
            rawValue: rev,
            isFuture: false,
          };
        } else {
          const count = inQuarter.length;
          return {
            period: q.label,
            value: count,
            rawValue: count,
            isFuture: false,
          };
        }
      });
    }

    if (groupBy === 'weekly') {
      // 4 standard weeks representation
      const weeks = [
        { label: 'Week 1 (Day 1 - 7)', range: [1, 7] },
        { label: 'Week 2 (Day 8 - 14)', range: [8, 14] },
        { label: 'Week 3 (Day 15 - 21)', range: [15, 21] },
        { label: 'Week 4 (Day 22 - End)', range: [22, 31] },
      ];

      const targetMonth = Number(selectedYear) === currentYear ? currentMonthIdx : 0;
      const targetMonthDeliveries = yearDeliveries.filter((d) => {
        const dt = new Date(d.trip_date || d.created_at);
        return dt.getMonth() === targetMonth;
      });

      return weeks.map((w) => {
        const inWeek = targetMonthDeliveries.filter((d) => {
          const dt = new Date(d.trip_date || d.created_at);
          const day = dt.getDate();
          return day >= w.range[0] && day <= w.range[1];
        });

        if (type === 'revenue') {
          const rev = inWeek
            .filter((d) => d.payment_verification === 'approved' || d.status === 'completed')
            .reduce((sum, d) => sum + Number(d.trip_cost || 0), 0);
          return {
            period: `${MONTHS_FULL[targetMonth]} - ${w.label}`,
            value: formatCurrency(rev),
            rawValue: rev,
            isFuture: false,
          };
        } else {
          return {
            period: `${MONTHS_FULL[targetMonth]} - ${w.label}`,
            value: inWeek.length,
            rawValue: inWeek.length,
            isFuture: false,
          };
        }
      });
    }

    return [];
  }, [isOpen, deliveries, selectedYear, groupBy, type, currentYear, currentMonthIdx]);

  if (!isOpen) return null;

  const isRevenue = type === 'revenue';
  const title = isRevenue ? 'Revenue Overview' : 'Deliveries Overview';
  const valueColumnLabel = isRevenue ? 'Total Revenue' : 'Total Deliveries';

  const handleExport = () => {
    const csvRows = [
      [groupBy === 'monthly' ? 'Month' : 'Period', valueColumnLabel],
      ...tableData.map((row) => [row.period, row.value]),
    ];

    const csvContent = csvRows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-overview-${selectedYear}-${groupBy}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overview-modal-overlay" onClick={onClose}>
      <div
        className="overview-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header with Back Arrow and Centered Logo */}
        <div className="overview-modal-header">
          <button
            type="button"
            className="overview-back-btn"
            onClick={onClose}
            title="Go back"
            aria-label="Back"
          >
            <i className="fas fa-arrow-left"></i>
          </button>

          <div className="overview-logo-title-wrap">
            <img
              src="/images/HJY LOGO 2 1.png"
              alt="HJY Logo"
              className="overview-hjy-logo"
            />
            <h2 className="overview-modal-title">{title}</h2>
          </div>
        </div>

        {/* Filter Controls: Year, Group by, Export */}
        <div className="overview-controls-bar">
          <div className="overview-control-pill">
            <i className="far fa-calendar-alt"></i>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="overview-select"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="overview-control-pill">
            <i className="far fa-calendar-check"></i>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="overview-select"
            >
              <option value="monthly">Group by: Monthly</option>
              <option value="quarterly">Group by: Quarterly</option>
              <option value="weekly">Group by: Weekly</option>
            </select>
          </div>

          <button
            type="button"
            className="overview-export-pill-btn"
            onClick={handleExport}
            title="Export overview table as CSV"
          >
            <i className="fas fa-arrow-up-from-bracket"></i>
            <span>Export</span>
          </button>
        </div>

        {/* Data Breakdown Table */}
        <div className="overview-table-container">
          <table className="overview-table">
            <thead>
              <tr>
                <th>{groupBy === 'monthly' ? 'Month' : 'Period'}</th>
                <th style={{ textAlign: 'right' }}>{valueColumnLabel}</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={idx} className={row.isFuture ? 'row-future' : ''}>
                  <td className="overview-td-period">{row.period}</td>
                  <td
                    className="overview-td-val"
                    style={{
                      textAlign: 'right',
                      color: row.isFuture ? '#94a3b8' : isRevenue ? '#0f172a' : '#1e293b',
                      fontWeight: row.isFuture ? 500 : 700,
                    }}
                  >
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsOverviewModal;
