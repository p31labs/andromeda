const ELEMENT_COLORS: Record<string, string> = { H: 'var(--color-surface)', O: '#FF0000', C: '#808080', N: '#0000FF', P: '#FFA500', Na: '#9370DB', Ca: '#E6E6FA', Cl: '#00FF00', S: '#FFFF00', Fe: '#A52A2A' };


  return ELEMENT_COLORS[dominant?.[0] ?? 'C'] ?? 'var(--color-surface)';

