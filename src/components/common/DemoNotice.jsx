import React from 'react';
import { Info, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './DemoNotice.css';

export default function DemoNotice() {
  const { user } = useAuth();

  return (
    <div className="demo-notice-bar" role="status" aria-label="Demo environment notice">
      <div className="demo-notice-content">
        {user ? (
          <>
            <ShieldCheck size={16} className="demo-notice-icon" aria-hidden="true" />
            <span>
              <strong>Phase 2 Active:</strong> Authenticated via Supabase ({user.email}). Displaying sample dashboard expenses (DB persistence in Phase 3).
            </span>
          </>
        ) : (
          <>
            <Info size={16} className="demo-notice-icon" aria-hidden="true" />
            <span>
              <strong>Phase 2 Preview:</strong> Displaying sample expense metrics. Connect Supabase in <code>.env</code> for live authentication.
            </span>
          </>
        )}
      </div>
      <span className="demo-notice-tag">{user ? 'Auth Active' : 'Sample Data'}</span>
    </div>
  );
}
