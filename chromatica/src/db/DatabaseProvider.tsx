/**
 * Chromatica Database Provider
 * Pure in-memory JavaScript database - no PGlite/WASM
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Project {
  id: string;
  name: string;
  description?: string;
  context: 'work' | 'personal';
  createdAt: number;
  updatedAt: number;
  data?: Record<string, unknown>;
}

export interface PainLog {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  location: string;
  notes?: string;
  timestamp: number;
}

export interface ColorSwatch {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

interface DatabaseContextType {
  projects: Project[];
  painLogs: PainLog[];
  colorSwatches: ColorSwatch[];
  isInitialized: boolean;
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Project;
  updateProject: (id: string, data: Partial<Project>) => Project | null;
  deleteProject: (id: string) => boolean;
  getProjects: () => Project[];
  createPainLog: (data: Omit<PainLog, 'id'>) => PainLog;
  getPainLogs: () => PainLog[];
  createColorSwatch: (data: Omit<ColorSwatch, 'id' | 'createdAt'>) => ColorSwatch;
  getColorSwatches: () => ColorSwatch[];
}

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context;
};

interface DatabaseProviderProps {
  children: ReactNode;
}

// Sample initial data
const sampleProjects: Project[] = [
  {
    id: generateId(),
    name: 'Sample Work Project',
    description: 'A demo project for work context',
    context: 'work',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    data: { priority: 'high' }
  },
  {
    id: generateId(),
    name: 'Sample Personal Project',
    description: 'A demo project for personal context',
    context: 'personal',
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now() - 43200000,
    data: { priority: 'medium' }
  }
];

const samplePainLogs: PainLog[] = [
  {
    id: generateId(),
    level: 2,
    location: 'Hands',
    notes: 'Mild stiffness after typing',
    timestamp: Date.now() - 3600000
  }
];

const sampleColorSwatches: ColorSwatch[] = [
  { id: generateId(), name: 'Ocean', color: '#0077be', createdAt: Date.now() - 86400000 },
  { id: generateId(), name: 'Coral', color: '#ff7f50', createdAt: Date.now() - 43200000 },
  { id: generateId(), name: 'Sage', color: '#9dc183', createdAt: Date.now() - 3600000 }
];

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(sampleProjects);
  const [painLogs, setPainLogs] = useState<PainLog[]>(samplePainLogs);
  const [colorSwatches, setColorSwatches] = useState<ColorSwatch[]>(sampleColorSwatches);
  const [isInitialized] = useState(true);

  const createProject = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project => {
    const now = Date.now();
    const newProject: Project = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  const updateProject = (id: string, data: Partial<Project>): Project | null => {
    let updated: Project | null = null;
    setProjects(prev =>
      prev.map(p => {
        if (p.id === id) {
          updated = { ...p, ...data, updatedAt: Date.now() };
          return updated;
        }
        return p;
      })
    );
    return updated;
  };

  const deleteProject = (id: string): boolean => {
    const exists = projects.some(p => p.id === id);
    if (!exists) return false;
    setProjects(prev => prev.filter(p => p.id !== id));
    return true;
  };

  const getProjects = (): Project[] => [...projects];

  const createPainLog = (data: Omit<PainLog, 'id'>): PainLog => {
    const newLog: PainLog = {
      ...data,
      id: generateId()
    };
    setPainLogs(prev => [...prev, newLog]);
    return newLog;
  };

  const getPainLogs = (): PainLog[] => [...painLogs];

  const createColorSwatch = (data: Omit<ColorSwatch, 'id' | 'createdAt'>): ColorSwatch => {
    const newSwatch: ColorSwatch = {
      ...data,
      id: generateId(),
      createdAt: Date.now()
    };
    setColorSwatches(prev => [...prev, newSwatch]);
    return newSwatch;
  };

  const getColorSwatches = (): ColorSwatch[] => [...colorSwatches];

  const value: DatabaseContextType = {
    projects,
    painLogs,
    colorSwatches,
    isInitialized,
    createProject,
    updateProject,
    deleteProject,
    getProjects,
    createPainLog,
    getPainLogs,
    createColorSwatch,
    getColorSwatches
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export default DatabaseProvider;
