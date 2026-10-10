import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  Users,
  BarChart3
} from 'lucide-react';
import './MobileBottomNav.css';

export default function MobileBottomNav({ onOpenAddExpense }) {
  const location = useLocation();

  const isSplitsActive = location.pathname.startsWith('/splits');

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-bottom-nav-inner">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          aria-label="Dashboard Overview"
        >
          <div className="nav-tab-icon">
            <LayoutDashboard size={20} />
          </div>
          <span className="nav-tab-label">Dashboard</span>
        </NavLink>

        <NavLink
          to="/expenses"
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          aria-label="Expenses Ledger"
        >
          <div className="nav-tab-icon">
            <Receipt size={20} />
          </div>
          <span className="nav-tab-label">Ledger</span>
        </NavLink>

        {/* Center Quick Add Button */}
        <div className="nav-tab-center-wrap">
          <button
            type="button"
            className="nav-center-action-btn"
            onClick={onOpenAddExpense}
            aria-label="Add New Expense"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
          <span className="nav-tab-center-label">Add</span>
        </div>

        <NavLink
          to="/splits"
          className={() => `nav-tab ${isSplitsActive ? 'active' : ''}`}
          aria-label="Shared Splits"
        >
          <div className="nav-tab-icon">
            <Users size={20} />
          </div>
          <span className="nav-tab-label">Splits</span>
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          aria-label="Financial Reports"
        >
          <div className="nav-tab-icon">
            <BarChart3 size={20} />
          </div>
          <span className="nav-tab-label">Reports</span>
        </NavLink>
      </div>
    </nav>
  );
}
