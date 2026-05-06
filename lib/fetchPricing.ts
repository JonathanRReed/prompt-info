import { buildPricingMap } from './pricingParser';
export type { PricingEntry, PricingMap } from './pricingParser';
import type { PricingMap } from './pricingParser';

type Rows = unknown[];

const OPENROUTER_MODELS_ENDPOINT = 'https://openrouter.ai/api/v1/models';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTextModel(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;

  const architecture = (value as Record<string, unknown>).architecture;
  if (!architecture || typeof architecture !== 'object') return true;

  const outputModalities = (architecture as Record<string, unknown>).output_modalities;
  if (Array.isArray(outputModalities)) {
    return outputModalities.some(item => typeof item === 'string' && item.toLowerCase().includes('text'));
  }

  const modality = (architecture as Record<string, unknown>).modality;
  return typeof modality === 'string' ? modality.toLowerCase().includes('text') : true;
}

function isPricingMap(value: unknown): value is PricingMap {
  if (!isRecord(value)) return false;

  const first = Object.values(value)[0];
  return (
    Object.values(value).length > 0 &&
    isRecord(first) &&
    'pricing' in first &&
    isRecord((first as Record<string, unknown>).pricing)
  );
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    return response.json();
  } catch {
    return null;
  }
}

function extractRows(response: unknown): Rows {
  if (!isRecord(response)) return [];

  const asRecord = response as Record<string, unknown>;
  if (Array.isArray(asRecord.data)) return asRecord.data;

  return [];
}

export async function fetchPricing(): Promise<PricingMap> {
  const routeCandidates = ['/api/pricing', '/api/pricing/'];

  for (const endpoint of routeCandidates) {
    const body = await fetchJson(endpoint);
    if (body && isPricingMap(body)) {
      return body as PricingMap;
    }
  }

  const directPricing = await fetchJson(OPENROUTER_MODELS_ENDPOINT);
  const directRows = extractRows(directPricing).filter(isTextModel);

  if (directRows.length > 0) {
    return buildPricingMap(directRows);
  }

  return {};
}
