import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/api-client';

export default function StaffWeatherCard({ onSevereAlert }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchWeather = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/weather', {
        params: { lat: 8.4542, lng: 124.6319 } // Cagayan de Oro Depot HQ
      });
      if (res.data && res.data.success) {
        setWeather(res.data);
        setLastRefreshed(new Date());
        if (res.data.is_severe && onSevereAlert) {
          onSevereAlert(res.data);
        }
      }
    } catch (err) {
      console.warn('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [onSevereAlert]);

  useEffect(() => {
    fetchWeather();
    // Auto-refresh every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  // Format today's date
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const temp = weather ? Math.round(weather.temperature) : 27;
  const high = weather ? Math.round(weather.high) : 29;
  const low = weather ? Math.round(weather.low) : 23;
  const condition = weather?.condition || 'Partly Cloudy';
  const isSevere = !!weather?.is_severe;
  const iconType = weather?.icon || 'partly_cloudy';

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 16,
        border: isSevere ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
        boxShadow: isSevere
          ? '0 6px 16px -2px rgba(220, 38, 38, 0.12)'
          : '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Row: Date & Location Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.2px',
              lineHeight: 1.2,
            }}
          >
            {dayName}
          </h4>
          <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, display: 'block', marginTop: 2 }}>
            {dateStr}
          </span>
        </div>

        {/* Location Pill (matching user screenshot) */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            color: '#ffffff',
            borderRadius: 20,
            padding: '4px 11px',
            fontSize: 11,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: '0 2px 5px rgba(79, 70, 229, 0.25)',
          }}
          title="HKY Fleet Headquarters & Depot"
        >
          <i className="fas fa-map-marker-alt" style={{ fontSize: 10 }}></i>
          <span>Cagayan de Oro</span>
        </div>
      </div>

      {/* Center Row: Weather Illustration & Large Temperature */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
        {/* Weather Illustration SVG */}
        <div style={{ width: 105, height: 75, position: 'relative' }}>
          <WeatherIllustration type={iconType} />
        </div>

        {/* Temperature Block */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#ea580c',
              lineHeight: 1,
              letterSpacing: '-0.5px',
            }}
          >
            {loading && !weather ? '...' : `${temp}°C`}
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, marginTop: 4 }}>
            High : {high}° Low : {low}°
          </div>
        </div>
      </div>

      {/* Bottom Row: Condition text & Precipitation / Refresh */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #f1f5f9',
          paddingTop: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
          {condition}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {weather?.precipitation_probability > 0 && (
            <span
              style={{
                fontSize: 11,
                color: '#2563eb',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              title="Precipitation Probability"
            >
              <i className="fas fa-tint"></i> {weather.precipitation_probability}%
            </span>
          )}

          <button
            type="button"
            onClick={fetchWeather}
            disabled={loading}
            title={lastRefreshed ? `Refreshed at ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Refresh weather'}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: 4,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#3b82f6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
          >
            <i className={`fas fa-redo-alt ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* Severe Weather Warning Banner */}
      {isSevere && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            marginTop: 2,
          }}
        >
          <i className="fas fa-exclamation-triangle" style={{ color: '#dc2626', fontSize: 13, marginTop: 2 }}></i>
          <div style={{ flex: 1 }}>
            <span style={{ color: '#991b1b', fontSize: 11.5, fontWeight: 700, display: 'block' }}>
              Dispatch Advisory:
            </span>
            <span style={{ color: '#b91c1c', fontSize: 11, lineHeight: 1.35, display: 'block' }}>
              {weather.dispatch_advisory || 'Severe weather detected. Road hazards and reduced visibility expected. Advisable to review pending dispatches.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Custom SVG Illustration matching the cheerful sun-behind-cloud aesthetic
 */
function WeatherIllustration({ type }) {
  // Types: sunny, partly_cloudy, cloudy, drizzle, rain, heavy_rain, thunderstorm, fog
  const isRainy = type === 'rain' || type === 'heavy_rain' || type === 'drizzle';
  const isStorm = type === 'thunderstorm';

  return (
    <svg width="100%" height="100%" viewBox="0 0 110 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Sun Gradient */}
        <linearGradient id="sunGrad" x1="22" y1="12" x2="48" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>

        {/* Cloud Gradient */}
        <linearGradient id="mainCloudGrad" x1="15" y1="28" x2="75" y2="65" gradientUnits="userSpaceOnUse">
          <stop stopColor={isStorm ? "#94A3B8" : "#FFFFFF"} />
          <stop offset="1" stopColor={isStorm ? "#64748B" : "#E2E8F0"} />
        </linearGradient>

        {/* Background Cloud Gradient */}
        <linearGradient id="bgCloudGrad" x1="50" y1="15" x2="85" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1F5F9" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Soft Drop Shadow for Cloud */}
        <filter id="cloudShadow" x="10" y="24" width="75" height="46" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Floating Background Small Cloud 1 (Top Right) */}
      <path
        d="M62 25 C62 21 66 17 71 17 C74 17 77 19 78 22 C80 21 83 23 83 25 C84 25 86 26 86 28 C86 31 83 33 80 33 L62 33 C59 33 57 31 57 28 C57 26 59 25 62 25 Z"
        fill="url(#bgCloudGrad)"
        opacity="0.85"
      />

      {/* Floating Background Small Cloud 2 (Mid Right) */}
      <path
        d="M74 44 C74 41 77 38 81 38 C83.5 38 85.5 39.5 86.5 42 C88 41 90.5 42.5 90.5 44 C91.5 44 93 45 93 47 C93 49 91 51 88 51 L74 51 C72 51 70 49 70 47 C70 45 72 44 74 44 Z"
        fill="url(#bgCloudGrad)"
        opacity="0.7"
      />

      {/* Sun with Rays (peaking from behind main cloud) */}
      {!isStorm && (
        <g>
          {/* Sun Rays */}
          <line x1="33" y1="6" x2="33" y2="10" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="20" y1="11" x2="23" y2="14" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="14" y1="24" x2="18" y2="24" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="46" y1="11" x2="43" y2="14" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="52" y1="24" x2="48" y2="24" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />

          {/* Main Sun Disk */}
          <circle cx="33" cy="24" r="14" fill="url(#sunGrad)" />
        </g>
      )}

      {/* Main Fluffy Foreground Cloud */}
      <g filter="url(#cloudShadow)">
        <path
          d="M26 58 C21 58 17 54 17 49 C17 44.5 20.5 41 24.8 40.2 C25.8 33.5 31.6 28 38.5 28 C43.2 28 47.4 30.5 49.8 34.2 C52 32.5 54.8 31.5 57.8 31.5 C64.2 31.5 69.5 36.5 69.8 42.8 C73.5 43.5 76 46.5 76 50.2 C76 54.5 72.5 58 68 58 L26 58 Z"
          fill="url(#mainCloudGrad)"
        />
      </g>

      {/* Rain Droplets (if rain or drizzle) */}
      {isRainy && (
        <g>
          <line x1="28" y1="63" x2="25" y2="70" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <line x1="40" y1="63" x2="37" y2="71" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <line x1="52" y1="63" x2="49" y2="70" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <line x1="64" y1="63" x2="61" y2="71" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {/* Lightning Bolt (if thunderstorm) */}
      {isStorm && (
        <path
          d="M44 58 L39 67 L46 67 L42 77 L53 65 L46 65 L49 58 Z"
          fill="#FBBF24"
          stroke="#F59E0B"
          strokeWidth="0.8"
        />
      )}
    </svg>
  );
}
