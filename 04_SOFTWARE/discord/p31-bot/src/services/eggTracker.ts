import fs from 'fs';
import path from 'path';

export type EggId = 'bashium' | 'willium' | 'missing_node' | 'tetrahedron';
export const ALL_EGGS: EggId[] = ['bashium', 'willium', 'missing_node', 'tetrahedron'];
export const FOUNDING_SLOTS = 4;

const PROGRESS_FILE = path.join(process.cwd(), 'egg-progress.json');
const FOUNDING_FILE = path.join(process.cwd(), 'founding-nodes.json');

// Initialize files if they don't exist
if (!fs.existsSync(PROGRESS_FILE)) fs.writeFileSync(PROGRESS_FILE, JSON.stringify({}));
if (!fs.existsSync(FOUNDING_FILE)) fs.writeFileSync(FOUNDING_FILE, JSON.stringify([]));

export const eggTracker = {
  // Returns true if this is a NEW discovery, false if already found
  recordDiscovery(userId: string, eggId: EggId): boolean {
    try {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      if (!progress[userId]) progress[userId] = [];

      if (progress[userId].includes(eggId)) {
        return false; // Already discovered
      }

      progress[userId].push(eggId);
      // Use synchronous write to prevent race conditions from rapid concurrent messages
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
      return true;
    } catch (error) {
      console.error('[EggTracker] Error recording discovery:', error);
      return false; // Assume not new on error
    }
  },

  getUserProgress(userId: string): EggId[] {
    try {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      return progress[userId] || [];
    } catch (error) {
      console.error('[EggTracker] Error getting user progress:', error);
      return [];
    }
  },

  hasCompletedAll(userId: string): boolean {
    try {
      const userEggs = this.getUserProgress(userId);
      return ALL_EGGS.every(egg => userEggs.includes(egg));
    } catch (error) {
      console.error('[EggTracker] Error checking completion:', error);
      return false;
    }
  },

  // Returns slot number (1-4) if they claimed one, or null if slots are full/already claimed
  claimFoundingNode(userId: string): number | null {
    try {
      const nodes = JSON.parse(fs.readFileSync(FOUNDING_FILE, 'utf-8'));

      if (nodes.includes(userId)) {
        return nodes.indexOf(userId) + 1; // Already a founding node
      }

      if (nodes.length < FOUNDING_SLOTS) {
        nodes.push(userId);
        fs.writeFileSync(FOUNDING_FILE, JSON.stringify(nodes, null, 2));
        return nodes.length; // Their slot number (1, 2, 3, or 4)
      }

      return null; // Slots full
    } catch (error) {
      console.error('[EggTracker] Error claiming founding node:', error);
      return null;
    }
  },
  
  getFoundingNodes(): string[] {
    try {
      return JSON.parse(fs.readFileSync(FOUNDING_FILE, 'utf-8'));
    } catch (error) {
      console.error('[EggTracker] Error getting founding nodes:', error);
      return [];
    }
  }
};
