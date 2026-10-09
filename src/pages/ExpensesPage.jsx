import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Receipt,
  PlusCircle,
  Filter,
  Download,
  Search,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { RECENT_EXPENSES } from '../data/mockData';
import RecentExpenses from '../components/dashboard/RecentExpenses';
import './PlaceholderPage.css';

export default function ExpensesPage() {
  const { onOpenAddExpense } = useOutletContext() || {};
  const [selectedFilter, setSelectedFilter] = useState('All');

  return (
    <div className="page-container">
      <div className="page-header-card card">
        <div className="page-header-info">
          <div className="page-header-icon">
            <Receipt size={24} />
          </div>
          <div>
            <h1 className="page-main-heading">Expense Ledger</h1>
            <p className="page-main-subheading">
              Browse, filter, and review your historical transactions
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={onOpenAddExpense}
            aria-label="Add Expense"
          >
            <PlusCircle size={16} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      <div className="placeholder-grid">
        <div className="placeholder-card card">
          <div className="card-section-title">
            <Filter size={18} className="feature-item-icon" />
            <span>Filter & Search (Preview)</span>
          </div>
          <p className="page-main-subheading">
            Preview filters that will be connected to the backend database in Phase 2.
          </p>

          <div className="form-field">
            <label className="form-label">Search Query</label>
            <input
              type="text"
              placeholder="Search by merchant, note..."
              className="form-text-input"
              disabled
            />
          </div>

          <div className="form-field">
            <label className="form-label">Category Filter</label>
            <select
              className="form-select"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
            >
              <option value="All">All Categories (Sample Preview)</option>
              <option value="Groceries & Food">Groceries & Food</option>
              <option value="Housing & Utilities">Housing & Utilities</option>
              <option value="Transportation">Transportation</option>
              <option value="Entertainment & Leisure">Entertainment & Leisure</option>
              <option value="Healthcare & Fitness">Healthcare & Fitness</option>
            </select>
          </div>
        </div>

        <div className="placeholder-card card">
          <div className="card-section-title">
            <Download size={18} className="feature-item-icon" />
            <span>Export & Ledger Insights</span>
          </div>
          <ul className="feature-list">
            <li className="feature-item">
              <CheckCircle size={16} className="feature-item-icon" />
              <span>Full CSV & PDF export capabilities (Roadmap)</span>
            </li>
            <li className="feature-item">
              <CheckCircle size={16} className="feature-item-icon" />
              <span>Category and tag-based grouping (Roadmap)</span>
            </li>
            <li className="feature-item">
              <CheckCircle size={16} className="feature-item-icon" />
              <span>Receipt image attachments with Supabase Storage (Phase 2)</span>
            </li>
          </ul>
        </div>
      </div>

      <RecentExpenses onOpenAddExpense={onOpenAddExpense} />
    </div>
  );
}
