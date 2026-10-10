import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Plus, Calendar, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEMO_METADATA } from '../../data/mockData';
import './Header.css';

export default function Header({ onToggleMobileMenu, onOpenAddExpense, title = 'Dashboard Preview' }) {
  const { user, signOut, isConfigured } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || (isConfigured ? 'User' : DEMO_METADATA.user.name);
  const displayEmail = user?.email || DEMO_METADATA.user.email;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'PT';

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

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
        <form
          className="header-search"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.headerSearchInput;
            const query = input?.value?.trim();
            if (query) {
              navigate(`/expenses?search=${encodeURIComponent(query)}`);
            } else {
              navigate('/expenses');
            }
          }}
        >
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            id="headerSearchInput"
            name="headerSearchInput"
            type="search"
            placeholder="Search expenses, tags..."
            className="search-input"
            aria-label="Search expenses"
          />
        </form>

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

        <div className="header-user-menu-wrapper">
          <div
            className="header-user-avatar"
            title={`Logged in as ${displayName}`}
            onClick={() => setShowDropdown(!showDropdown)}
            tabIndex={0}
            role="button"
            aria-haspopup="true"
            aria-expanded={showDropdown}
          >
            {initials}
          </div>

          {showDropdown && (
            <div className="header-user-dropdown card">
              <div className="dropdown-user-info">
                <p className="dropdown-user-name">{displayName}</p>
                <p className="dropdown-user-email">{displayEmail}</p>
              </div>
              <div className="dropdown-divider" />
              {user ? (
                <button className="dropdown-item dropdown-logout" onClick={handleSignOut}>
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button className="dropdown-item" onClick={() => { setShowDropdown(false); navigate('/login'); }}>
                  <UserIcon size={16} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
