'use client';

import PromptInput from '../PromptInput';
import type { SessionRunMode } from '../../lib/sessionMath';
import type { WorkloadCadence } from '../../lib/workloadMath';

export type TokenizerChoice = { key: string; label: string; description: string };

export function ScenarioInputs({
  prompt,
  samplePrompt,
  onPromptChange,
  promptTokens,
  tokenizing,
  tokenizationError,
  billedTokenNote,
  tokenizers,
  tokenizer,
  onTokenizerChange,
  outputTokens,
  onOutputTokensChange,
  turns,
  onTurnsChange,
  sessionMode,
  onSessionModeChange,
  workloadRuns,
  onWorkloadRunsChange,
  workloadCadence,
  onWorkloadCadenceChange,
}: {
  prompt: string;
  samplePrompt: string;
  onPromptChange: (value: string) => void;
  promptTokens: number;
  tokenizing: boolean;
  tokenizationError: string | null;
  billedTokenNote: string | null;
  tokenizers: readonly TokenizerChoice[];
  tokenizer: string;
  onTokenizerChange: (value: string) => void;
  outputTokens: number;
  onOutputTokensChange: (value: number) => void;
  turns: number;
  onTurnsChange: (value: number) => void;
  sessionMode: SessionRunMode;
  onSessionModeChange: (value: SessionRunMode) => void;
  workloadRuns: number;
  onWorkloadRunsChange: (value: number) => void;
  workloadCadence: WorkloadCadence;
  onWorkloadCadenceChange: (value: WorkloadCadence) => void;
}) {
  return (
    <div className="scenario-inputs">
      <div className="scenario-heading">
        <div>
          <p className="data-label">Your workload</p>
          <h2>Price the work, not the rate card.</h2>
        </div>
        <div className="privacy-note">
          <strong>Browser only</strong>
          <span>Your prompt never leaves this device.</span>
        </div>
      </div>

      <div className="prompt-field-heading">
        <label htmlFor="prompt-input">Prompt</label>
        <output data-testid="prompt-token-count" aria-live="polite">
          {tokenizing
            ? 'Counting prompt…'
            : tokenizationError
              ? tokenizationError
              : <>{promptTokens.toLocaleString()} {promptTokens === 1 ? 'token' : 'tokens'}{billedTokenNote ? <span>{billedTokenNote}</span> : null}</>}
        </output>
      </div>
      <PromptInput id="prompt-input" value={prompt} onChange={onPromptChange} />
      <div className="prompt-actions">
        <button type="button" onClick={() => onPromptChange(samplePrompt)}>Use example workload</button>
        <button type="button" onClick={() => onPromptChange('')}>Clear prompt</button>
      </div>

      <fieldset className="scenario-control-grid">
        <legend>Planning assumptions</legend>
        <label>
          <span>Tokenizer</span>
          <select value={tokenizer} onChange={event => onTokenizerChange(event.target.value)}>
            {tokenizers.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
          <small>{tokenizers.find(option => option.key === tokenizer)?.description}</small>
        </label>
        <label>
          <span>Output tokens per turn</span>
          <input
            type="number"
            inputMode="numeric"
            min={64}
            max={300_000}
            step={64}
            value={outputTokens}
            onChange={event => onOutputTokensChange(Number(event.target.value))}
          />
          <small>Use the maximum response size you are willing to pay for.</small>
        </label>
        <label>
          <span>Turns per run</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            step={1}
            value={turns}
            onChange={event => onTurnsChange(Number(event.target.value))}
          />
          <small>One request or a multi-turn agent session.</small>
        </label>
        <label>
          <span>Session behavior</span>
          <select value={sessionMode} onChange={event => onSessionModeChange(event.target.value as SessionRunMode)}>
            <option value="baseline">Stateless requests</option>
            <option value="scenario">Growing conversation</option>
          </select>
          <small>{sessionMode === 'baseline' ? 'Stateless mode prices each turn independently.' : 'Conversation mode includes history re-sends, cache pricing, and compaction.'}</small>
        </label>
        <label>
          <span>Runs per period</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1_000_000}
            step={1}
            value={workloadRuns}
            onChange={event => onWorkloadRunsChange(Number(event.target.value))}
          />
          <small>Scale the complete run, not a single turn.</small>
        </label>
        <label>
          <span>Workload cadence</span>
          <select value={workloadCadence} onChange={event => onWorkloadCadenceChange(event.target.value as WorkloadCadence)}>
            <option value="once">One-time batch</option>
            <option value="day">Every day</option>
            <option value="week">Every week</option>
            <option value="month">Every month</option>
          </select>
          <small>Monthly and annual totals appear for recurring work.</small>
        </label>
      </fieldset>
    </div>
  );
}
