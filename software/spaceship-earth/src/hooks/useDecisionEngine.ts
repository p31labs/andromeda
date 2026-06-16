/**
 * @file useDecisionEngine.ts
 * @brief Quantum Magic 8 Ball decision engine hook
 *
 * Polls medical-log.json, spoon-state.json, grading-index.json,
 * and computes a weighted recommendation with jitterbug-stage mapping.
 */
import { useState, useEffect, useCallback } from 'react';

const BASE = import.meta.env.BASE_URL || '/';

export interface DecisionInput {
  spoonLevel: number;
  calcium: number;
  albumin: number;
  notes: string;
  ecosystemFidelity: number;
  depressedCount: number;
}

export interface ActionScore {
  id: string;
  name: string;
  score: number;
  base: number;
  urgency: number;
  spoonCost: number;
  parallelBenefit: number;
  timeBonus: number;
  execPenalty: number;
}

export interface DecisionResult {
  recommendation: ActionScore;
  alternatives: ActionScore[];
  stage: 'VOID' | 'SEED' | 'SPROUT' | 'SAPLING' | 'BLOOM' | 'FRUIT';
  confidence: number;
  inputs: DecisionInput;
  evaluatedAt: string;
}

function computeStage(confidence: number, topScore: number, altGap: number): DecisionResult['stage'] {
  if (confidence < 0.2) return 'VOID';
  if (topScore < 2) return 'SEED';
  if (altGap < 0.5) return 'SPROUT';
  if (altGap < 1.5) return 'SAPLING';
  if (confidence > 0.7 && altGap >= 1.5) return 'BLOOM';
  return 'FRUIT';
}

function scoreActions(inputs: DecisionInput): ActionScore[] {
  const now = new Date();
  const hour = now.getHours();
  const isPeak = (hour >= 10 && hour < 12) || (hour >= 14 && hour < 16);
  const taskInitWeight = 0.8;
  const execPenalty = taskInitWeight;
  const isCritical = inputs.calcium <= 7.8;
  const isLowSpoons = inputs.spoonLevel <= 2;

  const actions: Omit<ActionScore, 'score' | 'timeBonus'>[] = [
    { id: 'medical_call', name: 'Call Coastal Community Health', base: 10, urgency: isCritical ? 2.0 : 1.0, spoonCost: 3, parallelBenefit: 0.5, execPenalty },
    { id: 'polisher', name: 'Run Quantum Polisher', base: 5, urgency: 1.0, spoonCost: 1, parallelBenefit: 0.8, execPenalty },
    { id: 'dashboard', name: 'Review Jitterbug Dashboard', base: 2, urgency: 1.0, spoonCost: 1, parallelBenefit: 0.9, execPenalty },
    { id: 'macrophage', name: 'Review Macrophage PRs', base: 3, urgency: 1.0, spoonCost: 2, parallelBenefit: 0.6, execPenalty },
    { id: 'prep_medical', name: 'Prepare medical log for endo', base: 4, urgency: isCritical ? 1.5 : 1.0, spoonCost: 2, parallelBenefit: 0.7, execPenalty },
    { id: 'rest', name: 'Rest / recover spoons', base: 1, urgency: isLowSpoons ? 2.0 : 1.0, spoonCost: 0.5, parallelBenefit: 0.0, execPenalty },
  ];

  const scored: ActionScore[] = actions.map((act) => {
    const timeBonus = act.id === 'rest' && hour >= 15 && hour < 17 ? 0.8 : isPeak && act.id !== 'rest' ? 1.2 : 1.0;
    let effectiveCost = act.spoonCost * execPenalty;
    if (effectiveCost <= 0) effectiveCost = 0.1;
    let score = (act.base * act.urgency * timeBonus * (1 + act.parallelBenefit)) / effectiveCost;
    if (act.id === 'rest' && isLowSpoons) score *= 1.5;
    return {
      ...act,
      score: parseFloat(score.toFixed(2)),
      timeBonus,
      execPenalty,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function computeConfidence(stage: DecisionResult['stage'], inputs: DecisionInput): number {
  const isCritical = inputs.calcium <= 7.8;
  if (isCritical) return 0.95;
  if (inputs.ecosystemFidelity < 50) return 0.8;
  if (stage === 'BLOOM') return 0.85;
  if (stage === 'SAPLING') return 0.6;
  if (stage === 'SPROUT') return 0.4;
  return 0.2;
}

export function useDecisionEngine(pollIntervalMs = 30000) {
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const evaluate = useCallback(async () => {
    try {
      const [spoonRes, medicalRes, gradingRes, polisherRes] = await Promise.all([
        fetch(`${BASE}spoon-state.json`).then((r) => (r.ok ? r.json() : { level: 4 })),
        fetch(`${BASE}medical-log.json`).then((r) => (r.ok ? r.json() : { serum_calcium_mg_dL: 8.2, albumin_g_dL: 4.0, notes: '' })),
        fetch(`${BASE}grading-index.json`).then((r) => (r.ok ? r.json() : { artifacts: [] })),
        fetch(`${BASE}quantum-polisher-report.json`).then((r) => (r.ok ? r.json() : { ecosystem_fidelity: 62.4, projects: {} })),
      ]);

      const spoonLevel = spoonRes.level ?? 4;
      const calcium = medicalRes.serum_calcium_mg_dL ?? 8.2;
      const albumin = medicalRes.albumin_g_dL ?? 4.0;
      const notes = medicalRes.notes ?? '';
      const ecosystemFidelity = polisherRes.ecosystem_fidelity ?? 62.4;
      const depressedCount = polisherRes.depressed_count ?? 0;

      const inputs: DecisionInput = { spoonLevel, calcium, albumin, notes, ecosystemFidelity, depressedCount };
      const scored = scoreActions(inputs);
      const top = scored[0];
      const altGap = scored[1] ? top.score - scored[1].score : 0;
      const stage = computeStage(1, top.score, altGap);
      const confidence = computeConfidence(stage, inputs);

      setResult({
        recommendation: top,
        alternatives: scored.slice(1, 4),
        stage,
        confidence,
        inputs,
        evaluatedAt: new Date().toISOString(),
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision engine failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    evaluate();
    const id = setInterval(evaluate, pollIntervalMs);
    return () => clearInterval(id);
  }, [evaluate, pollIntervalMs]);

  return { result, loading, error, refresh: evaluate };
}
