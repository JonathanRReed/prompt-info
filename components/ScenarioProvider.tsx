'use client';

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import type { SessionRunMode } from '../lib/sessionMath';
import type { WorkloadCadence } from '../lib/workloadMath';

export type PromptScenario = {
  prompt: string;
  model: string;
  tokenizer: string;
  inputTokensPerRun: number;
  outputTokensPerRun: number;
  turns: number;
  sessionMode: SessionRunMode;
  inputPerMillion: number | null;
  outputPerMillion: number | null;
  costPerRun: number | null;
  workloadRuns: number;
  workloadCadence: WorkloadCadence;
};

type ScenarioContextValue = {
  scenario: PromptScenario | null;
  setScenario: (scenario: PromptScenario | null) => void;
};

const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<PromptScenario | null>(null);
  const value = useMemo(() => ({ scenario, setScenario }), [scenario]);

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>;
}

export function usePromptScenario() {
  const context = useContext(ScenarioContext);
  if (!context) throw new Error('usePromptScenario must be used inside ScenarioProvider');
  return context;
}
