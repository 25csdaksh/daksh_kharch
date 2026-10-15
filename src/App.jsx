import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicRoute from './components/auth/PublicRoute';
import AppLayout from './components/layout/AppLayout';
import AuthLoadingScreen from './components/auth/AuthLoadingScreen';

// Code-split route components for performance and optimal bundle sizes
const CoverPage = lazy(() => import('./pages/CoverPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const BudgetPage = lazy(() => import('./pages/BudgetPage'));
const RecurringPage = lazy(() => import('./pages/RecurringPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SplitsPage = lazy(() => import('./pages/SplitsPage'));
const CreateSplitPage = lazy(() => import('./pages/CreateSplitPage'));
const SplitDetailPage = lazy(() => import('./pages/SplitDetailPage'));
const SettlementsPage = lazy(() => import('./pages/SettlementsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<AuthLoadingScreen message="Loading HisabSetu..." />}>
      <Routes>
        {/* Cover / Landing Page for unauthenticated visitors */}
        <Route path="/cover" element={<CoverPage />} />

        {/* Root Route: If user is logged in, redirect to Dashboard; otherwise show HisabSetu Cover Page */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <CoverPage />} />

        {/* Public Authentication Routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected Application Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/budgets" element={<BudgetPage />} />
            <Route path="/recurring" element={<RecurringPage />} />
            <Route path="/splits" element={<SplitsPage />} />
            <Route path="/splits/new" element={<CreateSplitPage />} />
            <Route path="/splits/:id" element={<SplitDetailPage />} />
            <Route path="/splits/settlements" element={<SettlementsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Fallback Catch-all Route: If logged in, go to dashboard; else go to cover page */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
