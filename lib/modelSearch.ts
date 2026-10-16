export const MAX_VISIBLE_MODEL_RESULTS = 80;

export type ModelSearchResult = {
  /** Rows to render, at most `limit`. */
  results: string[];
  /** Every catalog row that matches the query, before the render cap. */
  total: number;
  /** True when `results` is a truncated view of `total`. */
  truncated: boolean;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[-_:./]/g, ' ');
}

/**
 * Token search over model labels. Every space-separated part must appear in the
 * label, so "gpt 4o" and "gpt-4o" find the same rows. Prefix matches sort
 * first, then shorter labels. The render cap is applied after counting so the
 * picker can say "showing 80 of 386" instead of claiming 80 matches.
 */
export function searchModels(
  models: string[],
  query: string,
  labels?: Record<string, string>,
  limit = MAX_VISIBLE_MODEL_RESULTS,
): ModelSearchResult {
  const label = (model: string) => labels?.[model] ?? model;
  const cleaned = query.trim();
  if (!cleaned) {
    const results = models.slice(0, limit);
    return { results, total: models.length, truncated: models.length > results.length };
  }

  const normalizedQuery = normalize(cleaned);
  const parts = normalizedQuery.split(/\s+/).filter(Boolean);
  const matches = models
    .filter(model => {
      const normalizedModel = normalize(label(model));
      return parts.every(part => normalizedModel.includes(part));
    })
    .sort((a, b) => {
      const aStarts = normalize(label(a)).startsWith(normalizedQuery) ? 0 : 1;
      const bStarts = normalize(label(b)).startsWith(normalizedQuery) ? 0 : 1;
      return aStarts - bStarts || label(a).length - label(b).length || label(a).localeCompare(label(b));
    });
  const results = matches.slice(0, limit);
  return { results, total: matches.length, truncated: matches.length > results.length };
}

/** The status line under the picker. Never reports the render cap as the match count. */
export function describeModelSearch({ query, shown, total, catalogSize, curated }: {
  query: string;
  shown: number;
  total: number;
  catalogSize: number;
  curated: boolean;
}) {
  if (query.trim()) {
    if (total === 0) return 'No matches';
    const noun = total === 1 ? 'match' : 'matches';
    return shown < total
      ? `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} ${noun}. Refine to narrow.`
      : `${total.toLocaleString()} ${noun}`;
  }
  return `${curated ? 'Provider-diverse browse set' : 'Browse set'} · ${shown.toLocaleString()} of ${catalogSize.toLocaleString()}`;
}
