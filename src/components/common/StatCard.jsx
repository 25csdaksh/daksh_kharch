import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './StatCard.css';

export default function StatCard({
  title,
  amount,
  currency = '₹',
  subtitle,
  changePercentage,
  comparisonText,
  icon: Icon,
  badgeText = 'Demo'
}) {
  const isPositive = changePercentage > 0;
  const isNegative = changePercentage < 0;
  const isZero = changePercentage === 0 || changePercentage === undefined;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(amount);

  return (
    <div className="stat-card card">
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        <div className="stat-card-header-right">
          {badgeText && (
            <span className="badge badge-success stat-card-badge">
              {badgeText}
            </span>
          )}
          {Icon && (
            <div className="stat-card-icon" aria-hidden="true">
              <Icon size={18} />
            </div>
          )}
        </div>
      </div>

      <div className="stat-card-value-row">
        <div className="stat-card-amount">
          <span className="stat-card-currency">{currency}</span>
          <span className="stat-card-number">{formattedAmount}</span>
        </div>
      </div>

      <div className="stat-card-footer">
        {changePercentage !== undefined && (
          <span className={`stat-card-trend ${isPositive ? 'trend-up' : isNegative ? 'trend-down' : 'trend-neutral'}`}>
            {isPositive && <TrendingUp size={14} aria-hidden="true" />}
            {isNegative && <TrendingDown size={14} aria-hidden="true" />}
            {isZero && <Minus size={14} aria-hidden="true" />}
            <span>{Math.abs(changePercentage)}%</span>
          </span>
        )}
        {comparisonText && (
          <span className="stat-card-comparison">{comparisonText}</span>
        )}
        {subtitle && !comparisonText && (
          <span className="stat-card-subtitle">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
