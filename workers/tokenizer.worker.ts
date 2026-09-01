type TokenizerModule = {
  encode: (text: string) => number[];
  decode: (tokens: Iterable<number>) => string;
};

type TokenizerKey = 'o200k_base' | 'cl100k_base' | 'p50k_base' | 'p50k_edit' | 'r50k_base';
type TokenizeRequest = { requestId: number; tokenizer: TokenizerKey; prompt: string };
type TokenizeResponse = {
  requestId: number;
  count: number;
  decoded: Array<{ id: number; text: string }>;
  error?: string;
};

const IMPORTERS: Record<TokenizerKey, () => Promise<TokenizerModule>> = {
  o200k_base: () => import('gpt-tokenizer/encoding/o200k_base'),
  cl100k_base: () => import('gpt-tokenizer/encoding/cl100k_base'),
  p50k_base: () => import('gpt-tokenizer/encoding/p50k_base'),
  p50k_edit: () => import('gpt-tokenizer/encoding/p50k_edit'),
  r50k_base: () => import('gpt-tokenizer/encoding/r50k_base'),
};

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<TokenizeRequest>) => void) | null;
  postMessage: (message: TokenizeResponse) => void;
};

workerScope.onmessage = async ({ data }) => {
  try {
    const tokenizer = await IMPORTERS[data.tokenizer]();
    const tokens = tokenizer.encode(data.prompt);
    workerScope.postMessage({
      requestId: data.requestId,
      count: tokens.length,
      decoded: tokens.slice(0, 400).map(id => ({ id, text: tokenizer.decode([id]) })),
    });
  } catch (error) {
    workerScope.postMessage({
      requestId: data.requestId,
      count: 0,
      decoded: [],
      error: error instanceof Error ? error.message : 'Tokenizer unavailable.',
    });
  }
};
