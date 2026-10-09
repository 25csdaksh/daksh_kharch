import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { WEEKLY_SPENDING_DATA } from '../../data/mockData';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-day">{label}</p>
        <p className="tooltip-amount">
          Spent: <strong>₹{payload[0].value.toLocaleString('en-IN')}</strong>
        </p>
        <p className="tooltip-sub">Sample Day Metric</p>
      </div>
    );
  }
  return null;
};

export default function WeeklySpendingChart() {
  return (
    <div className="card chart-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <div className="chart-icon-wrap" aria-hidden="true">
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 className="chart-title">Weekly Spending Overview</h3>
            <p className="chart-subtitle">Daily expenditure for current week (Mon – Sun)</p>
          </div>
        </div>
        <span className="badge badge-demo">Demo Chart</span>
      </div>

      <div className="chart-container-bar">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={WEEKLY_SPENDING_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7EBE5" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#727B73', fontSize: 12, fontWeight: 500 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#727B73', fontSize: 12 }}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(36, 92, 69, 0.05)', radius: 6 }} />
            <Bar
              dataKey="amount"
              fill="#245C45"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
