import type { AgentPlan } from './agentPlanner';

export type TaskPreset = {
  id: string;
  name: string;
  description: string;
  mode: 'chat' | 'agent';
  plan: AgentPlan;
  lowResponses: number;
  highResponses: number;
};
const base: AgentPlan = {
  instructionTokens: 400,
  taskTokens: 1000,
  toolTokensPerStep: 500,
  visibleOutputTokens: 500,
  reasoningTokens: 1000,
  steps: 1,
  keepHistory: true,
  cacheEnabled: false,
  cacheHitPct: 80,
};
// Editable planning scenarios, not measured task averages or provider token limits.
export const TASK_PRESETS: TaskPreset[] = [
  {
    id: 'quick',
    name: 'Quick answer',
    description: 'One short answer to a small question.',
    mode: 'chat',
    lowResponses: 1,
    highResponses: 1,
    plan: {
      ...base,
      taskTokens: 500,
      visibleOutputTokens: 200,
      reasoningTokens: 300,
      reasoningLow: 50,
      reasoningHigh: 1200,
    },
  },
  {
    id: 'challenging',
    name: 'Challenging problem',
    description: 'One substantial answer with room for extended reasoning.',
    mode: 'chat',
    lowResponses: 1,
    highResponses: 1,
    plan: {
      ...base,
      taskTokens: 2500,
      visibleOutputTokens: 1500,
      reasoningTokens: 12000,
      reasoningLow: 3000,
      reasoningHigh: 48000,
    },
  },
  {
    id: 'discussion',
    name: 'Work through a document',
    description: 'Several questions and answers about supplied material.',
    mode: 'chat',
    lowResponses: 2,
    highResponses: 8,
    plan: {
      ...base,
      taskTokens: 20000,
      visibleOutputTokens: 1200,
      reasoningTokens: 4000,
      reasoningLow: 1000,
      reasoningHigh: 16000,
      steps: 4,
    },
  },
  {
    id: 'focused',
    name: 'Focused research or coding',
    description: 'An agent investigates, makes changes and checks its work.',
    mode: 'agent',
    lowResponses: 8,
    highResponses: 80,
    plan: {
      ...base,
      instructionTokens: 1500,
      taskTokens: 5000,
      toolTokensPerStep: 1500,
      visibleOutputTokens: 500,
      reasoningTokens: 3000,
      reasoningLow: 1000,
      reasoningHigh: 12000,
      steps: 20,
      compactEvery: 20,
      summaryTokens: 2000,
      cacheEnabled: true,
      replayReasoning: true,
    },
  },
  {
    id: 'extended',
    name: 'Extended autonomous project',
    description:
      'Repeated investigation, implementation and verification across many context summaries.',
    mode: 'agent',
    lowResponses: 200,
    highResponses: 5000,
    plan: {
      ...base,
      instructionTokens: 2000,
      taskTokens: 15000,
      toolTokensPerStep: 4000,
      visibleOutputTokens: 1000,
      reasoningTokens: 8000,
      reasoningLow: 2000,
      reasoningHigh: 32000,
      steps: 1000,
      compactEvery: 10,
      summaryTokens: 4000,
      cacheEnabled: true,
      replayReasoning: true,
    },
  },
  {
    id: 'team',
    name: 'Large agent-team project',
    description:
      'Four independent work streams tackling a substantial project. Each stream is priced.',
    mode: 'agent',
    lowResponses: 1000,
    highResponses: 20000,
    plan: {
      ...base,
      instructionTokens: 2000,
      taskTokens: 30000,
      toolTokensPerStep: 8000,
      visibleOutputTokens: 1500,
      reasoningTokens: 12000,
      reasoningLow: 3000,
      reasoningHigh: 48000,
      steps: 5000,
      compactEvery: 5,
      summaryTokens: 8000,
      workers: 4,
      cacheEnabled: true,
      replayReasoning: true,
    },
  },
];
