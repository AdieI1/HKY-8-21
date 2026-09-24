import React, { useState, useMemo } from 'react';

function renderStars(rating = 0) {
  const stars = [];
  const rounded = Math.round(Number(rating) || 0);
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <i
        key={i}
        className={i <= rounded ? 'fas fa-star' : 'far fa-star'}
        style={{ color: i <= rounded ? '#f59e0b' : '#cbd5e1', marginRight: 2 }}
      />
    );
  }
  return stars;
}

function formatTimeAgo(dateString) {
  if (!dateString) return '—';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function CustomerRatingsModal({ isOpen, onClose, reviews = [] }) {
  // Navigation mode: 'overview' (Screen 1) | 'feedback' (Screen 2)
  const [viewMode, setViewMode] = useState('overview');

  // Screen 1 controls
  const [timeframe, setTimeframe] = useState('all'); // 'year' | 'month' | '7days' | 'all'
  const [sortOrder, setSortOrder] = useState('recent'); // 'recent' | 'highest' | 'lowest'

  // Screen 2 controls
  const [activeStarFilter, setActiveStarFilter] = useState('all'); // 'all' | 5 | 4 | 3 | 2 | 1 | 'media'
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Map STRICTLY from database review records
  const dbReviews = useMemo(() => {
    return (reviews || []).map((r, i) => {
      const cust = r.customer || r.delivery?.request?.customer;
      const custName = cust?.full_name || 'Customer';
      const custCode = `CMR${String(cust?.user_id || r.customer_id || i + 1).padStart(3, '0')}`;
      const avatar = cust?.profile_photo_url || '/images/person-check-fill.png';
      const overallRating = Number(r.overall_rating || 0);
      const driverRating = Number(r.driver_rating || 0);
      const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US') : '—';
      const timeAgo = r.created_at ? formatTimeAgo(r.created_at) : '—';
      const category = r.delivery?.request?.cargo_type || r.delivery?.request?.item_name || 'Delivery';
      const photos = r.photo_url ? [r.photo_url] : [];

      const totalCustReviews = (reviews || []).filter(
        (x) =>
          (x.customer_id && x.customer_id === r.customer_id) ||
          (x.customer?.user_id && cust?.user_id && x.customer.user_id === cust.user_id)
      ).length;

      return {
        id: r.review_id || i + 1,
        customer_name: custName,
        customer_code: custCode,
        avatar,
        overall_rating: overallRating,
        driver_rating: driverRating,
        date: dateStr,
        created_at: r.created_at,
        time_ago: timeAgo,
        category,
        total_reviews_count: totalCustReviews || 1,
        comments: r.comments || '(No written comment)',
        photos,
        has_media: photos.length > 0,
      };
    });
  }, [reviews]);

  // Aggregate stats strictly from database reviews
  const stats = useMemo(() => {
    const total = dbReviews.length;
    if (total === 0) {
      return {
        total: 0,
        avgOverall: '0.0',
        avgService: '0.0',
        avgDriver: '0.0',
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const sumOverall = dbReviews.reduce((sum, r) => sum + r.overall_rating, 0);
    const sumDriver = dbReviews.reduce((sum, r) => sum + r.driver_rating, 0);
    const avgOverall = (sumOverall / total).toFixed(1);
    const avgService = avgOverall;
    const avgDriver = (sumDriver / total).toFixed(1);

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    dbReviews.forEach((r) => {
      const rounded = Math.max(1, Math.min(5, Math.round(r.overall_rating)));
      if (distribution[rounded] !== undefined) {
        distribution[rounded]++;
      }
    });

    return { total, avgOverall, avgService, avgDriver, distribution };
  }, [dbReviews]);

  // Timeframe filtered reviews for Screen 1
  const timeframeReviews = useMemo(() => {
    if (timeframe === 'all') return dbReviews;

    const now = new Date();
    return dbReviews.filter((r) => {
      if (!r.created_at) return true;
      const d = new Date(r.created_at);
      if (isNaN(d.getTime())) return true;

      if (timeframe === 'year') {
        return d.getFullYear() === now.getFullYear();
      }
      if (timeframe === 'month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (timeframe === '7days') {
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      return true;
    });
  }, [dbReviews, timeframe]);

  // Sorted reviews for Screen 1 table
  const sortedTableReviews = useMemo(() => {
    let list = [...timeframeReviews];
    if (sortOrder === 'highest') {
      list.sort((a, b) => b.overall_rating - a.overall_rating);
    } else if (sortOrder === 'lowest') {
      list.sort((a, b) => a.overall_rating - b.overall_rating);
    } else {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    return list;
  }, [timeframeReviews, sortOrder]);

  // Filtered reviews for Screen 2 (Feedback view)
  const filteredFeedbackList = useMemo(() => {
    let list = [...dbReviews];
    if (activeStarFilter === 'media') {
      list = list.filter((r) => r.has_media);
    } else if (typeof activeStarFilter === 'number') {
      list = list.filter((r) => Math.round(r.overall_rating) === activeStarFilter);
    }
    return list;
  }, [dbReviews, activeStarFilter]);

  if (!isOpen) return null;

  const handleExportCsv = () => {
    const rows = [
      ['Customer Name', 'Customer ID', 'Overall Rating', 'Driver Rating', 'Date', 'Comments'],
      ...dbReviews.map((r) => [
        r.customer_name,
        r.customer_code,
        r.overall_rating,
        r.driver_rating,
        r.date,
        r.comments,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-ratings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ratings-modal-overlay" onClick={onClose}>
      <div
        className="ratings-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* =========================================================
            SCREEN 1: CUSTOMER RATINGS OVERVIEW (DATABASE ONLY)
            ========================================================= */}
        {viewMode === 'overview' && (
          <div className="ratings-overview-view">
            {/* Header */}
            <div className="ratings-view-header">
              <button
                type="button"
                className="ratings-back-btn"
                onClick={onClose}
                title="Back to Analytics"
                aria-label="Back"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <div className="ratings-header-title-wrap">
                <h2 className="ratings-main-title">
                  Customer Ratings{' '}
                  <span className="ratings-star-gold">
                    ★ {stats.total > 0 ? stats.avgOverall : 'No ratings yet'}
                  </span>
                </h2>
                <span className="ratings-sub-counter">({stats.total} overall reviews in database)</span>
              </div>
            </div>

            {/* Top Grid: Breakdown Scores + Recent Feedback */}
            <div className="ratings-top-grid">
              {/* Left Card: Overall Service & Driver Reviews */}
              <div className="ratings-card rating-score-card">
                <div className="score-columns-wrap">
                  {/* Overall Service */}
                  <div className="score-col">
                    <div className="score-col-header blue">
                      <i className="fas fa-chart-simple"></i> Overall Service
                    </div>
                    <div className="score-circle-badge blue">{stats.avgService}</div>
                    <div className="score-bars-list">
                      {[5, 4, 3, 2, 1].map((s) => {
                        const pct = stats.total > 0 ? (stats.distribution[s] / stats.total) * 100 : 0;
                        return (
                          <div key={s} className="score-bar-row">
                            <span className="star-num">★ {s}</span>
                            <div className="score-bar-track">
                              <div className="score-bar-fill blue" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="score-bar-count">
                              {stats.distribution[s]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Driver Reviews */}
                  <div className="score-col">
                    <div className="score-col-header green">
                      <i className="fas fa-user-shield"></i> Driver Reviews
                    </div>
                    <div className="score-circle-badge green">{stats.avgDriver}</div>
                    <div className="score-bars-list">
                      {[5, 4, 3, 2, 1].map((s) => {
                        const countForDriver = dbReviews.filter((r) => Math.round(r.driver_rating) === s).length;
                        const pct = stats.total > 0 ? (countForDriver / stats.total) * 100 : 0;
                        return (
                          <div key={s} className="score-bar-row">
                            <span className="star-num">★ {s}</span>
                            <div className="score-bar-track">
                              <div className="score-bar-fill green" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="score-bar-count">
                              {countForDriver}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Timeframe selector pill tabs */}
                <div className="ratings-timeframe-bar">
                  <button
                    type="button"
                    className={`timeframe-pill ${timeframe === 'all' ? 'active' : ''}`}
                    onClick={() => setTimeframe('all')}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    className={`timeframe-pill ${timeframe === 'year' ? 'active' : ''}`}
                    onClick={() => setTimeframe('year')}
                  >
                    This year
                  </button>
                  <button
                    type="button"
                    className={`timeframe-pill ${timeframe === 'month' ? 'active' : ''}`}
                    onClick={() => setTimeframe('month')}
                  >
                    This month
                  </button>
                  <button
                    type="button"
                    className={`timeframe-pill ${timeframe === '7days' ? 'active' : ''}`}
                    onClick={() => setTimeframe('7days')}
                  >
                    Last 7 days
                  </button>
                </div>
              </div>

              {/* Right Card: Recent Feedback mini-feed */}
              <div className="ratings-card recent-feedback-card">
                <div className="feedback-card-header">
                  <div className="feedback-card-title">
                    <i className="far fa-comment-dots" style={{ color: '#ef4444' }}></i> Recent Feedback
                  </div>
                  {dbReviews.length > 0 && (
                    <button
                      type="button"
                      className="btn-see-all-link"
                      onClick={() => setViewMode('feedback')}
                    >
                      See all ({dbReviews.length})
                    </button>
                  )}
                </div>
                <div className="feedback-today-label">Database Submissions</div>

                <div className="recent-feedback-feed">
                  {timeframeReviews.slice(0, 5).map((r) => (
                    <div key={r.id} className="feed-item" onClick={() => setViewMode('feedback')}>
                      <img src={r.avatar} alt={r.customer_name} className="feed-avatar" />
                      <div className="feed-content">
                        <div className="feed-top-row">
                          <span className="feed-name">{r.customer_name}</span>
                          <span className="feed-time">{r.time_ago}</span>
                        </div>
                        <p className="feed-comment">{r.comments}</p>
                      </div>
                    </div>
                  ))}

                  {timeframeReviews.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8', fontSize: 12 }}>
                      No reviews found in database for this timeframe.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Card: Customer Reviews Table */}
            <div className="ratings-card reviews-table-card">
              <div className="reviews-table-header">
                <div className="table-title-wrap">
                  <h3 className="table-title">
                    <i className="fas fa-users" style={{ color: '#ef4444', marginRight: 6 }}></i> Customer Reviews
                  </h3>
                  <span className="table-subtitle">showing {sortedTableReviews.length} of {stats.total}</span>
                </div>

                <div className="table-actions-wrap">
                  <div className="table-sort-select-wrap">
                    <span>Sort by</span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="table-sort-select"
                    >
                      <option value="recent">Most Recent</option>
                      <option value="highest">Highest Rating</option>
                      <option value="lowest">Lowest Rating</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="table-export-btn"
                    onClick={handleExportCsv}
                    disabled={dbReviews.length === 0}
                    title="Export customer reviews to CSV"
                  >
                    <i className="fas fa-arrow-up-from-bracket"></i> Export
                  </button>
                </div>
              </div>

              <div className="reviews-table-container">
                <table className="reviews-data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Overall Rating</th>
                      <th>Driver Rating</th>
                      <th>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTableReviews.map((rev) => (
                      <tr key={rev.id}>
                        <td>
                          <div className="cust-cell">
                            <img src={rev.avatar} alt={rev.customer_name} className="cust-avatar" />
                            <div>
                              <div className="cust-name">{rev.customer_name}</div>
                              <div className="cust-code">{rev.customer_code}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="stars-row">{renderStars(rev.overall_rating)}</div>
                        </td>
                        <td>
                          <div className="stars-row">{renderStars(rev.driver_rating)}</div>
                        </td>
                        <td className="cust-comment-cell">{rev.comments}</td>
                      </tr>
                    ))}

                    {sortedTableReviews.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                          No reviews recorded in database yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            SCREEN 2: CUSTOMER FEEDBACK (STRICT DATABASE ONLY)
            ========================================================= */}
        {viewMode === 'feedback' && (
          <div className="ratings-feedback-view">
            {/* Header */}
            <div className="feedback-view-header">
              <button
                type="button"
                className="ratings-back-btn"
                onClick={() => setViewMode('overview')}
                title="Back to Ratings Overview"
                aria-label="Back"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <h2 className="feedback-page-title">Customer Feedback</h2>
            </div>

            {/* Top Metrics Summary Box */}
            <div className="feedback-summary-box">
              <div className="feedback-stat-block">
                <div className="summary-label">Total Reviews</div>
                <div className="summary-number">{stats.total}</div>
              </div>

              <div className="feedback-stat-block">
                <div className="summary-label">Average Rating</div>
                <div className="summary-rating-row">
                  <span className="summary-star-gold">★</span>
                  <span className="summary-number">{stats.total > 0 ? stats.avgOverall : '0.0'}</span>
                </div>
              </div>

              {/* Star Distribution Progress Bars strictly from database */}
              <div className="feedback-dist-block">
                {[5, 4, 3, 2, 1].map((s) => {
                  const pct = stats.total > 0 ? (stats.distribution[s] / stats.total) * 100 : 0;
                  return (
                    <div key={s} className="dist-row">
                      <span className="dist-star">★ {s}</span>
                      <div className="dist-bar-track">
                        <div
                          className="dist-bar-fill"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              s === 5 ? '#22c55e' : s === 4 ? '#84cc16' : s === 3 ? '#eab308' : s === 2 ? '#f97316' : '#ef4444',
                          }}
                        ></div>
                      </div>
                      <span className="dist-count">{stats.distribution[s]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Star Filters Bar */}
            <div className="feedback-filters-bar">
              <button
                type="button"
                className={`filter-tab-pill ${activeStarFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveStarFilter('all')}
              >
                All Reviews ({stats.total})
              </button>
              <button
                type="button"
                className={`filter-tab-pill ${activeStarFilter === 5 ? 'active' : ''}`}
                onClick={() => setActiveStarFilter(5)}
              >
                5 Star ({stats.distribution[5]})
              </button>
              <button
                type="button"
                className={`filter-tab-pill ${activeStarFilter === 4 ? 'active' : ''}`}
                onClick={() => setActiveStarFilter(4)}
              >
                4 Star ({stats.distribution[4]})
              </button>
              <button
                type="button"
                className={`filter-tab-pill ${activeStarFilter === 3 ? 'active' : ''}`}
                onClick={() => setActiveStarFilter(3)}
              >
                3 Star ({stats.distribution[3]})
              </button>
              <button
                type="button"
                className={`filter-tab-pill ${activeStarFilter === 2 ? 'active' : ''}`}
                onClick={() => setActiveStarFilter(2)}
              >
                2 Star ({stats.distribution[2]})
              </button>
              <button
                type="button"
                className={`filter-tab-pill ${activeStarFilter === 1 ? 'active' : ''}`}
                onClick={() => setActiveStarFilter(1)}
              >
                1 Star ({stats.distribution[1]})
              </button>
              <button
                type="button"
                className={`filter-tab-pill ${activeStarFilter === 'media' ? 'active' : ''}`}
                onClick={() => setActiveStarFilter('media')}
              >
                <i className="far fa-images" style={{ marginRight: 4 }}></i> With Media (
                {dbReviews.filter((r) => r.has_media).length})
              </button>
            </div>

            {/* Feed of Reviews strictly from database */}
            <div className="feedback-cards-feed">
              {filteredFeedbackList.map((rev) => (
                <article key={rev.id} className="feedback-card-item">
                  <div className="card-top-row">
                    <div className="card-customer-profile">
                      <img src={rev.avatar} alt={rev.customer_name} className="card-avatar" />
                      <div className="card-cust-info">
                        <div className="card-cust-name">{rev.customer_name}</div>
                        <div className="card-cust-meta">
                          <span>{rev.customer_code}</span>
                          <span className="meta-sep">•</span>
                          <span>Total reviews: {rev.total_reviews_count}</span>
                        </div>
                      </div>
                    </div>

                    <div className="card-rating-date">
                      <div className="stars-row">{renderStars(rev.overall_rating)}</div>
                      <div className="card-category-date">
                        {rev.date} | {rev.category}
                      </div>
                    </div>
                  </div>

                  <p className="card-comment-text">{rev.comments}</p>

                  {rev.photos && rev.photos.length > 0 && (
                    <div className="card-photos-grid">
                      {rev.photos.map((src, idx) => (
                        <img
                          key={idx}
                          src={src}
                          alt="Feedback attachment"
                          className="feedback-photo-thumb"
                          onClick={() => setPreviewPhoto(src)}
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}

              {filteredFeedbackList.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  {dbReviews.length === 0
                    ? 'No reviews have been recorded in the database yet.'
                    : 'No reviews match this star filter.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Photo preview modal lightbox */}
        {previewPhoto && (
          <div className="photo-lightbox-overlay" onClick={() => setPreviewPhoto(null)}>
            <div className="photo-lightbox-card" onClick={(e) => e.stopPropagation()}>
              <img src={previewPhoto} alt="Review full size" className="lightbox-img" />
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setPreviewPhoto(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerRatingsModal;
