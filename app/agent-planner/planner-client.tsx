'use client';
import { useEffect, useMemo, useState, useId, useRef } from 'react';
import { usePromptScenario } from '../../components/ScenarioProvider';
import ModelSelect from '../../components/ModelSelect';
import MeasuredUsage from './measured-usage';
import { SourceStatus } from '../../components/workbench/SourceStatus';
import { formatUsd } from '../../components/charts/chartFormat';
import {
  fetchPricing,
  type PricingCatalogResponse,
} from '../../lib/fetchPricing';
import {
  chooseDefaultModels,
  findRequestedModel,
  reconcileSelection,
  type ModelSelection,
} from '../../lib/modelSelection';
import {
  estimateAgentRun,
  usesImplicitGeminiCache,
  type AgentPlan,
} from '../../lib/agentPlanner';
import { plannerVolume } from '../../lib/plannerVolume';
import {
  buildAgentPlanLink,
  readAgentPlanHash,
  readLegacyAgentPlan,
  readLegacyNotices,
  type SharedAgentPlan,
} from '../../lib/agentPlanLink';
import {
  REASONING_SCENARIOS,
  type ReasoningEffort,
} from '../../lib/reasoningOptions';
import { TASK_PRESETS, type TaskPreset } from '../../lib/taskPresets';
import { clampPrompt } from '../../lib/promptLimits';

type WorkMode = 'chat' | 'agent';
const presetPlan = (preset: TaskPreset): AgentPlan => ({
  ...preset.plan,
  stepsLow: preset.lowResponses,
  stepsHigh: preset.highResponses,
});
const CHAT_INITIAL = presetPlan(TASK_PRESETS[0]);
const AGENT_INITIAL = presetPlan(TASK_PRESETS[3]);
const INITIAL = CHAT_INITIAL;
function Field({
  label,
  value,
  onChange,
  hint,
  max = 1000000,
  min = 0,
  displayLabel,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint: string;
  max?: number;
  min?: number;
  displayLabel?: string;
  step?: number;
}) {
  const id = useId();
  return (
    <div className="agent-field">
      <label htmlFor={id}>{displayLabel ?? label}</label>
      <input
        aria-label={label}
        step={step}
        id={id}
        type="number"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ''}
        onChange={(event) =>
          onChange(event.target.value === '' ? NaN : Number(event.target.value))
        }
        aria-describedby={`${id}-hint`}
      />
      <small id={`${id}-hint`}>{hint}</small>
    </div>
  );
}
const number = (value: number) =>
  Number.isFinite(value) ? Math.round(value).toLocaleString() : '—';
const perMillion = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${formatUsd(value * 1000)}/M`
    : 'Not published';
function varied(
  plan: AgentPlan,
  factor: number,
  side: 'low' | 'high',
): AgentPlan {
  return {
    ...plan,
    steps:
      side === 'low'
        ? (plan.stepsLow ?? plan.steps)
        : (plan.stepsHigh ?? plan.steps),
    taskTokens: Math.ceil(plan.taskTokens * factor),
    toolTokensPerStep: Math.ceil(plan.toolTokensPerStep * factor),
    visibleOutputTokens: Math.ceil(plan.visibleOutputTokens * factor),
    reasoningTokens:
      side === 'low'
        ? (plan.reasoningLow ?? Math.ceil(plan.reasoningTokens * factor))
        : (plan.reasoningHigh ?? Math.ceil(plan.reasoningTokens * factor)),
  };
}

export default function AgentPlannerClient() {
  const { scenario: persisted, setScenario } = usePromptScenario();
  const [plan, setPlan] = useState<AgentPlan>(
    persisted?.planner?.plan ?? INITIAL,
  );
  const [mode, setMode] = useState<WorkMode>(
    persisted?.planner?.mode ?? 'chat',
  );
  const [panel, setPanel] = useState(0);
  const [presetId, setPresetId] = useState(
    persisted?.planner ? 'custom' : 'quick',
  );
  const [usageMode, setUsageMode] = useState<'plan' | 'measured'>('plan');
  const savedModes = useRef<Record<WorkMode, AgentPlan>>({
    chat: CHAT_INITIAL,
    agent: AGENT_INITIAL,
  });
  function changeMode(next: WorkMode) {
    if (next === mode) return;
    savedModes.current[mode] = { ...plan };
    setPlan({ ...savedModes.current[next] });
    setMode(next);
    setPresetId('custom');
  }
  const [catalog, setCatalog] = useState<PricingCatalogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(0);
  const [selected, setSelected] = useState<string[]>(
    persisted?.planner?.models ?? [],
  );
  const [active, setActive] = useState(persisted?.model ?? '');
  const [runs, setRuns] = useState(persisted?.planner?.runs ?? 1);
  const [recurring, setRecurring] = useState(
    persisted?.planner?.recurring ?? false,
  );
  const [batchRuns, setBatchRuns] = useState(
    persisted?.planner?.batchRuns ?? 1,
  );
  const [importNotices, setImportNotices] = useState<string[]>([]);
  const [budgetEnabled, setBudgetEnabled] = useState(
    persisted?.planner?.budgetEnabled ?? false,
  );
  const [variance, setVariance] = useState(persisted?.planner?.variance ?? 30);
  const [budget, setBudget] = useState(persisted?.planner?.budget ?? 1);
  const [inputMode, setInputMode] = useState<'estimate' | 'paste'>(
    persisted?.prompt ? 'paste' : 'estimate',
  );
  const [prompt, setPrompt] = useState(persisted?.prompt ?? '');
  const [counted, setCounted] = useState<{
    text: string;
    count: number;
  } | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [copied, setCopied] = useState('');
  const [missingModels, setMissingModels] = useState<string[]>([]);
  // The link state currently applied. `key` names its source so a section
  // anchor (which changes the hash but not the source) never re-imports.
  const applied = useRef<{ key: string; shared: SharedAgentPlan | null }>({
    key: '',
    shared: null,
  });
  const pricingData = useRef<PricingCatalogResponse['data'] | null>(null);
  // The latest selection, read when a price refresh re-applies it.
  const selection = useRef<ModelSelection>({
    selected,
    active,
    missing: missingModels,
  });
  useEffect(() => {
    selection.current = { selected, active, missing: missingModels };
  }, [selected, active, missingModels]);
  // An import (or the first price load for a link or ?model=) chooses models.
  // Anything else, including every price refresh (`keepCurrent`), re-applies
  // the current selection to the new catalog.
  function selectModels(
    shared: SharedAgentPlan | null,
    data: PricingCatalogResponse['data'],
    keepCurrent = false,
  ) {
    const applySelection = (next: ModelSelection) => {
      selection.current = next;
      setSelected(next.selected);
      setActive(next.active);
      setMissingModels(next.missing);
    };
    const names = Object.keys(data);
    const defaults = chooseDefaultModels(names, data, 4);
    const resolve = (name: string) =>
      names.includes(name) ? name : findRequestedModel(name, data);
    const requested = findRequestedModel(
      new URLSearchParams(window.location.search).get('model'),
      data,
    );
    if (keepCurrent || (!shared && !requested)) {
      applySelection(reconcileSelection(selection.current, resolve, defaults));
      return;
    }
    const linked = (shared?.models ?? [])
      .map(resolve)
      .filter((name): name is string => Boolean(name));
    const next = linked.length
      ? [...new Set(linked)]
      : requested
        ? [requested, ...defaults.filter((name) => name !== requested)].slice(
            0,
            4,
          )
        : defaults;
    applySelection({
      selected: next,
      active: next[0] ?? '',
      missing: (shared?.models ?? []).filter((name) => !resolve(name)),
    });
  }
  useEffect(() => {
    // Each history entry records which plan source it showed, in
    // history.state (Next.js merges its own router state into it). Traversing
    // back or forward to an entry restores that source; a new anchor entry
    // inherits the current one.
    const SOURCE = 'promptInfoPlanSource';
    const entrySource = (): string | undefined =>
      window.history.state?.[SOURCE];
    const stampEntry = (key: string) => {
      if (entrySource() === key) return;
      window.history.replaceState(
        { ...(window.history.state ?? {}), [SOURCE]: key },
        '',
        window.location.href,
      );
    };
    const sharedFor = (key: string) =>
      key.startsWith('hash:')
        ? readAgentPlanHash(key.slice('hash:'.length))
        : readLegacyAgentPlan(key.slice('query:'.length));
    function importShared(key: string, shared: SharedAgentPlan) {
      applied.current = { key, shared };
      setPresetId('custom');
      setPlan(shared.plan);
      setMode(shared.mode ?? 'agent');
      setUsageMode('plan');
      setRuns(shared.runs);
      setRecurring(shared.recurring === true);
      setBatchRuns(shared.batchRuns ?? 1);
      setImportNotices(shared.notices ?? []);
      setBudgetEnabled(shared.budgetEnabled === true);
      setVariance(shared.variance);
      setBudget(shared.budget ?? 1);
      setInputMode('estimate');
      if (pricingData.current) selectModels(shared, pricingData.current);
      else {
        setSelected(shared.models);
        setActive(shared.models[0] ?? '');
      }
    }
    const { hash, search } = window.location;
    const initial = readAgentPlanHash(hash);
    const legacy = readLegacyAgentPlan(search);
    if (initial) importShared(`hash:${hash}`, initial);
    else if (legacy) importShared(`query:${search}`, legacy);
    else {
      // Only unsupported old values: nothing is applied, so only notices show.
      applied.current = { key: `query:${search}`, shared: null };
      setImportNotices(readLegacyNotices(search));
    }
    stampEntry(applied.current.key);

    // A stamped entry is history traversal: restore the source it showed. An
    // unstamped entry is new: a valid encoded plan (or a bare return to the
    // old query) imports; any other hash is a section anchor and keeps the
    // current state.
    function onHashChange() {
      const recorded = entrySource();
      if (recorded !== undefined) {
        const shared = sharedFor(recorded);
        if (recorded !== applied.current.key && shared)
          importShared(recorded, shared);
        return;
      }
      const { hash: nextHash, search: nextSearch } = window.location;
      const fromHash = readAgentPlanHash(nextHash);
      const fromQuery =
        nextHash === '' ? readLegacyAgentPlan(nextSearch) : null;
      const key = fromHash ? `hash:${nextHash}` : `query:${nextSearch}`;
      const next = fromHash ?? fromQuery;
      if (next && key !== applied.current.key) importShared(key, next);
      stampEntry(applied.current.key);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const update = (key: keyof AgentPlan, value: number | boolean) => {
    setPresetId('custom');
    setPlan((current) => ({
      ...current,
      [key]: value,
      ...(key === 'steps' ? { stepsLow: undefined, stepsHigh: undefined } : {}),
      ...(key === 'keepHistory' && !value
        ? { compactEvery: undefined, summaryTokens: undefined }
        : {}),
    }));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPricing()
      .then((result) => {
        if (cancelled) return;
        setCatalog(result);
        const firstLoad = pricingData.current === null;
        pricingData.current = result.data;
        selectModels(
          firstLoad ? applied.current.shared : null,
          result.data,
          !firstLoad,
        );
      })
      .catch((reason) => {
        if (!cancelled)
          setError(
            reason instanceof Error ? reason.message : 'Prices unavailable.',
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  useEffect(() => {
    if (inputMode !== 'paste' || !prompt) return;
    let worker: Worker | undefined;
    let cancelled = false;
    setTokenError('');
    const timeout = window.setTimeout(() => {
      worker?.terminate();
      if (!cancelled)
        setTokenError(
          'Counting took too long. Use a smaller prompt or an estimated token count.',
        );
    }, 10000);
    try {
      worker = new Worker(
        new URL('../../workers/tokenizer.worker.ts', import.meta.url),
        { type: 'module' },
      );
      worker.onmessage = (event) => {
        if (cancelled) return;
        window.clearTimeout(timeout);
        if (event.data.error || !Number.isFinite(event.data.count))
          setTokenError(
            'Token count unavailable. You can still enter an estimate.',
          );
        else setCounted({ text: prompt, count: event.data.count });
        worker?.terminate();
      };
      worker.onerror = () => {
        window.clearTimeout(timeout);
        if (!cancelled)
          setTokenError('Token count unavailable. Switch to estimated input.');
        worker?.terminate();
      };
      worker.postMessage({ requestId: 1, tokenizer: 'o200k_base', prompt });
    } catch {
      window.clearTimeout(timeout);
      setTokenError(
        'Token counting is unavailable. Switch to estimated input.',
      );
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      worker?.terminate();
    };
  }, [prompt, inputMode]);

  const counting =
    inputMode === 'paste' &&
    prompt !== '' &&
    counted?.text !== prompt &&
    !tokenError;
  const effectivePlan = useMemo(
    () => ({
      ...plan,
      taskTokens:
        inputMode === 'estimate'
          ? plan.taskTokens
          : prompt === ''
            ? 0
            : counted?.text === prompt
              ? counted.count
              : NaN,
    }),
    [plan, inputMode, prompt, counted],
  );
  const sharedState = useMemo(
    () => ({
      version: 1 as const,
      mode,
      plan: effectivePlan,
      models: selected,
      runs: recurring ? runs : 1,
      variance,
      budget: budgetEnabled ? budget : undefined,
      recurring,
      budgetEnabled,
      ...(!recurring && batchRuns > 1 ? { batchRuns } : {}),
    }),
    [
      mode,
      effectivePlan,
      selected,
      runs,
      batchRuns,
      variance,
      budget,
      recurring,
      budgetEnabled,
    ],
  );
  const models = Object.keys(catalog?.data ?? {});
  const estimates = useMemo(
    () =>
      selected
        .map((name) => {
          const entry = catalog?.data[name];
          if (!entry) return null;
          const expected = estimateAgentRun(effectivePlan, entry);
          const low = estimateAgentRun(
            varied(effectivePlan, Math.max(0, 1 - variance / 100), 'low'),
            entry,
          );
          const high = estimateAgentRun(
            varied(effectivePlan, 1 + variance / 100, 'high'),
            entry,
          );
          const cold = estimateAgentRun(
            { ...effectivePlan, cacheEnabled: false },
            entry,
          );
          return { name, entry, expected, low, high, cold };
        })
        .filter((row) => row !== null),
    [selected, catalog, effectivePlan, variance],
  );
  const primary = estimates.find((row) => row.name === active) ?? estimates[0];
  const usable = estimates
    .filter((row) => row.expected.feasible && row.expected.totalCost !== null)
    .sort((a, b) => a.expected.totalCost! - b.expected.totalCost!);
  const arithmeticReady =
    primary?.expected.totalCost !== null &&
    primary?.expected.totalCost !== undefined &&
    Number.isFinite(variance) &&
    variance >= 0 &&
    variance <= 100;
  const thinkingRangeValid =
    (plan.reasoningLow === undefined ||
      (Number.isInteger(plan.reasoningLow) &&
        plan.reasoningLow >= 0 &&
        plan.reasoningLow <= plan.reasoningTokens)) &&
    (plan.reasoningHigh === undefined ||
      (Number.isInteger(plan.reasoningHigh) &&
        plan.reasoningHigh >= plan.reasoningTokens &&
        plan.reasoningHigh <= 10000000));
  const scenarioCosts = [
    primary?.low.totalCost,
    primary?.expected.totalCost,
    primary?.high.totalCost,
  ].filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  );
  const responseRangeValid =
    (plan.stepsLow === undefined ||
      (Number.isInteger(plan.stepsLow) &&
        plan.stepsLow >= 1 &&
        plan.stepsLow <= plan.steps)) &&
    (plan.stepsHigh === undefined ||
      (Number.isInteger(plan.stepsHigh) &&
        plan.stepsHigh >= plan.steps &&
        plan.stepsHigh <= 1000000));
  const validRuns = Number.isInteger(runs) && runs > 0 && runs <= 1000000;
  const validBudget = Number.isFinite(budget) && budget >= 0 && budget <= 1000000;
  const ready = arithmeticReady && thinkingRangeValid && responseRangeValid;
  const cost = primary?.expected.totalCost ?? 0;
  const total = ready && recurring && validRuns ? cost * runs : null;
  const validBatch =
    Number.isInteger(batchRuns) && batchRuns > 0 && batchRuns <= 1000000;
  const volume = plannerVolume({
    cost: ready ? cost : null,
    scenarioCosts: ready ? scenarioCosts : [],
    recurring,
    runs,
    batchRuns,
  });
  const volumeValid = volume.kind === 'single' || volume.valid;
  const canExport = ready && volumeValid;
  const breakdown = primary
    ? [
        {
          name: 'Input & cache',
          value: primary.expected.inputCost ?? 0,
          className: 'input',
        },
        {
          name: 'Visible answer',
          value: primary.expected.visibleOutputCost ?? 0,
          className: 'output',
        },
        {
          name: 'Thinking allowance',
          value: primary.expected.reasoningCost ?? 0,
          className: 'thinking',
        },
        ...(primary.expected.compactions
          ? [
              {
                name: 'Summary output',
                value: primary.expected.summaryOutputCost ?? 0,
                className: 'output',
              },
            ]
          : []),
      ]
    : [];
  useEffect(() => {
    if (!primary || !ready || (recurring && !validRuns) || (!recurring && !validBatch) || (budgetEnabled && !validBudget)) return;
    setScenario({
      planner: sharedState,
      prompt: inputMode === 'paste' ? prompt : '',
      model: primary.name,
      tokenizer: 'o200k_base',
      inputTokensPerRun: primary.expected.inputTokens,
      outputTokensPerRun:
        primary.expected.visibleOutputTokens +
        primary.expected.reasoningTokens +
        primary.expected.summaryOutputTokens,
      turns: plan.steps,
      sessionMode: plan.keepHistory ? 'scenario' : 'baseline',
      inputPerMillion: Number.isFinite(primary.entry.pricing.input)
        ? primary.entry.pricing.input * 1000
        : null,
      outputPerMillion: Number.isFinite(primary.entry.pricing.output)
        ? primary.entry.pricing.output * 1000
        : null,
      costPerRun: primary.expected.totalCost,
      workloadRuns: recurring ? runs : batchRuns,
      workloadCadence: recurring ? 'month' : 'once',
    });
  }, [
    primary,
    ready,
    sharedState,
    inputMode,
    prompt,
    plan.steps,
    plan.keepHistory,
    recurring,
    runs,
    batchRuns,
    setScenario,
    validRuns,
    validBatch,
    validBudget,
    budgetEnabled,
  ]);
  async function copyShareLink() {
    if (!canExport) return;
    const link = buildAgentPlanLink(window.location.origin, {
      version: 1,
      mode,
      plan: effectivePlan,
      models: selected,
      runs: recurring ? runs : 1,
      variance,
      ...(budgetEnabled ? { budget } : {}),
      recurring,
      budgetEnabled,
      ...(!recurring && batchRuns > 1 ? { batchRuns } : {}),
    });
    if (!link) {
      setCopied('Complete the assumptions first.');
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied('Copied a restorable link. Prompt text was excluded.');
    } catch {
      setCopied('Could not copy the link.');
    }
  }
  async function copyPlan() {
    if (!volumeValid) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            version: 1,
            mode,
            assumptions: effectivePlan,
            models: selected,
            runsPerMonth: recurring ? runs : undefined,
            oneTimeBatchTasks:
              !recurring && batchRuns > 1 ? batchRuns : undefined,
            tokenVariancePct: variance,
            budgetUsd: budgetEnabled ? budget : undefined,
          },
          null,
          2,
        ),
      );
      setCopied('Copied assumptions. Prompt text was excluded.');
    } catch {
      setCopied(
        'Copy failed. Select and copy the assumptions from the page instead.',
      );
    }
  }

  const panels = [
    'Task',
    'Thinking',
    'Run settings',
    'Compare models',
  ] as const;
  const rangeLabel =
    loading && !catalog
      ? 'Loading prices…'
      : ready && scenarioCosts.length === 3
        ? `${formatUsd(Math.min(...scenarioCosts))} – ${formatUsd(Math.max(...scenarioCosts))}`
        : 'Unavailable';
  const workloadLabel = `${number(plan.workers ?? 1)} ${plan.workers && plan.workers > 1 ? 'agent streams' : 'stream'} · ${number(plan.steps)} ${plan.steps === 1 ? 'response' : 'responses'} each${plan.retries ? ` · ${number(1 + plan.retries)} attempts` : ''}`;
  const receiptText = [
    'Prompt Info · Cost estimate',
    primary?.name ?? 'Model unavailable',
    `Estimated range: ${rangeLabel}`,
    `Central estimate: ${ready ? formatUsd(cost) : 'Unavailable'}`,
    ...breakdown.map(
      (part) =>
        `${part.name}: ${ready ? formatUsd(part.value) : 'Unavailable'}`,
    ),
    workloadLabel,
    ...(volume.kind !== 'single' ? [volume.line] : []),
    'Editable workload scenarios, not guaranteed bounds. API model usage only.',
  ].join('\n');
  async function copyReceipt() {
    if (!canExport) return;
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopied('Receipt copied.');
    } catch {
      setCopied('Could not copy the receipt.');
    }
  }
  async function saveReceipt() {
    if (!canExport) return;
    try {
      const { downloadPlannerReceipt } =
        await import('../../lib/plannerReceipt');
      const saved = downloadPlannerReceipt({
        model: primary?.name ?? 'Model unavailable',
        range: rangeLabel,
        central: ready ? formatUsd(cost) : 'Unavailable',
        items: breakdown.map((part) => [
          part.name,
          ready ? formatUsd(part.value) : 'Unavailable',
        ]),
        monthly: volume.kind !== 'single' ? volume.line : undefined,
        workload: workloadLabel,
      });
      setCopied(
        saved
          ? 'Receipt image download started.'
          : 'Image export is unavailable. You can copy the receipt instead.',
      );
    } catch {
      setCopied(
        'Image export is unavailable. You can copy the receipt instead.',
      );
    }
  }
  function selectPanel(index: number) {
    setPanel(index);
    document
      .getElementById(`planner-tab-${index}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  return (
    <div className="agent-planner">
      <header className="planner-heading">
        <div>
          <h1>What will your AI task cost?</h1>
          <p>
            Set up a chat or an agent run. Compare the estimate before you
            build.
          </p>
        </div>
        <span className="planner-private">Calculated on your device</span>
      </header>
      <div
        className="planner-segment"
        role="group"
        aria-label="Estimate method"
      >
        <button
          type="button"
          aria-pressed={usageMode === 'plan'}
          onClick={() => setUsageMode('plan')}
        >
          Plan a task
        </button>
        <button
          type="button"
          aria-pressed={usageMode === 'measured'}
          onClick={() => setUsageMode('measured')}
        >
          Use actual token usage
        </button>
      </div>
      <div hidden={usageMode !== 'measured'}>
        {error && (
          <p className="agent-warning" role="alert">
            {error}{' '}
            <button
              className="planner-button"
              type="button"
              onClick={() => setRequest((value) => value + 1)}
            >
              Retry prices
            </button>
          </p>
        )}
        <MeasuredUsage catalog={catalog} initialModel={primary?.name ?? ''} />
      </div>
      <div hidden={usageMode !== 'plan'}>
        <div className="agent-workbench">
          <div className="agent-inputs">
            <section className="planner-model-card" aria-label="Selected model">
              <label htmlFor="agent-primary">Model to price</label>
              <ModelSelect
                id="agent-primary"
                value={primary?.name}
                models={models}
                pricing={catalog?.data}
                loading={loading}
                onChange={(name) => {
                  setActive(name);
                  setSelected((current) =>
                    current.includes(name)
                      ? current
                      : [name, ...current].slice(0, 6),
                  );
                }}
              />
              {catalog && (
                <p className="planner-rate-source">
                  <a href={catalog.sourceUrl}>
                    {catalog.source === 'openrouter-live'
                      ? 'OpenRouter API price catalog'
                      : 'Dated price catalog'}
                  </a>{' '}
                  · {catalog.freshness === 'live' ? 'live' : 'dated fallback'} ·{' '}
                  {new Date(catalog.retrievedAt).toLocaleDateString()}
                </p>
              )}
            </section>
            <div className="planner-editor">
              <div
                role="tablist"
                aria-label="Planner sections"
                className="planner-tabs"
              >
                {panels.map((name, index) => (
                  <button
                    type="button"
                    role="tab"
                    id={`planner-tab-${index}`}
                    aria-controls={`planner-panel-${index}`}
                    aria-selected={panel === index}
                    tabIndex={panel === index ? 0 : -1}
                    key={name}
                    onClick={() => selectPanel(index)}
                    onKeyDown={(event) => {
                      const next =
                        event.key === 'ArrowRight'
                          ? (index + 1) % panels.length
                          : event.key === 'ArrowLeft'
                            ? (index + panels.length - 1) % panels.length
                            : event.key === 'Home'
                              ? 0
                              : event.key === 'End'
                                ? panels.length - 1
                                : null;
                      if (next !== null) {
                        event.preventDefault();
                        setPanel(next);
                        document.getElementById(`planner-tab-${next}`)?.focus();
                      }
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <section
                className="planner-panel"
                role="tabpanel"
                id="planner-panel-0"
                aria-labelledby="planner-tab-0"
                hidden={panel !== 0}
              >
                <div className="planner-panel-title">
                  <h2>What are you working on?</h2>
                  <p>
                    Choose a starting workload. The receipt updates immediately.
                  </p>
                </div>
                <div className="planner-mode-row">
                  <div
                    className="planner-segment"
                    role="group"
                    aria-label="Work mode"
                  >
                    <button
                      type="button"
                      aria-pressed={mode === 'chat'}
                      onClick={() => changeMode('chat')}
                      title="User-led exchanges"
                    >
                      Chat
                    </button>
                    <button
                      type="button"
                      aria-pressed={mode === 'agent'}
                      onClick={() => changeMode('agent')}
                      title="Goal-directed model calls"
                    >
                      Agent
                    </button>
                  </div>
                  <div
                    className="planner-task-presets"
                    aria-label="Starting assumptions"
                  >
                    {TASK_PRESETS.filter((preset) => preset.mode === mode).map(
                      (preset) => (
                        <button
                          className="planner-preset-card"
                          aria-label={preset.name}
                          aria-pressed={presetId === preset.id}
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setPlan(presetPlan(preset));
                            setPresetId(preset.id);
                            setInputMode('estimate');
                          }}
                        >
                          <strong>{preset.name}</strong>
                          <span>{preset.description}</span>
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <div className="planner-section-rule" />
                <div className="planner-segment planner-input-toggle">
                  <button
                    type="button"
                    aria-pressed={inputMode === 'estimate'}
                    onClick={() => setInputMode('estimate')}
                  >
                    Use example context
                  </button>
                  <button
                    type="button"
                    aria-pressed={inputMode === 'paste'}
                    onClick={() => setInputMode('paste')}
                  >
                    Paste your prompt
                  </button>
                </div>
                {inputMode === 'paste' ? (
                  <div className="agent-field">
                    <label htmlFor="agent-task-prompt">Task prompt</label>
                    <textarea
                      id="agent-task-prompt"
                      value={prompt}
                      maxLength={200000}
                      onChange={(event) =>
                        setPrompt(clampPrompt(event.target.value))
                      }
                      placeholder="Paste your task or document. It stays on your device."
                    />
                    <small role="status">
                      {tokenError ||
                        (!prompt
                          ? 'Counted locally. Nothing is uploaded.'
                          : counted?.text === prompt
                            ? `${number(counted.count)} tokens using o200k_base. Other tokenizers may differ.`
                            : 'Counting locally…')}
                    </small>
                  </div>
                ) : (
                  <div className="agent-field">
                    <label htmlFor="task-context-size">Material supplied</label>
                    <select
                      id="task-context-size"
                      value={plan.taskTokens}
                      onChange={(event) =>
                        update('taskTokens', Number(event.target.value))
                      }
                    >
                      {![500, 8000, 30000, 100000].includes(
                        plan.taskTokens,
                      ) && (
                        <option value={plan.taskTokens}>
                          {number(plan.taskTokens)} tokens from this workload
                        </option>
                      )}
                      <option value={500}>
                        Short prompt · about 375 English words
                      </option>
                      <option value={8000}>
                        A document · about 6,000 English words
                      </option>
                      <option value={30000}>
                        Several files · 30,000 tokens
                      </option>
                      <option value={100000}>
                        Large collection · 100,000 tokens
                      </option>
                    </select>
                    <small>
                      Code, language and tokenizers change the count. Paste text
                      for a local estimate.
                    </small>
                  </div>
                )}
                <details className="planner-disclosure">
                  <summary>Customize context assumptions</summary>
                  <Field
                    label="Task and document tokens"
                    value={plan.taskTokens}
                    onChange={(value) => update('taskTokens', value)}
                    hint="The initial material, excluding shared instructions."
                  />
                  <div className="agent-field-grid">
                    <Field
                      label="Shared instruction tokens"
                      value={plan.instructionTokens}
                      onChange={(value) => update('instructionTokens', value)}
                      hint="System instructions and tool definitions, sent with every call."
                    />
                    <Field
                      label={
                        mode === 'chat'
                          ? 'New user-message tokens per later exchange'
                          : 'New tool/context tokens per later step'
                      }
                      value={plan.toolTokensPerStep}
                      onChange={(value) => update('toolTokensPerStep', value)}
                      hint={
                        mode === 'chat'
                          ? 'The next question or context from the user.'
                          : 'New search results, file excerpts or tool responses.'
                      }
                    />
                  </div>
                </details>
                <p className="planner-assumption-note">
                  {(plan.stepsLow ?? plan.steps) === (plan.stepsHigh ?? plan.steps)
                    ? `This models ${number(plan.steps)} ${plan.steps === 1 ? 'model response' : 'model responses'}`
                    : `This models ${number(plan.stepsLow ?? plan.steps)}–${number(plan.stepsHigh ?? plan.steps)} model responses, with ${number(plan.steps)} in the central scenario`}
                  {(plan.workers ?? 1) > 1 ? ` per agent across ${number(plan.workers!)} streams` : ''}
                  . Task difficulty alone cannot predict usage.
                </p>
                <button
                  className="planner-next"
                  type="button"
                  onClick={() => selectPanel(1)}
                >
                  Adjust answer and thinking →
                </button>
              </section>
              <section
                className="planner-panel"
                role="tabpanel"
                id="planner-panel-1"
                aria-labelledby="planner-tab-1"
                hidden={panel !== 1}
              >
                <div className="planner-panel-title">
                  <h2>Answer & thinking</h2>
                  <p>Both can be billed as output. Estimate them separately.</p>
                </div>
                {primary?.entry.reasoning?.supportedEfforts?.length ? (
                  <div className="agent-field">
                    <label htmlFor="agent-effort">
                      Reasoning effort for {primary.name}
                    </label>
                    <select
                      id="agent-effort"
                      value={
                        primary.entry.reasoning.supportedEfforts.includes(
                          plan.reasoningEffort as ReasoningEffort,
                        )
                          ? plan.reasoningEffort
                          : ''
                      }
                      onChange={(event) => {
                        if (!event.target.value) return;
                        setPresetId('custom');
                        const effort = event.target.value as ReasoningEffort;
                        const example = REASONING_SCENARIOS[effort];
                        setPlan((current) => ({
                          ...current,
                          reasoningEffort: effort,
                          reasoningTokens: example.base,
                          reasoningLow: example.low,
                          reasoningHigh: example.high,
                        }));
                      }}
                    >
                      <option value="">Custom token assumptions</option>
                      {primary.entry.reasoning.supportedEfforts.map(
                        (effort) => (
                          <option key={effort} value={effort}>
                            {effort}
                          </option>
                        ),
                      )}
                    </select>
                    <small>
                      These supported settings load illustrative, editable token
                      scenarios. They are not measured usage or provider bounds.
                    </small>
                  </div>
                ) : (
                  <p className="planner-callout">
                    This catalog entry has no verified effort choices. Set your
                    own thinking allowance below.
                  </p>
                )}
                <Field
                  label="Visible output tokens per step"
                  value={plan.visibleOutputTokens}
                  onChange={(value) => update('visibleOutputTokens', value)}
                  hint="Average per-request answer or tool-call text. Real requests can differ; use actual usage when available."
                />
                <div
                  className="planner-presets"
                  aria-label="Visible output examples"
                >
                  {[
                    [200, 'Short'],
                    [800, 'Detailed'],
                    [2000, 'Long'],
                  ].map(([value, label]) => (
                    <button
                      className="planner-button"
                      key={value}
                      type="button"
                      onClick={() =>
                        update('visibleOutputTokens', Number(value))
                      }
                    >
                      {label} · {number(Number(value))}
                    </button>
                  ))}
                </div>
                <fieldset className="planner-thinking-group">
                  <legend>Thinking tokens per call</legend>
                  <div className="planner-thinking-grid">
                    <Field
                      label="Low thinking scenario per call"
                      displayLabel="Low"
                      value={
                        plan.reasoningLow ??
                        Math.ceil(
                          plan.reasoningTokens *
                            Math.max(0, 1 - variance / 100),
                        )
                      }
                      onChange={(value) => update('reasoningLow', value)}
                      hint="Low scenario"
                    />
                    <Field
                      label="Thinking tokens per step"
                      displayLabel="Base"
                      value={plan.reasoningTokens}
                      onChange={(value) => update('reasoningTokens', value)}
                      hint="Base scenario"
                    />
                    <Field
                      label="High thinking scenario per call"
                      displayLabel="High"
                      value={
                        plan.reasoningHigh ??
                        Math.ceil(plan.reasoningTokens * (1 + variance / 100))
                      }
                      onChange={(value) => update('reasoningHigh', value)}
                      hint="High scenario"
                    />
                  </div>
                  <p>Your assumptions, not minimum or maximum guarantees.</p>
                </fieldset>
                {!thinkingRangeValid && (
                  <p role="alert" className="agent-warning">
                    Thinking scenarios must satisfy low ≤ base ≤ high. Enter
                    whole non-negative token counts.
                  </p>
                )}
                <Field
                  label="Token-size uncertainty (%)"
                  value={variance}
                  max={100}
                  onChange={setVariance}
                  hint="Vary input and visible answer sizes by this percentage. Thinking uses the scenarios above."
                />
                <details className="planner-disclosure">
                  <summary>Reasoning and context details</summary>
                  <p>
                    Cost comes from billed input and generated tokens at the
                    selected rates. Repeated requests accumulate these tokens;
                    tools only add model cost when their text or results are
                    processed. Separately priced tool services can add fees.
                  </p>
                  <p>
                    Effort does not determine a fixed token count. Replace these
                    example allowances with measured usage when you have it.
                  </p>
                  <label className="agent-check">
                    <input
                      type="checkbox"
                      checked={Boolean(plan.replayReasoning)}
                      onChange={(event) =>
                        update('replayReasoning', event.target.checked)
                      }
                    />
                    Include thinking tokens in later context as well
                  </label>
                  <small>
                    Use this only if your provider or agent replays thinking as
                    input.
                  </small>
                </details>
                <button
                  className="planner-next"
                  type="button"
                  onClick={() => selectPanel(2)}
                >
                  Adjust how the task runs →
                </button>
              </section>
              <section
                className="planner-panel"
                role="tabpanel"
                id="planner-panel-2"
                aria-labelledby="planner-tab-2"
                hidden={panel !== 2}
              >
                <div className="planner-panel-title">
                  <h2>How the task runs</h2>
                  <p>
                    A request sends input to the model and generates output.
                    Tool actions and waiting time are not flat model fees.
                  </p>
                </div>
                <div className="agent-field-grid">
                  <Field
                    label={
                      mode === 'chat'
                        ? 'Replies per conversation'
                        : 'Model requests within one task'
                    }
                    value={plan.steps}
                    min={1}
                    max={1000000}
                    onChange={(value) => update('steps', value)}
                    hint={
                      mode === 'chat'
                        ? 'Assistant replies in one conversation.'
                        : 'Separate model generations within the same task, not tool executions or whole-task restarts.'
                    }
                  />
                </div>
                <details className="planner-disclosure">
                  <summary>Shorter and longer task scenarios</summary>
                  <div className="agent-field-grid">
                    <Field
                      label="Low response count"
                      value={plan.stepsLow ?? plan.steps}
                      min={1}
                      max={1000000}
                      onChange={(value) => update('stepsLow', value)}
                      hint="Responses in the shorter scenario, per stream."
                    />
                    <Field
                      label="High response count"
                      value={plan.stepsHigh ?? plan.steps}
                      min={1}
                      max={1000000}
                      onChange={(value) => update('stepsHigh', value)}
                      hint="Responses in the longer scenario, per stream."
                    />
                  </div>
                </details>
                {!responseRangeValid && (
                  <p role="alert" className="agent-warning">
                    Response counts must satisfy low ≤ base ≤ high.
                  </p>
                )}
                <fieldset className="planner-option-group">
                  <legend>Context & caching</legend>
                  <label className="agent-check">
                    <input
                      type="checkbox"
                      checked={plan.keepHistory}
                      onChange={(event) =>
                        update('keepHistory', event.target.checked)
                      }
                    />
                    Keep previous answers and supplied context
                  </label>
                  <p>
                    {plan.keepHistory
                      ? plan.compactEvery
                        ? `History is summarized after every ${number(plan.compactEvery)} responses. Summary generation is charged, and the modeled cache starts cold again.`
                        : 'Input grows with each response. No context summarization is configured.'
                      : 'Each call uses the original task and its new context only.'}
                  </p>
                  {mode === 'agent' && (
                    <>
                      <label className="agent-check">
                        <input
                          type="checkbox"
                          checked={plan.compactEvery !== undefined}
                          onChange={(event) => {
                            setPresetId('custom');
                            setPlan((current) => ({
                              ...current,
                              keepHistory: true,
                              compactEvery: event.target.checked
                                ? 10
                                : undefined,
                              summaryTokens: event.target.checked
                                ? 4000
                                : undefined,
                            }));
                          }}
                        />
                        Summarize context during long tasks
                      </label>
                      {plan.compactEvery !== undefined && (
                        <div className="agent-field-grid">
                          <Field
                            label="Responses between summaries"
                            value={plan.compactEvery}
                            min={1}
                            max={200}
                            onChange={(value) => update('compactEvery', value)}
                            hint="A modeled summarization schedule, not a provider default."
                          />
                          <Field
                            label="Summary output tokens"
                            value={plan.summaryTokens ?? 4000}
                            min={1}
                            onChange={(value) => update('summaryTokens', value)}
                            hint="Total generated summary tokens, including any thinking."
                          />
                        </div>
                      )}
                      <Field
                        label="Independent agent streams"
                        value={plan.workers ?? 1}
                        min={1}
                        max={100}
                        onChange={(value) => update('workers', value)}
                        hint="Each stream does this workload and has its own context and token bill."
                      />
                    </>
                  )}
                  <label className="agent-check">
                    <input
                      type="checkbox"
                      checked={plan.cacheEnabled}
                      onChange={(event) =>
                        update('cacheEnabled', event.target.checked)
                      }
                    />
                    Assume prompt caching is enabled
                  </label>
                  {plan.cacheEnabled && (
                    <Field
                      label="Cache hits on repeated input (%)"
                      value={plan.cacheHitPct}
                      max={100}
                      onChange={(value) => update('cacheHitPct', value)}
                      hint="First use is cold. Hits need an eligible unchanged prefix. Cache writes may cost extra."
                    />
                  )}
                </fieldset>
                <div className="agent-field-grid">
                  <Field
                    label="Full-task reruns to budget for"
                    value={plan.retries ?? 0}
                    max={5}
                    onChange={(value) => update('retries', value)}
                    hint="Each retry repeats the whole task from a cold start."
                  />
                </div>
                <details className="planner-disclosure">
                  <summary>Optional budget planning</summary>
                  <label className="agent-check">
                    <input
                      type="checkbox"
                      checked={recurring}
                      onChange={(event) => setRecurring(event.target.checked)}
                    />
                    Estimate a monthly budget
                  </label>
                  {!recurring && (
                    <Field
                      label="Tasks in this one-time batch"
                      value={batchRuns}
                      min={1}
                      onChange={setBatchRuns}
                      hint="Each task runs once. Set 1 to price a single task."
                    />
                  )}
                  {recurring && (
                    <p>
                      Repeat this entire conversation or task throughout a
                      month. This does not change the cost of doing it once.
                    </p>
                  )}
                  {recurring && (
                    <Field
                      label="Completed tasks per month"
                      value={runs}
                      min={1}
                      onChange={setRuns}
                      hint="How many separate times you expect to do this same task."
                    />
                  )}
                  <label className="agent-check">
                    <input
                      type="checkbox"
                      checked={budgetEnabled}
                      onChange={(event) =>
                        setBudgetEnabled(event.target.checked)
                      }
                    />
                    Show a warning above my task budget
                  </label>
                  {budgetEnabled && (
                    <Field
                      label="Planning budget per task (USD)"
                      step={0.01}
                      value={budget}
                      onChange={setBudget}
                      hint="A calculator warning only. Set enforced spending limits in your agent or provider."
                    />
                  )}
                </details>
                <button
                  className="planner-next"
                  type="button"
                  onClick={() => selectPanel(3)}
                >
                  Compare model costs →
                </button>
              </section>
              <section
                id="planner-panel-3"
                className="planner-panel agent-comparison"
                role="tabpanel"
                aria-labelledby="planner-tab-3"
                hidden={panel !== 3}
              >
                <div className="planner-panel-title">
                  <h2>Compare models</h2>
                  <p>
                    The same workload and token assumptions for every model.
                  </p>
                </div>
                <button
                  className="planner-button"
                  type="button"
                  disabled={!catalog}
                  onClick={() => {
                    const next = chooseDefaultModels(models, catalog!.data, 6);
                    setSelected(next);
                    setActive(next[0] ?? '');
                  }}
                >
                  Compare current model families
                </button>
                <div className="agent-model-selectors">
                  {selected.map((name, index) => (
                    <div key={`${index}-${name}`}>
                      <div className="planner-model-label">
                        <label htmlFor={`agent-model-${index}`}>
                          Comparison model {index + 1}
                        </label>
                        <button
                          className="planner-text-button"
                          type="button"
                          disabled={selected.length === 1}
                          aria-label={`Remove ${name}`}
                          onClick={() => {
                            const rest = selected.filter(
                              (item) => item !== name,
                            );
                            setSelected(rest);
                            if (active === name) setActive(rest[0] ?? '');
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      <ModelSelect
                        id={`agent-model-${index}`}
                        value={name}
                        models={models.filter(
                          (candidate) =>
                            candidate === name || !selected.includes(candidate),
                        )}
                        pricing={catalog?.data}
                        loading={loading}
                        onChange={(value) => {
                          setSelected((current) =>
                            current.map((item, i) =>
                              i === index ? value : item,
                            ),
                          );
                          if (active === name) setActive(value);
                        }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  className="planner-button"
                  type="button"
                  disabled={
                    selected.length >= 6 || models.length <= selected.length
                  }
                  onClick={() => {
                    const next = models.find(
                      (name) => !selected.includes(name),
                    );
                    if (next) setSelected((current) => [...current, next]);
                  }}
                >
                  Add model
                </button>
                <div className="agent-table-scroll">
                  <table>
                    <caption>
                      API model usage. Lower cost does not imply better results.
                    </caption>
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Range / central</th>
                        {recurring && <th>Monthly</th>}
                        <th>Fits?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimates.map((row) => (
                        <tr
                          key={row.name}
                          className={
                            row.name === primary?.name ? 'is-active' : ''
                          }
                        >
                          <th>
                            <button
                              type="button"
                              onClick={() => setActive(row.name)}
                            >
                              {row.name}
                            </button>
                            {usable[0]?.name === row.name && (
                              <small>
                                Lowest base cost among selected fits
                              </small>
                            )}
                          </th>
                          <td>
                            {formatUsd(row.low.totalCost)} –{' '}
                            {formatUsd(row.high.totalCost)}
                            <small>
                              Central: {formatUsd(row.expected.totalCost)}
                            </small>
                          </td>
                          {recurring && (
                            <td>
                              {Number.isInteger(runs) &&
                              runs > 0 &&
                              runs <= 1000000 &&
                              row.expected.totalCost !== null
                                ? formatUsd(row.expected.totalCost * runs)
                                : '—'}
                            </td>
                          )}
                          <td>
                            {!row.expected.feasible
                              ? 'Base does not fit'
                              : !row.high.feasible
                                ? 'High does not fit'
                                : !row.low.feasible
                                  ? 'Low unverified'
                                  : 'All scenarios fit'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            <details className="planner-disclosure planner-source-details">
              <summary>Prices, sources and calculation details</summary>
              <SourceStatus
                catalog={catalog}
                modelCount={models.length}
                loading={loading}
                error={error}
                onRetry={() => setRequest((value) => value + 1)}
              />
              <button
                className="planner-button"
                type="button"
                disabled={loading}
                onClick={() => setRequest((value) => value + 1)}
              >
                Refresh prices
              </button>
              {primary && (
                <div className="agent-rate-grid">
                  <div>
                    <small>Input / million</small>
                    <strong>{perMillion(primary.entry.pricing.input)}</strong>
                  </div>
                  <div>
                    <small>Output / million</small>
                    <strong>{perMillion(primary.entry.pricing.output)}</strong>
                  </div>
                  <div>
                    <small>Cache read / million</small>
                    <strong>
                      {perMillion(primary.entry.pricing.inputCacheRead)}
                    </strong>
                  </div>
                  <div>
                    <small>Cache write / million</small>
                    <strong>
                      {usesImplicitGeminiCache(primary.entry)
                        ? 'Implicit: normal input rate'
                        : perMillion(primary.entry.pricing.inputCacheWrite)}
                    </strong>
                  </div>
                </div>
              )}
              <p>
                Conditional long-context rates apply per call. The range varies
                input, answer and thinking sizes plus the shorter/longer
                response counts supplied by the chosen task preset. All are
                editable planning assumptions. It is not a probability forecast.
              </p>
              <details className="planner-disclosure">
                <summary>
                  {primary?.expected.ledgerSampled
                    ? 'Inspect the initial requests, one stream and attempt'
                    : 'See every request and its input'}
                </summary>
                <div className="agent-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Attempt / call</th>
                        <th>Input tokens</th>
                        <th>Cached reads</th>
                        <th>Input</th>
                        <th>Answer</th>
                        <th>Thinking</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {primary?.expected.steps.map((step) => (
                        <tr key={`${step.attempt}-${step.number}`}>
                          <td>
                            {step.attempt} / {step.number}
                          </td>
                          <td>{number(step.inputTokens)}</td>
                          <td>{number(step.cacheReadTokens)}</td>
                          <td>{formatUsd(step.inputCost)}</td>
                          <td>{formatUsd(step.visibleOutputCost)}</td>
                          <td>{formatUsd(step.reasoningCost)}</td>
                          <td>{formatUsd(step.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <button
                className="planner-button"
                type="button"
                onClick={copyPlan}
                disabled={!canExport}
              >
                Copy plan assumptions
              </button>
              <p>
                <a href="https://openrouter.ai/docs/guides/best-practices/prompt-caching">
                  Caching documentation
                </a>{' '}
                ·{' '}
                <a href="https://openrouter.ai/docs/guides/best-practices/reasoning-tokens">
                  Reasoning documentation
                </a>
              </p>
            </details>
          </div>
          <aside
            id="agent-price"
            className="planner-receipt-column"
            aria-label="Run cost estimate"
          >
            <div className="planner-ticket">
              <div className="ticket-brand">
                <strong>Prompt Info</strong>
                <span>Cost receipt</span>
              </div>
              <div className="ticket-model">
                <span>
                  {mode === 'chat' ? 'Chat estimate' : 'Agent estimate'}
                </span>
                <h2>{primary?.name ?? 'Choose a model'}</h2>
                <p>{workloadLabel}</p>
              </div>
              <div className="ticket-range">
                <span>
                  Estimated range per{' '}
                  {mode === 'chat' ? 'conversation' : 'task'}
                </span>
                <output data-testid="agent-run-range" aria-live="polite">
                  {rangeLabel}
                </output>
                <p>
                  Central estimate:{' '}
                  <strong data-testid="agent-run-total">
                    {ready ? formatUsd(cost) : 'Unavailable'}
                  </strong>
                </p>
              </div>
              <p className="ticket-note">
                {number(primary?.expected.inputTokens ?? 0)} input tokens +{' '}
                {number(
                  (primary?.expected.visibleOutputTokens ?? 0) +
                    (primary?.expected.reasoningTokens ?? 0) +
                    (primary?.expected.summaryOutputTokens ?? 0),
                )}{' '}
                generated tokens, including thinking.
              </p>
              <dl className="ticket-items">
                {breakdown.map((part) => (
                  <div key={part.name}>
                    <dt>{part.name}</dt>
                    <dd>{ready ? formatUsd(part.value) : '—'}</dd>
                  </div>
                ))}
              </dl>
              {volume.kind === 'batch' && (
                <div className="ticket-monthly ticket-batch">
                  <span>{volume.label}</span>
                  <strong data-testid="agent-batch-total">
                    {formatUsd(volume.total)}
                  </strong>
                  <small
                    className="ticket-batch-range"
                    data-testid="agent-batch-range"
                  >
                    {volume.range
                      ? `Range ${formatUsd(volume.range[0])} – ${formatUsd(volume.range[1])}`
                      : 'Range unavailable'}
                  </small>
                </div>
              )}
              {recurring && (
                <div className="ticket-monthly">
                  <span>{number(runs)} tasks / month</span>
                  <strong data-testid="agent-monthly-total">
                    {formatUsd(total)}
                  </strong>
                </div>
              )}
              <p className="ticket-note">
                {primary?.expected.compactions
                  ? `${number(primary.expected.compactions)} paid context summaries included. `
                  : ''}
                Actual token use varies. These are your low, base and high
                scenarios, not guaranteed bounds.
              </p>
              {plan.cacheEnabled && ready && primary?.cold.totalCost != null && <p className="ticket-note">Same workload without caching: {formatUsd(primary.cold.totalCost)}.</p>}
              <p className="ticket-source">
                {catalog
                  ? catalog.freshness === 'live'
                    ? 'Live catalog rates'
                    : catalog.freshness === 'cached'
                      ? 'Cached rates. See sources for the date.'
                      : 'Dated snapshot. Check current prices.'
                  : 'Checking prices…'}
              </p>
              <div className="ticket-barcode" aria-hidden="true" />
              <p className="ticket-footer">API usage only · No charges made</p>
            </div>
            <div className="planner-receipt-actions">
              <button
                className="planner-button"
                type="button"
                onClick={copyReceipt}
                disabled={!canExport}
              >
                Copy receipt
              </button>
              <button
                className="planner-button"
                type="button"
                onClick={saveReceipt}
                disabled={!canExport}
              >
                Save image
              </button>
            </div>
            <button
              className="planner-text-button planner-share"
              type="button"
              onClick={copyShareLink}
              disabled={!canExport}
            >
              Copy a link to this plan
            </button>
            <p className="planner-copy-state" role="status">
              {copied}
            </p>
            {counting && (
              <p className="planner-callout">Counting your prompt locally…</p>
            )}
            {error && (
              <p className="agent-warning" role="alert">
                {error} Open prices and sources to retry.
              </p>
            )}
            {missingModels.length > 0 && (
              <p className="agent-warning">
                Saved models absent from the catalog: {missingModels.join(', ')}
                . Review the replacement selection.
              </p>
            )}
            {importNotices.map((notice) => (
              <p role="note" className="agent-warning" key={notice}>
                {notice}
              </p>
            ))}
            {!recurring && !validBatch && <p role="alert" className="agent-warning">Enter 1–1,000,000 tasks for the one-time batch. The per-task estimate is unchanged.</p>}
            {recurring && !validRuns && <p role="alert" className="agent-warning">Enter 1–1,000,000 completed tasks for the monthly projection. The per-task estimate is unchanged.</p>}
            {budgetEnabled && !validBudget && <p role="alert" className="agent-warning">Enter a valid task budget to enable the warning.</p>}
            {ready && scenarioCosts.length !== 3 && <p role="alert" className="agent-warning">The central estimate is available, but one range scenario could not be calculated. Review its response and token assumptions.</p>}
            {budgetEnabled && validBudget && ready && Math.max(...scenarioCosts) > budget && (
              <p role="note" className="agent-warning">
                The modeled range exceeds your {formatUsd(budget)} task budget.
              </p>
            )}
            {!counting &&
              primary?.expected.warnings.map((warning) => (
                <p role="note" className="agent-warning" key={warning}>
                  {warning}
                </p>
              ))}
            {primary &&
              ready &&
              primary.expected.feasible &&
              (!primary.low.feasible || !primary.high.feasible) && (
                <p role="note" className="agent-warning">
                  The central scenario fits, but part of the range exceeds model
                  limits. Check the comparison before using it as a budget.
                </p>
              )}
            {primary && !counting && !primary.expected.feasible && (
              <strong className="agent-warning">
                This plan does not fit this model. The figures are illustrative.
              </strong>
            )}
            <p className="planner-exclusions">
              Model usage only. Tool services and platform fees are extra.
            </p>
          </aside>
        </div>
        <div className="agent-mobile-total">
          <a href="#agent-price">
            {rangeLabel}
            <span>View receipt</span>
          </a>
          <button type="button" onClick={() => selectPanel(3)}>
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}
