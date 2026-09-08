import React from 'react';

const WIDTHS = ['75%', '60%', '85%', '50%', '90%', '70%', '65%'];

export default function TableSkeleton({
  rows = 5,
  columns = 6,
  hasAvatar = false,
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`skeleton-row-${rIdx}`} className="hjy-skeleton-row">
          {Array.from({ length: columns }).map((__, cIdx) => {
            const isAvatarCol = hasAvatar && cIdx === 0;
            const width = WIDTHS[(rIdx + cIdx) % WIDTHS.length];

            return (
              <td key={`skeleton-cell-${rIdx}-${cIdx}`} style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                {isAvatarCol ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="hjy-skeleton-avatar" />
                    <div className="hjy-skeleton-bar" style={{ width: '110px' }} />
                  </div>
                ) : (
                  <div
                    className="hjy-skeleton-bar"
                    style={{ width, maxWidth: '100%' }}
                  />
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
