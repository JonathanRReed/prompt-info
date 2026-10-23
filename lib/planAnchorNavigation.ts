/** Follow a planner control with the browser's native fragment navigation. */
export function followPlanAnchor(
  hash: '#main-content' | '#agent-price',
  source: string,
  location: Pick<Location, 'hash'>,
  stampEntry: (source: string) => void,
) {
  location.hash = hash;
  // The URL/history entry changes synchronously; hashchange is a later task.
  // Do not leave the new anchor entry without its source in that interval.
  stampEntry(source);
}
