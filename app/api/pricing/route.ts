import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { getSupabaseClient } from "@/lib/supabase";
import type { PricingEntry, PricingMap } from "@/types/pricing";

const PRICING_SOURCE =
  process.env.SUPABASE_PRICING_TABLE?.trim() ||
  process.env.SUPABASE_PRICING_VIEW?.trim() ||
  "model_pricing";

const FALLBACK_JSON_PATH = path.join(process.cwd(), "public/data/llm-data.json");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const parseString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const parsePricingPayload = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return isRecord(value) ? value : null;
};

const normaliseRow = (row: Record<string, unknown>) => {
  const pricingPayload = parsePricingPayload(row.pricing);

  const name =
    parseString(row.model) ||
    parseString(row.name) ||
    parseString(row.model_name) ||
    parseString(row.slug) ||
    parseString(row.id);

  if (!name) {
    return null;
  }

  const inputCost =
    parseNumber(row.input_cost) ??
    parseNumber(row.inputPrice) ??
    parseNumber(row.input_price) ??
    parseNumber(row.pricing_input) ??
    (pricingPayload ? parseNumber(pricingPayload.input) ?? parseNumber(pricingPayload.prompt) : null);

  const outputCost =
    parseNumber(row.output_cost) ??
    parseNumber(row.outputPrice) ??
    parseNumber(row.output_price) ??
    parseNumber(row.pricing_output) ??
    (pricingPayload ? parseNumber(pricingPayload.output) ?? parseNumber(pricingPayload.completion) : null);

  const co2eFactor =
    parseNumber(row.co2e_factor) ??
    parseNumber(row.co2eFactor) ??
    parseNumber(row.emissions_factor) ??
    (pricingPayload ? parseNumber(pricingPayload.co2eFactor) ?? parseNumber(pricingPayload.emissions) : null);

  const avgOutputTokens =
    parseNumber(row.avg_output_tokens) ??
    parseNumber(row.avgOutputTokens) ??
    parseNumber(row.output_token_average) ??
    parseNumber(row.avg_output);

  const provider =
    parseString(row.provider) ||
    parseString(row.vendor) ||
    parseString(row.source);

  const description =
    parseString(row.description) ||
    parseString(row.notes) ||
    parseString(row.summary);

  const entry: PricingEntry = {};

  if (inputCost !== null || outputCost !== null) {
    entry.pricing = {
      input: inputCost,
      output: outputCost,
    };
  }

  if (co2eFactor !== null) {
    entry.co2eFactor = co2eFactor;
  }

  if (avgOutputTokens !== null) {
    entry.avgOutputTokens = avgOutputTokens;
  }

  if (provider) {
    entry.provider = provider;
  }

  if (description) {
    entry.description = description;
  }

  const knownKeys = new Set([
    "pricing",
    "model",
    "name",
    "model_name",
    "slug",
    "id",
    "input_cost",
    "inputPrice",
    "input_price",
    "pricing_input",
    "output_cost",
    "outputPrice",
    "output_price",
    "pricing_output",
    "co2e_factor",
    "co2eFactor",
    "emissions_factor",
    "avg_output_tokens",
    "avgOutputTokens",
    "output_token_average",
    "avg_output",
    "provider",
    "vendor",
    "source",
    "description",
    "notes",
    "summary",
    "created_at",
    "updated_at",
  ]);

  const metadataEntries = Object.entries(row).filter(([key]) => !knownKeys.has(key));
  if (metadataEntries.length > 0) {
    entry.metadata = Object.fromEntries(metadataEntries);
  }

  return { name, entry };
};

const buildPricingMap = (rows: Record<string, unknown>[]): PricingMap => {
  return rows.reduce<PricingMap>((acc, current) => {
    const normalised = normaliseRow(current);
    if (!normalised) {
      return acc;
    }

    acc[normalised.name] = normalised.entry;
    return acc;
  }, {});
};

const respondWithFallback = async () => {
  try {
    const raw = await readFile(FALLBACK_JSON_PATH, "utf8");
    return new NextResponse(raw, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-data-source": "fallback",
      },
    });
  } catch (error) {
    console.error("Failed to read fallback pricing data", error);
    return NextResponse.json(
      { error: "Pricing data is unavailable." },
      {
        status: 500,
        headers: {
          "x-data-source": "unavailable",
        },
      },
    );
  }
};

export const GET = async () => {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase.from(PRICING_SOURCE).select("*");

      if (!error && Array.isArray(data) && data.length > 0) {
        const pricingMap = buildPricingMap(data as Record<string, unknown>[]);

        if (Object.keys(pricingMap).length > 0) {
          return NextResponse.json(pricingMap, {
            headers: {
              "x-data-source": "supabase",
            },
          });
        }
      }

      if (error) {
        console.error("Failed to load pricing data from Supabase", error);
      }
    } catch (error) {
      console.error("Unexpected error loading pricing data from Supabase", error);
    }
  }

  return respondWithFallback();
};
