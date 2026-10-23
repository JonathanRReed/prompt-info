import {
  readAgentPlanHash,
  readLegacyAgentPlan,
  type SharedAgentPlan,
} from './agentPlanLink';

export type PlanNavigationInput = {
  hash: string;
  search: string;
  recordedSource?: string;
  activeSource: string;
};

export type PlanNavigationResolution = {
  source: string;
  shared: SharedAgentPlan | null;
  stamp: boolean;
};

function sharedFor(source: string): SharedAgentPlan | null {
  return source.startsWith('hash:')
    ? readAgentPlanHash(source.slice('hash:'.length))
    : readLegacyAgentPlan(source.slice('query:'.length));
}

/** Resolve the same-document URL/history entry before importing planner state. */
export function resolvePlanNavigation({
  hash,
  search,
  recordedSource,
  activeSource,
}: PlanNavigationInput): PlanNavigationResolution {
  // Explicit encoded URLs are authoritative even if Next/router navigation
  // carries the previous entry's source metadata into the new history entry.
  const fromHash = readAgentPlanHash(hash);
  if (fromHash) {
    const source = `hash:${hash}`;
    return {
      source,
      shared: source !== activeSource ? fromHash : null,
      stamp: true,
    };
  }
  // Plain anchors still restore their stamped source on back/forward. If the
  // source is already active, keep current edits rather than re-importing it.
  if (recordedSource !== undefined) {
    return {
      source: recordedSource,
      shared: recordedSource !== activeSource ? sharedFor(recordedSource) : null,
      stamp: false,
    };
  }
  const fromQuery = hash === '' ? readLegacyAgentPlan(search) : null;
  const source = `query:${search}`;
  const shared = fromQuery;
  return shared && source !== activeSource
    ? { source, shared, stamp: true }
    : { source: activeSource, shared: null, stamp: true };
}
