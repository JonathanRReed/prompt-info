'use client';
import { useEffect, useMemo, useState } from 'react';
import type { PricingMap } from '../types/pricing';

export type PricingSource = 'supabase' | 'fallback' | 'unavailable' | null;

interface UsePricingDataResult {
  pricing: PricingMap | null;
  models: string[];
  loading: boolean;
  source: PricingSource;
  error: string | null;
}

export const usePricingData = (): UsePricingDataResult => {
  const [pricing, setPricing] = useState<PricingMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<PricingSource>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPricing = async () => {
      try {
        setLoading(true);
        setError(null);
        setSource(null);

        const response = await fetch('/api/pricing');

        if (!response.ok) {
          throw new Error(`Unexpected response: ${response.status}`);
        }

        const header = response.headers.get('x-data-source');
        const data: PricingMap = await response.json();

        if (cancelled) {
          return;
        }

        setPricing(data);
        setSource(
          header === 'supabase' || header === 'fallback' || header === 'unavailable'
            ? header
            : null,
        );
      } catch (err) {
        console.error('Failed to load pricing data', err);

        if (!cancelled) {
          setPricing(null);
          setError('Unable to load pricing data. Using bundled defaults.');
          setSource('unavailable');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPricing();

    return () => {
      cancelled = true;
    };
  }, []);

  const models = useMemo(() => {
    if (!pricing) {
      return [] as string[];
    }

    return Object.keys(pricing).sort((a, b) => a.localeCompare(b));
  }, [pricing]);

  return { pricing, models, loading, source, error };
};
