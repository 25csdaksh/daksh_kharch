import React from 'react';
import { ShieldCheck, Database, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './DemoNotice.css';

export default function DemoNotice() {
  const { user, isConfigured } = useAuth();

  return (
    <div className="demo-notice-bar" role="status" aria-label="Database status notice">
      <div className="demo-notice-content">
        {user ? (
          <>
            <ShieldCheck size={16} className="demo-notice-icon" aria-hidden="true" />
            <span>
              <strong>Phase 3 Live:</strong> Connected to Supabase PostgreSQL with user-isolated Row Level Security ({user.email}).
            </span>
          </>
        ) : isConfigured ? (
          <>
            <Database size={16} className="demo-notice-icon" aria-hidden="true" />
            <span>
              <strong>Phase 3 Ready:</strong> Supabase client connected. Sign in to view and persist live personal expense records.
            </span>
          </>
        ) : (
          <>
            <KeyRound size={16} className="demo-notice-icon" aria-hidden="true" />
            <span>
              <strong>Phase 3 Preview:</strong> Configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> for live persistence.
            </span>
          </>
        )}
      </div>
      <span className="demo-notice-tag">{user ? 'Live PostgreSQL' : isConfigured ? 'RLS Active' : 'Setup Required'}</span>
    </div>
  );
}
