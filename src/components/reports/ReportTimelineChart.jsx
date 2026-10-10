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
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { formatCurrencyINR } from '../../utils/dateUtils';

const CustomTimelineTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="chart-tooltip">
        <p className="tooltip-day">
          {item.fullDate ? `${item.name} (${item.fullDate})` : item.name}
        </p>
        <p className="tooltip-amount">
          Spent: <strong>{formatCurrencyINR(payload[0].value)}</strong>
        </p>
        {item.count !== undefined && (
          <p className="tooltip-sub">
            {item.count} transaction{item.count !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function ReportTimelineChart({
  data = [],
  isLoading = false,
  periodType = 'weekly',
  periodLabel = ''
}) {
  const totalSpend = data.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const hasData = data.length > 0 && totalSpend > 0;

  const getChartTitle = () => {
    switch (periodType) {
      case 'weekly':
        return 'Weekly Daily Expenditure';
      case 'monthly':
        return 'Monthly Daily Trend';
      case 'yearly':
        return '12-Month Spending Overview';
      case 'custom':
        return 'Custom Interval Spending';
      default:
        return 'Spending Timeline';
    }
  };

  return (
    <div className="card chart-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <div className="chart-icon-wrap" aria-hidden="true">
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 className="chart-title">{getChartTitle()}</h3>
            <p className="chart-subtitle">{periodLabel || 'Timeline Breakdown'}</p>
          </div>
        </div>
        <span className="badge badge-success">
          {formatCurrencyINR(totalSpend, false)} Total
        </span>
      </div>

      <div className="chart-container-bar">
        {isLoading ? (
          <div className="chart-loading-state">
            <span className="loading-pulse-text">Loading report timeline...</span>
          </div>
        ) : !hasData ? (
          <div className="chart-empty-state">
            <Calendar size={32} className="empty-state-icon" />
            <p className="empty-state-title">No transactions in this period</p>
            <p className="empty-state-subtitle">
              Expenditure bars will automatically appear when transactions are recorded within this period.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 10, right: 8, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                interval={periodType === 'monthly' ? (data.length > 20 ? 2 : 1) : 0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
              />
              <Tooltip
                content={<CustomTimelineTooltip />}
                cursor={{ fill: 'rgba(30, 58, 138, 0.06)', radius: 6 }}
              />
              <Bar
                dataKey="amount"
                fill="#1E3A8A"
                radius={[5, 5, 0, 0]}
                maxBarSize={periodType === 'monthly' ? 16 : 36}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
