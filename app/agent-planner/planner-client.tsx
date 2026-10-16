'use client';
import { useEffect, useMemo, useState, useId, useRef } from 'react';
import ModelSelect from '../../components/ModelSelect';
import { SourceStatus } from '../../components/workbench/SourceStatus';
import { formatUsd } from '../../components/charts/chartFormat';
import { fetchPricing, type PricingCatalogResponse } from '../../lib/fetchPricing';
import { chooseDefaultModels, findRequestedModel } from '../../lib/modelSelection';
import { estimateAgentRun, type AgentPlan } from '../../lib/agentPlanner';
import { buildAgentPlanLink, readAgentPlanHash } from '../../lib/agentPlanLink';
import { REASONING_SCENARIOS, type ReasoningEffort } from '../../lib/reasoningOptions';
import { clampPrompt } from '../../lib/promptLimits';

const INITIAL: AgentPlan = { instructionTokens: 1000, taskTokens: 2000, toolTokensPerStep: 1000, visibleOutputTokens: 500, reasoningTokens: 2000, steps: 8, keepHistory: true, cacheEnabled: false, cacheHitPct: 80 };
type WorkMode = 'chat' | 'agent';
const CHAT_INITIAL: AgentPlan = { ...INITIAL, instructionTokens: 200, taskTokens: 500, toolTokensPerStep: 100, visibleOutputTokens: 500, reasoningTokens: 300, steps: 1 };
const CHAT_PRESETS = [
  { name: 'Quick question', description: 'One answer with a small thinking allowance.', plan: CHAT_INITIAL },
  { name: 'Back-and-forth', description: 'Four user-led exchanges with retained history.', plan: { ...CHAT_INITIAL, steps: 4 } },
  { name: 'Document discussion', description: 'Six exchanges about supplied documents.', plan: { ...CHAT_INITIAL, taskTokens: 8000, visibleOutputTokens: 800, reasoningTokens: 1000, steps: 6 } },
];
const PRESETS = [
  { name: 'One response', description: 'A single answer from a short prompt.', plan: { ...INITIAL, instructionTokens: 200, taskTokens: 500, toolTokensPerStep: 0, visibleOutputTokens: 500, reasoningTokens: 300, steps: 1 } },
  { name: 'Document assistant', description: 'Read documents and work through a few questions.', plan: { ...INITIAL, taskTokens: 8000, toolTokensPerStep: 1000, visibleOutputTokens: 800, reasoningTokens: 1000, steps: 4 } },
  { name: 'Autonomous agent', description: 'Several model calls with growing tool results.', plan: INITIAL },
];
function Field({ label, value, onChange, hint, max = 1000000, min = 0, displayLabel, step = 1 }: { label: string; value: number; onChange: (value: number) => void; hint: string; max?: number; min?: number; displayLabel?: string; step?: number }) {
  const id = useId();
  return <div className="agent-field"><label htmlFor={id}>{displayLabel ?? label}</label><input aria-label={label} step={step} id={id} type="number" min={min} max={max} value={Number.isFinite(value) ? value : ''} onChange={event => onChange(event.target.value === '' ? NaN : Number(event.target.value))} aria-describedby={`${id}-hint`} /><small id={`${id}-hint`}>{hint}</small></div>;
}
const number = (value: number) => Number.isFinite(value) ? Math.round(value).toLocaleString() : '—';
const perMillion = (value?: number) => typeof value === 'number' && Number.isFinite(value) ? `${formatUsd(value * 1000)}/M` : 'Not published';
function varied(plan: AgentPlan, factor: number, side: 'low' | 'high'): AgentPlan {
  return { ...plan, taskTokens: Math.ceil(plan.taskTokens * factor), toolTokensPerStep: Math.ceil(plan.toolTokensPerStep * factor), visibleOutputTokens: Math.ceil(plan.visibleOutputTokens * factor), reasoningTokens: side === 'low' ? plan.reasoningLow ?? Math.ceil(plan.reasoningTokens * factor) : plan.reasoningHigh ?? Math.ceil(plan.reasoningTokens * factor) };
}

export default function AgentPlannerClient() {
  const [plan, setPlan] = useState<AgentPlan>(INITIAL);
  const [mode, setMode] = useState<WorkMode>('agent');
  const [panel, setPanel] = useState(0);
  const savedModes = useRef<Record<WorkMode, AgentPlan>>({ chat: CHAT_INITIAL, agent: INITIAL });
  function changeMode(next: WorkMode) {
    if (next === mode) return;
    savedModes.current[mode] = { ...plan };
    setPlan({ ...savedModes.current[next] });
    setMode(next);
  }
  const [catalog, setCatalog] = useState<PricingCatalogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState('');
  const [runs, setRuns] = useState(100);
  const [variance, setVariance] = useState(30);
  const [budget, setBudget] = useState(1);
  const [inputMode, setInputMode] = useState<'estimate' | 'paste'>('estimate');
  const [prompt, setPrompt] = useState('');
  const [counted, setCounted] = useState<{ text: string; count: number } | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [copied, setCopied] = useState('');
  const [missingModels, setMissingModels] = useState<string[]>([]);
  useEffect(() => {
    function restore() {
      const shared = readAgentPlanHash(window.location.hash);
      if (!shared) return;
      setPlan(shared.plan); setMode(shared.mode ?? 'agent');
      setRuns(shared.runs); setVariance(shared.variance); setBudget(shared.budget ?? 1); setInputMode('estimate');
      setSelected(shared.models); setActive(shared.models[0] ?? '');
    }
    restore();
    window.addEventListener('hashchange', restore);
    return () => window.removeEventListener('hashchange', restore);
  }, []);
  const update = (key: keyof AgentPlan, value: number | boolean) => setPlan(current => ({ ...current, [key]: value }));

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    fetchPricing().then(result => {
      if (cancelled) return;
      setCatalog(result);
      const names = Object.keys(result.data);
      const defaults = chooseDefaultModels(names, result.data, 4);
      const requested = findRequestedModel(new URLSearchParams(window.location.search).get('model'), result.data);
      const shared = readAgentPlanHash(window.location.hash);
      const linked = (shared?.models ?? []).map(name => findRequestedModel(name, result.data)).filter((name): name is string => Boolean(name));
      setMissingModels((shared?.models ?? []).filter(name => !findRequestedModel(name, result.data)));
      const next = linked.length ? linked : requested ? [requested, ...defaults.filter(name => name !== requested)].slice(0, 4) : defaults;
      setSelected(current => current.filter(name => names.includes(name)).length ? current.filter(name => names.includes(name)) : next);
      setActive(current => names.includes(current) ? current : next[0] ?? '');
    }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Prices unavailable.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [request]);

  useEffect(() => {
    if (inputMode !== 'paste' || !prompt) return;
    let worker: Worker | undefined;
    let cancelled = false;
    setTokenError('');
    const timeout = window.setTimeout(() => {
      worker?.terminate();
      if (!cancelled) setTokenError('Counting took too long. Use a smaller prompt or an estimated token count.');
    }, 10000);
    try {
      worker = new Worker(new URL('../../workers/tokenizer.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = event => {
        if (cancelled) return;
        window.clearTimeout(timeout);
        if (event.data.error || !Number.isFinite(event.data.count)) setTokenError('Token count unavailable. You can still enter an estimate.');
        else setCounted({ text: prompt, count: event.data.count });
        worker?.terminate();
      };
      worker.onerror = () => { window.clearTimeout(timeout); if (!cancelled) setTokenError('Token count unavailable. Switch to estimated input.'); worker?.terminate(); };
      worker.postMessage({ requestId: 1, tokenizer: 'o200k_base', prompt });
    } catch { window.clearTimeout(timeout); setTokenError('Token counting is unavailable. Switch to estimated input.'); }
    return () => { cancelled = true; window.clearTimeout(timeout); worker?.terminate(); };
  }, [prompt, inputMode]);

  const counting = inputMode === 'paste' && prompt !== '' && counted?.text !== prompt && !tokenError;
  const effectivePlan = useMemo(() => ({ ...plan, taskTokens: inputMode === 'estimate' ? plan.taskTokens : prompt === '' ? 0 : counted?.text === prompt ? counted.count : NaN }), [plan, inputMode, prompt, counted]);
  const models = Object.keys(catalog?.data ?? {});
  const estimates = useMemo(() => selected.map(name => {
    const entry = catalog?.data[name];
    if (!entry) return null;
    const expected = estimateAgentRun(effectivePlan, entry);
    const low = estimateAgentRun(varied(effectivePlan, Math.max(0, 1 - variance / 100), 'low'), entry);
    const high = estimateAgentRun(varied(effectivePlan, 1 + variance / 100, 'high'), entry);
    const cold = estimateAgentRun({ ...effectivePlan, cacheEnabled: false }, entry);
    return { name, entry, expected, low, high, cold };
  }).filter(row => row !== null), [selected, catalog, effectivePlan, variance]);
  const primary = estimates.find(row => row.name === active) ?? estimates[0];
  const usable = estimates.filter(row => row.expected.feasible && row.expected.totalCost !== null).sort((a, b) => a.expected.totalCost! - b.expected.totalCost!);
  const arithmeticReady = primary?.expected.totalCost !== null && primary?.expected.totalCost !== undefined && Number.isInteger(runs) && runs > 0 && runs <= 1000000 && Number.isFinite(variance) && variance >= 0 && variance <= 100;
  const thinkingRangeValid = (plan.reasoningLow === undefined || (Number.isInteger(plan.reasoningLow) && plan.reasoningLow >= 0 && plan.reasoningLow <= plan.reasoningTokens)) && (plan.reasoningHigh === undefined || (Number.isInteger(plan.reasoningHigh) && plan.reasoningHigh >= plan.reasoningTokens && plan.reasoningHigh <= 10000000));
  const scenarioCosts = [primary?.low.totalCost, primary?.expected.totalCost, primary?.high.totalCost].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const ready = arithmeticReady && thinkingRangeValid && Number.isFinite(budget) && budget >= 0 && budget <= 1000000;
  const cost = primary?.expected.totalCost ?? 0;
  const total = ready ? cost * runs : null;
  const breakdown = primary ? [
    { name: 'Input & cache', value: primary.expected.inputCost ?? 0, className: 'input' },
    { name: 'Visible answer', value: primary.expected.visibleOutputCost ?? 0, className: 'output' },
    { name: 'Thinking allowance', value: primary.expected.reasoningCost ?? 0, className: 'thinking' },
  ] : [];
  async function copyShareLink() {
    const link = buildAgentPlanLink(window.location.origin, { version: 1, mode, plan: effectivePlan, models: selected, runs, variance, budget });
    if (!link) { setCopied('Complete the assumptions first.'); return; }
    try { await navigator.clipboard.writeText(link); setCopied('Copied a restorable link. Prompt text was excluded.'); } catch { setCopied('Could not copy the link.'); }
  }
  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ version: 1, mode, assumptions: effectivePlan, models: selected, runsPerMonth: runs, tokenVariancePct: variance, budgetUsd: budget }, null, 2));
      setCopied('Copied assumptions. Prompt text was excluded.');
    } catch { setCopied('Copy failed. Select and copy the assumptions from the page instead.'); }
  }

  const panels = ['Task', 'Thinking', 'Run settings', 'Compare models'] as const;
  const rangeLabel = ready ? `${formatUsd(Math.min(...scenarioCosts))} – ${formatUsd(Math.max(...scenarioCosts))}` : 'Unavailable';
  const receiptText = [
    'Prompt Info · Cost estimate', primary?.name ?? 'Model unavailable',
    `Estimated range: ${rangeLabel}`, `Central estimate: ${ready ? formatUsd(cost) : 'Unavailable'}`,
    ...breakdown.map(part => `${part.name}: ${ready ? formatUsd(part.value) : 'Unavailable'}`),
    `${number(plan.steps)} model calls × ${number(1 + (plan.retries ?? 0))} attempts`,
    `${number(runs)} tasks/month: ${formatUsd(total)}`,
    'Editable workload scenarios, not guaranteed bounds. API model usage only.',
  ].join('\n');
  async function copyReceipt() {
    try { await navigator.clipboard.writeText(receiptText); setCopied('Receipt copied.'); }
    catch { setCopied('Could not copy the receipt.'); }
  }
  async function saveReceipt() {
    try {
    const { downloadPlannerReceipt } = await import('../../lib/plannerReceipt');
    const saved = downloadPlannerReceipt({ model: primary?.name ?? 'Model unavailable', range: rangeLabel, central: ready ? formatUsd(cost) : 'Unavailable', items: breakdown.map(part => [part.name, ready ? formatUsd(part.value) : 'Unavailable']), monthly: `${number(runs)} tasks/month: ${formatUsd(total)}`, workload: `${number(plan.steps)} calls × ${number(1 + (plan.retries ?? 0))} attempts` });
    setCopied(saved ? 'Receipt image download started.' : 'Image export is unavailable. You can copy the receipt instead.');
    } catch { setCopied('Image export is unavailable. You can copy the receipt instead.'); }
  }
  function selectPanel(index: number) { setPanel(index); document.getElementById(`planner-tab-${index}`)?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }

  return <div className="agent-planner">
    <header className="planner-heading"><div><h1>What will your AI task cost?</h1><p>Set up a chat or an agent run. Compare the estimate before you build.</p></div><span className="planner-private">Calculated on your device</span></header>
    <div className="agent-workbench">
      <div className="agent-inputs">
        <section className="planner-model-card" aria-label="Selected model"><label htmlFor="agent-primary">Model to price</label><ModelSelect id="agent-primary" value={primary?.name} models={models} pricing={catalog?.data} loading={loading} onChange={name => { setActive(name); setSelected(current => current.includes(name) ? current : [name, ...current].slice(0, 6)); }} /></section>
        <div className="planner-editor">
          <div role="tablist" aria-label="Planner sections" className="planner-tabs">{panels.map((name, index) => <button type="button" role="tab" id={`planner-tab-${index}`} aria-controls={`planner-panel-${index}`} aria-selected={panel === index} tabIndex={panel === index ? 0 : -1} key={name} onClick={() => selectPanel(index)} onKeyDown={event => { const next = event.key === 'ArrowRight' ? (index + 1) % panels.length : event.key === 'ArrowLeft' ? (index + panels.length - 1) % panels.length : event.key === 'Home' ? 0 : event.key === 'End' ? panels.length - 1 : null; if (next !== null) { event.preventDefault(); setPanel(next); document.getElementById(`planner-tab-${next}`)?.focus(); } }}>{name}</button>)}</div>
          <section className="planner-panel" role="tabpanel" id="planner-panel-0" aria-labelledby="planner-tab-0" hidden={panel !== 0}>
            <div className="planner-panel-title"><h2>Task input</h2></div>
            <div className="planner-mode-row"><div className="planner-segment" role="group" aria-label="Work mode"><button type="button" aria-pressed={mode === 'chat'} onClick={() => changeMode('chat')} title="User-led exchanges">Chat</button><button type="button" aria-pressed={mode === 'agent'} onClick={() => changeMode('agent')} title="Goal-directed model calls">Agent</button></div><div className="planner-presets" aria-label="Starting assumptions">{(mode === 'chat' ? CHAT_PRESETS : PRESETS).map(preset => <button className="planner-button" key={preset.name} type="button" onClick={() => { setPlan({ ...preset.plan }); setInputMode('estimate'); }} title={preset.description}>{preset.name}</button>)}</div></div>
            <div className="planner-section-rule" />
            <div className="planner-segment planner-input-toggle"><button type="button" aria-pressed={inputMode === 'estimate'} onClick={() => setInputMode('estimate')}>Estimate input</button><button type="button" aria-pressed={inputMode === 'paste'} onClick={() => setInputMode('paste')}>Count a draft prompt</button></div>
            {inputMode === 'paste' ? <div className="agent-field"><label htmlFor="agent-task-prompt">Task prompt</label><textarea id="agent-task-prompt" value={prompt} maxLength={200000} onChange={event => setPrompt(clampPrompt(event.target.value))} placeholder="Paste your task or document. It stays on your device." /><small role="status">{tokenError || (!prompt ? 'Counted locally. Nothing is uploaded.' : counted?.text === prompt ? `${number(counted.count)} tokens using o200k_base. Other tokenizers may differ.` : 'Counting locally…')}</small></div> : <Field label="Task and document tokens" value={plan.taskTokens} onChange={value => update('taskTokens', value)} hint="About 750 English words per 1,000 tokens. Code and other languages vary." />}
            <div className="agent-field-grid"><Field label="Shared instruction tokens" value={plan.instructionTokens} onChange={value => update('instructionTokens', value)} hint="System instructions and tool definitions, sent with every call." /><Field label={mode === 'chat' ? 'New user-message tokens per later exchange' : 'New tool/context tokens per later step'} value={plan.toolTokensPerStep} onChange={value => update('toolTokensPerStep', value)} hint={mode === 'chat' ? 'The next question or context from the user.' : 'New search results, file excerpts or tool responses.'} /></div>
            <button className="planner-next" type="button" onClick={() => selectPanel(1)}>Set answer and thinking sizes →</button>
          </section>
          <section className="planner-panel" role="tabpanel" id="planner-panel-1" aria-labelledby="planner-tab-1" hidden={panel !== 1}>
            <div className="planner-panel-title"><h2>Answer & thinking</h2><p>Both can be billed as output. Estimate them separately.</p></div>
            {primary?.entry.reasoning?.supportedEfforts?.length ? <div className="agent-field"><label htmlFor="agent-effort">Reasoning effort for {primary.name}</label><select id="agent-effort" value={primary.entry.reasoning.supportedEfforts.includes(plan.reasoningEffort as ReasoningEffort) ? plan.reasoningEffort : ''} onChange={event => { if (!event.target.value) return; const effort = event.target.value as ReasoningEffort; const example = REASONING_SCENARIOS[effort]; setPlan(current => ({ ...current, reasoningEffort: effort, reasoningTokens: example.base, reasoningLow: example.low, reasoningHigh: example.high })); }}><option value="">Custom token assumptions</option>{primary.entry.reasoning.supportedEfforts.map(effort => <option key={effort} value={effort}>{effort}</option>)}</select><small>These supported settings load illustrative, editable token scenarios. They are not measured usage or provider bounds.</small></div> : <p className="planner-callout">This catalog entry has no verified effort choices. Set your own thinking allowance below.</p>}
            <Field label="Visible output tokens per step" value={plan.visibleOutputTokens} onChange={value => update('visibleOutputTokens', value)} hint="The answer or tool-call text you expect to receive." />
            <div className="planner-presets" aria-label="Visible output examples">{[[200,'Short'],[800,'Detailed'],[2000,'Long']].map(([value,label]) => <button className="planner-button" key={value} type="button" onClick={() => update('visibleOutputTokens', Number(value))}>{label} · {number(Number(value))}</button>)}</div>
            <fieldset className="planner-thinking-group"><legend>Thinking tokens per call</legend><div className="planner-thinking-grid"><Field label="Low thinking scenario per call" displayLabel="Low" value={plan.reasoningLow ?? Math.ceil(plan.reasoningTokens * Math.max(0, 1 - variance / 100))} onChange={value => update('reasoningLow', value)} hint="Low scenario" /><Field label="Thinking tokens per step" displayLabel="Base" value={plan.reasoningTokens} onChange={value => update('reasoningTokens', value)} hint="Base scenario" /><Field label="High thinking scenario per call" displayLabel="High" value={plan.reasoningHigh ?? Math.ceil(plan.reasoningTokens * (1 + variance / 100))} onChange={value => update('reasoningHigh', value)} hint="High scenario" /></div><p>Your assumptions, not minimum or maximum guarantees.</p></fieldset>
            {!thinkingRangeValid && <p role="alert" className="agent-warning">Thinking scenarios must satisfy low ≤ base ≤ high. Enter whole non-negative token counts.</p>}
            <Field label="Token-size uncertainty (%)" value={variance} max={100} onChange={setVariance} hint="Vary input and visible answer sizes by this percentage. Thinking uses the scenarios above." />
            <details className="planner-disclosure"><summary>Reasoning and context details</summary><p>Effort does not determine a fixed token count. Replace these example allowances with measured usage when you have it.</p><label className="agent-check"><input type="checkbox" checked={Boolean(plan.replayReasoning)} onChange={event => update('replayReasoning', event.target.checked)} />Include thinking tokens in later context as well</label><small>Use this only if your provider or agent replays thinking as input.</small></details>
            <button className="planner-next" type="button" onClick={() => selectPanel(2)}>Set calls, caching and retries →</button>
          </section>
          <section className="planner-panel" role="tabpanel" id="planner-panel-2" aria-labelledby="planner-tab-2" hidden={panel !== 2}>
            <div className="planner-panel-title"><h2>How the task runs</h2><p>Each reply or agent step is a model call.</p></div>
            <div className="agent-field-grid"><Field label={mode === 'chat' ? 'Replies per conversation' : 'Model calls per run'} value={plan.steps} min={1} max={200} onChange={value => update('steps', value)} hint={mode === 'chat' ? 'Assistant replies in one conversation.' : 'Include planning, tool selection and follow-up calls.'} /><Field label="Runs per month" value={runs} min={1} onChange={setRuns} hint="Complete tasks your team expects each month." /></div>
            <fieldset className="planner-option-group"><legend>Context & caching</legend><label className="agent-check"><input type="checkbox" checked={plan.keepHistory} onChange={event => update('keepHistory', event.target.checked)} />Keep previous answers and supplied context</label><p>{plan.keepHistory ? 'Input grows with each call. No automatic compaction is assumed.' : 'Each call uses the original task and its new context only.'}</p><label className="agent-check"><input type="checkbox" checked={plan.cacheEnabled} onChange={event => update('cacheEnabled', event.target.checked)} />Assume prompt caching is enabled</label>{plan.cacheEnabled && <Field label="Cache hits on repeated input (%)" value={plan.cacheHitPct} max={100} onChange={value => update('cacheHitPct', value)} hint="First use is cold. Hits need an eligible unchanged prefix. Cache writes may cost extra." />}</fieldset>
            <div className="agent-field-grid"><Field label="Full-run retries to budget for" value={plan.retries ?? 0} max={5} onChange={value => update('retries', value)} hint="Each retry repeats the whole task from a cold start." /><Field label="Planning budget per task (USD)" step={0.01} value={budget} onChange={setBudget} hint="An alert threshold. Set real stop limits in your agent or provider." /></div>
            <button className="planner-next" type="button" onClick={() => selectPanel(3)}>Compare model costs →</button>
          </section>
          <section id="planner-panel-3" className="planner-panel agent-comparison" role="tabpanel" aria-labelledby="planner-tab-3" hidden={panel !== 3}>
            <div className="planner-panel-title"><h2>Compare models</h2><p>The same workload and token assumptions for every model.</p></div><button className="planner-button" type="button" disabled={!catalog} onClick={() => { const next = chooseDefaultModels(models,catalog!.data,6); setSelected(next); setActive(next[0] ?? ''); }}>Compare current model families</button>
            <div className="agent-model-selectors">{selected.map((name,index) => <div key={`${index}-${name}`}><div className="planner-model-label"><label htmlFor={`agent-model-${index}`}>Comparison model {index + 1}</label><button className="planner-text-button" type="button" disabled={selected.length === 1} aria-label={`Remove ${name}`} onClick={() => setSelected(current => current.filter(item => item !== name))}>Remove</button></div><ModelSelect id={`agent-model-${index}`} value={name} models={models.filter(candidate => candidate === name || !selected.includes(candidate))} pricing={catalog?.data} loading={loading} onChange={value => setSelected(current => current.map((item,i) => i === index ? value : item))} /></div>)}</div>
            <button className="planner-button" type="button" disabled={selected.length >= 6 || models.length <= selected.length} onClick={() => { const next = models.find(name => !selected.includes(name)); if (next) setSelected(current => [...current,next]); }}>Add model</button>
            <div className="agent-table-scroll"><table><caption>API model usage. Lower cost does not imply better results.</caption><thead><tr><th>Model</th><th>Range / central</th><th>Monthly</th><th>Fits?</th></tr></thead><tbody>{estimates.map(row => <tr key={row.name} className={row.name === primary?.name ? 'is-active' : ''}><th><button type="button" onClick={() => setActive(row.name)}>{row.name}</button>{usable[0]?.name === row.name && <small>Lowest base cost among selected fits</small>}</th><td>{formatUsd(row.low.totalCost)} – {formatUsd(row.high.totalCost)}<small>Central: {formatUsd(row.expected.totalCost)}</small></td><td>{Number.isInteger(runs) && runs > 0 && runs <= 1000000 && row.expected.totalCost !== null ? formatUsd(row.expected.totalCost * runs) : '—'}</td><td>{!row.expected.feasible ? 'Base does not fit' : !row.high.feasible ? 'High does not fit' : !row.low.feasible ? 'Low unverified' : 'All scenarios fit'}</td></tr>)}</tbody></table></div>
          </section>
        </div>
        <details className="planner-disclosure planner-source-details"><summary>Prices, sources and calculation details</summary><SourceStatus catalog={catalog} modelCount={models.length} loading={loading} error={error} onRetry={() => setRequest(value => value + 1)} /><button className="planner-button" type="button" disabled={loading} onClick={() => setRequest(value => value + 1)}>Refresh prices</button>{primary && <div className="agent-rate-grid"><div><small>Input / million</small><strong>{perMillion(primary.entry.pricing.input)}</strong></div><div><small>Output / million</small><strong>{perMillion(primary.entry.pricing.output)}</strong></div><div><small>Cache read / million</small><strong>{perMillion(primary.entry.pricing.inputCacheRead)}</strong></div><div><small>Cache write / million</small><strong>{perMillion(primary.entry.pricing.inputCacheWrite)}</strong></div></div>}<p>Conditional long-context rates apply per call. The range varies task, tool and answer sizes, plus your thinking scenarios. Call count stays fixed. It is not a probability forecast.</p><details className="planner-disclosure"><summary>See every call and its growing input</summary><div className="agent-table-scroll"><table><thead><tr><th>Attempt / call</th><th>Input tokens</th><th>Cached reads</th><th>Input</th><th>Answer</th><th>Thinking</th><th>Total</th></tr></thead><tbody>{primary?.expected.steps.map(step => <tr key={`${step.attempt}-${step.number}`}><td>{step.attempt} / {step.number}</td><td>{number(step.inputTokens)}</td><td>{number(step.cacheReadTokens)}</td><td>{formatUsd(step.inputCost)}</td><td>{formatUsd(step.visibleOutputCost)}</td><td>{formatUsd(step.reasoningCost)}</td><td>{formatUsd(step.totalCost)}</td></tr>)}</tbody></table></div></details><button className="planner-button" type="button" onClick={copyPlan} disabled={!ready}>Copy plan assumptions</button><p><a href="https://openrouter.ai/docs/guides/best-practices/prompt-caching">Caching documentation</a> · <a href="https://openrouter.ai/docs/guides/best-practices/reasoning-tokens">Reasoning documentation</a></p></details>
      </div>
      <aside id="agent-price" className="planner-receipt-column" aria-label="Run cost estimate">
        <div className="planner-ticket">
          <div className="ticket-brand"><strong>Prompt Info</strong><span>Cost receipt</span></div>
          <div className="ticket-model"><span>{mode === 'chat' ? 'Chat estimate' : 'Agent estimate'}</span><h2>{primary?.name ?? 'Choose a model'}</h2><p>{number(plan.steps)} calls × {number(1 + (plan.retries ?? 0))} {plan.retries ? 'attempts' : 'attempt'}</p></div>
          <div className="ticket-range"><span>Estimated range per {mode === 'chat' ? 'conversation' : 'task'}</span><output data-testid="agent-run-range" aria-live="polite">{rangeLabel}</output><p>Central estimate: <strong data-testid="agent-run-total">{ready ? formatUsd(cost) : 'Unavailable'}</strong></p></div>
          <dl className="ticket-items">{breakdown.map(part => <div key={part.name}><dt>{part.name}</dt><dd>{ready ? formatUsd(part.value) : '—'}</dd></div>)}</dl>
          <div className="ticket-monthly"><span>{number(runs)} tasks / month</span><strong data-testid="agent-monthly-total">{formatUsd(total)}</strong></div>
          <p className="ticket-note">Actual token use varies. These are your low, base and high scenarios, not guaranteed bounds.</p>
          <p className="ticket-source">{catalog ? catalog.freshness === "live" ? "Live catalog rates" : catalog.freshness === "cached" ? "Cached rates. See sources for the date." : "Dated snapshot. Check current prices." : "Checking prices…"}</p><div className="ticket-barcode" aria-hidden="true" /><p className="ticket-footer">API usage only · No charges made</p>
        </div>
        <div className="planner-receipt-actions"><button className="planner-button" type="button" onClick={copyReceipt} disabled={!ready}>Copy receipt</button><button className="planner-button" type="button" onClick={saveReceipt} disabled={!ready}>Save image</button></div><button className="planner-text-button planner-share" type="button" onClick={copyShareLink} disabled={!ready}>Copy a link to this plan</button><p className="planner-copy-state" role="status">{copied}</p>
        {counting && <p className="planner-callout">Counting your prompt locally…</p>}{error && <p className="agent-warning" role="alert">{error} Open prices and sources to retry.</p>}{missingModels.length > 0 && <p className="agent-warning">Saved models absent from the catalog: {missingModels.join(', ')}. Review the replacement selection.</p>}
        {ready && Math.max(...scenarioCosts) > budget && <p role="note" className="agent-warning">The modeled range exceeds your {formatUsd(budget)} task budget.</p>}
        {!counting && primary?.expected.warnings.map(warning => <p role="note" className="agent-warning" key={warning}>{warning}</p>)}
        {primary && !counting && !primary.expected.feasible && <strong className="agent-warning">This plan does not fit this model. The figures are illustrative.</strong>}
        <p className="planner-exclusions">Model usage only. Tool services and platform fees are extra.</p>
      </aside>
    </div>
    <div className="agent-mobile-total"><a href="#agent-price">{rangeLabel}<span>View receipt</span></a><button type="button" onClick={() => selectPanel(3)}>Compare</button></div>
  </div>;
}
