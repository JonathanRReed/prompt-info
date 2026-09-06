'use client';

import { useEffect, useId, useState } from 'react';
import PromptInput from '../PromptInput';
import type { SessionRunMode } from '../../lib/sessionMath';
import type { WorkloadCadence } from '../../lib/workloadMath';

export type TokenizerChoice = { key: string; label: string; description: string };

// The committed value is a clamped number, but while the field has focus the
// raw text is authoritative. Clearing the box leaves it empty instead of
// snapping to the minimum, and a partial entry such as "-" is not treated as a
// value until the field is left or Enter is pressed.
function NumericAssumption({
  label,
  help,
  value,
  min,
  max,
  step,
  onCommit,
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (value: number) => void;
}) {
  const fieldId = useId();
  const helpId = `${fieldId}-help`;
  const [draft, setDraft] = useState(() => String(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [editing, value]);

  function commit() {
    const parsed = Number(draft);
    const next = draft.trim() === '' || !Number.isFinite(parsed)
      ? value
      : Math.min(max, Math.max(min, Math.floor(parsed)));
    setDraft(String(next));
    onCommit(next);
  }

  return (
    <div className="scenario-control-cell">
      <label htmlFor={fieldId}><span>{label}</span></label>
      <input
        id={fieldId}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={draft}
        aria-describedby={helpId}
        onFocus={() => setEditing(true)}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => {
          commit();
          setEditing(false);
        }}
        onKeyDown={event => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          commit();
        }}
      />
      <small id={helpId}>{help}</small>
    </div>
  );
}

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
  const fieldPrefix = useId();
  const tokenizerId = `${fieldPrefix}-tokenizer`;
  const sessionModeId = `${fieldPrefix}-session-mode`;
  const cadenceId = `${fieldPrefix}-cadence`;

  return (
    <div className="scenario-inputs">
      <div className="scenario-heading">
        <div>
          <p className="data-label">Inputs and usage</p>
          <h2>Enter a prompt and usage assumptions.</h2>
        </div>
        <div className="privacy-note">
          <strong>Processed locally</strong>
          <span>This app does not include prompt text in its network requests.</span>
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
        <button type="button" onClick={() => onPromptChange(samplePrompt)}>Use example prompt</button>
        <button type="button" onClick={() => onPromptChange('')}>Clear prompt</button>
      </div>

      <fieldset className="scenario-control-grid">
        <legend>Planning assumptions</legend>
        <div className="scenario-control-cell">
          <label htmlFor={tokenizerId}><span>Tokenizer</span></label>
          <select
            id={tokenizerId}
            aria-describedby={`${tokenizerId}-help`}
            value={tokenizer}
            onChange={event => onTokenizerChange(event.target.value)}
          >
            {tokenizers.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
          <small id={`${tokenizerId}-help`}>{tokenizers.find(option => option.key === tokenizer)?.description}</small>
        </div>
        <NumericAssumption
          label="Output tokens per turn"
          help="Use the maximum response size you are willing to pay for."
          value={outputTokens}
          min={64}
          max={300_000}
          step={64}
          onCommit={onOutputTokensChange}
        />
        <NumericAssumption
          label="Turns per run"
          help="One request or a multi-turn agent session."
          value={turns}
          min={1}
          max={200}
          step={1}
          onCommit={onTurnsChange}
        />
        <div className="scenario-control-cell">
          <label htmlFor={sessionModeId}><span>Session behavior</span></label>
          <select
            id={sessionModeId}
            aria-describedby={`${sessionModeId}-help`}
            value={sessionMode}
            onChange={event => onSessionModeChange(event.target.value as SessionRunMode)}
          >
            <option value="baseline">Stateless requests</option>
            <option value="scenario">Growing conversation</option>
          </select>
          <small id={`${sessionModeId}-help`}>{sessionMode === 'baseline' ? 'Stateless mode prices each turn independently.' : 'Conversation mode includes history re-sends, cache pricing, and compaction.'}</small>
        </div>
        <NumericAssumption
          label="Runs per period"
          help="Scale the complete run, not a single turn."
          value={workloadRuns}
          min={1}
          max={1_000_000}
          step={1}
          onCommit={onWorkloadRunsChange}
        />
        <div className="scenario-control-cell">
          <label htmlFor={cadenceId}><span>Workload cadence</span></label>
          <select
            id={cadenceId}
            aria-describedby={`${cadenceId}-help`}
            value={workloadCadence}
            onChange={event => onWorkloadCadenceChange(event.target.value as WorkloadCadence)}
          >
            <option value="once">One-time batch</option>
            <option value="day">Every day</option>
            <option value="week">Every week</option>
            <option value="month">Every month</option>
          </select>
          <small id={`${cadenceId}-help`}>Monthly and annual totals appear for recurring work.</small>
        </div>
      </fieldset>
    </div>
  );
}
