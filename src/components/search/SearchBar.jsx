import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({
  value = '',
  onChange,
  onClear,
  isLoading = false,
  placeholder = 'Search by description, merchant, tags, notes...'
}) {
  const [internalText, setInternalText] = useState(value);

  // Sync internal state with external value changes
  useEffect(() => {
    setInternalText(value);
  }, [value]);

  // Debounced input propagator (250ms debounce)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (internalText !== value) {
        onChange(internalText);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [internalText, value, onChange]);

  const handleClear = () => {
    setInternalText('');
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
  };

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <Search size={18} className="search-leading-icon" aria-hidden="true" />
        <input
          type="search"
          className="search-main-input"
          placeholder={placeholder}
          value={internalText}
          onChange={(e) => setInternalText(e.target.value)}
          aria-label="Search transactions"
        />
        <div className="search-trailing-actions">
          {isLoading && <Loader2 size={16} className="spin text-muted" />}
          {internalText && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={handleClear}
              title="Clear search"
              aria-label="Clear search text"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
