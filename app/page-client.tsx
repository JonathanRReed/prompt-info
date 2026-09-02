'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CostByModelChart } from '../components/charts/CostByModelChart';
import { SessionAccumulationChart } from '../components/charts/SessionAccumulationChart';
import { TokenCompositionChart } from '../components/charts/TokenCompositionChart';
import { CostReceipt } from '../components/workbench/CostReceipt';
import { CostWorkbench } from '../components/workbench/CostWorkbench';
import { ModelComparison } from '../components/workbench/ModelComparison';
import { ScenarioInputs, type TokenizerChoice } from '../components/workbench/ScenarioInputs';
import { SourceStatus } from '../components/workbench/SourceStatus';
import { BudgetSensitivity } from '../components/workbench/BudgetSensitivity';
import { usePromptScenario } from '../components/ScenarioProvider';
import {
  buildCostComparison,
  buildSessionAccumulation,
  buildTokenComposition,
  type CostComparisonScenario,
} from '../lib/costComparison';
import { fetchPricing, type PricingCatalogResponse, type PricingMap } from '../lib/fetchPricing';
import { chooseDefaultModels } from '../lib/modelSelection';
import { getModelTokenizerMultiplier, resolveModelTokenProfile } from '../lib/modelTokenLimits';
import type { SessionRunMode } from '../lib/sessionMath';
import type { WorkloadCadence } from '../lib/workloadMath';
import {
  parseScenarioRecipe,
  SCENARIO_RECIPE_SCHEMA,
  type ScenarioRecipe,
} from '../lib/scenarioRecipe';

const SAMPLE_PROMPT = 'Summarize a ten-page research brief, identify the three highest-impact findings, and return a concise decision memo with citations.';
const MAX_OUTPUT_TOKENS = 300_000;

const TOKENIZERS = [
  { key: 'o200k_base', label: 'o200k_base', description: 'Current OpenAI and broadly compatible planning count' },
  { key: 'cl100k_base', label: 'cl100k_base', description: 'GPT-4, GPT-3.5, and embedding-era count' },
  { key: 'p50k_base', label: 'p50k_base', description: 'Older code-focused model count' },
  { key: 'p50k_edit', label: 'p50k_edit', description: 'Legacy edit-model count' },
  { key: 'r50k_base', label: 'r50k_base', description: 'Legacy GPT-3 base-model count' },
] as const satisfies readonly TokenizerChoice[];

type TokenizerKey = typeof TOKENIZERS[number]['key'];
type TokenizerModule = {
  encode: (text: string) => number[];
  decode: (tokens: Iterable<number>) => string;
};

const TOKENIZER_IMPORTERS: Record<TokenizerKey, () => Promise<TokenizerModule>> = {
  o200k_base: () => import('gpt-tokenizer/encoding/o200k_base'),
  cl100k_base: () => import('gpt-tokenizer/encoding/cl100k_base'),
  p50k_base: () => import('gpt-tokenizer/encoding/p50k_base'),
  p50k_edit: () => import('gpt-tokenizer/encoding/p50k_edit'),
  r50k_base: () => import('gpt-tokenizer/encoding/r50k_base'),
};

function clampInteger(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function bundledCatalog(data: PricingMap): PricingCatalogResponse {
  return {
    schemaVersion: 1,
    data,
    source: 'bundled-static',
    sourceUrl: 'https://prompt-info.helloworldfirm.com/data/llm-data.json',
    retrievedAt: new Date().toISOString(),
    freshness: 'static',
    isFallback: true,
    fallbackReason: 'The pricing API was unavailable. Using the bundled dated catalog.',
  };
}

export default function HomePageClient() {
  const { setScenario } = usePromptScenario();
  const [prompt, setPrompt] = useState(SAMPLE_PROMPT);
  const [tokenizer, setTokenizer] = useState<TokenizerKey>('o200k_base');
  const [tokenCount, setTokenCount] = useState(0);
  const [promptTokenOverride, setPromptTokenOverride] = useState<number | null>(null);
  const [decodedTokens, setDecodedTokens] = useState<Array<{ id: number; text: string }>>([]);
  const [tokenizing, setTokenizing] = useState(true);
  const [tokenizationError, setTokenizationError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<PricingCatalogResponse | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingRequest, setPricingRequest] = useState(0);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [outputTokens, setOutputTokens] = useState(2_048);
  const [turns, setTurns] = useState(1);
  const [sessionMode, setSessionMode] = useState<SessionRunMode>('baseline');
  const [workloadRuns, setWorkloadRuns] = useState(100);
  const [workloadCadence, setWorkloadCadence] = useState<WorkloadCadence>('month');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [monthlyBudget, setMonthlyBudget] = useState(100);
  const [volumeVariancePct, setVolumeVariancePct] = useState(20);
  const [retryRatePct, setRetryRatePct] = useState(5);
  const [recipeState, setRecipeState] = useState<'idle' | 'exported' | 'imported' | 'error'>('idle');
  const recipeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setPricingLoading(true);
    setPricingError(null);

    (async () => {
      try {
        const response = await fetchPricing();
        if (cancelled) return;
        setCatalog(response);
        const models = Object.keys(response.data);
        setSelectedModels(current => {
          const valid = current.filter(model => models.includes(model)).slice(0, 3);
          return valid.length >= 2 ? valid : chooseDefaultModels(models, response.data, 2);
        });
      } catch (error) {
        try {
          const response = await fetch('/data/llm-data.json', { headers: { Accept: 'application/json' } });
          if (!response.ok) throw new Error(`Bundled catalog returned ${response.status}`);
          const data = await response.json() as PricingMap;
          if (cancelled) return;
          const fallback = bundledCatalog(data);
          setCatalog(fallback);
          setSelectedModels(chooseDefaultModels(Object.keys(data), data, 2));
        } catch {
          if (cancelled) return;
          setCatalog(null);
          setPricingError(error instanceof Error ? error.message : 'Pricing catalog is unavailable.');
        }
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pricingRequest]);

  useEffect(() => {
    let cancelled = false;
    let worker: Worker | null = null;
    let fallbackStarted = false;
    setTokenizing(true);
    setTokenizationError(null);
    setTokenCount(0);
    setDecodedTokens([]);
    const timeout = window.setTimeout(() => {
      (async () => {
        if (!prompt) {
          if (!cancelled) {
            setTokenizing(false);
          }
          return;
        }

        const applyResult = (count: number, decoded: Array<{ id: number; text: string }>) => {
          if (cancelled) return;
          setTokenCount(count);
          setDecodedTokens(decoded);
          setTokenizationError(null);
          setTokenizing(false);
        };

        const tokenizeOnMainThread = async () => {
          if (fallbackStarted || cancelled) return;
          fallbackStarted = true;
          worker?.terminate();
          worker = null;
          try {
            const encoder = await TOKENIZER_IMPORTERS[tokenizer]();
            if (cancelled) return;
            const encoded = encoder.encode(prompt);
            applyResult(
              encoded.length,
              encoded.slice(0, 400).map(id => ({ id, text: encoder.decode([id]) })),
            );
          } catch {
            if (!cancelled) {
              setTokenizationError('Token count unavailable');
              setTokenizing(false);
            }
          }
        };

        if (typeof Worker === 'undefined') {
          await tokenizeOnMainThread();
          return;
        }

        try {
          worker = new Worker(new URL('../workers/tokenizer.worker.ts', import.meta.url), { type: 'module' });
          const requestId = Date.now();
          worker.onmessage = event => {
            if (cancelled || event.data.requestId !== requestId) return;
            if (event.data.error) {
              void tokenizeOnMainThread();
              return;
            }
            applyResult(event.data.count, event.data.decoded);
            worker?.terminate();
            worker = null;
          };
          worker.onerror = () => {
            void tokenizeOnMainThread();
          };
          worker.postMessage({ requestId, tokenizer, prompt });
        } catch {
          await tokenizeOnMainThread();
        }
      })();
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      worker?.terminate();
      worker = null;
    };
  }, [prompt, tokenizer]);

  const pricing = catalog?.data ?? null;
  const availableModels = useMemo(() => Object.keys(pricing ?? {}), [pricing]);
  const effectiveTokenCount = promptTokenOverride ?? tokenCount;
  const baseScenario = useMemo<CostComparisonScenario>(() => ({
    mode: sessionMode,
    promptTokens: effectiveTokenCount,
    referenceOutputTokens: outputTokens,
    turns,
    outputTokenLimit: MAX_OUTPUT_TOKENS,
    contextWindowTokens: 1_000_000,
  }), [effectiveTokenCount, outputTokens, sessionMode, turns]);

  const selectedPricingModels = useMemo(() => selectedModels.map(model => {
    const entry = pricing?.[model];
    const company = resolveModelTokenProfile(model, entry).company;
    return {
      model,
      entry,
      promptTokenMultiplier: getModelTokenizerMultiplier(model, company),
    };
  }), [pricing, selectedModels]);

  const comparison = useMemo(() => buildCostComparison({
    models: selectedPricingModels,
    scenario: baseScenario,
    workload: { runs: workloadRuns, cadence: workloadCadence },
  }), [baseScenario, selectedPricingModels, workloadCadence, workloadRuns]);
  const primaryRow = comparison.rows[0] ?? null;
  const primaryEntry = primaryRow?.entry ?? null;
  const primaryMultiplier = selectedPricingModels[0]?.promptTokenMultiplier ?? 1;
  const tokenComposition = primaryRow?.estimate ? buildTokenComposition(primaryRow.estimate) : [];
  const accumulation = useMemo(() => primaryEntry
    ? buildSessionAccumulation({
        entry: primaryEntry,
        scenario: {
          ...baseScenario,
          promptTokens: Math.round(baseScenario.promptTokens * primaryMultiplier),
        },
      })
    : [], [baseScenario, primaryEntry, primaryMultiplier]);
  const chartMetric = workloadCadence === 'once' ? 'sessionCost' : 'monthlyCost';
  const billedTokenNote = primaryMultiplier === 1 || effectiveTokenCount === 0
    ? null
    : `, about ${Math.round(effectiveTokenCount * primaryMultiplier).toLocaleString()} billed for ${primaryRow?.model ?? 'this provider'}`;

  useEffect(() => {
    if (!primaryRow || !primaryEntry) return;
    setScenario({
      prompt,
      model: primaryRow.model,
      tokenizer,
      inputTokensPerRun: Math.round(effectiveTokenCount * primaryMultiplier),
      outputTokensPerRun: outputTokens,
      turns,
      sessionMode,
      inputPerMillion: primaryEntry.pricing.input * 1_000,
      outputPerMillion: primaryEntry.pricing.output * 1_000,
      costPerRun: primaryRow.sessionCost,
      workloadRuns,
      workloadCadence,
    });
  }, [effectiveTokenCount, outputTokens, primaryEntry, primaryMultiplier, primaryRow, prompt, sessionMode, setScenario, tokenizer, turns, workloadCadence, workloadRuns]);

  function replaceModel(index: number, model: string) {
    setSelectedModels(current => current.map((value, position) => position === index ? model : value));
  }

  function addModel() {
    if (!pricing || selectedModels.length >= 3) return;
    const preferred = chooseDefaultModels(availableModels, pricing, 3).find(model => !selectedModels.includes(model));
    const next = preferred ?? availableModels.find(model => !selectedModels.includes(model));
    if (next) setSelectedModels(current => [...current, next].slice(0, 3));
  }

  function removeModel(index: number) {
    setSelectedModels(current => current.filter((_, position) => position !== index));
  }

  function receiptText() {
    const source = catalog ? `${catalog.source}, retrieved ${catalog.retrievedAt}` : 'pricing unavailable';
    return [
      'Prompt Info cost receipt',
      `Model: ${primaryRow?.model ?? 'Unavailable'}`,
      `Prompt tokens: ${effectiveTokenCount.toLocaleString()}`,
      `Output tokens per turn: ${outputTokens.toLocaleString()}`,
      `Turns: ${turns.toLocaleString()} (${sessionMode})`,
      `Runs: ${workloadRuns.toLocaleString()} per ${workloadCadence}`,
      `Planning range: plus or minus ${volumeVariancePct}% volume, ${retryRatePct}% retry allowance`,
      `Monthly budget: ${monthlyBudget > 0 ? `$${monthlyBudget.toLocaleString()}` : 'not set'}`,
      `One request: ${primaryRow?.requestCost ?? 'Unavailable'}`,
      `Session: ${primaryRow?.sessionCost ?? 'Unavailable'}`,
      `Monthly: ${primaryRow?.monthlyCost ?? 'Unavailable'}`,
      `Annual: ${primaryRow?.annualCost ?? 'Unavailable'}`,
      `Source: ${source}`,
      'Prompt text remained in the browser.',
    ].join('\n');
  }

  async function copyReceipt() {
    try {
      await navigator.clipboard.writeText(receiptText());
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1_500);
    } catch {
      setCopyState('error');
    }
  }

  async function exportReceipt() {
    if (!primaryRow) return;
    const { downloadCostReceiptImage } = await import('../lib/receiptExport');
    downloadCostReceiptImage({
      row: primaryRow,
      assumptions: [
        `${effectiveTokenCount.toLocaleString()} prompt tokens, ${outputTokens.toLocaleString()} output tokens`,
        `${turns.toLocaleString()} turns, ${sessionMode} session`,
        `${workloadRuns.toLocaleString()} runs per ${workloadCadence}`,
      ],
      source: catalog ? `${catalog.source}, ${catalog.retrievedAt}` : 'Pricing source unavailable',
    });
  }

  function exportScenarioRecipe() {
    const recipe: ScenarioRecipe = {
      schemaVersion: SCENARIO_RECIPE_SCHEMA,
      createdAt: new Date().toISOString(),
      privacy: { promptIncluded: false },
      promptTokens: effectiveTokenCount,
      tokenizer,
      selectedModels,
      outputTokens,
      turns,
      sessionMode,
      workloadRuns,
      workloadCadence,
      planning: { monthlyBudget, volumeVariancePct, retryRatePct },
      source: { name: catalog?.source ?? null, retrievedAt: catalog?.retrievedAt ?? null },
    };
    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `prompt-info-scenario-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    setRecipeState('exported');
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  async function importScenarioRecipe(file: File | undefined) {
    if (!file) return;
    try {
      const recipe = parseScenarioRecipe(JSON.parse(await file.text()));
      if (!recipe || !TOKENIZERS.some(option => option.key === recipe.tokenizer)) throw new Error('Invalid scenario recipe');
      const validModels = recipe.selectedModels.filter(model => availableModels.includes(model));
      if (validModels.length === 0) throw new Error('Scenario models are not in the current catalog');
      setPromptTokenOverride(recipe.promptTokens);
      setTokenizer(recipe.tokenizer as TokenizerKey);
      setSelectedModels(validModels.slice(0, 3));
      setOutputTokens(recipe.outputTokens);
      setTurns(recipe.turns);
      setSessionMode(recipe.sessionMode);
      setWorkloadRuns(recipe.workloadRuns);
      setWorkloadCadence(recipe.workloadCadence);
      setMonthlyBudget(recipe.planning.monthlyBudget);
      setVolumeVariancePct(recipe.planning.volumeVariancePct);
      setRetryRatePct(recipe.planning.retryRatePct);
      setRecipeState('imported');
    } catch {
      setRecipeState('error');
    }
  }

  return (
    <>
      <div className="workbench-source-wrap">
        <SourceStatus
          catalog={catalog}
          modelCount={availableModels.length}
          loading={pricingLoading}
          error={pricingError}
          onRetry={() => setPricingRequest(value => value + 1)}
        />
      </div>

      <CostWorkbench
        scenario={(
          <ScenarioInputs
            prompt={prompt}
            samplePrompt={SAMPLE_PROMPT}
            onPromptChange={value => {
              setPromptTokenOverride(null);
              setPrompt(value);
            }}
            promptTokens={effectiveTokenCount}
            tokenizing={tokenizing}
            tokenizationError={tokenizationError}
            billedTokenNote={billedTokenNote}
            tokenizers={TOKENIZERS}
            tokenizer={tokenizer}
            onTokenizerChange={value => {
              setPromptTokenOverride(null);
              setTokenizer(value as TokenizerKey);
            }}
            outputTokens={outputTokens}
            onOutputTokensChange={value => setOutputTokens(clampInteger(value, 64, MAX_OUTPUT_TOKENS, 2_048))}
            turns={turns}
            onTurnsChange={value => setTurns(clampInteger(value, 1, 200, 1))}
            sessionMode={sessionMode}
            onSessionModeChange={setSessionMode}
            workloadRuns={workloadRuns}
            onWorkloadRunsChange={value => setWorkloadRuns(clampInteger(value, 1, 1_000_000, 1))}
            workloadCadence={workloadCadence}
            onWorkloadCadenceChange={setWorkloadCadence}
          />
        )}
        receipt={(
          <CostReceipt
            row={primaryRow}
            recommendation={comparison.recommendation}
            catalog={catalog}
            onCopy={copyReceipt}
            onExport={exportReceipt}
            copyState={copyState}
          />
        )}
      />

      <div className="workbench-section-shell">
        <div className="scenario-recipe-actions">
          <div>
            <p className="data-label">Reproducible scenario</p>
            <p>Export or import the model set and numeric assumptions. Prompt text is never included.</p>
          </div>
          <div>
            <button
              type="button"
              onClick={exportScenarioRecipe}
              disabled={selectedModels.length === 0 || tokenizing || effectiveTokenCount === 0}
            >
              Export scenario JSON
            </button>
            <button type="button" onClick={() => recipeInputRef.current?.click()} disabled={availableModels.length === 0}>Import scenario JSON</button>
            <input
              ref={recipeInputRef}
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={event => {
                void importScenarioRecipe(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
          </div>
          <p className="scenario-recipe-status" role="status">
            {recipeState === 'exported'
              ? 'Scenario exported without prompt text.'
              : recipeState === 'imported'
                ? 'Scenario imported. Numeric prompt tokens are active until the prompt changes.'
                : recipeState === 'error'
                  ? 'That scenario file could not be applied to the current catalog.'
                  : ''}
          </p>
        </div>
      </div>

      <div className="workbench-section-shell">
        <ModelComparison
          selectedModels={selectedModels}
          availableModels={availableModels}
          pricing={pricing}
          rows={comparison.rows}
          recommendation={comparison.recommendation}
          loading={pricingLoading}
          onChange={replaceModel}
          onAdd={addModel}
          onRemove={removeModel}
        />
      </div>

      <div className="workbench-section-shell">
        <BudgetSensitivity
          monthlyCost={primaryRow?.monthlyCost ?? null}
          budget={monthlyBudget}
          onBudgetChange={value => setMonthlyBudget(clampInteger(value, 0, 100_000_000, 0))}
          volumeVariancePct={volumeVariancePct}
          onVolumeVarianceChange={value => setVolumeVariancePct(clampInteger(value, 0, 100, 20))}
          retryRatePct={retryRatePct}
          onRetryRateChange={value => setRetryRatePct(clampInteger(value, 0, 500, 5))}
        />
      </div>

      <section className="workbench-chart-grid" aria-label="Cost visualizations">
        <CostByModelChart rows={comparison.rows} metric={chartMetric} />
        <TokenCompositionChart segments={tokenComposition} />
        <SessionAccumulationChart series={accumulation} model={primaryRow?.model ?? 'selected model'} />
      </section>

      <section className="evidence-panel" aria-labelledby="evidence-heading">
        <div className="evidence-copy">
          <p className="data-label">Token evidence</p>
          <h2 id="evidence-heading">Inspect what the counter sees.</h2>
          <p>The first 400 token fragments are shown. Long prompts are still counted in full, but the visualizer stays bounded so the page remains responsive.</p>
          <details>
            <summary>Calculation and source assumptions</summary>
            <ul>
              <li>Prompt counting uses the selected OpenAI BPE tokenizer. Non-OpenAI providers use a disclosed planning multiplier.</li>
              <li>Growing conversation mode includes re-sent history, provider cache rates when published, and context compaction.</li>
              <li>Monthly and annual totals include model usage only. They exclude human labor, storage, search, tool APIs, and taxes.</li>
              <li>{catalog?.isFallback ? catalog.fallbackReason : 'Current rates came from the live OpenRouter model catalog.'}</li>
            </ul>
          </details>
        </div>
        <div className="token-inspector">
          {decodedTokens.length > 0 ? (
            <div className="token-chip-list">
              {decodedTokens.map((token, index) => (
                <span className="token-chip" key={`${token.id}-${index}`} title={`Token ${index + 1}, ID ${token.id}`}>
                  <span>{token.text || '[space]'}</span>
                  <small>#{token.id}</small>
                </span>
              ))}
            </div>
          ) : (
            <p>Paste a prompt to inspect token fragments.</p>
          )}
        </div>
      </section>

      <section className="lab-continuation" aria-labelledby="labs-heading">
        <div>
          <p className="data-label">Keep the same scenario</p>
          <h2 id="labs-heading">Test the payload, then test the economics.</h2>
        </div>
        <div className="lab-links">
          <Link href="/format-comparison/">Open format lab</Link>
          <Link href="/token-efficiency/">Compare efficiency</Link>
        </div>
      </section>
    </>
  );
}
