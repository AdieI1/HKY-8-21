import React from 'react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
  pageSize = 10,
}) {
  if (totalPages <= 1 && (!totalItems || totalItems <= pageSize)) {
    return null;
  }

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems > 0 ? Math.min(currentPage * pageSize, totalItems) : 0;

  return (
    <div className="hjy-pagination">
      <div className="hjy-pagination-info">
        {totalItems != null && totalItems > 0 ? (
          <span>
            Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalItems}</strong> entries
          </span>
        ) : (
          <span>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
        )}
      </div>

      <div className="hjy-pagination-controls">
        <button
          type="button"
          className="hjy-page-btn"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous Page"
        >
          <i className="fas fa-chevron-left" />
        </button>

        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="hjy-page-dots">
                ...
              </span>
            );
          }

          const isActive = currentPage === p;
          return (
            <button
              key={p}
              type="button"
              className={`hjy-page-btn ${isActive ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={isActive ? 'page' : undefined}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          className="hjy-page-btn"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Next Page"
        >
          <i className="fas fa-chevron-right" />
        </button>
      </div>
    </div>
  );
}
