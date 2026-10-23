const SOURCE = 'promptInfoPlanSource';

/** Follow a planner control with the browser's native fragment navigation. */
export function followPlanAnchor(
  hash: '#main-content' | '#agent-price',
  source: string,
  location: Pick<Location, 'hash'>,
  history: Pick<History, 'state' | 'replaceState'>,
) {
  // Native fragment entries may start with null state. Retain the current
  // router/user metadata before creating that entry, not after it is gone.
  const previousState = history.state;
  location.hash = hash;
  // This is metadata-only. An unchanged URL argument would make Next's
  // history wrapper restore router state and potentially replay old scrolling.
  history.replaceState(
    { ...(previousState ?? {}), ...(history.state ?? {}), [SOURCE]: source },
    '',
  );
}
