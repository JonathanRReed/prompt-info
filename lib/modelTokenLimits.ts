export const HARD_MAX_OUTPUT_TOKENS = 300000;
const DEFAULT_OUTPUT_TOKENS = 8192;

export type TokenLimitConfidence = 'high' | 'medium' | 'low';

export type ModelTokenProfile = {
  maxOutputTokens: number;
  contextWindowTokens?: number;
  source: string;
  confidence: TokenLimitConfidence;
};

type LimitFieldMap = Record<string, unknown>;

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
];

const CONTEXT_LIMIT_FIELDS = [
  'context_window',
  'contextWindow',
  'contextWindowTokens',
  'context_length',
  'contextLength',
  'input_token_limit',
  'inputTokenLimit',
  'token_limit',
  'tokenLimit',
];

function toPositiveInteger(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : null;
}

function firstNumericField(fields: LimitFieldMap | undefined, names: string[]) {
  if (!fields) return null;

  for (const name of names) {
    const value = toPositiveInteger(fields[name]);
    if (value !== null) return value;
  }

  return null;
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

  if (/\bgpt 5 4\b/.test(name) && !/\bmini\b|\bnano\b/.test(name)) {
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

  if (/claude/.test(name)) {
    if (/opus 4 7/.test(name)) {
      return { maxOutputTokens: 128000, contextWindowTokens: 1000000, source: 'Claude Opus 4.7 family', confidence: 'high' };
    }
    if (/sonnet 4 6/.test(name)) {
      return { maxOutputTokens: 64000, contextWindowTokens: 1000000, source: 'Claude Sonnet 4.6 family', confidence: 'high' };
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
    if (!isNonReasoning && /reason|r1|speciale/.test(name)) {
      return { maxOutputTokens: 64000, contextWindowTokens: 128000, source: 'DeepSeek reasoning family', confidence: 'high' };
    }
    return { maxOutputTokens: 8192, contextWindowTokens: 128000, source: 'DeepSeek chat family', confidence: 'high' };
  }

  if (/grok/.test(name)) {
    if (/4 20|fast/.test(name)) {
      return { maxOutputTokens: 8192, contextWindowTokens: 2000000, source: 'xAI long-context family estimate', confidence: 'low' };
    }
    return { maxOutputTokens: 8192, contextWindowTokens: 128000, source: 'xAI Grok family estimate', confidence: 'low' };
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
  const explicitOutput = firstNumericField(fields, OUTPUT_LIMIT_FIELDS);
  const contextWindow = firstNumericField(fields, CONTEXT_LIMIT_FIELDS) ?? undefined;
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
      maxOutputTokens: Math.min(explicitOutput, HARD_MAX_OUTPUT_TOKENS),
      contextWindowTokens: contextWindow,
      source: explicitSource ?? 'model data',
      confidence: explicitConfidence ?? 'high',
    };
  }

  const inferred = inferModelTokenProfile(model);
  if (inferred) return inferred;

  const legacyOutput = firstNumericField(fields, ['avgOutputTokens']);
  if (legacyOutput !== null && legacyOutput >= DEFAULT_OUTPUT_TOKENS) {
    return {
      maxOutputTokens: Math.min(legacyOutput, HARD_MAX_OUTPUT_TOKENS),
      contextWindowTokens: contextWindow,
      source: 'legacy fallback data',
      confidence: 'low',
    };
  }

  return {
    maxOutputTokens: DEFAULT_OUTPUT_TOKENS,
    contextWindowTokens: contextWindow,
    source: 'default fallback',
    confidence: 'low',
  };
}
