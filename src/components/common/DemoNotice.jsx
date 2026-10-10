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
              <strong>Secure Session:</strong> Connected to Supabase PostgreSQL with user-isolated Row Level Security ({user.email}).
            </span>
          </>
        ) : isConfigured ? (
          <>
            <Database size={16} className="demo-notice-icon" aria-hidden="true" />
            <span>
              <strong>Supabase Connected:</strong> Sign in to access your encrypted personal expense records.
            </span>
          </>
        ) : (
          <>
            <KeyRound size={16} className="demo-notice-icon" aria-hidden="true" />
            <span>
              <strong>Configuration Notice:</strong> Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in environment variables.
            </span>
          </>
        )}
      </div>
      <span className="demo-notice-tag">{user ? 'RLS Enforced' : isConfigured ? 'Ready' : 'Setup Required'}</span>
    </div>
  );
}
