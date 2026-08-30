export type WorkloadCadence = 'once' | 'day' | 'week' | 'month';

export type WorkloadProjection = {
  cadence: WorkloadCadence;
  runs: number;
  runsPerMonth: number | null;
  runsPerYear: number | null;
  costPerPeriod: number;
  monthlyCost: number | null;
  annualCost: number | null;
};

export function projectWorkload(_: {
  costPerRun: number;
  runs: number;
  cadence: WorkloadCadence;
}): WorkloadProjection | null {
  const { costPerRun, runs, cadence } = _;
  if (!Number.isFinite(costPerRun) || costPerRun < 0 || !Number.isInteger(runs) || runs < 1) {
    return null;
  }

  const costPerPeriod = costPerRun * runs;
  if (cadence === 'once') {
    return {
      cadence,
      runs,
      runsPerMonth: null,
      runsPerYear: null,
      costPerPeriod,
      monthlyCost: null,
      annualCost: null,
    };
  }

  const periodsPerYear = cadence === 'day' ? 365 : cadence === 'week' ? 52 : 12;
  const runsPerYear = runs * periodsPerYear;
  const annualCost = costPerRun * runsPerYear;

  return {
    cadence,
    runs,
    runsPerMonth: runsPerYear / 12,
    runsPerYear,
    costPerPeriod,
    monthlyCost: annualCost / 12,
    annualCost,
  };
}
