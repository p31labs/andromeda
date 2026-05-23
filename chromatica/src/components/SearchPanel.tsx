/**
 * SearchPanel - Arthritis-Optimized Search
 * 96px touch targets, large fonts, voice-searchable
 */

import { useState } from 'react';
import { Search, X, Mic } from 'lucide-react';
import { useChromaticaStore } from '../stores/useChromaticaStore';

interface SearchPanelProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchPanel({ onSearch, placeholder = 'Search projects...' }: SearchPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const { preferences } = useChromaticaStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    setIsExpanded(false);
  };

  // Arthritis-optimized: minimum 24px font, 96px touch targets
  const inputHeight = preferences.fontSize === 'extra-large' ? 72 : 64; // 64-72px
  const fontSize = preferences.fontSize === 'extra-large' ? 28 : preferences.fontSize === 'large' ? 24 : 20;

  return (
    <div style={{ padding: '16px', backgroundColor: '#161920', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '12px 20px',
          border: '2px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Search style={{ width: 32, height: 32, color: '#9ca3af', flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsExpanded(true)}
          placeholder={placeholder}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: `${fontSize}px`,
            outline: 'none',
            minWidth: 0,
            height: `${inputHeight - 24}px`,
          }}
          aria-label="Search projects"
        />
        {preferences.voiceEnabled && (
          <button
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: 'rgba(93, 202, 165, 0.2)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Search by voice"
          >
            <Mic size={24} color="#5DCAA5" />
          </button>
        )}
        {query && (
          <button
            onClick={handleClear}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Clear search"
          >
            <X size={28} color="#9ca3af" />
          </button>
        )}
      </div>

      {/* Filter chips - 96px touch targets */}
      {isExpanded && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
          <FilterChip label="All" active />
          <FilterChip label="Palettes" />
          <FilterChip label="Projects" />
          <FilterChip label="Colors" />
          <FilterChip label="Recent" />
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      style={{
        padding: '16px 24px', // Arthritis-optimized: 48px+ touch target
        borderRadius: '24px',
        border: '2px solid',
        borderColor: active ? '#5DCAA5' : 'rgba(255, 255, 255, 0.2)',
        backgroundColor: active ? '#5DCAA5' : 'transparent',
        color: active ? '#0f1115' : '#9ca3af',
        fontSize: '18px',
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
        minHeight: '56px',
      }}
    >
      {label}
    </button>
  );
}

export default SearchPanel;
