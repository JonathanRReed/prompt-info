'use client';

import { useMemo, useState } from 'react';
import { breakEvenOutputRate, costPerTask, EFFICIENCY_PRESETS } from '../../lib/tokenEfficiency';

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
};

type EditableRateField = 'inputPerMillion' | 'outputPerMillion' | 'outputTokensPerTask';

function initialModels(): EditableModel[] {
  return EFFICIENCY_PRESETS.map(({ key, name, provider, inputPerMillion, outputPerMillion, outputTokensPerTask }) => ({
    key,
    name,
    provider,
    inputPerMillion,
    outputPerMillion,
    outputTokensPerTask,
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

const fieldInputClass =
  'glass-select w-full border px-3 py-2 text-right font-mono text-sm font-bold text-rose-text tabular-nums focus:border-rose-love focus:outline-none focus:ring-2 focus:ring-rose-love [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export default function TokenEfficiencyPageClient() {
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [inputTokensPerTask, setInputTokensPerTask] = useState(DEFAULT_INPUT_TOKENS_PER_TASK);
  const [models, setModels] = useState<EditableModel[]>(initialModels);

  const updateModel = (key: string, field: EditableRateField, rawValue: number) => {
    const max = field === 'outputTokensPerTask' ? MAX_TOKENS_PER_TASK : MAX_RATE_PER_MILLION;
    const value = clampNumber(rawValue, max);
    setModels(prev => prev.map(model => (model.key === key ? { ...model, [field]: value } : model)));
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
          }}
          className="self-start border border-rose-highlightMed bg-rose-base px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-subtle transition duration-200 hover:border-rose-love hover:text-rose-text focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none sm:self-end"
        >
          Reset presets
        </button>
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
        Every field is editable. Swap in your own models, rates, and measured token counts; the math is just price
        times tokens, per task and per workload.
      </p>

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
        {rows.map(row => (
          <article key={row.key} className="flex flex-col bg-rose-base p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-rose-text">{row.name}</h3>
                <p className="mt-1 text-xs text-rose-muted">{row.provider}</p>
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
                  Output tokens per task
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
        input side, not the verbosity story. Model a full session on the planner when those matter.
      </p>
    </section>
  );
}
