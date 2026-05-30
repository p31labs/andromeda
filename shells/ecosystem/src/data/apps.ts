export type AppStatus = 'active' | 'building' | 'shipped';
export type AppCategory = 'shells' | 'arcade' | 'family' | 'tools' | 'workers';

export interface AppEntry {
  name: string;
  description: string;
  status: AppStatus;
  domain: string | null;
  category: AppCategory;
}

export const apps: AppEntry[] = [
  // Shells
  {
    name: 'PHOS',
    description: 'Cognitive Sanctuary — personal operating environment',
    status: 'active',
    domain: 'https://phos.p31ca.org',
    category: 'shells',
  },
  {
    name: 'WILLOW',
    description: 'Kids Companion — learning and bonding platform',
    status: 'building',
    domain: 'https://willow.p31ca.org',
    category: 'shells',
  },
  {
    name: 'BONDING',
    description: 'Chemistry Game — molecular bonding playground',
    status: 'shipped',
    domain: 'https://bonding.p31ca.org',
    category: 'shells',
  },
  {
    name: 'ARCADE',
    description: 'Family Gaming OS — shared play world',
    status: 'building',
    domain: 'https://arcade.p31ca.org',
    category: 'shells',
  },
  {
    name: 'MESH',
    description: 'Network Monitor — topology visualization',
    status: 'building',
    domain: 'https://mesh.p31ca.org',
    category: 'shells',
  },
  {
    name: 'ECOSYSTEM',
    description: 'App Hub — this application',
    status: 'shipped',
    domain: 'https://ecosystem.p31ca.org',
    category: 'shells',
  },

  // Arcade Games
  {
    name: 'SmallBall',
    description: 'Physics-based arcade game',
    status: 'building',
    domain: null,
    category: 'arcade',
  },
  {
    name: 'Gridiron',
    description: 'Strategy sports simulation',
    status: 'building',
    domain: null,
    category: 'arcade',
  },
  {
    name: 'Card Table',
    description: 'Classic card games collection',
    status: 'building',
    domain: null,
    category: 'arcade',
  },
  {
    name: 'Strategy Board',
    description: 'Turn-based tactical board play',
    status: 'building',
    domain: null,
    category: 'arcade',
  },
  {
    name: 'Liquid Sculptor',
    description: 'Fluid dynamics art sandbox',
    status: 'building',
    domain: null,
    category: 'arcade',
  },
  {
    name: 'Resonance Rings',
    description: 'Harmonic puzzle game',
    status: 'building',
    domain: null,
    category: 'arcade',
  },
  {
    name: 'Magnetic Poetry',
    description: 'Word collage creative tool',
    status: 'building',
    domain: null,
    category: 'arcade',
  },
  {
    name: 'Orbital Drift',
    description: 'Gravity and orbit physics game',
    status: 'building',
    domain: null,
    category: 'arcade',
  },
  {
    name: 'Geodesic Builder',
    description: 'Construct geodesic structures',
    status: 'building',
    domain: null,
    category: 'arcade',
  },
  {
    name: 'Water Park Simulator',
    description: 'Fluid and wave simulation playground',
    status: 'building',
    domain: null,
    category: 'arcade',
  },

  // Family Apps
  {
    name: 'Culinary Matria',
    description: 'Recipe and meal planning hub',
    status: 'building',
    domain: null,
    category: 'family',
  },
  {
    name: 'Warehouse AJ',
    description: 'Inventory management system',
    status: 'building',
    domain: null,
    category: 'family',
  },
  {
    name: 'Maid Manager',
    description: 'Home task coordination',
    status: 'building',
    domain: null,
    category: 'family',
  },
  {
    name: 'Cheomatica',
    description: 'Chemistry calculator and reference',
    status: 'building',
    domain: null,
    category: 'family',
  },
  {
    name: 'Aura Manager',
    description: 'Mood and energy tracking',
    status: 'building',
    domain: null,
    category: 'family',
  },
  {
    name: 'Pharma Cortex',
    description: 'Medication information and reminders',
    status: 'building',
    domain: null,
    category: 'family',
  },
  {
    name: 'Fence Pro',
    description: 'Project boundary and planning tool',
    status: 'building',
    domain: null,
    category: 'family',
  },
  {
    name: 'Used Marketplace',
    description: 'Local secondhand exchange',
    status: 'building',
    domain: null,
    category: 'family',
  },

  // Tools
  {
    name: 'Chromatica',
    description: 'Creative Workstation — design and color tools',
    status: 'building',
    domain: null,
    category: 'tools',
  },
  {
    name: 'Vibe Studio',
    description: 'AI Code Editor — GitHub Copilot workspace',
    status: 'building',
    domain: null,
    category: 'tools',
  },
  {
    name: 'Lighthouse Edu',
    description: 'Learning management and course builder',
    status: 'building',
    domain: null,
    category: 'tools',
  },
  {
    name: 'Spoon Calculator',
    description: 'Energy budgeting and spoon tracker',
    status: 'building',
    domain: null,
    category: 'tools',
  },
  {
    name: 'CashPilot',
    description: 'Budget and expense tracker',
    status: 'building',
    domain: null,
    category: 'tools',
  },
  {
    name: 'Retro Vault',
    description: 'Media archive and preservation',
    status: 'building',
    domain: null,
    category: 'tools',
  },

  // Workers
  {
    name: 'BONDING Relay',
    description: 'Cloudflare KV multiplayer relay for BONDING',
    status: 'active',
    domain: 'https://bonding-relay.trimtab-signal.workers.dev',
    category: 'workers',
  },
  {
    name: 'CHUMP Edge',
    description: 'Edge compute gateway for P31 services',
    status: 'building',
    domain: null,
    category: 'workers',
  },
  {
    name: 'Love Ledger',
    description: 'L.O.V.E. token ledger — soulbound care credits',
    status: 'building',
    domain: null,
    category: 'workers',
  },
  {
    name: 'p31 Signaling',
    description: 'WebSocket signaling server for real-time features',
    status: 'building',
    domain: null,
    category: 'workers',
  },
  {
    name: 'Tetra Hub',
    description: 'Distributed state synchronization hub',
    status: 'building',
    domain: null,
    category: 'workers',
  },
  {
    name: 'Node One Bridge',
    description: 'Hardware-to-cloud bridge for Node One (Totem)',
    status: 'building',
    domain: null,
    category: 'workers',
  },
  {
    name: 'Mesh Living Core',
    description: 'Core mesh networking service',
    status: 'building',
    domain: null,
    category: 'workers',
  },
  {
    name: 'p31 MCP Server',
    description: 'Model Context Protocol server for P31 tools',
    status: 'building',
    domain: null,
    category: 'workers',
  },
];

export const categoryLabels: Record<AppCategory, string> = {
  shells: 'Shells',
  arcade: 'Arcade',
  family: 'Family',
  tools: 'Tools',
  workers: 'Workers',
};

export const categoryIcons: Record<AppCategory, string> = {
  shells: '⊕',
  arcade: '◆',
  family: '♥',
  tools: '⚙',
  workers: '⬡',
};
