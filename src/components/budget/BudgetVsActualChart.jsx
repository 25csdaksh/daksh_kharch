import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { BarChart2, PieChart } from 'lucide-react';
import { formatCurrencyINR } from '../../utils/dateUtils';
import './BudgetVsActualChart.css';

const CustomBudgetTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0]?.payload;
    if (!dataItem) return null;

    const budget = dataItem.budgetAmount || 0;
    const actual = dataItem.spentAmount || 0;
    const diff = budget - actual;
    const isOver = actual > budget && budget > 0;

    return (
      <div className="budget-chart-tooltip">
        <p className="tooltip-cat-title">{label}</p>
        <div className="tooltip-metric-line">
          <span className="dot dot-budget" />
          <span>Budget:</span>
          <strong>{formatCurrencyINR(budget)}</strong>
        </div>
        <div className="tooltip-metric-line">
          <span className={`dot ${isOver ? 'dot-danger' : 'dot-actual'}`} />
          <span>Actual:</span>
          <strong>{formatCurrencyINR(actual)}</strong>
        </div>
        {budget > 0 && (
          <div className="tooltip-variance-line">
            <span>Variance: </span>
            <span className={isOver ? 'text-danger' : 'text-success'}>
              {isOver
                ? `+${formatCurrencyINR(Math.abs(diff))} Over`
                : `${formatCurrencyINR(diff)} Remaining`}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function BudgetVsActualChart({
  items = [],
  monthLabel = 'This Month',
  isLoading = false
}) {
  // Filter items that have either budget or spending to make chart compact and meaningful
  const chartData = items.filter(
    (item) => item.budgetAmount > 0 || item.spentAmount > 0
  );

  const hasData = chartData.length > 0;

  return (
    <div className="card budget-chart-card">
      <div className="budget-chart-header">
        <div className="chart-header-title-group">
          <div className="chart-icon-box" aria-hidden="true">
            <BarChart2 size={18} />
          </div>
          <div>
            <h3 className="chart-title">Budget vs. Actual Spending</h3>
            <p className="chart-subtitle">{monthLabel} Category Comparison</p>
          </div>
        </div>

        <div className="chart-legend-pills">
          <div className="legend-pill">
            <span className="pill-indicator bg-budget" />
            <span>Target Budget</span>
          </div>
          <div className="legend-pill">
            <span className="pill-indicator bg-actual" />
            <span>Actual Spent</span>
          </div>
        </div>
      </div>

      <div className="budget-chart-body">
        {isLoading ? (
          <div className="chart-loading-state">
            <span className="loading-pulse-text">Loading comparison chart...</span>
          </div>
        ) : !hasData ? (
          <div className="chart-empty-state">
            <PieChart size={32} className="empty-state-icon" />
            <p className="empty-state-title">No budget or expenditure data</p>
            <p className="empty-state-subtitle">
              Add category budgets and log your daily expenses to visualize your target vs actual performance.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 12, left: -4, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={40}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                content={<CustomBudgetTooltip />}
                cursor={{ fill: 'rgba(15, 23, 42, 0.04)', radius: 6 }}
              />
              <Bar
                name="Budget"
                dataKey="budgetAmount"
                fill="#064E3B"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                name="Actual"
                dataKey="spentAmount"
                fill="#F5B000"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
