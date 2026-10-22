import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import AddExpenseModal from '../common/AddExpenseModal';
import './AppLayout.css';

export default function AppLayout() {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/':
      case '/dashboard':
        return 'Dashboard Overview';
      case '/search':
        return 'Transaction Search & Smart Filters';
      case '/calendar':
        return 'Financial Calendar & Daily Ledger';
      case '/accounts':
        return 'Wallets & Accounts';
      case '/expenses':
        return 'Expense Ledger';
      case '/budgets':
        return 'Smart Budget Manager';
      case '/recurring':
        return 'Recurring Bills & Subscriptions';
      case '/goals':
        return 'Savings Goals & Progress Tracking';
      case '/ledger':
        return 'My Ledger — મારું ખાતું / ઉધાર ખાતું';
      case '/reports':
        return 'Financial Reports & Analytics';
      case '/settings':
        return 'System & Account Settings';
      case '/login':
        return 'Authentication & Profile';
      default:
        if (pathname.startsWith('/ledger/')) {
          return 'Account Statement — ખાતાવહી';
        }
        if (pathname.startsWith('/splits/')) {
          return 'Split Group Details';
        }
        return 'HisabSetu Dashboard';
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      <div className="app-main-wrapper">
        <Header
          title={getPageTitle(location.pathname)}
          onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        />

        <main className="app-main-content">
          <Outlet context={{ onOpenAddExpense: () => setIsAddExpenseOpen(true) }} />
        </main>
      </div>

      <MobileBottomNav
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      />
    </div>
  );
}
