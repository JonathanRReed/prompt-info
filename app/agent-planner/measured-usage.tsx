'use client';
import { importUsage } from '../../lib/importUsage';
import { useState } from 'react';
import ModelSelect from '../../components/ModelSelect';
import { chooseDefaultModels } from '../../lib/modelSelection';
import { formatUsd } from '../../components/charts/chartFormat';
import type { PricingCatalogResponse } from '../../lib/fetchPricing';
import {
  priceMeasuredUsage,
  type MeasuredRequest,
} from '../../lib/measuredUsage';

const EMPTY: MeasuredRequest = {
  input: 0,
  cached: 0,
  written: 0,
  output: 0,
  reasoning: 0,
};
const FIELDS: [keyof MeasuredRequest, string][] = [
  ['input', 'Total input'],
  ['cached', 'Of that, cache reads'],
  ['written', 'Of that, cache writes'],
  ['output', 'Total output, including thinking'],
  ['reasoning', 'Of that, thinking (if known)'],
];
export default function MeasuredUsage({
  catalog,
  initialModel,
}: {
  catalog: PricingCatalogResponse | null;
  initialModel: string;
}) {
  const [rows, setRows] = useState<(MeasuredRequest & { id: number })[]>([
    { ...EMPTY, id: 1 },
  ]);
  const [usageJson, setUsageJson] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [nextId, setNextId] = useState(2);
  const [model, setModel] = useState('');
  const [comparison, setComparison] = useState('');
  const [copied, setCopied] = useState('');
  const name = model || initialModel;
  const entry = catalog?.data[name];
  const estimate = entry ? priceMeasuredUsage(rows, entry) : null;
  const alternatives = Object.keys(catalog?.data ?? {}).filter(
    (candidate) => candidate !== name,
  );
  const comparisonName =
    comparison !== name && alternatives.includes(comparison)
      ? comparison
      : catalog
        ? (chooseDefaultModels(alternatives, catalog.data, 1)[0] ?? '')
        : '';
  const other =
    comparisonName && catalog?.data[comparisonName]
      ? priceMeasuredUsage(rows, catalog.data[comparisonName])
      : null;
  const input = rows.reduce((sum, row) => sum + row.input, 0);
  const output = rows.reduce((sum, row) => sum + row.output, 0);
  const receipt = `Prompt Info: observed usage repriced\n${name}\n${rows.length} requests\nInput: ${input} tokens\nOutput including thinking: ${output} tokens\nCost at current catalog rates: ${formatUsd(estimate?.total ?? null)}\nModel token charges only. This is not a provider invoice.`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(receipt);
      setCopied('Receipt copied.');
    } catch {
      setCopied('Could not copy. Select the receipt text instead.');
    }
  }
  return (
    <>
      <div className="agent-workbench measured-workbench">
        <div className="agent-inputs">
          <section className="planner-model-card">
            <label htmlFor="measured-model">Model to price</label>
            <ModelSelect
              id="measured-model"
              value={name}
              models={Object.keys(catalog?.data ?? {})}
              pricing={catalog?.data}
              loading={!catalog}
              onChange={setModel}
            />
          </section>
          <section className="planner-editor planner-panel">
            <div className="planner-panel-title">
              <h2>Use your token usage</h2>
              <p>
                Enter one row per API request. Each row can have different input
                and output. Nothing is uploaded.
              </p>
            </div>
            <p className="planner-callout">
              Output includes thinking. If the split is unknown, leave thinking
              at 0: the full output total is still priced once.
            </p>
            <details className="planner-disclosure">
              <summary>Find the right numbers in your API response</summary>
              <ul>
                <li>
                  OpenAI: input_tokens and output_tokens already include their
                  cached and reasoning subsets.
                </li>
                <li>
                  Claude: add input_tokens, cache_read_input_tokens and
                  cache_creation_input_tokens for total input. Use output_tokens
                  for total output.
                </li>
                <li>
                  Gemini: use promptTokenCount for input. Add
                  candidatesTokenCount and thoughtsTokenCount for total output.
                </li>
              </ul>
              <p>
                Use token usage records, not prompts or API keys.
                Provider-specific cache durations, hosted tools, batch discounts
                and platform fees can change the final invoice.
              </p>
              <p>
                <a href="https://developers.openai.com/api/docs/guides/token-counting">
                  OpenAI usage
                </a>{' '}
                ·{' '}
                <a href="https://platform.claude.com/docs/en/build-with-claude/prompt-caching">
                  Claude caching
                </a>{' '}
                ·{' '}
                <a href="https://ai.google.dev/gemini-api/docs/generate-content/thinking">
                  Gemini thinking
                </a>
              </p>
            </details>
            <details className="planner-disclosure">
              <summary>Import API usage JSON</summary>
              <div className="agent-field">
                <label htmlFor="usage-json">
                  Usage object or array of requests
                </label>
                <textarea
                  id="usage-json"
                  value={usageJson}
                  maxLength={1000000}
                  onChange={(event) => setUsageJson(event.target.value)}
                  placeholder='{"input_tokens": 1000, "output_tokens": 500}'
                />
                <small>
                  Paste usage fields only. Supports OpenAI, Claude and Gemini
                  generateContent. Parsed locally; never sent to a server.
                </small>
              </div>
              <button
                className="planner-button"
                type="button"
                onClick={() => {
                  try {
                    const imported = importUsage(usageJson);
                    setRows(
                      imported.map((row, index) => ({ ...row, id: index + 1 })),
                    );
                    setNextId(imported.length + 1);
                    setUsageJson('');
                    setImportStatus(
                      `Imported ${imported.length} requests. Previous rows were replaced.`,
                    );
                  } catch (error) {
                    setImportStatus(
                      error instanceof Error
                        ? error.message
                        : 'Could not import usage.',
                    );
                  }
                }}
              >
                Replace rows with imported usage
              </button>
              <p role="status">{importStatus}</p>
            </details>
            {rows.map((row, index) => (
              <fieldset className="planner-option-group" key={row.id}>
                <legend>Request {index + 1}</legend>
                <div className="agent-field-grid">
                  {FIELDS.map(([key, label]) => (
                    <div className="agent-field" key={key}>
                      <label htmlFor={`usage-${row.id}-${key}`}>{label}</label>
                      <input
                        id={`usage-${row.id}-${key}`}
                        type="number"
                        min={0}
                        max={10000000}
                        step={1}
                        value={Number.isFinite(row[key]) ? row[key] : ''}
                        onChange={(event) => {
                          const value =
                            event.target.value === ''
                              ? NaN
                              : Number(event.target.value);
                          setRows((current) =>
                            current.map((item) =>
                              item.id === row.id
                                ? { ...item, [key]: value }
                                : item,
                            ),
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  className="planner-text-button"
                  type="button"
                  disabled={rows.length === 1}
                  onClick={() =>
                    setRows((current) =>
                      current.filter((item) => item.id !== row.id),
                    )
                  }
                >
                  Remove request {index + 1}
                </button>
              </fieldset>
            ))}
            <button
              className="planner-button"
              type="button"
              disabled={rows.length >= 200}
              onClick={() => {
                setRows((current) => [...current, { ...EMPTY, id: nextId }]);
                setNextId((current) => current + 1);
              }}
            >
              Add request
            </button>
            <div className="planner-section-rule" />
            <div className="planner-panel-title">
              <h2>Compare the same usage</h2>
              <p>
                This compares rates. Another model may need different tokens to
                complete the same task.
              </p>
            </div>
            <label htmlFor="measured-comparison">Comparison model</label>
            <ModelSelect
              id="measured-comparison"
              value={comparisonName || undefined}
              models={alternatives}
              pricing={catalog?.data}
              loading={!catalog}
              onChange={setComparison}
            />
            {other && (
              <div className="planner-callout">
                <strong>
                  {comparisonName}: {formatUsd(other.total)}
                </strong>
                {other.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            )}
          </section>
        </div>
        <aside
          id="measured-price"
          className="planner-receipt-column"
          aria-label="Measured token cost"
        >
          <div className="planner-ticket">
            <div className="ticket-brand">
              <strong>Prompt Info</strong>
              <span>Cost receipt</span>
            </div>
            <div className="ticket-model">
              <span>Observed usage · repriced</span>
              <h2>{name || 'Choose a model'}</h2>
              <p>
                {rows.length} {rows.length === 1 ? 'request' : 'requests'}
              </p>
            </div>
            <div className="ticket-range">
              <span>Cost at catalog rates</span>
              <output aria-live="polite" data-testid="measured-total">
                {formatUsd(estimate?.total ?? null)}
              </output>
            </div>
            <dl className="ticket-items">
              <div>
                <dt>Input & cache</dt>
                <dd>{formatUsd(estimate?.inputCost ?? null)}</dd>
              </div>
              <div>
                <dt>Output outside known thinking</dt>
                <dd>{formatUsd(estimate?.answerCost ?? null)}</dd>
              </div>
              <div>
                <dt>Known thinking subset</dt>
                <dd>{formatUsd(estimate?.thinkingCost ?? null)}</dd>
              </div>
            </dl>
            <div className="ticket-monthly">
              <span>Total token usage</span>
              <strong>
                {Number.isFinite(input + output)
                  ? (input + output).toLocaleString()
                  : '—'}
              </strong>
            </div>
            <p className="ticket-note">
              These counts are priced directly. An unknown thinking split does
              not change the total output charge.
            </p>
            <p className="ticket-source">
              {catalog?.freshness === 'live'
                ? 'Live catalog rates'
                : 'Dated catalog rates; check the source before budgeting.'}
            </p>
            <div className="ticket-barcode" aria-hidden="true" />
            <p className="ticket-footer">Model tokens only · No charges made</p>
          </div>
          <button
            className="planner-button"
            type="button"
            onClick={copy}
            disabled={estimate?.total == null}
          >
            Copy usage receipt
          </button>
          <p role="status">{copied}</p>
          {estimate?.warnings.map((warning) => (
            <p className="agent-warning" role="note" key={warning}>
              {warning}
            </p>
          ))}
        </aside>
      </div>
      <div className="agent-mobile-total">
        <a href="#measured-price">
          {formatUsd(estimate?.total ?? null)}
          <span>View usage receipt</span>
        </a>
      </div>
    </>
  );
}
