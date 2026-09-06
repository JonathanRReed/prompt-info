'use client';

import ModelSelect from '../ModelSelect';
import type { CostComparisonRow, CostRecommendation } from '../../lib/costComparison';
import type { PricingMap } from '../../lib/pricingParser';
import { formatUsd } from '../charts/chartFormat';

export function ModelComparison({
  selectedModels,
  availableModels,
  pricing,
  rows,
  recommendation,
  loading,
  onChange,
  onAdd,
  onRemove,
}: {
  selectedModels: string[];
  availableModels: string[];
  pricing: PricingMap | null;
  rows: CostComparisonRow[];
  recommendation: CostRecommendation | null;
  loading: boolean;
  onChange: (index: number, model: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <section className="model-comparison" aria-labelledby="comparison-heading">
      <div className="comparison-heading-row">
        <div>
          <p className="data-label">Model comparison</p>
          <h2 id="comparison-heading">Compare selected models</h2>
        </div>
        <button
          type="button"
          className="comparison-add"
          onClick={onAdd}
          disabled={selectedModels.length >= 3 || availableModels.length <= selectedModels.length}
        >
          Add comparison model
        </button>
      </div>

      <div className="comparison-rows">
        {selectedModels.length === 0 ? (
          <p className="comparison-unavailable">
            {loading ? 'Loading the model catalog.' : 'No models are selected yet.'}
          </p>
        ) : selectedModels.map((model, index) => {
          const row = rows.find(candidate => candidate.model === model);
          const entry = pricing?.[model];
          const isRecommended = recommendation?.model === model;
          return (
            <article
              key={`${model}-${index}`}
              className="comparison-row"
              data-testid="comparison-model-row"
            >
              <div className="comparison-model-control">
                <label htmlFor={`comparison-model-${index}`}>Comparison model {index + 1}</label>
                <ModelSelect
                  id={`comparison-model-${index}`}
                  value={model}
                  onChange={value => onChange(index, value)}
                  models={availableModels.filter(value => value === model || !selectedModels.includes(value))}
                  loading={loading}
                  pricing={pricing}
                />
                {selectedModels.length > 2 && index > 0 ? (
                  <button type="button" className="comparison-remove" onClick={() => onRemove(index)}>
                    Remove {model}
                  </button>
                ) : null}
              </div>
              <div className="comparison-rate-grid">
                <span><small>Input / 1M</small><strong>{entry ? formatUsd(entry.pricing.input * 1_000) : 'Unavailable'}</strong></span>
                <span><small>Output / 1M</small><strong>{entry ? formatUsd(entry.pricing.output * 1_000) : 'Unavailable'}</strong></span>
                <span><small>Request</small><strong>{formatUsd(row?.requestCost)}</strong></span>
                <span><small>Session</small><strong>{formatUsd(row?.sessionCost)}</strong></span>
                <span><small>Monthly</small><strong>{formatUsd(row?.monthlyCost)}</strong></span>
                <span><small>Annual</small><strong>{formatUsd(row?.annualCost)}</strong></span>
              </div>
              {isRecommended ? <p className="comparison-observation">Lowest estimated cost in this selection.</p> : null}
              {!row?.isUsable ? <p className="comparison-unavailable">{row?.unavailableReason ?? 'Waiting for pricing data.'}</p> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
