'use client';

import { buildBudgetSensitivity } from '../../lib/budgetSensitivity';
import { formatUsd } from '../charts/chartFormat';

export function BudgetSensitivity({
  monthlyCost,
  budget,
  onBudgetChange,
  volumeVariancePct,
  onVolumeVarianceChange,
  retryRatePct,
  onRetryRateChange,
}: {
  monthlyCost: number | null;
  budget: number;
  onBudgetChange: (value: number) => void;
  volumeVariancePct: number;
  onVolumeVarianceChange: (value: number) => void;
  retryRatePct: number;
  onRetryRateChange: (value: number) => void;
}) {
  const hasEstimate = monthlyCost !== null && Number.isFinite(monthlyCost);
  const sensitivity = buildBudgetSensitivity({
    monthlyCost: monthlyCost ?? 0,
    monthlyBudget: budget,
    volumeVariancePct,
    retryRatePct,
  });

  return (
    <section className="budget-sensitivity" aria-labelledby="budget-heading">
      <div className="budget-heading-row">
        <div>
          <p className="data-label">Budget and uncertainty</p>
          <h2 id="budget-heading">See a low, base, and high case.</h2>
        </div>
        <p className={`budget-status ${hasEstimate ? sensitivity.highWithinBudget ? 'is-within' : 'is-over' : ''}`}>
          {!hasEstimate ? 'Estimate unavailable' : budget === 0
            ? 'No budget threshold set'
            : sensitivity.highWithinBudget
              ? 'High case remains within budget'
              : 'High case exceeds budget'}
        </p>
      </div>
      <div className="budget-control-grid">
        <label><span>Monthly budget</span><input type="number" min="0" step="10" value={budget} onChange={event => onBudgetChange(Number(event.target.value))} /></label>
        <label><span>Volume variance</span><input type="number" min="0" max="100" step="1" value={volumeVariancePct} onChange={event => onVolumeVarianceChange(Number(event.target.value))} /><small>Plus or minus {volumeVariancePct}% runs</small></label>
        <label><span>Retry and failure allowance</span><input type="number" min="0" max="500" step="1" value={retryRatePct} onChange={event => onRetryRateChange(Number(event.target.value))} /><small>{retryRatePct}% added to the high case</small></label>
      </div>
      <dl className="budget-case-grid">
        <div><dt>Low volume</dt><dd>{hasEstimate ? formatUsd(sensitivity.low) : 'Unavailable'}<small>{Math.max(0, 100 - volumeVariancePct)}% of planned runs</small></dd></div>
        <div><dt>Base estimate</dt><dd>{hasEstimate ? formatUsd(sensitivity.base) : 'Unavailable'}<small>{hasEstimate && budget > 0 ? `${formatUsd(Math.abs(sensitivity.remainingAtBase))} ${sensitivity.baseWithinBudget ? 'remaining' : 'over budget'}` : 'Current workload inputs'}</small></dd></div>
        <div><dt>High case</dt><dd>{hasEstimate ? formatUsd(sensitivity.high) : 'Unavailable'}<small>Volume variance plus retry allowance</small></dd></div>
      </dl>
      <p className="budget-footnote">This is a planning range, not a probability forecast. It excludes labor, storage, search, tool APIs, taxes, and contract discounts.</p>
    </section>
  );
}
