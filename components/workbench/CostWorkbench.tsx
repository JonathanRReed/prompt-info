import type { ReactNode } from 'react';

export function CostWorkbench({ scenario, receipt }: { scenario: ReactNode; receipt: ReactNode }) {
  return (
    <section id="planner" className="cost-workbench" aria-label="AI workload cost workbench">
      <div className="cost-workbench-scenario">{scenario}</div>
      <div className="cost-workbench-receipt">{receipt}</div>
    </section>
  );
}
