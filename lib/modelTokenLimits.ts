export const HARD_MAX_OUTPUT_TOKENS = 300000;
const DEFAULT_OUTPUT_TOKENS = 8192;

export type TokenLimitConfidence = 'high' | 'medium' | 'low';
export type ModelCompany =
  | 'OpenAI'
  | 'Anthropic'
  | 'Google'
  | 'xAI'
  | 'DeepSeek'
  | 'Mistral'
  | 'Other';

// Cache READ price as a percent of the base input price (10 = 10%), used only
// when the model's own published cache pricing is unavailable.
// Verified against official provider pricing pages, June 2026.
export const MODEL_COMPANY_CACHE_READ_PCT: Record<ModelCompany, number> = {
  OpenAI: 10, // GPT-5.x cached input is 10% of base input, no write premium (older 4o-era was 50%)
  Anthropic: 10, // cache read = 10% of base input
  Google: 10, // Gemini 2.5/3.x context-cache read = 10% of base input (storage billed separately per hour)
  xAI: 16, // Grok 4.3: $0.20 cached vs $1.25 input
  DeepSeek: 2, // V4 cache-hit pricing is ~2% of cache-miss input
  Mistral: 100, // Mistral publishes no cached-input discount; bill re-sent history at full price
  Other: 50,
};

// Cache WRITE premium as a multiplier on the base input price for tokens that
// are new to the cached prefix. Only Anthropic charges an explicit write
// premium (1.25x for the default 5-minute TTL); others write at base price.
export const MODEL_COMPANY_CACHE_WRITE_MULTIPLIER: Record<ModelCompany, number> = {
  OpenAI: 1,
  Anthropic: 1.25,
  Google: 1,
  xAI: 1,
  DeepSeek: 1,
  Mistral: 1,
  Other: 1,
};

// The site tokenizes with OpenAI BPE encodings (gpt-tokenizer). Other vendors'
// native tokenizers segment text differently and typically produce MORE tokens
// than o200k/cl100k for the same text, so a raw BPE count undercounts what the
// provider actually bills. These multipliers calibrate the BPE count into a
// planning estimate per provider (English prose; code usually runs higher).
// Based on empirical tokenizer comparisons against o200k_base, June 2026.
export const MODEL_COMPANY_TOKENIZER_MULTIPLIER: Record<ModelCompany, number> = {
  OpenAI: 1,
  Anthropic: 1.16, // Claude tokenizer yields ~16% more tokens than o200k on prose (~30% on code)
  Google: 1.05, // Gemini SentencePiece is near-parity on prose, ~1.2x on indented code
  xAI: 1.05,
  DeepSeek: 1.05, // parity on prose, ~1.1x on code
  Mistral: 1.05, // Tekken tokenizer is near-parity with o200k
  Other: 1.05,
};

export function getCompanyTokenizerMultiplier(company: ModelCompany) {
  return MODEL_COMPANY_TOKENIZER_MULTIPLIER[company] ?? 1;
}

// Claude Opus 4.7 shipped a re-tuned tokenizer that maps the same text to
// roughly 1.2-1.45x the token count of earlier Claude tokenizers, so models on
// it (Opus 4.7/4.8, Fable 5) bill well above an o200k count. Planning estimate.
const ANTHROPIC_RETUNED_TOKENIZER_MULTIPLIER = 1.4;

export function getModelTokenizerMultiplier(model: string, company?: ModelCompany) {
  const resolvedCompany = company ?? inferModelCompany(model);
  if (resolvedCompany === 'Anthropic' && /opus[ ._-]?4[ ._-]?[78]|fable/i.test(model)) {
    return ANTHROPIC_RETUNED_TOKENIZER_MULTIPLIER;
  }
  return getCompanyTokenizerMultiplier(resolvedCompany);
}

export function getCompanyCacheWriteMultiplier(company: ModelCompany) {
  return MODEL_COMPANY_CACHE_WRITE_MULTIPLIER[company] ?? 1;
}

export type ModelTokenProfile = {
  maxOutputTokens: number;
  contextWindowTokens?: number;
  source: string;
  confidence: TokenLimitConfidence;
  company?: ModelCompany;
};

type LimitFieldMap = Record<string, unknown>;

type NumericCandidate = {
  value: number;
  path: string;
};

const OUTPUT_LIMIT_FIELDS = [
  'max_output_tokens',
  'maxOutputTokens',
  'max_output_token',
  'max_output_length',
  'output_tokens_max',
  'output_token_limit',
  'outputTokenLimit',
  'max_completion_tokens',
  'maxCompletionTokens',
  'max_response_tokens',
  'maxResponseTokens',
  'response_token_limit',
  'responseTokenLimit',
  'output_limit',
  'outputLimit',
  'max_tokens',
  'maxTokens',
];

const CONTEXT_LIMIT_FIELDS = [
  'context_length',
  'contextLength',
  'context_window',
  'contextWindow',
  'contextWindowTokens',
  'input_token_limit',
  'inputTokenLimit',
  'token_limit',
  'tokenLimit',
];

const OPENROUTER_OUTPUT_PATHS = [
  'top_provider.max_completion_tokens',
  'topProvider.maxCompletionTokens',
  'max_completion_tokens',
  'maxCompletionTokens',
];

const OPENROUTER_CONTEXT_PATHS = [
  'context_length',
  'contextLength',
  'top_provider.context_length',
  'topProvider.contextLength',
];

function parseNumberLike(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string') return NaN;

  const normalized = value.trim().toLowerCase().replace(/[$,]/g, '');
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([kmb])?(?:\s*(?:tokens?|context|ctx))?$/);
  if (!match) return NaN;

  const [, rawNumber, suffix] = match;
  const multiplier = suffix === 'k' ? 1_000 : suffix === 'm' ? 1_000_000 : suffix === 'b' ? 1_000_000_000 : 1;
  return Number(rawNumber) * multiplier;
}

function toPositiveInteger(value: unknown) {
  const num = parseNumberLike(value);
  if (!Number.isFinite(num)) return null;
  const floored = Math.floor(num);
  return floored > 0 ? floored : null;
}

function firstNumericField(fields: LimitFieldMap | undefined, names: string[]) {
  if (!fields) return null;

  for (const name of names) {
    const value = toPositiveInteger(fields[name]);
    if (value !== null) return value;
  }

  return null;
}

function normalizePathPart(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function normalizePath(path: string) {
  return path.split('.').map(normalizePathPart).join('.');
}

function collectNumericCandidates(value: unknown, path = '', seen = new WeakSet<object>()): NumericCandidate[] {
  if (!value || typeof value !== 'object') return [];
  if (seen.has(value)) return [];
  seen.add(value);

  const candidates: NumericCandidate[] = [];
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>);

  for (const [key, child] of entries) {
    const nextPath = path ? `${path}.${key}` : key;
    const numericValue = toPositiveInteger(child);
    if (numericValue !== null) {
      candidates.push({ value: numericValue, path: nextPath });
    }

    if (child && typeof child === 'object') {
      candidates.push(...collectNumericCandidates(child, nextPath, seen));
    }
  }

  return candidates;
}

function firstNumericCandidate(fields: LimitFieldMap | undefined, names: string[]) {
  if (!fields) return null;

  const normalizedNames = new Set(names.map(normalizePath));
  const candidates = collectNumericCandidates(fields);

  for (const candidate of candidates) {
    const normalizedPath = normalizePath(candidate.path);
    const leaf = normalizedPath.split('.').at(-1);
    if (normalizedNames.has(normalizedPath) || (leaf && normalizedNames.has(leaf))) {
      if (!/price|pricing|cost|cache|rate|seconds|per_second/.test(normalizedPath)) {
        return candidate;
      }
    }
  }

  return null;
}

function isOpenRouterLimitPath(path: string) {
  const normalizedPath = normalizePath(path);
  return normalizedPath.startsWith('top_provider.') ||
    normalizedPath === 'context_length' ||
    normalizedPath === 'max_completion_tokens' ||
    normalizedPath.includes('openrouter') ||
    normalizedPath.includes('open_router');
}

function inferModelCompany(model: string): ModelCompany {
  const normalized = model.toLowerCase();

  if (!normalized) return 'Other';

  if (
    /chatgpt|gpt-|gpt /i.test(model) ||
    /\bgpt5\b|\bgpt-5\b/.test(normalized) ||
    /\bo[1-9]/.test(normalized) ||
    /\bo 1\b/.test(normalized) ||
    /\bo 2\b/.test(normalized) ||
    /\bo 3\b/.test(normalized) ||
    /\bo 4\b/.test(normalized) ||
    /\bo 5\b/.test(normalized)
  ) {
    return 'OpenAI';
  }

  if (/claude/.test(normalized) || /anthropic/.test(normalized) || /fable/.test(normalized)) {
    return 'Anthropic';
  }

  if (/gemini|gemma/.test(normalized) || /google/.test(normalized)) {
    return 'Google';
  }

  if (/grok/.test(normalized) || /xai/.test(normalized)) {
    return 'xAI';
  }

  if (/deepseek/.test(normalized)) {
    return 'DeepSeek';
  }

  if (/mistral/.test(normalized)) {
    return 'Mistral';
  }

  return 'Other';
}

export function resolveModelCompany(model: string): ModelCompany {
  return inferModelCompany(model);
}

export function getCompanyCachedInputBillablePct(company: ModelCompany) {
  return MODEL_COMPANY_CACHE_READ_PCT[company];
}

function normalizeModelName(model: string) {
  return model.toLowerCase().replace(/[_./-]+/g, ' ');
}

function inferModelTokenProfile(model: string): ModelTokenProfile | null {
  const name = normalizeModelName(model);

  if (!name) return null;

  const isNonReasoning = /\bnon reasoning\b/.test(name);

  if (/\bgpt 5 2\b/.test(name) && /\bchat\b/.test(name)) {
    return { maxOutputTokens: 16384, contextWindowTokens: 400000, source: 'OpenAI GPT-5.2 chat family', confidence: 'medium' };
  }

  if (/\bgpt 5\b/.test(name) && /\bpro\b/.test(name) && !/\bgpt 5 [124]\b/.test(name)) {
    return { maxOutputTokens: 272000, contextWindowTokens: 400000, source: 'OpenAI GPT-5 Pro family', confidence: 'high' };
  }

  if (/\bgpt 5 5\b/.test(name)) {
    return { maxOutputTokens: 128000, contextWindowTokens: 1050000, source: 'OpenAI GPT-5.5 family', confidence: 'high' };
  }

  if (/\bgpt 5 4\b/.test(name) && /\bmini\b|\bnano\b/.test(name)) {
    return { maxOutputTokens: 128000, contextWindowTokens: 400000, source: 'OpenAI GPT-5.4 mini/nano family', confidence: 'high' };
  }

  if (/\bgpt 5 4\b/.test(name)) {
    return { maxOutputTokens: 128000, contextWindowTokens: 1050000, source: 'OpenAI GPT-5.4 family', confidence: 'high' };
  }

  if (/\bgpt 5\b|gpt 5 [1-9]|gpt 5.*codex/.test(name)) {
    return { maxOutputTokens: 128000, contextWindowTokens: 400000, source: 'OpenAI GPT-5 family', confidence: 'high' };
  }

  if (/\bo[134]\b|\bo[134] mini\b|\bo[134] pro\b|codex mini/.test(name)) {
    if (name.includes('preview')) {
      return { maxOutputTokens: 32768, contextWindowTokens: 128000, source: 'OpenAI preview reasoning family', confidence: 'medium' };
    }
    return { maxOutputTokens: 100000, contextWindowTokens: 200000, source: 'OpenAI reasoning family', confidence: 'high' };
  }

  if (/gpt 4 1/.test(name)) {
    return { maxOutputTokens: 32768, contextWindowTokens: 1047576, source: 'OpenAI GPT-4.1 family', confidence: 'high' };
  }

  if (/gpt 4o/.test(name) || /chatgpt 4o/.test(name)) {
    return { maxOutputTokens: 16384, contextWindowTokens: 128000, source: 'OpenAI GPT-4o family', confidence: 'high' };
  }

  if (/gpt 4 5/.test(name)) {
    return { maxOutputTokens: 16384, contextWindowTokens: 128000, source: 'OpenAI GPT-4.5 family', confidence: 'medium' };
  }

  if (/gpt 4 turbo/.test(name)) {
    return { maxOutputTokens: 4096, contextWindowTokens: 128000, source: 'OpenAI GPT-4 Turbo family', confidence: 'medium' };
  }

  if (/\bgpt 4\b/.test(name)) {
    return { maxOutputTokens: 8192, contextWindowTokens: 8192, source: 'OpenAI GPT-4 legacy family', confidence: 'medium' };
  }

  if (/gpt 3 5/.test(name)) {
    return { maxOutputTokens: 4096, contextWindowTokens: 16385, source: 'OpenAI GPT-3.5 family', confidence: 'medium' };
  }

  if (/gemini 3|gemini 2 5/.test(name)) {
    return { maxOutputTokens: 65536, contextWindowTokens: 1048576, source: 'Gemini long-output family', confidence: 'high' };
  }

  if (/gemini 2 0|gemini 1 5/.test(name)) {
    return { maxOutputTokens: 8192, contextWindowTokens: 1000000, source: 'Gemini 1.5 and 2.0 family', confidence: 'medium' };
  }

  if (/gemini|gemma/.test(name)) {
    return { maxOutputTokens: 8192, source: 'Google model family estimate', confidence: 'low' };
  }

  if (/claude|fable/.test(name)) {
    if (/fable 5/.test(name)) {
      return { maxOutputTokens: 128000, contextWindowTokens: 1000000, source: 'Claude Fable 5 family', confidence: 'high' };
    }
    if (/opus 4 [678]/.test(name)) {
      return { maxOutputTokens: 128000, contextWindowTokens: 1000000, source: 'Claude Opus 4.6-4.8 family', confidence: 'high' };
    }
    if (/sonnet 4 6/.test(name)) {
      return { maxOutputTokens: 64000, contextWindowTokens: 1000000, source: 'Claude Sonnet 4.6 family', confidence: 'high' };
    }
    if (/sonnet 4 5/.test(name)) {
      return { maxOutputTokens: 64000, contextWindowTokens: 200000, source: 'Claude Sonnet 4.5 family', confidence: 'high' };
    }
    if (/haiku 4 5/.test(name)) {
      return { maxOutputTokens: 64000, contextWindowTokens: 200000, source: 'Claude Haiku 4.5 family', confidence: 'high' };
    }
    if (/3 7|4|opus 4|sonnet 4/.test(name)) {
      return { maxOutputTokens: 64000, contextWindowTokens: 200000, source: 'Claude 3.7 and 4.x family estimate', confidence: 'medium' };
    }
    return { maxOutputTokens: 8192, contextWindowTokens: 200000, source: 'Claude standard family estimate', confidence: 'medium' };
  }

  if (/deepseek/.test(name)) {
    if (/v4|\b4 (flash|pro)\b/.test(name)) {
      return { maxOutputTokens: 131072, contextWindowTokens: 1000000, source: 'DeepSeek V4 family', confidence: 'medium' };
    }
    if (!isNonReasoning && /reason|r1|speciale/.test(name)) {
      return { maxOutputTokens: 64000, contextWindowTokens: 128000, source: 'DeepSeek reasoning family', confidence: 'high' };
    }
    return { maxOutputTokens: 8192, contextWindowTokens: 128000, source: 'DeepSeek chat family', confidence: 'high' };
  }

  if (/grok/.test(name)) {
    if (/\bgrok 4\b|grok 4 /.test(name)) {
      return { maxOutputTokens: 32768, contextWindowTokens: 1000000, source: 'xAI Grok 4.x family', confidence: 'medium' };
    }
    return { maxOutputTokens: 8192, contextWindowTokens: 128000, source: 'xAI Grok family estimate', confidence: 'low' };
  }

  if (/mistral|magistral|ministral/.test(name)) {
    return { maxOutputTokens: 16384, contextWindowTokens: 256000, source: 'Mistral 2026 family estimate', confidence: 'low' };
  }

  if (/mini ?max m1 80k/.test(name)) {
    return { maxOutputTokens: 80000, source: 'MiniMax model-name limit', confidence: 'medium' };
  }

  if (/mini ?max m1 40k/.test(name)) {
    return { maxOutputTokens: 40000, source: 'MiniMax model-name limit', confidence: 'medium' };
  }

  if (!isNonReasoning && /thinking|reasoning|reasoner|adaptive reasoning|max effort|xhigh|high effort/.test(name)) {
    return { maxOutputTokens: 32768, source: 'reasoning model family estimate', confidence: 'low' };
  }

  if (/coder|codex|codestral|devstral|code/.test(name)) {
    return { maxOutputTokens: 16384, source: 'coding model family estimate', confidence: 'low' };
  }

  if (/llama 4 scout|longcat|qwen3 max|qwen3 6|max thinking|kimi k2 thinking/.test(name)) {
    return { maxOutputTokens: 32768, source: 'long-output model family estimate', confidence: 'low' };
  }

  return null;
}

export function resolveModelTokenProfile(model: string, fields?: LimitFieldMap): ModelTokenProfile {
  const company = inferModelCompany(model);
  const explicitOutput =
    firstNumericCandidate(fields, [...OPENROUTER_OUTPUT_PATHS, ...OUTPUT_LIMIT_FIELDS]) ??
    (firstNumericField(fields, OUTPUT_LIMIT_FIELDS) !== null
      ? { value: firstNumericField(fields, OUTPUT_LIMIT_FIELDS) as number, path: 'model data' }
      : null);
  const explicitContext =
    firstNumericCandidate(fields, [...OPENROUTER_CONTEXT_PATHS, ...CONTEXT_LIMIT_FIELDS]) ??
    (firstNumericField(fields, CONTEXT_LIMIT_FIELDS) !== null
      ? { value: firstNumericField(fields, CONTEXT_LIMIT_FIELDS) as number, path: 'model data' }
      : null);
  const contextWindow = explicitContext?.value;
  const contextSourceLabel = explicitContext && isOpenRouterLimitPath(explicitContext.path)
    ? 'OpenRouter context data'
    : 'model context data';
  const explicitSource = typeof fields?.outputTokenLimitSource === 'string'
    ? fields.outputTokenLimitSource
    : null;
  const explicitConfidence =
    fields?.outputTokenLimitConfidence === 'high' ||
    fields?.outputTokenLimitConfidence === 'medium' ||
    fields?.outputTokenLimitConfidence === 'low'
      ? fields.outputTokenLimitConfidence
      : null;

  if (explicitOutput !== null) {
    return {
      maxOutputTokens: Math.min(explicitOutput.value, HARD_MAX_OUTPUT_TOKENS),
      contextWindowTokens: contextWindow,
      source: explicitSource ?? (isOpenRouterLimitPath(explicitOutput.path) ? 'OpenRouter model data' : 'model data'),
      confidence: explicitConfidence ?? 'high',
      company,
    };
  }

  const inferred = inferModelTokenProfile(model);
  if (inferred) {
    return {
      ...inferred,
      maxOutputTokens: contextWindow
        ? Math.min(inferred.maxOutputTokens, contextWindow, HARD_MAX_OUTPUT_TOKENS)
        : inferred.maxOutputTokens,
      contextWindowTokens: contextWindow ?? inferred.contextWindowTokens,
      source: contextWindow ? `${inferred.source}, ${contextSourceLabel}` : inferred.source,
      confidence: contextWindow ? 'high' : inferred.confidence,
      company,
    };
  }

  const legacyOutput = firstNumericField(fields, ['avgOutputTokens']);
  if (legacyOutput !== null && legacyOutput >= DEFAULT_OUTPUT_TOKENS) {
    return {
      maxOutputTokens: Math.min(legacyOutput, HARD_MAX_OUTPUT_TOKENS),
      contextWindowTokens: contextWindow,
      source: 'legacy fallback data',
      confidence: 'low',
      company,
    };
  }

  return {
    maxOutputTokens: contextWindow ? Math.min(DEFAULT_OUTPUT_TOKENS, contextWindow) : DEFAULT_OUTPUT_TOKENS,
    contextWindowTokens: contextWindow,
    source: contextWindow ? `${contextSourceLabel} with default output fallback` : 'default fallback',
    confidence: contextWindow ? 'medium' : 'low',
    company,
  };
}
