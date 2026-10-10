import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { PieChart as PieIcon, Layers } from 'lucide-react';
import { formatCurrencyINR } from '../../utils/dateUtils';

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="chart-tooltip">
        <p className="tooltip-day">{data.name}</p>
        <p className="tooltip-amount">
          {formatCurrencyINR(data.value)} ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export default function CategoryBreakdownChart({ categories = [], isLoading = false, monthName = 'This Month' }) {
  const hasData = categories && categories.length > 0;

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <div className="chart-icon-wrap" aria-hidden="true">
            <PieIcon size={18} />
          </div>
          <div>
            <h3 className="chart-title">Category Breakdown</h3>
            <p className="chart-subtitle">Expense distribution for {monthName}</p>
          </div>
        </div>
        <span className="badge badge-demo">
          {hasData ? `${categories.length} Categories` : 'No Data'}
        </span>
      </div>

      {isLoading ? (
        <div className="chart-loading-state">
          <span className="loading-pulse-text">Calculating category distribution...</span>
        </div>
      ) : !hasData ? (
        <div className="chart-empty-state">
          <Layers size={32} className="empty-state-icon" />
          <p className="empty-state-title">No category expenses yet</p>
          <p className="empty-state-subtitle">Categorized breakdown will automatically appear when you add expenses.</p>
        </div>
      ) : (
        <div className="category-chart-layout">
          <div className="pie-container">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categories.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="category-legend">
            {categories.map((item) => (
              <div key={item.name} className="legend-item">
                <div className="legend-indicator-group">
                  <span
                    className="legend-color-dot"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="legend-label">{item.name}</span>
                </div>
                <div className="legend-values">
                  <span className="legend-percent">{item.percentage}%</span>
                  <span className="legend-amount">{formatCurrencyINR(item.value, false)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
