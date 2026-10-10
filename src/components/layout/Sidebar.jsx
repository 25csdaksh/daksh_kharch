import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Settings,
  LogIn,
  LogOut,
  PlusCircle,
  Wallet,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEMO_METADATA } from '../../data/mockData';
import './Sidebar.css';

export default function Sidebar({ onOpenAddExpense, isMobileOpen, onCloseMobile }) {
  const { user, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/expenses', label: 'Expenses', icon: Receipt },
    { path: '/splits', label: 'Split Bills', icon: Users },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings }
  ];

  // Derive display name & initials
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || (isConfigured ? 'User' : DEMO_METADATA.user.name);
  const displayEmail = user?.email || DEMO_METADATA.user.email;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'HS';

  return (
    <>
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${isMobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <img src="/hisabsetu-emblem.png" alt="HisabSetu Emblem" className="brand-logo-img" />
          </div>
          <div className="sidebar-brand-text">
            <span className="brand-name">HisabSetu</span>
            <span className="brand-badge">YOUR MONEY. A SMARTER YOU.</span>
          </div>
        </div>

        <div className="sidebar-action">
          <button
            className="btn btn-primary btn-add-expense"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onOpenAddExpense();
            }}
          >
            <PlusCircle size={18} />
            <span>Add Expense</span>
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main Navigation">
          <span className="nav-section-title">Menu</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'nav-item-active' : ''}`
                }
                onClick={onCloseMobile}
              >
                <Icon size={18} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            );
          })}

          {!user && (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item-active' : ''}`
              }
              onClick={onCloseMobile}
            >
              <LogIn size={18} className="nav-icon" />
              <span className="nav-label">Sign In</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-preview">
            <div className="avatar-circle">{initials}</div>
            <div className="user-info">
              <span className="user-name" title={displayName}>{displayName}</span>
              <span className="user-plan" title={displayEmail}>{displayEmail}</span>
            </div>
            {user && (
              <button
                className="btn-logout-sidebar"
                onClick={handleSignOut}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
