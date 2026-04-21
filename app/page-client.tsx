'use client';

import Link from 'next/link';
import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import PromptInput from '../components/PromptInput';
import ModelSelect from '../components/ModelSelect';
import { fetchPricing, PricingMap } from '../lib/fetchPricing';
import { HARD_MAX_OUTPUT_TOKENS, resolveModelTokenProfile } from '../lib/modelTokenLimits';

const DEFAULT_OUTPUT_TOKENS = 4096;
const AUTO_OUTPUT_FALLBACK = 768;
const FALLBACK_CONTEXT_WINDOW = 4096;
const TOKEN_STEP = 64;
const DEFAULT_AGENT_TURNS = 8;
const MAX_AGENT_TURNS = 200;
const RECEIPT_ANIMATION_MS = 2800;

const TOKENIZERS = [
  { key: 'o200k_base', label: 'o200k_base', description: 'Newest OpenAI GPT-4o, o-series, and GPT-5 style models' },
  { key: 'cl100k_base', label: 'cl100k_base', description: 'GPT-4, GPT-3.5, embeddings, and broad OpenAI-compatible estimates' },
  { key: 'p50k_base', label: 'p50k_base', description: 'Codex and older code-focused models' },
  { key: 'p50k_edit', label: 'p50k_edit', description: 'Legacy edit models' },
  { key: 'r50k_base', label: 'r50k_base', description: 'Legacy GPT-3 base models' },
] as const;

type OutputPreset = {
  label: string;
  tokens: number;
  description: string;
};

type ReceiptRow = [string, string];

const OUTPUT_PRESETS: OutputPreset[] = [
  { label: 'Tiny', tokens: 256, description: 'label or title' },
  { label: 'Brief', tokens: 768, description: 'short answer' },
  { label: 'Standard', tokens: 2048, description: 'normal response' },
  { label: 'Long', tokens: 4096, description: 'detailed answer' },
  { label: 'Deep', tokens: 8192, description: 'large report' },
  { label: '16K', tokens: 16384, description: 'long document' },
  { label: '32K', tokens: 32768, description: 'deep run' },
  { label: '64K', tokens: 65536, description: 'extended run' },
  { label: '128K', tokens: 128000, description: 'max-scale run' },
];

const AGENT_TURN_PRESETS = [
  { label: 'Quick', turns: 3, description: 'short tool loop' },
  { label: 'IDE', turns: 8, description: 'coding session' },
  { label: 'Research', turns: 16, description: 'multi-source run' },
  { label: 'Deep', turns: 32, description: 'long investigation' },
  { label: 'Marathon', turns: 64, description: 'large agent job' },
];

type TokenizerKey = typeof TOKENIZERS[number]['key'];
type TokenizerModule = {
  encode: (lineToEncode: string) => number[];
  decode: (inputTokensToDecode: Iterable<number>) => string;
};

const TOKENIZER_IMPORTERS: Record<TokenizerKey, () => Promise<TokenizerModule>> = {
  o200k_base: () => import('gpt-tokenizer/esm/encoding/o200k_base'),
  cl100k_base: () => import('gpt-tokenizer/esm/encoding/cl100k_base'),
  p50k_base: () => import('gpt-tokenizer/esm/encoding/p50k_base'),
  p50k_edit: () => import('gpt-tokenizer/esm/encoding/p50k_edit'),
  r50k_base: () => import('gpt-tokenizer/esm/encoding/r50k_base'),
};

function formatCost(value: number | null) {
  return value !== null && Number.isFinite(value) ? `$${value.toFixed(6)}` : 'N/A';
}

function formatTokenCount(value: number | undefined) {
  return value && Number.isFinite(value) ? value.toLocaleString() : 'unknown';
}

function formatConfidence(confidence: string | undefined) {
  if (confidence === 'high') return 'high confidence';
  if (confidence === 'medium') return 'medium confidence';
  return 'planning estimate';
}

function compactModelName(model: string) {
  if (!model) return 'Select a model';
  return model.length > 34 ? `${model.slice(0, 31)}...` : model;
}

function clampOutputTokens(value: number, limit = HARD_MAX_OUTPUT_TOKENS) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.floor(value), Math.min(limit, HARD_MAX_OUTPUT_TOKENS)));
}

function clampAgentTurns(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(Math.floor(value), MAX_AGENT_TURNS));
}

function roundToTokenStep(value: number) {
  return Math.ceil(value / TOKEN_STEP) * TOKEN_STEP;
}

function estimateOutputTokens(promptTokens: number, modelLimit: number) {
  if (modelLimit <= 0) return 0;
  const safeLimit = Math.max(TOKEN_STEP, Math.min(modelLimit, HARD_MAX_OUTPUT_TOKENS));
  const softCap = Math.min(safeLimit, DEFAULT_OUTPUT_TOKENS);

  if (promptTokens <= 0) {
    return Math.min(AUTO_OUTPUT_FALLBACK, softCap);
  }

  const estimated =
    promptTokens < 80
      ? AUTO_OUTPUT_FALLBACK
      : promptTokens < 700
        ? promptTokens * 1.5
        : promptTokens * 1.2;

  return clampOutputTokens(Math.max(TOKEN_STEP, roundToTokenStep(estimated)), softCap);
}

function getRecommendedTokenizer(model: string): TokenizerKey | null {
  const normalized = model.toLowerCase();

  if (!normalized) return null;
  if (/(gpt-5|gpt-4o|chatgpt-4o|o1|o3|o4|realtime|audio)/.test(normalized)) return 'o200k_base';
  if (normalized.includes('edit')) return 'p50k_edit';
  if (/(codex|code-|code_)/.test(normalized)) return 'p50k_base';
  if (/(gpt-4|gpt-3\.5|embedding|davinci-002|babbage-002)/.test(normalized)) return 'cl100k_base';
  if (/(ada|babbage|curie|davinci)/.test(normalized)) return 'r50k_base';

  return null;
}

function ReceiptCard({
  rows,
  totalTokens,
  totalCostLabel,
  note,
  action,
  showRegister = false,
  animateSequence = false,
  className = '',
}: {
  rows: ReceiptRow[];
  totalTokens: number;
  totalCostLabel: string;
  note: string;
  action?: ReactNode;
  showRegister?: boolean;
  animateSequence?: boolean;
  className?: string;
}) {
  const sequenceStyle = {
    '--receipt-count': rows.length,
  } as CSSProperties;

  return (
    <div
      className={`receipt-card ${animateSequence ? 'receipt-card-sequenced' : ''} ${className}`}
      style={animateSequence ? sequenceStyle : undefined}
    >
      <div className="receipt-perf" aria-hidden="true" />
      <div className="flex items-start justify-between gap-6 border-b border-rose-highlightMed pb-5">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-rose-muted">Live estimate</p>
          <p className="mt-2 text-2xl font-black uppercase leading-none tracking-[-0.04em] text-rose-text">Cost receipt</p>
        </div>
        <output className="register-price font-mono text-sm font-bold text-rose-love tabular-nums">
          {totalCostLabel}
        </output>
      </div>

      {showRegister && (
        <div className="register-strip mt-5" aria-hidden="true">
          <span>Ringing up session total</span>
          <span>{totalCostLabel}</span>
        </div>
      )}

      <div className="mt-6 grid gap-3">
        {rows.map(([label, value], index) => (
          <div
            key={label}
            className="receipt-row"
            style={animateSequence ? ({ '--receipt-index': index } as CSSProperties) : undefined}
          >
            <span>{label}</span>
            <output>{value}</output>
          </div>
        ))}
      </div>

      <div className="receipt-total mt-8">
        <span>Total tokens</span>
        <data value={totalTokens}>{totalTokens.toLocaleString()}</data>
      </div>
      <div className="receipt-cost-total mt-3">
        <span>Total cost</span>
        <output>{totalCostLabel}</output>
      </div>
      <p className="receipt-note mt-5 text-sm leading-6 text-rose-muted">
        {note}
      </p>
      {action && <div className="receipt-action-wrap mt-5">{action}</div>}
    </div>
  );
}

export default function HomePageClient() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [tokens, setTokens] = useState<number[]>([]);
  const [decodedTokens, setDecodedTokens] = useState<{ str: string; id: number }[]>([]);
  const [cost, setCost] = useState<number | null>(null);
  const [inputCost, setInputCost] = useState<number | null>(null);
  const [outputCost, setOutputCost] = useState<number | null>(null);
  const [pricing, setPricing] = useState<PricingMap | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [outputMode, setOutputMode] = useState<'auto' | 'custom'>('auto');
  const [customOutTokens, setCustomOutTokens] = useState(DEFAULT_OUTPUT_TOKENS);
  const [visualizerMode, setVisualizerMode] = useState<'snapshot' | 'tokens'>('snapshot');
  const [tokenizer, setTokenizer] = useState<TokenizerKey>('o200k_base');
  const [tokenizerTouched, setTokenizerTouched] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [agentTurns, setAgentTurns] = useState(DEFAULT_AGENT_TURNS);
  const [summaryView, setSummaryView] = useState<'receipt' | 'detail'>('receipt');
  const [animatedSessionCost, setAnimatedSessionCost] = useState(0);
  const [finalReceiptAnimationState, setFinalReceiptAnimationState] = useState<'idle' | 'running' | 'done'>('idle');
  const animatedSessionCostRef = useRef(0);
  const finalReceiptRef = useRef<HTMLDivElement | null>(null);
  const finalReceiptAnimationTimerRef = useRef<number | null>(null);
  const [finalReceiptInView, setFinalReceiptInView] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchPricing();
        if (mounted) setPricing(data);
      } catch (e) {
        console.error('Failed to load pricing from Supabase', e);
        if (mounted) setPricing({});
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (pricing === null) {
      setModelsLoading(true);
      return () => {
        mounted = false;
      };
    }

    (async () => {
      setModelsLoading(true);
      try {
        const keys = Object.keys(pricing);
        if (keys.length > 0) {
          if (mounted) setAvailableModels(keys);
          return;
        }

        try {
          const res = await fetch('/data/llm-data.json');
          const json = await res.json();
          const staticKeys = Object.keys(json ?? {});
          if (mounted) {
            setPricing(json as PricingMap);
            setAvailableModels(staticKeys);
          }
        } catch (err) {
          console.warn('Fallback to static model list failed:', err);
          if (mounted) setAvailableModels([]);
        }
      } finally {
        if (mounted) setModelsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pricing]);

  useEffect(() => {
    if (modelsLoading || availableModels.length === 0) return;
    if (!model || !availableModels.includes(model)) {
      setModel(availableModels[0]);
    }
  }, [availableModels, model, modelsLoading]);

  const modelTokenProfile = useMemo(
    () => resolveModelTokenProfile(model, pricing?.[model]),
    [model, pricing]
  );
  const modelOutputLimit = modelTokenProfile.maxOutputTokens;
  const modelContextWindow = modelTokenProfile.contextWindowTokens;
  const effectiveOutputLimit = useMemo(() => {
    if (!modelContextWindow) return modelOutputLimit;
    return clampOutputTokens(Math.max(0, modelContextWindow - tokens.length), modelOutputLimit);
  }, [modelContextWindow, modelOutputLimit, tokens.length]);

  const autoOutTokens = useMemo(
    () => estimateOutputTokens(tokens.length, effectiveOutputLimit),
    [effectiveOutputLimit, tokens.length]
  );

  const plannedOutput = outputMode === 'auto'
    ? autoOutTokens
    : clampOutputTokens(customOutTokens, effectiveOutputLimit);

  const outputPresets = useMemo(() => {
    const presets = [...OUTPUT_PRESETS];
    const shouldAddCap =
      modelOutputLimit > 0 &&
      modelOutputLimit <= HARD_MAX_OUTPUT_TOKENS &&
      !presets.some(preset => preset.tokens === modelOutputLimit) &&
      modelOutputLimit > OUTPUT_PRESETS[OUTPUT_PRESETS.length - 1].tokens;

    if (shouldAddCap) {
      presets.push({ label: 'Cap', tokens: modelOutputLimit, description: 'model ceiling' });
    }

    return presets.sort((a, b) => a.tokens - b.tokens);
  }, [modelOutputLimit]);

  const recommendedTokenizer = useMemo(() => getRecommendedTokenizer(model), [model]);

  useEffect(() => {
    setCustomOutTokens(prev => clampOutputTokens(prev, effectiveOutputLimit));
  }, [effectiveOutputLimit]);

  useEffect(() => {
    if (!tokenizerTouched && recommendedTokenizer) {
      setTokenizer(recommendedTokenizer);
    }
  }, [recommendedTokenizer, tokenizerTouched]);

  useEffect(() => {
    if (!pricing || !model || !tokens.length) {
      setCost(null);
      setInputCost(null);
      setOutputCost(null);
      return;
    }

    const entry = pricing[model];
    let inCost: number | null = null;
    let outCost: number | null = null;

    if (entry && entry.pricing) {
      const inPricePer1k = Number(entry.pricing.input);
      const outPricePer1k = Number(entry.pricing.output);

      if (Number.isFinite(inPricePer1k)) {
        inCost = (tokens.length / 1000) * inPricePer1k;
      }

      if (Number.isFinite(outPricePer1k) && plannedOutput > 0) {
        outCost = (plannedOutput / 1000) * outPricePer1k;
      }
    }

    setInputCost(inCost);
    setOutputCost(outCost);
    const total = [inCost, outCost].every(v => typeof v === 'number' && !Number.isNaN(v))
      ? (inCost as number) + (outCost as number)
      : typeof inCost === 'number'
        ? inCost
        : null;
    setCost(total);
  }, [pricing, model, tokens, plannedOutput]);

  const tokenizerOption = TOKENIZERS.find(t => t.key === tokenizer) ?? TOKENIZERS[0];

  useEffect(() => {
    let cancelled = false;

    if (!prompt) {
      setTokens([]);
      setDecodedTokens([]);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const tokenizerModule = await TOKENIZER_IMPORTERS[tokenizer]();
        if (cancelled) return;
        const tks = tokenizerModule.encode(prompt);
        setTokens(tks);
        setDecodedTokens(tks.map(t => ({ str: tokenizerModule.decode([t]), id: t })));
      } catch (e) {
        const fallback = await TOKENIZER_IMPORTERS.cl100k_base();
        if (cancelled) return;
        const tks = fallback.encode(prompt);
        setTokens(tks);
        setDecodedTokens(tks.map(t => ({ str: fallback.decode([t]), id: t })));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prompt, tokenizer]);

  const hasTokens = tokens.length > 0;
  const modelOptions = availableModels;
  const combinedTokens = tokens.length + plannedOutput;
  const effectiveAgentTurns = agentMode ? clampAgentTurns(agentTurns) : 1;
  const totalPromptTokens = tokens.length * effectiveAgentTurns;
  const totalOutputTokens = plannedOutput * effectiveAgentTurns;
  const totalSessionTokens = combinedTokens * effectiveAgentTurns;
  const contextReferenceWindow = modelContextWindow ?? FALLBACK_CONTEXT_WINDOW;
  const contextCoverage = useMemo(
    () => (hasTokens || plannedOutput > 0 ? Math.min(100, (combinedTokens / contextReferenceWindow) * 100) : 0),
    [combinedTokens, contextReferenceWindow, hasTokens, plannedOutput]
  );
  const contextRemaining = modelContextWindow
    ? Math.max(0, modelContextWindow - combinedTokens)
    : null;
  const outputCapLabel = modelOutputLimit.toLocaleString();
  const availableOutputLabel = effectiveOutputLimit.toLocaleString();
  const contextWindowLabel = formatTokenCount(modelContextWindow);
  const contextRemainingLabel = contextRemaining === null ? 'unknown' : contextRemaining.toLocaleString();
  const contextMeterLabel = modelContextWindow ? 'model context plan' : 'fallback planning window';
  const tokenLimitSource = `${modelTokenProfile.source}, ${formatConfidence(modelTokenProfile.confidence)}`;
  const sessionInputCost = typeof inputCost === 'number' ? inputCost * effectiveAgentTurns : null;
  const sessionOutputCost = typeof outputCost === 'number' ? outputCost * effectiveAgentTurns : null;
  const sessionCost = typeof cost === 'number' ? cost * effectiveAgentTurns : null;
  const animatedSessionCostLabel = sessionCost === null ? 'N/A' : formatCost(animatedSessionCost);
  const finalSessionCostLabel = formatCost(sessionCost);
  const receiptAnimationSignature = useMemo(
    () => [
      model,
      tokenizer,
      outputMode,
      plannedOutput,
      effectiveAgentTurns,
      totalSessionTokens,
      finalSessionCostLabel,
    ].join('|'),
    [effectiveAgentTurns, finalSessionCostLabel, model, outputMode, plannedOutput, tokenizer, totalSessionTokens]
  );

  useEffect(() => {
    const target = typeof sessionCost === 'number' ? sessionCost : 0;
    const start = animatedSessionCostRef.current;
    let frame = 0;
    let latest = start;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      animatedSessionCostRef.current = target;
      setAnimatedSessionCost(target);
      return;
    }

    const startedAt = performance.now();
    const duration = 680;

    const tick = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      latest = start + (target - start) * eased;
      animatedSessionCostRef.current = latest;
      setAnimatedSessionCost(latest);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        animatedSessionCostRef.current = target;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      animatedSessionCostRef.current = latest;
    };
  }, [sessionCost]);

  useEffect(() => {
    if (summaryView !== 'receipt') return;
    const receiptNode = finalReceiptRef.current;
    if (!receiptNode) return;

    if (!('IntersectionObserver' in window)) {
      setFinalReceiptInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setFinalReceiptInView(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.28,
      }
    );

    observer.observe(receiptNode);
    return () => observer.disconnect();
  }, [summaryView]);

  useEffect(() => {
    if (finalReceiptAnimationTimerRef.current) {
      clearTimeout(finalReceiptAnimationTimerRef.current);
      finalReceiptAnimationTimerRef.current = null;
    }
    setFinalReceiptAnimationState('idle');
  }, [receiptAnimationSignature]);

  useEffect(() => {
    if (summaryView !== 'receipt' || !finalReceiptInView || finalReceiptAnimationState !== 'idle') return;

    setFinalReceiptAnimationState('running');
    finalReceiptAnimationTimerRef.current = window.setTimeout(() => {
      setFinalReceiptAnimationState('done');
      finalReceiptAnimationTimerRef.current = null;
    }, RECEIPT_ANIMATION_MS);
  }, [finalReceiptAnimationState, finalReceiptInView, receiptAnimationSignature, summaryView]);

  useEffect(() => () => {
    if (finalReceiptAnimationTimerRef.current) {
      clearTimeout(finalReceiptAnimationTimerRef.current);
    }
  }, []);

  const receiptNote = agentMode
    ? 'Agent mode multiplies the bill by similar AI turns. Context safety still stays per turn.'
    : 'Empty values show until you paste a prompt and choose a priced model.';
  const receiptRows: ReceiptRow[] = [
    ['Model', compactModelName(model)],
    ['Mode', agentMode ? `Agent x ${effectiveAgentTurns}` : 'One-shot'],
    ['Tokenizer', tokenizer.replace('_', '/')],
    ['Prompt / turn', tokens.length.toLocaleString()],
    ['Output / turn', outputMode === 'auto' ? `${plannedOutput.toLocaleString()} est.` : plannedOutput.toLocaleString()],
    ['Total turns', effectiveAgentTurns.toLocaleString()],
    ['Output cap', outputCapLabel],
    ['Available out', availableOutputLabel],
    ['Context', contextWindowLabel],
    ['Context left', contextRemainingLabel],
    ['Input cost', formatCost(sessionInputCost)],
    ['Output cost', formatCost(sessionOutputCost)],
  ];
  const summaryRows: ReceiptRow[] = [
    ['Prompt tokens', tokens.length.toLocaleString()],
    ['Planned output', plannedOutput.toLocaleString()],
    ['Agent mode', agentMode ? 'On' : 'Off'],
    ['AI turns', effectiveAgentTurns.toLocaleString()],
    ['Total prompt tokens', totalPromptTokens.toLocaleString()],
    ['Total output tokens', totalOutputTokens.toLocaleString()],
    ['Output cap', outputCapLabel],
    ['Available output', availableOutputLabel],
    ['Context window', contextWindowLabel],
    ['Context left', contextRemainingLabel],
    ['Combined tokens', combinedTokens.toLocaleString()],
    ['Session tokens', totalSessionTokens.toLocaleString()],
    ['Input cost', formatCost(sessionInputCost)],
    ['Output cost', formatCost(sessionOutputCost)],
    ['Total cost', finalSessionCostLabel],
  ];

  const downloadReceiptImage = () => {
    const scale = 2;
    const width = 1500;
    const cardX = 120;
    const cardY = 86;
    const cardWidth = 1180;
    const shadowOffset = 34;
    const rowHeight = 66;
    const headerHeight = 265;
    const totalHeight = 330;
    const footerHeight = 150;
    const cardHeight = headerHeight + receiptRows.length * rowHeight + totalHeight + footerHeight;
    const height = cardY + cardHeight + shadowOffset + 92;
    const contentLeft = cardX + 76;
    const contentRight = cardX + cardWidth - 76;
    const backgroundColor = '#050505';
    const cardColor = '#111111';
    const accentColor = '#e61919';
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext('2d');
    if (!context) return;

    const drawPerforation = (edgeY: number) => {
      context.fillStyle = backgroundColor;
      for (let x = cardX + 18; x < cardX + cardWidth - 8; x += 22) {
        context.beginPath();
        context.arc(x, edgeY, 8, 0, Math.PI * 2);
        context.fill();
      }
    };

    const drawRightText = (text: string, x: number, y: number, maxWidth: number, font: string) => {
      const parts = font.match(/^(\d+)px\s+(.+)$/);
      if (!parts) {
        context.font = font;
        context.fillText(text, x, y);
        return;
      }

      const fontFamily = parts[2];
      let size = Number(parts[1]);
      context.font = `${size}px ${fontFamily}`;
      while (size > 22 && context.measureText(text).width > maxWidth) {
        size -= 2;
        context.font = `${size}px ${fontFamily}`;
      }
      context.fillText(text, x, y);
    };

    context.scale(scale, scale);
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    context.fillStyle = 'rgba(230, 25, 25, 0.14)';
    context.beginPath();
    context.moveTo(0, height * 0.7);
    context.lineTo(width * 0.22, height * 0.45);
    context.lineTo(width, height * 0.1);
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();
    context.fill();

    context.fillStyle = accentColor;
    context.fillRect(cardX + shadowOffset, cardY + shadowOffset, cardWidth, cardHeight);
    context.fillStyle = cardColor;
    context.fillRect(cardX, cardY, cardWidth, cardHeight);
    context.strokeStyle = '#343434';
    context.lineWidth = 2;
    context.strokeRect(cardX, cardY, cardWidth, cardHeight);
    drawPerforation(cardY);
    drawPerforation(cardY + cardHeight);

    context.font = '700 24px Space Mono, monospace';
    context.fillStyle = '#8b8b8b';
    context.fillText('L I V E   E S T I M A T E', contentLeft, cardY + 82);
    context.font = '900 64px Outfit, sans-serif';
    context.fillStyle = '#f0f0f0';
    context.fillText('COST RECEIPT', contentLeft, cardY + 158);
    context.font = '700 28px Space Mono, monospace';
    context.fillStyle = accentColor;
    context.textAlign = 'right';
    drawRightText(finalSessionCostLabel, contentRight, cardY + 82, 360, '28px Space Mono, monospace');
    context.textAlign = 'left';

    context.strokeStyle = '#555555';
    context.setLineDash([14, 14]);
    context.beginPath();
    context.moveTo(contentLeft, cardY + 210);
    context.lineTo(contentRight, cardY + 210);
    context.stroke();
    context.setLineDash([]);

    let y = cardY + headerHeight;
    context.font = '700 26px Space Mono, monospace';
    for (const [label, value] of receiptRows) {
      context.fillStyle = '#8b8b8b';
      context.textAlign = 'left';
      context.fillText(label.toUpperCase(), contentLeft, y);
      context.fillStyle = '#e8e8e8';
      context.textAlign = 'right';
      drawRightText(value, contentRight, y, 590, '700 26px Space Mono, monospace');
      context.strokeStyle = '#303030';
      context.beginPath();
      context.moveTo(contentLeft, y + 24);
      context.lineTo(contentRight, y + 24);
      context.stroke();
      y += rowHeight;
    }

    y += 62;
    context.fillStyle = '#8b8b8b';
    context.textAlign = 'left';
    context.font = '700 26px Space Mono, monospace';
    context.fillText('TOTAL TOKENS', contentLeft, y);
    context.fillStyle = accentColor;
    context.textAlign = 'right';
    drawRightText(totalSessionTokens.toLocaleString(), contentRight, y + 34, 760, '92px Space Mono, monospace');

    y += 124;
    context.fillStyle = '#8b8b8b';
    context.textAlign = 'left';
    context.font = '700 26px Space Mono, monospace';
    context.fillText('TOTAL COST', contentLeft, y);
    context.fillStyle = accentColor;
    context.textAlign = 'right';
    drawRightText(finalSessionCostLabel, contentRight, y + 10, 520, '48px Space Mono, monospace');

    context.textAlign = 'left';
    context.font = '500 24px Outfit, sans-serif';
    context.fillStyle = '#8b8b8b';
    context.fillText('Made at https://prompt-info.helloworldfirm.com/', contentLeft, cardY + cardHeight - 68);

    const link = document.createElement('a');
    link.download = 'prompt-info-final-bill.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  return (
    <>
      <section className="mx-auto w-full max-w-[1500px] border-x border-b border-rose-highlightMed bg-rose-base px-4 py-12 sm:px-6 md:px-12 md:py-16">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <p className="data-label text-rose-love">Workbench</p>
            <h2 className="mt-4 max-w-4xl text-[clamp(2.7rem,6vw,5.8rem)] font-black uppercase leading-[0.88] tracking-[-0.07em] text-rose-text">
              Price the request in the same order you build it.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-rose-subtle sm:text-base">
            Start with text, then select the model and tokenizer. Output uses a conservative auto estimate until you switch to a preset or custom number.
          </p>
        </div>
      </section>

      <section id="planner" className="mx-auto grid w-full max-w-[1500px] gap-px bg-rose-highlightMed px-px py-px lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <article className="bg-rose-base p-4 sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="stage-tag">Step 01</span>
              <label className="data-label" htmlFor="prompt-input">
                Prompt
              </label>
              <p className="mt-2 max-w-xl text-sm leading-6 text-rose-subtle">
                Paste the exact text you plan to send. The receipt updates as you type.
              </p>
            </div>
            <output className="font-mono text-sm font-bold text-rose-text tabular-nums">
              {tokens.length.toLocaleString()} tokens
            </output>
          </div>
          <div className="mt-5">
            <PromptInput id="prompt-input" value={prompt} onChange={setPrompt} />
          </div>
          <div className="mt-5 h-2 border border-rose-highlightMed bg-rose-overlay">
            <div
              className="h-full bg-rose-love transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${contextCoverage}%` }}
            />
          </div>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-rose-muted tabular-nums">
            {Math.round(contextCoverage)}% of the {contextReferenceWindow.toLocaleString()} token {contextMeterLabel}
          </p>
        </article>

        <aside className="grid gap-px bg-rose-highlightMed">
          <div className="bg-rose-base p-4 sm:p-6 md:p-8">
            <span className="stage-tag">Step 02</span>
            <label className="data-label" htmlFor="model-select">
              Model
            </label>
            <div className="mt-4">
              <ModelSelect
                id="model-select"
                value={model}
                onChange={setModel}
                models={modelOptions}
                loading={modelsLoading}
              />
            </div>
          </div>

          <div className="bg-rose-base p-4 sm:p-6 md:p-8">
            <span className="stage-tag">Step 03</span>
            <label className="data-label" htmlFor="tokenizer-select">
              Tokenizer
            </label>
            <select
              id="tokenizer-select"
              value={tokenizer}
              onChange={e => {
                setTokenizerTouched(true);
                setTokenizer(e.target.value as TokenizerKey);
              }}
              className="glass-select mt-4 w-full appearance-none border px-4 py-3 text-sm font-semibold transition duration-200 focus:border-rose-love focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none"
            >
              {TOKENIZERS.map(opt => (
                <option key={opt.key} value={opt.key} className="bg-rose-base text-rose-text">
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
            <div className="mt-4 grid gap-3">
              <p className="text-sm leading-6 text-rose-muted">
                {tokenizerOption.description}. These are the mainstream OpenAI BPE encodings available in the tokenizer package. Anthropic, Gemini, and Llama counts remain planning estimates unless their native tokenizer is added later.
              </p>
              {recommendedTokenizer && recommendedTokenizer !== tokenizer && (
                <button
                  type="button"
                  onClick={() => {
                    setTokenizer(recommendedTokenizer);
                    setTokenizerTouched(false);
                  }}
                  className="justify-self-start border border-rose-highlightMed bg-rose-base px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-subtle transition duration-200 hover:border-rose-love hover:text-rose-text focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none"
                >
                  Use recommended {recommendedTokenizer.replace('_', '/')}
                </button>
              )}
            </div>
          </div>

          <div className="bg-rose-base p-4 sm:p-6 md:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="stage-tag">Step 04</span>
                <label className="data-label" htmlFor="expected-out">
                  Planned output
                </label>
                <p className="mt-2 text-sm leading-6 text-rose-subtle">
                  Output is uncertain, so auto mode estimates from prompt length. Presets and direct edits switch to custom mode.
                </p>
              </div>
              <output className="font-mono text-sm font-bold text-rose-text tabular-nums" aria-live="polite">
                {plannedOutput.toLocaleString()}
              </output>
            </div>
            <div className="mt-5 grid gap-px bg-rose-highlightMed p-px sm:grid-cols-2">
              {(['auto', 'custom'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setOutputMode(mode)}
                  aria-pressed={outputMode === mode}
                  className={`min-h-11 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none ${
                    outputMode === mode
                      ? 'bg-rose-love text-white'
                      : 'bg-rose-base text-rose-subtle hover:bg-rose-overlay hover:text-rose-text'
                  }`}
                >
                  {mode === 'auto' ? 'Auto estimate' : 'Custom'}
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(92px,1fr))]">
              {outputPresets.map(preset => {
                const isUnavailable = preset.tokens > effectiveOutputLimit;
                const isActive = outputMode === 'custom' && preset.tokens === plannedOutput;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={isUnavailable}
                    onClick={() => {
                      setOutputMode('custom');
                      setCustomOutTokens(preset.tokens);
                    }}
                    aria-pressed={isActive}
                    className={`min-h-16 border px-3 py-2 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none ${
                      isActive
                        ? 'border-rose-love bg-rose-love text-white'
                        : isUnavailable
                          ? 'cursor-not-allowed border-rose-highlightMed bg-rose-base text-rose-muted opacity-45'
                        : 'border-rose-highlightMed bg-rose-base text-rose-subtle hover:border-rose-love hover:text-rose-text'
                    }`}
                  >
                    <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.14em]">{preset.label}</span>
                    <span className="mt-1 block font-mono text-xs font-bold tabular-nums">{preset.tokens.toLocaleString()}</span>
                    <span className="mt-1 block text-xs normal-case text-current opacity-75">
                      {isUnavailable ? 'above available' : preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center">
              <input
                id="expected-out"
                type="range"
                min={0}
                max={effectiveOutputLimit}
                step={TOKEN_STEP}
                value={plannedOutput}
                onChange={e => {
                  setOutputMode('custom');
                  setCustomOutTokens(clampOutputTokens(Number(e.target.value), effectiveOutputLimit));
                }}
                className="h-2 w-full cursor-pointer appearance-none bg-rose-overlay accent-rose-love"
                aria-describedby="planned-output-help"
              />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={effectiveOutputLimit}
                step={TOKEN_STEP}
                value={plannedOutput}
                onChange={e => {
                  setOutputMode('custom');
                  setCustomOutTokens(clampOutputTokens(Number(e.target.value), effectiveOutputLimit));
                }}
                className="glass-select w-full border px-4 py-3 text-right font-mono text-sm font-bold text-rose-text tabular-nums focus:border-rose-love focus:outline-none focus:ring-2 focus:ring-rose-love [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label="Custom planned output tokens"
              />
            </div>
            <p id="planned-output-help" className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-rose-muted tabular-nums">
              {outputMode === 'auto' ? 'Auto estimate' : 'Custom forecast'} / available {availableOutputLabel} / output cap {outputCapLabel} / {tokenLimitSource}
            </p>
          </div>

          <div className="bg-rose-base p-4 sm:p-6 md:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="stage-tag">Step 05</span>
                <label className="data-label" htmlFor="agent-turns">
                  Agent mode
                </label>
                <p className="mt-2 text-sm leading-6 text-rose-subtle">
                  Multiply the prompt, output, and cost by repeated AI turns for IDE agents, tool loops, and deep research.
                </p>
              </div>
              <output className="font-mono text-sm font-bold text-rose-text tabular-nums" aria-live="polite">
                {effectiveAgentTurns.toLocaleString()} turn{effectiveAgentTurns === 1 ? '' : 's'}
              </output>
            </div>

            <div className="mt-5 grid gap-px bg-rose-highlightMed p-px sm:grid-cols-2">
              {[
                { label: 'One-shot', enabled: false },
                { label: 'Agent work', enabled: true },
              ].map(option => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setAgentMode(option.enabled)}
                  aria-pressed={agentMode === option.enabled}
                  className={`min-h-11 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none ${
                    agentMode === option.enabled
                      ? 'bg-rose-love text-white'
                      : 'bg-rose-base text-rose-subtle hover:bg-rose-overlay hover:text-rose-text'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(98px,1fr))]">
              {AGENT_TURN_PRESETS.map(preset => {
                const isActive = agentMode && effectiveAgentTurns === preset.turns;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setAgentMode(true);
                      setAgentTurns(preset.turns);
                    }}
                    aria-pressed={isActive}
                    className={`min-h-16 border px-3 py-2 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none ${
                      isActive
                        ? 'border-rose-love bg-rose-love text-white'
                        : 'border-rose-highlightMed bg-rose-base text-rose-subtle hover:border-rose-love hover:text-rose-text'
                    }`}
                  >
                    <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.14em]">{preset.label}</span>
                    <span className="mt-1 block font-mono text-xs font-bold tabular-nums">{preset.turns.toLocaleString()} turns</span>
                    <span className="mt-1 block text-xs normal-case text-current opacity-75">{preset.description}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center">
              <input
                id="agent-turns"
                type="range"
                min={1}
                max={MAX_AGENT_TURNS}
                step={1}
                value={effectiveAgentTurns}
                onChange={e => {
                  setAgentMode(true);
                  setAgentTurns(clampAgentTurns(Number(e.target.value)));
                }}
                className="h-2 w-full cursor-pointer appearance-none bg-rose-overlay accent-rose-love"
                aria-describedby="agent-mode-help"
              />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_AGENT_TURNS}
                step={1}
                value={effectiveAgentTurns}
                onChange={e => {
                  setAgentMode(true);
                  setAgentTurns(clampAgentTurns(Number(e.target.value)));
                }}
                className="glass-select w-full border px-4 py-3 text-right font-mono text-sm font-bold text-rose-text tabular-nums focus:border-rose-love focus:outline-none focus:ring-2 focus:ring-rose-love [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label="Agent turn count"
              />
            </div>

            <div className="mt-5 grid gap-px bg-rose-highlightMed sm:grid-cols-3">
              {[
                ['Prompt total', totalPromptTokens.toLocaleString()],
                ['Output total', totalOutputTokens.toLocaleString()],
                ['Session cost', formatCost(sessionCost)],
              ].map(([label, value]) => (
                <div key={label} className="bg-rose-base p-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-rose-muted">{label}</p>
                  <output className="mt-2 block font-mono text-sm font-bold text-rose-text tabular-nums">{value}</output>
                </div>
              ))}
            </div>
            <p id="agent-mode-help" className="mt-3 text-sm leading-6 text-rose-muted">
              Context safety is still shown per turn. Agent totals assume each turn sends a similar prompt and receives a similar response.
            </p>
          </div>
        </aside>
      </section>

      <section id="evidence" className="mx-auto grid w-full max-w-[1500px] gap-px bg-rose-highlightMed px-px pb-px lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <aside className="receipt-panel bg-rose-base p-4 sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="stage-tag">Step 06</span>
              <p className="data-label mt-4">Final bill</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-rose-highlightMed p-px">
              {(['receipt', 'detail'] as const).map(view => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setSummaryView(view)}
                  aria-pressed={summaryView === view}
                  className={`min-h-10 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none ${
                    summaryView === view
                      ? 'bg-rose-love text-white'
                      : 'bg-rose-base text-rose-subtle hover:bg-rose-overlay hover:text-rose-text'
                  }`}
                >
                  {view === 'receipt' ? 'Receipt' : 'Details'}
                </button>
              ))}
            </div>
          </div>

          {summaryView === 'receipt' ? (
            <div ref={finalReceiptRef} className="receipt-stage mt-7">
              <ReceiptCard
                key={receiptAnimationSignature}
                rows={receiptRows}
                totalTokens={totalSessionTokens}
                totalCostLabel={animatedSessionCostLabel}
                note={receiptNote}
                className="receipt-card-final"
                showRegister={finalReceiptAnimationState === 'running'}
                animateSequence={finalReceiptAnimationState === 'running'}
                action={(
                  <button
                    type="button"
                    onClick={downloadReceiptImage}
                    className="receipt-action"
                  >
                    Save bill image
                  </button>
                )}
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-px bg-rose-highlightMed">
              {summaryRows.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[minmax(0,1fr)_minmax(100px,0.7fr)] bg-rose-base">
                  <span className="border-r border-rose-highlightMed p-3 text-sm text-rose-subtle">{label}</span>
                  <output className="p-3 text-right font-mono text-sm font-bold text-rose-text tabular-nums">{value}</output>
                </div>
              ))}
            </div>
          )}
          <p className="mt-5 text-sm leading-7 text-rose-muted">
            The estimate uses the selected model price, planned output length, and agent turn count. It is meant for prompt planning, not provider billing reconciliation.
          </p>
        </aside>

        <article className="bg-rose-base p-4 sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="data-label">Token evidence</p>
              <h2 className="mt-3 max-w-3xl text-[clamp(2.4rem,5vw,5.4rem)] font-black uppercase leading-[0.9] tracking-[-0.06em] text-rose-text">
                Inspect what the counter sees.
              </h2>
            </div>
            <div className="flex border border-rose-highlightMed">
              {(['snapshot', 'tokens'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setVisualizerMode(mode)}
                  className={`min-h-11 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition duration-200 focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none ${
                    visualizerMode === mode
                      ? 'bg-rose-love text-white'
                      : 'bg-rose-base text-rose-subtle hover:bg-rose-overlay hover:text-rose-text'
                  }`}
                  aria-pressed={visualizerMode === mode}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 border border-rose-highlightMed bg-rose-surface p-3">
            {visualizerMode === 'snapshot' && decodedTokens.length === 0 ? (
              <div className="p-5 text-sm text-rose-muted">Paste a prompt to see token fragments and IDs.</div>
            ) : visualizerMode === 'snapshot' ? (
              <div className="max-h-[420px] overflow-y-auto p-1">
                <div className="flex flex-wrap gap-2">
                  {decodedTokens.map((tok, i) => (
                    <span
                      key={`${tok.id}-${i}`}
                      className="token-chip group"
                      title={`Token #${i + 1}\nID: ${tok.id}`}
                    >
                      <span className="text-rose-text group-hover:text-white">{tok.str || '[space]'}</span>
                      <span className="text-rose-muted group-hover:text-rose-text">#{tok.id}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-6 text-rose-subtle">
                {decodedTokens.length
                  ? decodedTokens.map((tok, i) => `${String(i + 1).padStart(4, '0')} / ${tok.id} / ${JSON.stringify(tok.str)}`).join('\n')
                  : '0000 / waiting for prompt'}
              </pre>
            )}
          </div>
        </article>
      </section>

      <section className="mx-auto w-full max-w-[1500px] border-x border-b border-rose-highlightMed bg-rose-base px-4 py-16 sm:px-6 md:px-12 md:py-24">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_340px] md:items-end">
          <div>
            <p className="data-label">Need a different payload shape?</p>
            <h2 className="mt-5 max-w-5xl text-[clamp(2.8rem,7vw,6.6rem)] font-black uppercase leading-[0.86] tracking-[-0.07em] text-rose-text">
              Compare the same prompt as TOON, JSON, YAML, XML, and CSV.
            </h2>
          </div>
          <Link className="action-primary justify-center" href="/format-comparison">
            Open format lab
          </Link>
        </div>
      </section>
    </>
  );
}
