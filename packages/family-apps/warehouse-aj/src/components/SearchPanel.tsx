import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

interface SearchPanelProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchPanel({ onSearch, placeholder = 'Search items...' }: SearchPanelProps) {
  const { searchQuery, setSearchQuery } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
    setIsExpanded(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.searchWrapper}>
        <Search style={styles.searchIcon} />
        <input
          type="text"
          value={searchQuery}
          onChange={handleChange}
          onFocus={() => setIsExpanded(true)}
          placeholder={placeholder}
          style={styles.input}
        />
        {searchQuery && (
          <button onClick={handleClear} style={styles.clearButton}>
            <X style={styles.clearIcon} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div style={styles.filters}>
          <FilterButton label="All" active />
          <FilterButton label="Seating" />
          <FilterButton label="Tables" />
          <FilterButton label="Hardware" />
          <FilterButton label="Lighting" />
        </div>
      )}
    </div>
  );
}

function FilterButton({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      style={{
        ...styles.filterButton,
        ...(active ? styles.filterButtonActive : {}),
      }}
    >
      {label}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '12px 16px',
    backgroundColor: '#161920',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '10px 14px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    width: '18px',
    height: '18px',
    color: '#9ca3af',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    minWidth: 0,
  },
  clearButton: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  clearIcon: {
    width: '16px',
    height: '16px',
    color: '#9ca3af',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  filterButton: {
    padding: '6px 12px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#5DCAA5',
    color: '#0f1115',
    borderColor: '#5DCAA5',
  },
};

export default SearchPanel;
