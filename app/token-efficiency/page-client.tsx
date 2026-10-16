'use client';

import { useEffect, useMemo, useState } from 'react';
import ModelSelect from '../../components/ModelSelect';
import { usePromptScenario } from '../../components/ScenarioProvider';
import {
  fetchPricing,
  type PricingCatalogResponse,
} from '../../lib/fetchPricing';
import { chooseDefaultModels } from '../../lib/modelSelection';
import { editedRate } from '../../lib/efficiencyModelRates';
import { costPerTask } from '../../lib/tokenEfficiency';
import { formatUsd } from '../../components/charts/chartFormat';

type Row = {
  key: string;
  name: string;
  inputRate: number | null;
  outputRate: number | null;
  tokens: number;
};
const INITIAL: Row[] = ['a', 'b', 'c'].map((key) => ({
  key,
  name: '',
  inputRate: null,
  outputRate: null,
  tokens: 500,
}));
const safeCount = (raw: string): number =>
  raw.trim() && Number.isSafeInteger(Number(raw)) && Number(raw) >= 0
    ? Number(raw)
    : NaN;
const inputClass =
  'glass-select mt-2 min-h-11 w-full border px-3 py-2 font-mono text-sm text-rose-text';

export default function TokenEfficiencyPageClient() {
  const { scenario } = usePromptScenario();
  const [catalog, setCatalog] = useState<PricingCatalogResponse | null>(null);
  const [error, setError] = useState('');
  const [request, setRequest] = useState(0);
  const [rows, setRows] = useState<Row[]>(INITIAL);
  const [input, setInput] = useState(5000);
  const [tasks, setTasks] = useState(1);
  const [tasksDraft, setTasksDraft] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setError('');
    fetchPricing()
      .then((response) => {
        if (cancelled) return;
        setCatalog(response);
        const defaults = chooseDefaultModels(
          Object.keys(response.data),
          response.data,
          3,
        );
        setRows((current) =>
          current.map((row, index) => {
            const name = response.data[row.name]
              ? row.name
              : (defaults[index] ?? '');
            const price = response.data[name]?.pricing;
            return {
              ...row,
              name,
              inputRate: price ? price.input * 1000 : null,
              outputRate: price ? price.output * 1000 : null,
            };
          }),
        );
      })
      .catch((error) => {
        if (!cancelled)
          setError(
            error instanceof Error ? error.message : 'Prices unavailable.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [request]);
  const select = (key: string, name: string) => {
    const rates = catalog?.data[name]?.pricing;
    setRows((current) =>
      current.map((row) =>
        row.key === key
          ? {
              ...row,
              name,
              inputRate: rates ? rates.input * 1000 : null,
              outputRate: rates ? rates.output * 1000 : null,
            }
          : row,
      ),
    );
  };
  const update = (
    key: string,
    field: 'inputRate' | 'outputRate' | 'tokens',
    raw: string,
  ) =>
    setRows((current) =>
      current.map((row) =>
        row.key === key
          ? {
              ...row,
              [field]:
                field === 'tokens' ? safeCount(raw) : editedRate(raw, 1000000),
            }
          : row,
      ),
    );
  const calculated = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        cost: costPerTask({
          inputTokensPerTask: input,
          outputTokensPerTask: row.tokens,
          inputPerMillion: row.inputRate,
          outputPerMillion: row.outputRate,
        }),
      })),
    [rows, input],
  );
  const maximum = Math.max(0, ...calculated.map((row) => row.cost ?? 0));
  const outputMaximum = Math.max(
    1,
    ...rows.map((row) => (Number.isFinite(row.tokens) ? row.tokens : 0)),
  );
  const applyPlanner = () => {
    if (!scenario) return;
    setInput(scenario.inputTokensPerRun);
    setTasks(scenario.workloadRuns);
    setTasksDraft(null);
    setRows((current) =>
      current.map((row, index) => ({
        ...row,
        tokens: scenario.outputTokensPerRun,
        ...(index === 0
          ? {
              name: scenario.model,
              inputRate: scenario.inputPerMillion,
              outputRate: scenario.outputPerMillion,
            }
          : {}),
      })),
    );
    setImported(true);
  };
  return (
    <section
      id="efficiency-lab"
      className="mx-auto w-full max-w-[1500px] border-b border-rose-highlightMed bg-rose-base p-4 sm:p-6 md:p-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Compare a task</h2>
        <button
          className="action-secondary"
          type="button"
          onClick={() => {
            setInput(5000);
            setTasks(1);
            setTasksDraft(null);
            setRows((current) =>
              current.map((row) => ({ ...row, tokens: 500 })),
            );
            setImported(false);
          }}
        >
          Reset token assumptions
        </button>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-rose-subtle">
        Start with equal output lengths, then change them to test a hypothesis
        or enter measured usage. Output includes billed thinking. These counts
        are editable examples, not model-specific predictions.
      </p>
      <p className="mt-3 text-xs leading-6 text-rose-muted">
        {catalog ? (
          <>
            <a className="underline" href={catalog.sourceUrl}>
              {catalog.source === 'openrouter-live'
                ? 'OpenRouter price catalog'
                : 'Dated price catalog'}
            </a>{' '}
            · {new Date(catalog.retrievedAt).toLocaleDateString()} ·{' '}
            {catalog.freshness === 'live' ? 'live rates' : 'fallback rates'}
          </>
        ) : (
          error || 'Loading current model prices…'
        )}{' '}
        <button
          className="underline"
          type="button"
          onClick={() => setRequest((value) => value + 1)}
        >
          Refresh prices
        </button>
      </p>
      {catalog?.isFallback && (
        <p role="note" className="mt-2 text-xs text-rose-muted">
          {catalog.fallbackReason}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-subtle">
          Enter rates manually or refresh to try again.
        </p>
      )}
      {scenario && (
        <div className="mt-5 border border-rose-highlightMed p-4">
          <button
            className="action-secondary"
            type="button"
            onClick={applyPlanner}
          >
            Use planner token totals
          </button>
          <p className="mt-2 text-xs text-rose-muted">
            Imports the same input and output totals into this simplified
            comparison. Caching and conditional tiers are excluded, so it will
            not reproduce an agent receipt.
          </p>
          {imported && (
            <p role="status" className="mt-2 text-sm text-signal-text">
              Planner token totals applied equally.
            </p>
          )}
        </div>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <div>
          <label htmlFor="efficiency-input-tokens" className="data-label">
            Input tokens per task
          </label>
          <input
            id="efficiency-input-tokens"
            className={inputClass}
            type="number"
            min={0}
            max={Number.MAX_SAFE_INTEGER}
            value={Number.isFinite(input) ? input : ''}
            onChange={(e) => setInput(safeCount(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="efficiency-tasks" className="data-label">
            Tasks in workload
          </label>
          <input
            id="efficiency-tasks"
            className={inputClass}
            type="number"
            min={1}
            max={1000000}
            value={tasksDraft ?? tasks}
            onChange={(e) => {
              setTasksDraft(e.target.value);
              const n = safeCount(e.target.value);
              if (n >= 1 && n <= 1000000) setTasks(n);
            }}
            onBlur={() => setTasksDraft(null)}
          />
        </div>
      </div>
      <section
        className="efficiency-chart-grid"
        aria-label="Calculated cost and output comparison"
      >
        <div className="efficiency-chart">
          <h3>Cost per task</h3>
          <div className="efficiency-bar-list">
            {calculated.map((row, index) => (
              <div className="efficiency-bar-row" key={row.key}>
                <div>
                  <strong>{row.name || `Model ${index + 1}`}</strong>
                  <span>{formatUsd(row.cost)}</span>
                </div>
                <div className="efficiency-bar-track" aria-hidden="true">
                  <span
                    style={{
                      transform: `scaleX(${maximum ? (row.cost ?? 0) / maximum : 0})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="efficiency-chart">
          <h3>Output tokens per task</h3>
          <div className="efficiency-bar-list">
            {rows.map((row, index) => (
              <div className="efficiency-bar-row" key={row.key}>
                <div>
                  <strong>{row.name || `Model ${index + 1}`}</strong>
                  <span>
                    {Number.isFinite(row.tokens)
                      ? row.tokens.toLocaleString()
                      : '—'}
                  </span>
                </div>
                <div className="efficiency-bar-track" aria-hidden="true">
                  <span
                    style={{
                      transform: `scaleX(${Number.isFinite(row.tokens) ? row.tokens / outputMaximum : 0})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {calculated.map((row, index) => (
          <article
            key={row.key}
            className="min-w-0 border border-rose-highlightMed bg-rose-surface p-4 sm:p-5"
          >
            <h3 className="text-sm font-semibold text-rose-text">
              {row.name || `Model ${index + 1}`}
            </h3>
            <div className="mt-4">
              <label
                htmlFor={`efficiency-model-${row.key}`}
                className="data-label"
              >
                Comparison model {index + 1}
              </label>
              <ModelSelect
                id={`efficiency-model-${row.key}`}
                models={Object.keys(catalog?.data ?? {})}
                pricing={catalog?.data}
                value={row.name}
                loading={!catalog && !error}
                autoSelect={false}
                onChange={(name) => select(row.key, name)}
              />
            </div>
            <div className="mt-5 space-y-4">
              {(
                [
                  ['inputRate', 'Input $ / M tokens'],
                  ['outputRate', 'Output $ / M tokens'],
                  ['tokens', 'Your output tokens / task'],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <label
                    htmlFor={`${row.key}-${field}`}
                    className="text-xs text-rose-subtle"
                  >
                    {label}
                  </label>
                  <input
                    id={`${row.key}-${field}`}
                    type="number"
                    min={0}
                    max={field === 'tokens' ? Number.MAX_SAFE_INTEGER : 1000000}
                    step={field === 'tokens' ? 1 : 0.01}
                    className={inputClass}
                    value={
                      row[field] !== null && Number.isFinite(row[field])
                        ? row[field]!
                        : ''
                    }
                    placeholder="Not reported"
                    onChange={(e) => update(row.key, field, e.target.value)}
                  />
                </div>
              ))}
            </div>
            {(row.inputRate === null || row.outputRate === null) && (
              <p role="status" className="mt-3 text-xs text-rose-subtle">
                A price is not reported. Enter both rates to calculate task
                cost.
              </p>
            )}
            <div className="mt-5 border-t border-rose-highlightMed pt-4">
              <p className="text-xs text-rose-muted">Cost per task</p>
              <output className="mt-1 block font-mono text-2xl font-bold text-signal-text">
                {formatUsd(row.cost)}
              </output>
              {tasks > 1 && (
                <>
                  <p className="mt-3 text-xs text-rose-muted">
                    {tasks.toLocaleString()} tasks
                  </p>
                  <output className="font-mono text-lg">
                    {formatUsd(row.cost === null ? null : row.cost * tasks)}
                  </output>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="mt-5 max-w-3xl text-sm leading-7 text-rose-muted">
        This compares token rates and volume. Cache pricing, conditional
        long-context tiers and hosted tools are outside this simple view. Equal
        token counts do not establish equal quality or equal work.
      </p>
    </section>
  );
}
