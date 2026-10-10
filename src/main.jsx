import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import App from './App';
import './index.css';

// Handle native Android hardware back button & deep linking
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  CapApp.addListener('backButton', () => {
    const path = window.location.pathname;
    if (path === '/' || path === '/dashboard' || path === '/cover' || path === '/login') {
      CapApp.exitApp();
    } else {
      window.history.back();
    }
  });

  // Handle Android deep links (e.g., Supabase password recovery: com.hisabsetu.app://reset-password)
  CapApp.addListener('appUrlOpen', (data) => {
    try {
      const urlString = data?.url;
      if (!urlString) return;
      const targetPath = '/' + urlString.replace(/^[^:]+:\/\//, '').replace(/^\/+/, '');
      if (targetPath && targetPath !== '/') {
        window.location.href = targetPath;
      }
    } catch (err) {
      console.warn('Could not handle incoming deep link URL:', err);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
