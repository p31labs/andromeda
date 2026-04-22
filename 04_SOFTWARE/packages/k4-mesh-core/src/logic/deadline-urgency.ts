// ═══════════════════════════════════════════════════════════
// @p31/k4-mesh-core: Deadline Urgency
// Pure functions for deadline calculation from CENTAUR Strategic
// ═══════════════════════════════════════════════════════════

import type { Deadline } from '../vertices/types';

/**
 * Calculate urgency score for a deadline (0-10)
 * Pure function - no side effects
 */
export function calculateDeadlineUrgency(
  deadline: { date: number; priority: string; status: string },
  now: number = Date.now()
): number {
  if (deadline.status === 'completed') return 0;
  
  const timeUntil = deadline.date - now;
  const daysUntil = timeUntil / (1000 * 60 * 60 * 24);
  
  let urgency = 0;
  
  // Time proximity factor
  if (daysUntil <= 0) urgency = 10; // Overdue
  else if (daysUntil <= 1) urgency = 9;
  else if (daysUntil <= 2) urgency = 8;
  else if (daysUntil <= 3) urgency = 7;
  else if (daysUntil <= 7) urgency = 6;
  else if (daysUntil <= 14) urgency = 5;
  else if (daysUntil <= 30) urgency = 4;
  else if (daysUntil <= 60) urgency = 3;
  else if (daysUntil <= 90) urgency = 2;
  else urgency = 1;
  
  // Priority modifier
  if (deadline.priority === 'critical') urgency += 1;
  else if (deadline.priority === 'high') urgency += 0.5;
  else if (deadline.priority === 'low') urgency -= 1;
  
  return Math.max(0, Math.min(10, Math.round(urgency * 10) / 10));
}

/**
 * Sort deadlines by urgency (highest first)
 * Pure function
 */
export function sortDeadlinesByUrgency(
  deadlines: Deadline[],
  now: number = Date.now()
): Deadline[] {
  return [...deadlines].sort((a, b) => {
    const urgencyA = calculateDeadlineUrgency(a, now);
    const urgencyB = calculateDeadlineUrgency(b, now);
    return urgencyB - urgencyA;
  });
}

/**
 * Get critical deadlines (urgency >= 8)
 * Pure function
 */
export function getCriticalDeadlines(
  deadlines: Deadline[],
  now: number = Date.now()
): Deadline[] {
  return deadlines.filter(d => 
    d.status !== 'completed' && 
    calculateDeadlineUrgency(d, now) >= 8
  );
}

/**
 * Calculate if a deadline should trigger a medication reminder
 * Pure function
 */
export function shouldTriggerMedicationReminder(
  deadline: Deadline,
  now: number = Date.now()
): boolean {
  if (deadline.status === 'completed') return false;
  
  const timeUntil = deadline.date - now;
  const hoursUntil = timeUntil / (1000 * 60 * 60);
  
  // Trigger 24 hours before court/medical deadlines
  if (deadline.track === 'legal' || deadline.track === 'medical') {
    return hoursUntil > 20 && hoursUntil < 28;
  }
  
  // Trigger 4 hours before critical deadlines
  if (deadline.priority === 'critical') {
    return hoursUntil > 2 && hoursUntil < 6;
  }
  
  return false;
}

/**
 * Generate deadline summary statistics
 * Pure function
 */
export function generateDeadlineSummary(
  deadlines: Deadline[],
  now: number = Date.now()
): {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
  critical: number;
  upcoming: number;
} {
  const total = deadlines.length;
  const pending = deadlines.filter(d => d.status === 'pending').length;
  const completed = deadlines.filter(d => d.status === 'completed').length;
  const overdue = deadlines.filter(d => d.date < now && d.status === 'pending').length;
  const critical = getCriticalDeadlines(deadlines, now).length;
  const upcoming = deadlines.filter(d => {
    const daysUntil = (d.date - now) / (1000 * 60 * 60 * 24);
    return daysUntil > 0 && daysUntil <= 14 && d.status === 'pending';
  }).length;
  
  return { total, pending, completed, overdue, critical, upcoming };
}
