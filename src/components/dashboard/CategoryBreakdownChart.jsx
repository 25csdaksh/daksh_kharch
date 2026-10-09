import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { CATEGORY_BREAKDOWN_DATA } from '../../data/mockData';

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="chart-tooltip">
        <p className="tooltip-day">{data.name}</p>
        <p className="tooltip-amount">
          ₹{data.value.toLocaleString('en-IN')} ({data.percentage}%)
        </p>
        <p className="tooltip-sub">Sample Category Data</p>
      </div>
    );
  }
  return null;
};

export default function CategoryBreakdownChart() {
  return (
    <div className="card chart-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <div className="chart-icon-wrap" aria-hidden="true">
            <PieIcon size={18} />
          </div>
          <div>
            <h3 className="chart-title">Category Breakdown</h3>
            <p className="chart-subtitle">Expense distribution by category</p>
          </div>
        </div>
        <span className="badge badge-demo">Demo Chart</span>
      </div>

      <div className="category-chart-layout">
        <div className="pie-container">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={CATEGORY_BREAKDOWN_DATA}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {CATEGORY_BREAKDOWN_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="category-legend">
          {CATEGORY_BREAKDOWN_DATA.map((item) => (
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
                <span className="legend-amount">₹{item.value.toLocaleString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
