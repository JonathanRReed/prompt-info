'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePromptScenario } from '../../components/ScenarioProvider';
import {
  matchArtificialAnalysisModel,
  type ArtificialAnalysisCatalogResponse,
  type ArtificialAnalysisModel,
} from '../../lib/artificialAnalysis';
import {
  breakEvenOutputRate,
  costPerTask,
  EFFICIENCY_PRESETS,
  scaleOutputTokensByEfficiency,
} from '../../lib/tokenEfficiency';

const DEFAULT_TASKS = 1000;
const DEFAULT_INPUT_TOKENS_PER_TASK = 5000;
const MAX_TASKS = 1_000_000;
const MAX_TOKENS_PER_TASK = 10_000_000;
const MAX_RATE_PER_MILLION = 10_000;

type EditableModel = {
  key: string;
  name: string;
  provider: string;
  inputPerMillion: number;
  outputPerMillion: number;
  outputTokensPerTask: number;
  intelligenceIndex: number | null;
  benchmarkCostPerTask: number | null;
  outputTokensPerSecond: number | null;
  aaModelId: string | null;
  rateSource: string;
};

type EditableRateField = 'inputPerMillion' | 'outputPerMillion' | 'outputTokensPerTask';

function initialModels(): EditableModel[] {
  return EFFICIENCY_PRESETS.map(({ key, name, provider, inputPerMillion, outputPerMillion, outputTokensPerTask, intelligenceIndex }) => ({
    key,
    name,
    provider,
    inputPerMillion,
    outputPerMillion,
    outputTokensPerTask,
    intelligenceIndex,
    benchmarkCostPerTask: null,
    outputTokensPerSecond: null,
    aaModelId: null,
    rateSource: 'Dated benchmark preset',
  }));
}

function clampNumber(value: number, max: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, max);
}

function formatCost(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  if (value === 0) return '$0.00';
  if (value < 0.01) return `$${value.toFixed(6)}`;
  if (value < 1) return `$${value.toFixed(4)}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sourceLabel(source: ArtificialAnalysisCatalogResponse['source'] | undefined) {
  if (source === 'artificial-analysis-free-api') return 'live free API';
  if (source === 'artificial-analysis-supabase-cache') return 'project database cache';
  if (source === 'dated-fallback') return 'dated local fallback';
  return 'loading';
}

function withCatalogModel(current: EditableModel, model: ArtificialAnalysisModel): EditableModel {
  return {
    ...current,
    name: model.name,
    provider: model.creator,
    inputPerMillion: model.inputPerMillion ?? current.inputPerMillion,
    outputPerMillion: model.outputPerMillion ?? current.outputPerMillion,
    intelligenceIndex: model.intelligenceIndex,
    benchmarkCostPerTask: model.benchmarkCostPerTask,
    outputTokensPerSecond: model.outputTokensPerSecond,
    aaModelId: model.id,
    rateSource: 'Artificial Analysis',
  };
}

const fieldInputClass =
  'glass-select w-full border px-3 py-2 text-right font-mono text-sm font-bold text-rose-text tabular-nums focus:border-rose-love focus:outline-none focus:ring-2 focus:ring-rose-love [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export default function TokenEfficiencyPageClient() {
  const { scenario } = usePromptScenario();
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [inputTokensPerTask, setInputTokensPerTask] = useState(DEFAULT_INPUT_TOKENS_PER_TASK);
  const [models, setModels] = useState<EditableModel[]>(initialModels);
  const [catalog, setCatalog] = useState<ArtificialAnalysisCatalogResponse | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [plannerApplied, setPlannerApplied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/benchmarks')
      .then(async response => {
        if (!response.ok) throw new Error(`Benchmark catalog failed with ${response.status}`);
        return await response.json() as ArtificialAnalysisCatalogResponse;
      })
      .then(response => {
        if (cancelled) return;
        setCatalog(response);
        setModels(current => current.map(model => {
          const match = response.data.find(candidate => candidate.slug === model.key);
          return match ? withCatalogModel(model, match) : model;
        }));
      })
      .catch(() => {
        if (!cancelled) setCatalogError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const catalogModels = useMemo(
    () => (catalog?.data ?? []).filter(model => model.inputPerMillion !== null || model.outputPerMillion !== null),
    [catalog]
  );

  const updateModel = (key: string, field: EditableRateField, rawValue: number) => {
    const max = field === 'outputTokensPerTask' ? MAX_TOKENS_PER_TASK : MAX_RATE_PER_MILLION;
    const value = clampNumber(rawValue, max);
    setModels(prev => prev.map(model => (
      model.key === key
        ? { ...model, [field]: value, rateSource: field === 'outputTokensPerTask' ? model.rateSource : 'Edited rate' }
        : model
    )));
  };

  const selectCatalogModel = (slotKey: string, modelId: string) => {
    const selected = catalogModels.find(model => model.id === modelId);
    if (!selected) return;
    setModels(current => current.map(model => model.key === slotKey ? withCatalogModel(model, selected) : model));
  };

  const usePlannerWorkload = () => {
    if (!scenario) return;
    setTasks(Math.max(1, Math.min(MAX_TASKS, scenario.workloadRuns)));
    setInputTokensPerTask(clampNumber(scenario.inputTokensPerRun, MAX_TOKENS_PER_TASK));
    setModels(current => {
      const benchmarkMatch = catalog ? matchArtificialAnalysisModel(scenario.model, catalog.data) : null;
      const referenceIndex = benchmarkMatch
        ? Math.max(0, current.findIndex(model => model.aaModelId === benchmarkMatch.id))
        : 0;
      const referenceAssumption = current[referenceIndex]?.outputTokensPerTask ?? scenario.outputTokensPerRun;

      return current.map((model, index) => {
        const scaledOutputTokens = clampNumber(scaleOutputTokensByEfficiency({
          measuredOutputTokens: scenario.outputTokensPerRun,
          referenceOutputTokens: referenceAssumption,
          comparisonOutputTokens: model.outputTokensPerTask,
        }), MAX_TOKENS_PER_TASK);

        if (index !== referenceIndex) return { ...model, outputTokensPerTask: scaledOutputTokens };

        const evidenceModel = benchmarkMatch ? withCatalogModel(model, benchmarkMatch) : model;
        return {
          ...evidenceModel,
          name: scenario.model || evidenceModel.name,
          provider: scenario.model.includes(':') ? scenario.model.slice(0, scenario.model.indexOf(':')) : evidenceModel.provider,
          inputPerMillion: scenario.inputPerMillion ?? evidenceModel.inputPerMillion,
          outputPerMillion: scenario.outputPerMillion ?? evidenceModel.outputPerMillion,
          outputTokensPerTask: clampNumber(scenario.outputTokensPerRun, MAX_TOKENS_PER_TASK),
          rateSource: 'Planner pricing',
        };
      });
    });
    setPlannerApplied(true);
  };

  const rows = useMemo(() => {
    const computed = models.map(model => ({
      ...model,
      taskCost: costPerTask({
        inputTokensPerTask,
        outputTokensPerTask: model.outputTokensPerTask,
        inputPerMillion: model.inputPerMillion,
        outputPerMillion: model.outputPerMillion,
      }),
    }));

    const validTaskCosts = computed.filter(row => row.taskCost !== null) as Array<(typeof computed)[number] & { taskCost: number }>;
    const cheapestPerTask = validTaskCosts.length
      ? validTaskCosts.reduce((best, row) => (row.taskCost < best.taskCost ? row : best))
      : null;
    const cheapestPerToken = computed.reduce((best, row) => (row.outputPerMillion < best.outputPerMillion ? row : best));

    return computed.map(row => {
      const isCheapestPerTask = cheapestPerTask !== null && row.key === cheapestPerTask.key;
      const breakEven =
        !isCheapestPerTask && cheapestPerTask !== null
          ? breakEvenOutputRate(
              {
                inputTokensPerTask,
                outputTokensPerTask: cheapestPerTask.outputTokensPerTask,
                inputPerMillion: cheapestPerTask.inputPerMillion,
                outputPerMillion: cheapestPerTask.outputPerMillion,
              },
              {
                inputTokensPerTask,
                outputTokensPerTask: row.outputTokensPerTask,
                inputPerMillion: row.inputPerMillion,
              }
            )
          : null;

      return {
        ...row,
        isCheapestPerTask,
        isCheapestPerToken: row.key === cheapestPerToken.key,
        breakEven,
      };
    });
  }, [models, inputTokensPerTask]);

  return (
    <section id="efficiency-lab" className="mx-auto w-full max-w-[1500px] border-x border-b border-rose-highlightMed bg-rose-base px-4 py-12 sm:px-6 md:px-12 md:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="data-label">Efficiency lab</p>
          <h2 className="mt-4 max-w-4xl text-[clamp(2.2rem,5vw,4.6rem)] font-black uppercase leading-[0.9] tracking-[-0.06em] text-rose-text">
            Price the task, then argue about the rate card.
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setModels(initialModels());
            setTasks(DEFAULT_TASKS);
            setInputTokensPerTask(DEFAULT_INPUT_TOKENS_PER_TASK);
            setPlannerApplied(false);
          }}
          className="self-start border border-rose-highlightMed bg-rose-base px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-subtle transition duration-200 hover:border-rose-love hover:text-rose-text focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none sm:self-end"
        >
          Reset presets
        </button>
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
        Every field is editable. Pick benchmarked models, then use your own measured token counts. The comparison
        keeps published evidence separate from your workload assumptions.
      </p>

      <div className="mt-6 flex flex-col gap-3 border border-rose-highlightMed bg-rose-overlay p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-love">
            Artificial Analysis catalog · {catalogModels.length.toLocaleString()} models
          </p>
          <p className="mt-2 text-xs leading-5 text-rose-muted">
            Source: {catalogError ? 'unavailable, editable presets retained' : sourceLabel(catalog?.source)}.
            {catalog?.intelligenceIndexVersion ? ` Intelligence Index v${catalog.intelligenceIndexVersion}.` : ''}
          </p>
        </div>
        <a
          href="https://artificialanalysis.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-text underline decoration-rose-love underline-offset-4 hover:text-rose-love"
        >
          Artificial Analysis
        </a>
      </div>

      {scenario && (
        <div className="mt-4 flex flex-col gap-3 border border-rose-highlightMed p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="data-label">Active planner scenario</p>
            <p className="mt-2 text-sm text-rose-subtle">
              {scenario.model || 'Selected model'} · {scenario.inputTokensPerRun.toLocaleString()} input · {scenario.outputTokensPerRun.toLocaleString()} output · {scenario.workloadRuns.toLocaleString()} runs / {scenario.workloadCadence}
            </p>
            {plannerApplied && <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-love">Planner scenario applied</p>}
          </div>
          <button
            type="button"
            onClick={usePlannerWorkload}
            className="action-secondary justify-center"
          >
            Use planner workload
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        <div>
          <label className="data-label" htmlFor="efficiency-tasks">
            Tasks in workload
          </label>
          <input
            id="efficiency-tasks"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_TASKS}
            step={1}
            value={tasks}
            onChange={e => setTasks(Math.max(1, Math.floor(clampNumber(Number(e.target.value), MAX_TASKS))))}
            className={`mt-2 ${fieldInputClass}`}
          />
        </div>
        <div>
          <label className="data-label" htmlFor="efficiency-input-tokens">
            Input tokens per task
          </label>
          <input
            id="efficiency-input-tokens"
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_TOKENS_PER_TASK}
            step={64}
            value={inputTokensPerTask}
            onChange={e => setInputTokensPerTask(clampNumber(Number(e.target.value), MAX_TOKENS_PER_TASK))}
            className={`mt-2 ${fieldInputClass}`}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-px bg-rose-highlightMed lg:grid-cols-3">
        {rows.map((row, index) => (
          <article key={row.key} className="flex flex-col bg-rose-base p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-rose-text">{row.name}</h3>
                <p className="mt-1 text-xs text-rose-muted">{row.provider}</p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-rose-muted">Rates: {row.rateSource}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {row.isCheapestPerToken && (
                  <span className="border border-rose-highlightMed px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-rose-muted">
                    Lowest rate card
                  </span>
                )}
                {row.isCheapestPerTask && (
                  <span className="bg-rose-love px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                    Cheapest per task
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-rose-muted" htmlFor={`${row.key}-catalog-model`}>
                Comparison model {index + 1}
              </label>
              <select
                id={`${row.key}-catalog-model`}
                value={row.aaModelId ?? ''}
                onChange={event => selectCatalogModel(row.key, event.target.value)}
                disabled={catalogModels.length === 0}
                className="glass-select mt-1 min-h-11 w-full border px-3 font-mono text-xs font-bold text-rose-text focus:border-rose-love focus:outline-none focus:ring-2 focus:ring-rose-love disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">{catalogModels.length ? 'Choose from catalog' : 'Catalog loading'}</option>
                {catalogModels.map(model => (
                  <option key={model.id} value={model.id}>{model.displayName}</option>
                ))}
              </select>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-px bg-rose-highlightMed">
              <div className="bg-rose-base p-3">
                <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-rose-muted">AA intelligence</dt>
                <dd className="mt-1 font-mono text-sm font-bold text-rose-text tabular-nums">{row.intelligenceIndex ?? 'N/A'}</dd>
              </div>
              <div className="bg-rose-base p-3">
                <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-rose-muted">AA cost / task</dt>
                <dd className="mt-1 font-mono text-sm font-bold text-rose-text tabular-nums">{formatCost(row.benchmarkCostPerTask)}</dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-3">
              <div>
                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-rose-muted" htmlFor={`${row.key}-input-rate`}>
                  Input $ / M tokens
                </label>
                <input
                  id={`${row.key}-input-rate`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.05}
                  value={row.inputPerMillion}
                  onChange={e => updateModel(row.key, 'inputPerMillion', Number(e.target.value))}
                  className={`mt-1 ${fieldInputClass}`}
                />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-rose-muted" htmlFor={`${row.key}-output-rate`}>
                  Output $ / M tokens
                </label>
                <input
                  id={`${row.key}-output-rate`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.05}
                  value={row.outputPerMillion}
                  onChange={e => updateModel(row.key, 'outputPerMillion', Number(e.target.value))}
                  className={`mt-1 ${fieldInputClass}`}
                />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-rose-muted" htmlFor={`${row.key}-output-tokens`}>
                  Your output tokens / task
                </label>
                <input
                  id={`${row.key}-output-tokens`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={500}
                  value={row.outputTokensPerTask}
                  onChange={e => updateModel(row.key, 'outputTokensPerTask', Number(e.target.value))}
                  className={`mt-1 ${fieldInputClass}`}
                />
              </div>
            </div>

            <div className="mt-6 border-t border-rose-highlightMed pt-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-rose-muted">Cost per task</p>
              <output className="mt-1 block font-mono text-2xl font-black text-rose-love tabular-nums">
                {formatCost(row.taskCost)}
              </output>
              <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-rose-muted">
                {tasks.toLocaleString()} tasks
              </p>
              <output className="mt-1 block font-mono text-sm font-bold text-rose-text tabular-nums">
                {formatCost(row.taskCost === null ? null : row.taskCost * tasks)}
              </output>
              {row.outputTokensPerSecond !== null && (
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-rose-muted">
                  AA speed · {row.outputTokensPerSecond.toLocaleString()} output tok/s
                </p>
              )}
              {row.breakEven !== null && (
                <p className="mt-4 text-xs leading-5 text-rose-muted">
                  At {row.outputTokensPerTask.toLocaleString()} tokens per task, this model needs an output rate at or
                  below <span className="font-mono font-bold text-rose-text">{formatCost(row.breakEven)}</span> / M to
                  tie the cheapest per-task model.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-muted">
        Cache reads, cache writes, and multi-turn history re-sends are deliberately out of scope here; they change the
        input side, not the verbosity story. Model a full session on the planner when those matter. A blank AA cost per
        task means the active catalog source did not publish that metric; Prompt Info does not manufacture it.
      </p>
    </section>
  );
}
