import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { BarChart3, Calendar } from 'lucide-react';
import { formatCurrencyINR } from '../../utils/dateUtils';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="chart-tooltip">
        <p className="tooltip-day">{label} {item.date ? `(${item.date})` : ''}</p>
        <p className="tooltip-amount">
          Spent: <strong>{formatCurrencyINR(payload[0].value)}</strong>
        </p>
      </div>
    );
  }
  return null;
};

export default function WeeklySpendingChart({ data = [], isLoading = false }) {
  const totalWeekSpend = data.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const hasData = data.length > 0 && totalWeekSpend > 0;

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
        <span className="badge badge-success">
          {formatCurrencyINR(totalWeekSpend, false)} Total
        </span>
      </div>

      <div className="chart-container-bar">
        {isLoading ? (
          <div className="chart-loading-state">
            <span className="loading-pulse-text">Loading weekly analytics...</span>
          </div>
        ) : !hasData ? (
          <div className="chart-empty-state">
            <Calendar size={32} className="empty-state-icon" />
            <p className="empty-state-title">No expenses this week</p>
            <p className="empty-state-subtitle">Your daily spending breakdown will appear here once you record expenses.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={data} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="day"
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }}
              />
              <YAxis
                width={32}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }}
                tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(5, 150, 105, 0.06)', radius: 6 }} />
              <Bar
                dataKey="amount"
                radius={[6, 6, 0, 0]}
                maxBarSize={30}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.amount > 0 ? '#059669' : '#E2E8F0'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
