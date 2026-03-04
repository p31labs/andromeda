export interface JitterbugVertex {
  id: number;
  label: string;
  domain: string;
  value: number; // 0-1 normalized
  color: string; // hex
}

export const DEFAULT_VERTICES: JitterbugVertex[] = [
  { id: 0, label: 'Energy',        domain: 'spoons',       value: 0.5, color: '#FFD700' },
  { id: 1, label: 'Tasks',         domain: 'wcds',         value: 0.5, color: '#4ECDC4' },
  { id: 2, label: 'Environment',   domain: 'sensory',      value: 0.5, color: '#45B7D1' },
  { id: 3, label: 'Creation',      domain: 'output',       value: 0.5, color: '#96CEB4' },
  { id: 4, label: 'BONDING',       domain: 'play',         value: 0.0, color: '#FF6B6B' },
  { id: 5, label: 'Communication', domain: 'buffer',       value: 0.0, color: '#C9B1FF' },
  { id: 6, label: 'Legal',         domain: 'court',        value: 0.0, color: '#F7DC6F' },
  { id: 7, label: 'Health',        domain: 'calcium',      value: 0.0, color: '#82E0AA' },
];
