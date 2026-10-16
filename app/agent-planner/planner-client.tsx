'use client';
import { useEffect, useMemo, useState, useId } from 'react';
import ModelSelect from '../../components/ModelSelect';
import { SourceStatus } from '../../components/workbench/SourceStatus';
import { formatUsd } from '../../components/charts/chartFormat';
import { fetchPricing, type PricingCatalogResponse } from '../../lib/fetchPricing';
import { chooseDefaultModels, findRequestedModel } from '../../lib/modelSelection';
import { estimateAgentRun, type AgentPlan } from '../../lib/agentPlanner';
import { buildAgentPlanLink, readAgentPlanHash } from '../../lib/agentPlanLink';
import { clampPrompt } from '../../lib/promptLimits';

const INITIAL: AgentPlan = { instructionTokens: 1000, taskTokens: 2000, toolTokensPerStep: 1000, visibleOutputTokens: 500, reasoningTokens: 2000, steps: 8, keepHistory: true, cacheEnabled: false, cacheHitPct: 80 };
const PRESETS = [
  { name: 'One response', description: 'A single answer from a short prompt.', plan: { ...INITIAL, instructionTokens: 200, taskTokens: 500, toolTokensPerStep: 0, visibleOutputTokens: 500, reasoningTokens: 0, steps: 1 } },
  { name: 'Document assistant', description: 'Read documents and work through a few questions.', plan: { ...INITIAL, taskTokens: 8000, toolTokensPerStep: 1000, visibleOutputTokens: 800, reasoningTokens: 1000, steps: 4 } },
  { name: 'Autonomous agent', description: 'Several model calls with growing tool results.', plan: INITIAL },
];
function Field({ label, value, onChange, hint, max = 1000000, min = 0 }: { label: string; value: number; onChange: (value: number) => void; hint: string; max?: number; min?: number }) {
  const id = useId();
  return <div className="agent-field"><label htmlFor={id}>{label}</label><input id={id} type="number" min={min} max={max} value={Number.isFinite(value) ? value : ''} onChange={event => onChange(event.target.value === '' ? NaN : Number(event.target.value))} aria-describedby={`${id}-hint`} /><small id={`${id}-hint`}>{hint}</small></div>;
}
const number = (value: number) => Number.isFinite(value) ? Math.round(value).toLocaleString() : '—';
const perMillion = (value?: number) => typeof value === 'number' && Number.isFinite(value) ? `${formatUsd(value * 1000)}/M` : 'Not published';
function varied(plan: AgentPlan, factor: number): AgentPlan {
  return { ...plan, taskTokens: Math.ceil(plan.taskTokens * factor), toolTokensPerStep: Math.ceil(plan.toolTokensPerStep * factor), visibleOutputTokens: Math.ceil(plan.visibleOutputTokens * factor), reasoningTokens: Math.ceil(plan.reasoningTokens * factor) };
}

export default function AgentPlannerClient() {
  const [plan, setPlan] = useState<AgentPlan>(INITIAL);
  const [catalog, setCatalog] = useState<PricingCatalogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState('');
  const [runs, setRuns] = useState(100);
  const [variance, setVariance] = useState(30);
  const [inputMode, setInputMode] = useState<'estimate' | 'paste'>('estimate');
  const [prompt, setPrompt] = useState('');
  const [counted, setCounted] = useState<{ text: string; count: number } | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [copied, setCopied] = useState('');
  const [missingModels, setMissingModels] = useState<string[]>([]);
  useEffect(() => {
    const shared = readAgentPlanHash(window.location.hash);
    if (shared) { setPlan(shared.plan); setRuns(shared.runs); setVariance(shared.variance); setSelected(shared.models); }
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

  const effectivePlan = useMemo(() => ({ ...plan, taskTokens: inputMode === 'estimate' ? plan.taskTokens : prompt === '' ? 0 : counted?.text === prompt ? counted.count : NaN }), [plan, inputMode, prompt, counted]);
  const models = Object.keys(catalog?.data ?? {});
  const estimates = useMemo(() => selected.map(name => {
    const entry = catalog?.data[name];
    if (!entry) return null;
    const expected = estimateAgentRun(effectivePlan, entry);
    const low = estimateAgentRun(varied(effectivePlan, Math.max(0, 1 - variance / 100)), entry);
    const high = estimateAgentRun(varied(effectivePlan, 1 + variance / 100), entry);
    const cold = estimateAgentRun({ ...effectivePlan, cacheEnabled: false }, entry);
    return { name, entry, expected, low, high, cold };
  }).filter(row => row !== null), [selected, catalog, effectivePlan, variance]);
  const primary = estimates.find(row => row.name === active) ?? estimates[0];
  const usable = estimates.filter(row => row.expected.feasible && row.expected.totalCost !== null).sort((a, b) => a.expected.totalCost! - b.expected.totalCost!);
  const ready = primary?.expected.totalCost !== null && primary?.expected.totalCost !== undefined && Number.isInteger(runs) && runs > 0 && runs <= 1000000 && Number.isFinite(variance) && variance >= 0 && variance <= 100;
  const cost = primary?.expected.totalCost ?? 0;
  const total = ready ? cost * runs : null;
  const breakdown = primary ? [
    { name: 'Input & cache', value: primary.expected.inputCost ?? 0, className: 'input' },
    { name: 'Visible answer', value: primary.expected.visibleOutputCost ?? 0, className: 'output' },
    { name: 'Thinking allowance', value: primary.expected.reasoningCost ?? 0, className: 'thinking' },
  ] : [];
  async function copyShareLink() {
    const link = buildAgentPlanLink(window.location.origin, { version: 1, plan: effectivePlan, models: selected, runs, variance });
    if (!link) { setCopied('Complete the assumptions first.'); return; }
    try { await navigator.clipboard.writeText(link); setCopied('Copied a restorable link. Prompt text was excluded.'); } catch { setCopied('Could not copy the link.'); }
  }
  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ version: 1, assumptions: effectivePlan, models: selected, runsPerMonth: runs, tokenVariancePct: variance }, null, 2));
      setCopied('Copied assumptions. Prompt text was excluded.');
    } catch { setCopied('Copy failed. Select and copy the assumptions from the page instead.'); }
  }

  return <div className="agent-planner">
    <header className="agent-hero"><div><p className="data-label">Agent budget planner · preview</p><h1>What could this agent run cost?</h1><p>Start with rough inputs. See what changes when the agent thinks longer, calls more tools or reuses context.</p></div><p className="agent-privacy">Local calculations.<br/>No model calls. No prompt uploads.</p></header>
    <SourceStatus catalog={catalog} modelCount={models.length} loading={loading} error={error} onRetry={() => setRequest(value => value + 1)} />
    <section className="agent-presets" aria-label="Starting assumptions"><span>Start with</span>{PRESETS.map(preset => <button key={preset.name} type="button" onClick={() => { setPlan({ ...preset.plan }); setInputMode('estimate'); }} title={preset.description}>{preset.name}</button>)}<small>Editable examples, not measured usage.</small><button type="button" disabled={loading} onClick={() => setRequest(value => value + 1)}>Refresh prices</button></section>{missingModels.length > 0 && <p role="note" className="agent-warning">Saved models absent from this catalog: {missingModels.join(", ")}. Review the replacement selection before using the estimate.</p>}
    <div className="agent-workbench">
      <div className="agent-inputs">
        <section className="agent-step"><div className="agent-step-heading"><b>01</b><div><h2>What goes in?</h2><p>Include the instructions, task and context your model actually receives.</p></div></div>
          <div className="agent-mode"><button type="button" aria-pressed={inputMode === 'estimate'} onClick={() => setInputMode('estimate')}>Estimate input</button><button type="button" aria-pressed={inputMode === 'paste'} onClick={() => setInputMode('paste')}>Count a draft prompt</button></div>
          {inputMode === 'paste' ? <div className="agent-field"><label htmlFor="agent-task-prompt">Task prompt</label><textarea id="agent-task-prompt" value={prompt} maxLength={200000} onChange={event => setPrompt(clampPrompt(event.target.value))} placeholder="Paste the task or document text. Keep shared system instructions in the separate field below." /><small role="status">{tokenError || (!prompt ? 'Paste a draft to count it locally.' : counted?.text === prompt ? `${number(counted.count)} tokens using o200k_base. Other model tokenizers can differ.` : 'Counting locally…')}</small></div> : <Field label="Task and document tokens" value={plan.taskTokens} onChange={value => update('taskTokens', value)} hint="Rough English guide: 1,000 tokens is about 750 words. Code and other languages vary." />}
          <div className="agent-field-grid"><Field label="Shared instruction tokens" value={plan.instructionTokens} onChange={value => update('instructionTokens', value)} hint="System prompt and tool definitions. Sent on every model call, not added to history again." /><Field label="New tool/context tokens per later step" value={plan.toolTokensPerStep} onChange={value => update('toolTokensPerStep', value)} hint="Search results, file excerpts and tool responses added after the first call." /></div>
        </section>
        <section className="agent-step"><div className="agent-step-heading"><b>02</b><div><h2>What comes out?</h2><p>Budget for the answer you see and any paid thinking you do not see.</p></div></div>
          <div className="agent-field-grid"><Field label="Visible output tokens per step" value={plan.visibleOutputTokens} onChange={value => update('visibleOutputTokens', value)} hint="Expected answer or tool-call text, not the model's maximum capacity." /><Field label="Thinking tokens per step" value={plan.reasoningTokens} onChange={value => update('reasoningTokens', value)} hint="A planning allowance billed as output. Set to zero for non-reasoning calls." /></div>
          <div className="agent-quick" aria-label="Visible output examples"><span>Answer size</span>{[[200,'Short'],[800,'Detailed'],[2000,'Long']].map(([value,label]) => <button key={value} type="button" onClick={() => update('visibleOutputTokens', Number(value))}>{label} · {number(Number(value))}</button>)}</div>
          <details><summary>Can I use low, medium or high reasoning effort?</summary><p>Effort is a model setting, not a token count. More effort can use more paid output, but the task and model determine usage. Change the thinking allowance to explore scenarios, then replace it with measured usage from a trial run. This calculator does not execute the model or enforce a spending cap.</p><label className="agent-check"><input type="checkbox" checked={Boolean(plan.replayReasoning)} onChange={event => update('replayReasoning', event.target.checked)} />Include thinking tokens in later context as well</label><small>Only enable if your provider or agent actually replays them as input.</small></details>
        </section>
        <section className="agent-step"><div className="agent-step-heading"><b>03</b><div><h2>How does the run repeat?</h2><p>One step is one model call. More calls can mean larger context, not just a larger multiplier.</p></div></div>
          <div className="agent-field-grid"><Field label="Model calls per run" value={plan.steps} min={1} max={200} onChange={value => update('steps', value)} hint="Include planning, tool-selection and follow-up calls." /><Field label="Runs per month" value={runs} min={1} onChange={setRuns} hint="How many complete tasks your team expects to run." /></div>
          <label className="agent-check"><input type="checkbox" checked={plan.keepHistory} onChange={event => update('keepHistory', event.target.checked)} />Keep previous answers and tool results in context</label>
          <small>{plan.keepHistory ? 'History grows at each step. No invisible summarization or compaction is assumed.' : 'Each later step sends the same instructions/task plus one new tool result; earlier answers are omitted.'}</small>
          <label className="agent-check"><input type="checkbox" checked={plan.cacheEnabled} onChange={event => update('cacheEnabled', event.target.checked)} />Assume prompt caching is enabled</label>
          {plan.cacheEnabled ? <Field label="Cache hits on repeated input (%)" value={plan.cacheHitPct} max={100} onChange={value => update('cacheHitPct', value)} hint="First use is cold. A hit requires an eligible unchanged prefix, supported provider and valid cache lifetime. Misses can incur cache-write pricing." /> : <p className="agent-note">Cold estimate: all input is billed normally. A published cache discount alone does not guarantee a cache hit.</p>}
        </section>
      </div>
      <aside id="agent-price" className="agent-receipt" aria-label="Run cost estimate"><p className="data-label">Your current scenario</p><label htmlFor="agent-primary">Inspect model</label><ModelSelect id="agent-primary" value={primary?.name} models={models} pricing={catalog?.data} loading={loading} onChange={name => { setActive(name); setSelected(current => current.includes(name) ? current : [name, ...current].slice(0,6)); }} />
        <p className="agent-total" data-testid="agent-run-total" aria-live="polite">{ready ? formatUsd(cost) : 'Unavailable'}</p><p>per complete {number(plan.steps)}-call run</p>
        {primary && <div className="agent-rate-grid"><div><small>Input / million</small><strong>{perMillion(primary.entry.pricing.input)}</strong></div><div><small>Output / million</small><strong>{perMillion(primary.entry.pricing.output)}</strong></div><div><small>Cache read / million</small><strong>{perMillion(primary.entry.pricing.inputCacheRead)}</strong></div><div><small>Cache write / million</small><strong>{perMillion(primary.entry.pricing.inputCacheWrite)}</strong></div></div>}
        {primary && <p className="agent-note">{primary.entry.pricing.input > 0 ? `A generated token costs ${(primary.entry.pricing.output / primary.entry.pricing.input).toLocaleString(undefined,{maximumFractionDigits:1})}× a normal input token at these base rates.` : 'This model has no normal input charge.'} Conditional long-context rates are applied per call.</p>}
        <div className="agent-breakdown" aria-label="Cost composition">{breakdown.map(part => <div key={part.name}><div><span>{part.name}</span><b>{ready ? formatUsd(part.value) : '—'}</b></div><div className="agent-bar-track"><span className={`agent-bar ${part.className}`} style={{width:`${cost > 0 ? part.value / cost * 100 : 0}%`}} /></div></div>)}</div>
        <div className="agent-monthly"><span>{number(runs)} runs / month</span><strong data-testid="agent-monthly-total">{formatUsd(total)}</strong></div>
        {primary?.expected.warnings.map(warning => <p role="note" className="agent-warning" key={warning}>{warning}</p>)}
        {primary && !primary.expected.feasible && <strong className="agent-warning">This plan does not fit this model. The arithmetic is illustrative; do not treat it as a runnable recommendation.</strong>}
        <p className="agent-note">API model usage only. Excludes tool services, storage, subscriptions, taxes and credit-purchase fees.</p>
      </aside>
    </div>
    <section id="agent-comparison" className="agent-comparison"><div className="agent-section-heading"><div><p className="data-label">Same workload, different models</p><h2>Compare the cost before you choose.</h2><p>Current catalog prices. Lower cost does not establish better quality or a higher success rate.</p></div><button type="button" disabled={!catalog} onClick={() => { const next=chooseDefaultModels(models,catalog!.data,6); setSelected(next); setActive(next[0]??''); }}>Compare current model families</button></div>
      <div className="agent-model-selectors">{selected.map((name,index)=><div key={`${index}-${name}`}><label htmlFor={`agent-model-${index}`}>Comparison model {index+1}</label><ModelSelect id={`agent-model-${index}`} value={name} models={models.filter(candidate=>candidate===name||!selected.includes(candidate))} pricing={catalog?.data} loading={loading} onChange={value=>setSelected(current=>current.map((item,i)=>i===index?value:item))} /><button type="button" disabled={selected.length===1} aria-label={`Remove ${name}`} onClick={()=>setSelected(current=>current.filter(item=>item!==name))}>Remove</button></div>)}</div>
      <button type="button" disabled={selected.length>=6||models.length<=selected.length} onClick={()=>{const next=models.find(name=>!selected.includes(name));if(next)setSelected(current=>[...current,next]);}}>Add model</button>
      <div className="agent-table-scroll"><table><caption>Estimated API usage for the same agent plan</caption><thead><tr><th>Model</th><th>Input / M</th><th>Output / M</th><th>One run</th><th>Monthly</th><th>Fits the plan?</th></tr></thead><tbody>{estimates.map(row=><tr key={row.name} className={row.name===primary?.name?'is-active':''}><th><button type="button" onClick={()=>setActive(row.name)}>{row.name}</button>{usable[0]?.name===row.name&&<small>Lowest modeled cost among selected fits</small>}</th><td>{perMillion(row.entry.pricing.input)}</td><td>{perMillion(row.entry.pricing.output)}</td><td>{formatUsd(row.expected.totalCost)}</td><td>{Number.isInteger(runs)&&runs>0&&runs<=1000000&&row.expected.totalCost!==null?formatUsd(row.expected.totalCost*runs):'—'}</td><td>{row.expected.feasible?'Within reported limits':'Does not fit'}</td></tr>)}</tbody></table></div>
    </section>
    <section className="agent-sensitivity"><div><p className="data-label">Explore the unknowns</p><h2>What if the run is larger than expected?</h2><p>Change task, tool, answer and thinking sizes together. Instructions and call count stay fixed. This is a scenario range, not a probability forecast.</p></div><Field label="Token-size uncertainty (%)" value={variance} max={100} onChange={setVariance} hint="Try 30% or 50% while requirements are still vague." /><div className="agent-range">{[['Smaller',primary?.low],['Expected',primary?.expected],['Larger',primary?.high]].map(([label,estimate])=>{const value=typeof estimate==='object'?estimate:undefined;return <div key={String(label)}><span>{String(label)}</span><strong>{ready?formatUsd(value?.totalCost??null):'—'}</strong><small>{value?.feasible?'per run':'Plan exceeds model limits or is incomplete'}</small></div>;})}</div>{plan.cacheEnabled&&<p>Same plan with caching off: <strong>{formatUsd(primary?.cold.totalCost??null)}</strong> per run. Cache writes can make a short run more expensive.</p>}</section>
    <section className="agent-details"><details><summary>See every call and its growing input</summary><div className="agent-table-scroll"><table><thead><tr><th>Call</th><th>Input tokens</th><th>Cached reads</th><th>Input cost</th><th>Answer cost</th><th>Thinking cost</th><th>Total</th></tr></thead><tbody>{primary?.expected.steps.map(step=><tr key={step.number}><td>{step.number}</td><td>{number(step.inputTokens)}</td><td>{number(step.cacheReadTokens)}</td><td>{formatUsd(step.inputCost)}</td><td>{formatUsd(step.visibleOutputCost)}</td><td>{formatUsd(step.reasoningCost)}</td><td>{formatUsd(step.totalCost)}</td></tr>)}</tbody></table></div></details><button type="button" onClick={copyShareLink} disabled={!ready}>Copy a link to this plan</button> <button type="button" onClick={copyPlan} disabled={!ready}>Copy plan assumptions</button><p role="status">{copied}</p><p className="agent-note">Use a real trial run to replace these assumptions with recorded input, cached input, visible output and reasoning usage. Model behavior, tokenization and provider routing can change the bill.</p><p><a href="https://openrouter.ai/docs/guides/best-practices/prompt-caching">How caching works</a> · <a href="https://github.com/OpenRouterTeam/docs/blob/main/guides/best-practices/reasoning-tokens.mdx">Thinking-token billing</a></p></section>
    <div className="agent-mobile-total"><a href="#agent-price">{ready ? formatUsd(cost) : "Unavailable"} / run</a><a href="#agent-comparison">Compare models ↑</a></div>
  </div>;
}
