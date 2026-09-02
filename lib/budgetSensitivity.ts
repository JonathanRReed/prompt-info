export type BudgetSensitivity = {
  low: number;
  base: number;
  high: number;
  budget: number;
  remainingAtBase: number;
  baseWithinBudget: boolean;
  highWithinBudget: boolean;
};

export function buildBudgetSensitivity({
  monthlyCost,
  monthlyBudget,
  volumeVariancePct,
  retryRatePct,
}: {
  monthlyCost: number;
  monthlyBudget: number;
  volumeVariancePct: number;
  retryRatePct: number;
}): BudgetSensitivity {
  const base = Math.max(0, Number.isFinite(monthlyCost) ? monthlyCost : 0);
  const budget = Math.max(0, Number.isFinite(monthlyBudget) ? monthlyBudget : 0);
  const variance = Math.min(100, Math.max(0, volumeVariancePct)) / 100;
  const retries = Math.min(500, Math.max(0, retryRatePct)) / 100;
  const low = base * (1 - variance);
  const high = base * (1 + variance) * (1 + retries);
  return {
    low,
    base,
    high,
    budget,
    remainingAtBase: budget - base,
    baseWithinBudget: budget === 0 ? true : base <= budget,
    highWithinBudget: budget === 0 ? true : high <= budget,
  };
}
