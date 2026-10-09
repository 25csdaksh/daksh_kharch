import React from 'react';
import { Menu, Search, Bell, Plus, Calendar } from 'lucide-react';
import { DEMO_METADATA } from '../../data/mockData';
import './Header.css';

export default function Header({ onToggleMobileMenu, onOpenAddExpense, title = 'Dashboard Preview' }) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <Menu size={22} />
        </button>
        <div className="header-page-title-group">
          <h1 className="header-title">{title}</h1>
          <span className="header-date">
            <Calendar size={13} aria-hidden="true" />
            {today}
          </span>
        </div>
      </div>

      <div className="header-right">
        <div className="header-search">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search expenses, tags..."
            className="search-input"
            disabled
            title="Search will be functional in Phase 2"
          />
        </div>

        <button
          className="btn btn-primary header-add-btn"
          onClick={onOpenAddExpense}
          aria-label="Add Expense"
        >
          <Plus size={16} />
          <span className="btn-text">Add Expense</span>
        </button>

        <button
          className="header-icon-btn"
          aria-label="Notifications"
          title="Notifications preview"
        >
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        <div className="header-user-avatar" title={`Logged in as ${DEMO_METADATA.user.name}`}>
          {DEMO_METADATA.user.avatar}
        </div>
      </div>
    </header>
  );
}
