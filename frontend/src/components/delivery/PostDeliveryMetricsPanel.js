import React from 'react';

/**
 * Formats duration between two timestamps into a readable string (e.g. "2h 45m" or "45 mins").
 */
export function formatTripDuration(startTime, endTime) {
  if (!startTime) return '—';
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end <= start) return '—';

  const totalMinutes = Math.floor((end - start) / 60000);
  if (totalMinutes < 1) return '< 1 min';
  if (totalMinutes < 60) return `${totalMinutes} min${totalMinutes > 1 ? 's' : ''}`;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

/**
 * Calculates fuel consumption and fuel efficiency (km/L).
 */
export function getFuelMetrics(delivery) {
  const startFuel = delivery?.starting_fuel != null ? Number(delivery.starting_fuel) : 85.0;
  let endFuel = delivery?.ending_fuel != null ? Number(delivery.ending_fuel) : null;
  if (endFuel !== null && endFuel < 0) endFuel = Math.max(0, endFuel);

  const distance = Number(delivery?.distance_travelled || delivery?.request?.distance_km || 0);

  let consumed = delivery?.fuel_consumed != null ? Number(delivery.fuel_consumed) : null;
  if (consumed === null && endFuel !== null) {
    consumed = Math.max(0, Number((startFuel - endFuel).toFixed(1)));
  } else if (consumed === null && distance > 0) {
    consumed = Number((distance * 0.22).toFixed(1)); // ~4.5 km/L estimate
    endFuel = Math.max(0, Number((startFuel - consumed).toFixed(1)));
  }

  let efficiency = null;
  if (distance > 0 && consumed > 0) {
    efficiency = (distance / consumed).toFixed(1);
  }

  return {
    startFuel: startFuel.toFixed(1),
    endFuel: endFuel != null ? endFuel.toFixed(1) : '—',
    consumed: consumed != null ? consumed.toFixed(1) : '—',
    distance: distance > 0 ? distance.toFixed(1) : '—',
    efficiency: efficiency ? `${efficiency} km/L` : '—',
    unit: delivery?.fuel_unit || 'Liters',
  };
}

function PostDeliveryMetricsPanel({ delivery, speedMetrics, onViewRouteMap }) {
  if (!delivery) return null;

  const duration = formatTripDuration(delivery.start_time || delivery.created_at, delivery.end_time || delivery.updated_at);
  const fuel = getFuelMetrics(delivery);
  const distance = fuel.distance !== '—' ? `${fuel.distance} km` : (delivery.request?.distance_km ? `${delivery.request.distance_km} km` : '—');

  const startOdo = delivery.starting_odometer != null ? `${Number(delivery.starting_odometer).toLocaleString()} km` : '—';
  const endOdo = delivery.ending_odometer != null ? `${Number(delivery.ending_odometer).toLocaleString()} km` : '—';

  const completedTime = delivery.end_time || delivery.updated_at;
  const formattedCompletedDate = completedTime
    ? new Date(completedTime).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Completed';

  return (
    <div className="post-delivery-container">
      {/* Success Completion Header */}
      <div className="post-delivery-banner">
        <div className="banner-icon">
          <i className="fas fa-check-circle"></i>
        </div>
        <div className="banner-info">
          <div className="banner-title">Delivery Completed &amp; Verified</div>
          <div className="banner-subtitle">
            Delivered on <strong>{formattedCompletedDate}</strong>
          </div>
        </div>
      </div>

      <div className="post-delivery-section-title">
        <i className="fas fa-chart-line"></i> POST-DELIVERY PERFORMANCE METRICS
      </div>

      {/* 4 High-Impact KPI Tiles */}
      <div className="post-metrics-grid">
        <div className="post-metric-card duration">
          <div className="metric-icon"><i className="far fa-clock"></i></div>
          <div className="metric-value">{duration}</div>
          <div className="metric-label">Total Trip Duration</div>
        </div>

        <div className="post-metric-card distance">
          <div className="metric-icon"><i className="fas fa-route"></i></div>
          <div className="metric-value">{distance}</div>
          <div className="metric-label">Distance Traveled</div>
        </div>

        <div className="post-metric-card fuel">
          <div className="metric-icon"><i className="fas fa-gas-pump"></i></div>
          <div className="metric-value">{fuel.consumed} {fuel.unit}</div>
          <div className="metric-label">Fuel Consumed ({fuel.efficiency})</div>
        </div>

        <div className="post-metric-card speed">
          <div className="metric-icon"><i className="fas fa-tachometer-alt"></i></div>
          <div className="metric-value">{speedMetrics?.avgSpeed || 0} km/h</div>
          <div className="metric-label">Avg Speed (Peak: {speedMetrics?.peakSpeed || 0} km/h)</div>
        </div>
      </div>

      <div className="panel-divider"></div>

      {/* Logistics & Audit Breakdown */}
      <div className="panel-timeline-title">LOGISTICS &amp; TELEMETRY AUDIT</div>
      
      <div className="panel-detail">
        <span className="panel-detail-label">Starting Odometer:</span>
        <span className="panel-detail-value">{startOdo}</span>
      </div>
      <div className="panel-detail">
        <span className="panel-detail-label">Ending Odometer:</span>
        <span className="panel-detail-value">{endOdo}</span>
      </div>
      <div className="panel-detail">
        <span className="panel-detail-label">Starting Fuel:</span>
        <span className="panel-detail-value">{fuel.startFuel} {fuel.unit}</span>
      </div>
      <div className="panel-detail">
        <span className="panel-detail-label">Ending Fuel:</span>
        <span className="panel-detail-value">{fuel.endFuel} {fuel.unit}</span>
      </div>
      <div className="panel-detail">
        <span className="panel-detail-label">Fuel Economy:</span>
        <span className="panel-detail-value" style={{ color: '#16a34a', fontWeight: 700 }}>
          {fuel.efficiency !== '—' ? fuel.efficiency : 'Standard Range'}
        </span>
      </div>

      {delivery.trip_cost && (
        <div className="panel-detail">
          <span className="panel-detail-label">Trip Cost:</span>
          <span className="panel-detail-value font-mono">
            ₱{Number(delivery.trip_cost).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {delivery.remarks && (
        <div className="panel-detail">
          <span className="panel-detail-label">Driver Remarks:</span>
          <span className="panel-detail-value">{delivery.remarks}</span>
        </div>
      )}

      <button className="btn-view-location post-delivery-btn" onClick={onViewRouteMap}>
        <i className="fas fa-map-marked-alt"></i> View Completed Route &amp; GPS Breadcrumbs
      </button>
    </div>
  );
}

export default PostDeliveryMetricsPanel;
