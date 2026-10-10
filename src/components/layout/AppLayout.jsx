import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import DemoNotice from '../common/DemoNotice';
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
      case '/expenses':
        return 'Expense Ledger';
      case '/reports':
        return 'Financial Reports & Analytics';
      case '/settings':
        return 'System & Account Settings';
      case '/login':
        return 'Authentication & Profile';
      default:
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
        <DemoNotice />
        <Header
          title={getPageTitle(location.pathname)}
          onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        />

        <main className="app-main-content">
          <Outlet context={{ onOpenAddExpense: () => setIsAddExpenseOpen(true) }} />
        </main>
      </div>

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      />
    </div>
  );
}
