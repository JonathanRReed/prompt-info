import { expect, test } from 'bun:test';
import { readReasoningOptions } from './reasoningOptions';
import { buildPricingMap } from './pricingParser';
test('does not invent efforts for absent metadata or permit disabled mandatory reasoning', () => {
  expect(readReasoningOptions(undefined)).toBeUndefined();
  expect(readReasoningOptions({ mandatory: true, supported_efforts: ['none','low','high','invented'] })?.supportedEfforts).toEqual(['low','high']);
  expect(readReasoningOptions({ supported_efforts: null })?.supportedEfforts).toContain('none');
  expect(readReasoningOptions({})?.supportedEfforts).toBeUndefined();
});
test('retains reasoning capabilities across catalog parsing', () => {
  const data = buildPricingMap([{ id: 'test/model', name: 'Test model', pricing: { prompt: '0.000001', completion: '0.000002' }, reasoning: { mandatory: true, supported_efforts: ['high','low'], default_effort: 'low' } }]);
  expect(data['Test model'].reasoning).toMatchObject({ mandatory: true, supportedEfforts: ['high','low'], defaultEffort: 'low' });
});
