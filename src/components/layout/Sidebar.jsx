import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Settings,
  LogIn,
  PlusCircle,
  Wallet,
  Sparkles
} from 'lucide-react';
import { DEMO_METADATA } from '../../data/mockData';
import './Sidebar.css';

export default function Sidebar({ onOpenAddExpense, isMobileOpen, onCloseMobile }) {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/expenses', label: 'Expenses', icon: Receipt },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/login', label: 'Login / Account', icon: LogIn }
  ];

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
            <Wallet size={24} />
          </div>
          <div className="sidebar-brand-text">
            <span className="brand-name">PaisaTrack</span>
            <span className="brand-badge">Phase 1</span>
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
        </nav>

        <div className="sidebar-footer">
          <div className="demo-pill">
            <Sparkles size={14} />
            <span>Demo Mode Active</span>
          </div>
          <div className="user-profile-preview">
            <div className="avatar-circle">{DEMO_METADATA.user.avatar}</div>
            <div className="user-info">
              <span className="user-name">{DEMO_METADATA.user.name}</span>
              <span className="user-plan">{DEMO_METADATA.user.role}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
