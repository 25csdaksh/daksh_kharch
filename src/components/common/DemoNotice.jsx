import React from 'react';
import { Info } from 'lucide-react';
import './DemoNotice.css';

export default function DemoNotice() {
  return (
    <div className="demo-notice-bar" role="status" aria-label="Demo environment notice">
      <div className="demo-notice-content">
        <Info size={16} className="demo-notice-icon" aria-hidden="true" />
        <span>
          <strong>Phase 1 UI Preview:</strong> Displaying sample demonstration data. No database or authentication active.
        </span>
      </div>
      <span className="demo-notice-tag">Sample Data</span>
    </div>
  );
}
