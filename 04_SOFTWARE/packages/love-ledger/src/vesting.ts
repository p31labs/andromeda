/**
 * @module love-ledger/vesting
 * @description Age-gated vesting for founding nodes.
 *
 * Founding nodes (S.J. and W.J.) have sovereignty pools that vest
 * over time based on age milestones. This module computes the current
 * vested amount and next milestone for each founding node.
 *
 * The vesting schedule is conservative by design:
 *   13 → 10%   First device, first identity
 *   16 → 25%   Expanded autonomy
 *   18 → 50%   Legal majority
 *   21 → 75%   Full adult
 *   25 → 100%  Prefrontal cortex maturation
 *
 * All calculations are pure functions of the current date and the
 * founding node's date of birth.
 */

import type { FoundingNode, VestingMilestone } from "./types.js";
import { DEFAULT_VESTING_SCHEDULE, FOUNDING_NODES } from "./types.js";

export interface VestingStatus {
  readonly node: FoundingNode;
  readonly ageYears: number;
  readonly ageDays: number;
  readonly vestedPercent: number;
  readonly vestedAmount: number;
  readonly lockedAmount: number;
  readonly nextMilestone: VestingMilestone | null;
  readonly daysUntilNext: number | null;
  readonly milestones: readonly MilestoneStatus[];
}

export interface MilestoneStatus {
  readonly milestone: VestingMilestone;
  readonly reached: boolean;
  readonly reachedDate: string | null;
}

export function computeAge(
  dateOfBirth: string,
  asOf: Date = new Date()
): { years: number; days: number } {
  const [dobY, dobM, dobD] = dateOfBirth.split("-").map(Number) as [number, number, number];
  const dob = new Date(dobY, dobM - 1, dobD);
  const diffMs = asOf.getTime() - dob.getTime();
  const totalDays = Math.floor(diffMs / 86400000);

  let years = asOf.getFullYear() - dobY;
  const monthDiff = asOf.getMonth() - (dobM - 1);
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dobD)) {
    years--;
  }

  return { years: Math.max(0, years), days: Math.max(0, totalDays) };
}

export function dateAtAge(dateOfBirth: string, ageYears: number): Date {
  const [y, m, d] = dateOfBirth.split("-").map(Number) as [number, number, number];
  return new Date(y + ageYears, m - 1, d);
}

export function vestedPercent(
  ageYears: number,
  schedule: readonly VestingMilestone[] = DEFAULT_VESTING_SCHEDULE
): number {
  let percent = 0;
  for (const milestone of schedule) {
    if (ageYears >= milestone.ageYears) {
      percent = milestone.cumulativePercent;
    }
  }
  return percent;
}

export function computeVestingStatus(
  node: FoundingNode,
  sovereigntyPool: number,
  schedule: readonly VestingMilestone[] = DEFAULT_VESTING_SCHEDULE,
  asOf: Date = new Date()
): VestingStatus {
  const age = computeAge(node.dateOfBirth, asOf);
  const vested = vestedPercent(age.years, schedule);
  const vestedAmt = sovereigntyPool * vested / 100;
  const lockedAmt = sovereigntyPool - vestedAmt;

  let nextMilestone: VestingMilestone | null = null;
  for (const m of schedule) {
    if (age.years < m.ageYears) {
      nextMilestone = m;
      break;
    }
  }

  let daysUntilNext: number | null = null;
  if (nextMilestone) {
    const nextDate = dateAtAge(node.dateOfBirth, nextMilestone.ageYears);
    daysUntilNext = Math.max(0, Math.ceil((nextDate.getTime() - asOf.getTime()) / 86400000));
  }

  const milestones: MilestoneStatus[] = schedule.map(m => {
    const d = dateAtAge(node.dateOfBirth, m.ageYears).toISOString().split("T")[0];
    return {
      milestone: m,
      reached: age.years >= m.ageYears,
      reachedDate: d ?? null,
    };
  });

  return {
    node,
    ageYears: age.years,
    ageDays: age.days,
    vestedPercent: vested,
    vestedAmount: vestedAmt,
    lockedAmount: lockedAmt,
    nextMilestone,
    daysUntilNext,
    milestones,
  };
}

export function computeAllVesting(
  sovereigntyPool: number,
  schedule: readonly VestingMilestone[] = DEFAULT_VESTING_SCHEDULE,
  nodes: readonly FoundingNode[] = FOUNDING_NODES,
  asOf: Date = new Date()
): readonly VestingStatus[] {
  const perNodePool = sovereigntyPool / nodes.length;
  return nodes.map(node => computeVestingStatus(node, perNodePool, schedule, asOf));
}
