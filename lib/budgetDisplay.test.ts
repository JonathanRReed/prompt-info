import { expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BudgetSensitivity } from '../components/workbench/BudgetSensitivity';

test('unavailable pricing does not claim a zero-cost workload is within budget', () => {
  const html = renderToStaticMarkup(createElement(BudgetSensitivity, {
    monthlyCost: null, budget: 100, volumeVariancePct: 20, retryRatePct: 5,
    onBudgetChange() {}, onVolumeVarianceChange() {}, onRetryRateChange() {},
  }));
  expect(html).toContain('Estimate unavailable');
  expect(html).not.toContain('High case remains within budget');
  expect(html).not.toContain('$0.00');
});
