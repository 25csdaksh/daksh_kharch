import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Home,
  Navigation,
  Coffee,
  HeartPulse,
  CreditCard,
  ArrowUpRight
} from 'lucide-react';
import { RECENT_EXPENSES } from '../../data/mockData';

const getCategoryIcon = (category) => {
  switch (category) {
    case 'Groceries & Food':
      return <ShoppingBag size={16} />;
    case 'Housing & Utilities':
      return <Home size={16} />;
    case 'Transportation':
      return <Navigation size={16} />;
    case 'Entertainment & Leisure':
      return <Coffee size={16} />;
    case 'Healthcare & Fitness':
      return <HeartPulse size={16} />;
    default:
      return <CreditCard size={16} />;
  }
};

export default function RecentExpenses({ onOpenAddExpense }) {
  return (
    <div className="card recent-expenses-card">
      <div className="recent-expenses-header">
        <div>
          <h3 className="card-heading">Recent Expenses</h3>
          <p className="card-subheading">Latest 5 sample transactions</p>
        </div>
        <div className="header-actions">
          <span className="badge badge-demo">Sample Data</span>
          <Link to="/expenses" className="view-all-link">
            <span>View All</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      <div className="expenses-table-wrapper">
        <table className="expenses-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Category</th>
              <th>Date & Time</th>
              <th>Payment</th>
              <th className="th-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_EXPENSES.map((expense) => (
              <tr key={expense.id} className="expense-row">
                <td className="cell-title">
                  <div className="expense-avatar-icon" aria-hidden="true">
                    {getCategoryIcon(expense.category)}
                  </div>
                  <span className="title-text">{expense.title}</span>
                </td>
                <td className="cell-category">
                  <span className="category-pill">{expense.category}</span>
                </td>
                <td className="cell-date">{expense.date}</td>
                <td className="cell-payment">
                  <span className="payment-tag">{expense.paymentMethod}</span>
                </td>
                <td className="cell-amount">
                  -₹{expense.amount.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="recent-expenses-footer">
        <p className="footer-notice">
          Showing preview records only. Real-time logging will be activated in subsequent phases.
        </p>
      </div>
    </div>
  );
}
