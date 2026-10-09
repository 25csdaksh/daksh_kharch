import React from 'react';
import { Layers } from 'lucide-react';
import { formatCurrencyINR } from '../../utils/dateUtils';
import { getCategoryIcon } from '../dashboard/RecentExpenses';

export default function ReportCategoryTable({ categories = [], isLoading = false, totalSpend = 0 }) {
  const hasCategories = categories && categories.length > 0;

  return (
    <div className="card category-report-table-card">
      <div className="chart-header" style={{ marginBottom: 'var(--spacing-sm)' }}>
        <div className="chart-title-group">
          <div className="chart-icon-wrap" aria-hidden="true">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="chart-title">Category Distribution Ledger</h3>
            <p className="chart-subtitle">Detailed breakdown and average ticket size</p>
          </div>
        </div>
        <span className="badge badge-demo">
          {hasCategories ? `${categories.length} Categories` : '0 Categories'}
        </span>
      </div>

      {isLoading ? (
        <div className="chart-loading-state" style={{ minHeight: '160px' }}>
          <span className="loading-pulse-text">Loading category metrics...</span>
        </div>
      ) : !hasCategories ? (
        <div className="chart-empty-state" style={{ padding: '2rem 1rem' }}>
          <p className="empty-state-title">No category data</p>
          <p className="empty-state-subtitle">No categorized spending in this reporting interval.</p>
        </div>
      ) : (
        <div className="expenses-table-wrapper">
          <table className="category-report-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Category</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'center' }}>Share</th>
                <th style={{ textAlign: 'right' }}>Tx Count</th>
                <th style={{ textAlign: 'right' }}>Avg / Tx</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.name}>
                  <td>
                    <div className="cell-cat-name">
                      <span
                        className="cat-color-dot"
                        style={{ backgroundColor: cat.color }}
                        aria-hidden="true"
                      />
                      <span>{cat.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatCurrencyINR(cat.value)}
                  </td>
                  <td className="cat-progress-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="cat-mini-bar-track">
                        <div
                          className="cat-mini-bar-fill"
                          style={{
                            width: `${Math.min(100, cat.percentage)}%`,
                            backgroundColor: cat.color
                          }}
                        />
                      </div>
                      <span style={{ fontWeight: 600, minWidth: '34px', textAlign: 'right' }}>
                        {cat.percentage}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-muted)' }}>
                    {cat.count}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-muted)' }}>
                    {formatCurrencyINR(cat.avgPerTransaction, false)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
