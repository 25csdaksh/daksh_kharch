import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLoadingScreen from './AuthLoadingScreen';

export default function PublicRoute() {
  const { user, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingScreen message="Checking session..." />;
  }

  // If user is already authenticated with Supabase, redirect to dashboard or intended destination
  if (isConfigured && user) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
}
