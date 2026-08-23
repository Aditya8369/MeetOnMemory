import { AsyncLocalStorage } from "node:async_hooks";
import AiUsageDaily from "../models/aiUsageDailyModel.js";

const usageContext = new AsyncLocalStorage();

/** Gemini Flash-class list prices (USD / 1M tokens) — approximate for admin meters. */
const GEMINI_INPUT_USD_PER_M = Number.parseFloat(
  process.env.AI_COST_GEMINI_INPUT_PER_M || "0.10",
);
const GEMINI_OUTPUT_USD_PER_M = Number.parseFloat(
  process.env.AI_COST_GEMINI_OUTPUT_PER_M || "0.40",
);

export const runWithAiUsageContext = (store, fn) =>
  usageContext.run(store || {}, fn);

export const getAiUsageOrganizationId = () => {
  const store = usageContext.getStore();
  return store?.organizationId || null;
};

export const utcDayKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
};

export const estimateGeminiCostUsd = ({
  promptTokens = 0,
  completionTokens = 0,
} = {}) => {
  const input = (Number(promptTokens) || 0) / 1_000_000;
  const output = (Number(completionTokens) || 0) / 1_000_000;
  return Number(
    (input * GEMINI_INPUT_USD_PER_M + output * GEMINI_OUTPUT_USD_PER_M).toFixed(
      6,
    ),
  );
};

/**
 * Fire-and-forget daily counter upsert. Never stores prompt contents.
 *
 * @param {object} event
 * @param {"gemini"|"embedding"} event.kind
 * @param {string|import("mongoose").Types.ObjectId} [event.organizationId]
 * @param {boolean} [event.error]
 * @param {number} [event.promptTokens]
 * @param {number} [event.completionTokens]
 * @param {number} [event.totalTokens]
 * @param {number} [event.embeddingChars]
 */
export const recordAiUsage = async (event = {}) => {
  const organizationId =
    event.organizationId || getAiUsageOrganizationId() || null;
  if (!organizationId) return null;

  const kind = event.kind === "embedding" ? "embedding" : "gemini";
  const date = utcDayKey();
  const promptTokens = Math.max(0, Number(event.promptTokens) || 0);
  const completionTokens = Math.max(0, Number(event.completionTokens) || 0);
  const totalTokens = Math.max(
    0,
    Number(event.totalTokens) || promptTokens + completionTokens,
  );
  const embeddingChars = Math.max(0, Number(event.embeddingChars) || 0);
  const isError = Boolean(event.error);

  const $inc = {
    estimatedCostUsd:
      kind === "gemini" && !isError
        ? estimateGeminiCostUsd({ promptTokens, completionTokens })
        : 0,
  };

  if (kind === "gemini") {
    $inc.geminiRequests = 1;
    if (isError) $inc.geminiErrors = 1;
    else {
      $inc.promptTokens = promptTokens;
      $inc.completionTokens = completionTokens;
      $inc.totalTokens = totalTokens;
    }
  } else {
    $inc.embeddingRequests = 1;
    if (isError) $inc.embeddingErrors = 1;
    else $inc.embeddingChars = embeddingChars;
  }

  try {
    return await AiUsageDaily.findOneAndUpdate(
      { organization: organizationId, date },
      { $inc, $setOnInsert: { organization: organizationId, date } },
      { upsert: true, new: true },
    );
  } catch (err) {
    console.warn("⚠️ AI usage metric write failed:", err?.message || err);
    return null;
  }
};

/** Non-blocking wrapper for call sites. */
export const recordAiUsageSafe = (event) => {
  Promise.resolve()
    .then(() => recordAiUsage(event))
    .catch(() => {});
};

const parseDay = (value, fallback) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return utcDayKey(fallback);
};

/**
 * Admin dashboard payload for an org over a date range.
 */
export const getOrgAiUsageMetrics = async ({
  organizationId,
  from,
  to,
} = {}) => {
  if (!organizationId) {
    const err = new Error("Organization is required");
    err.statusCode = 400;
    throw err;
  }

  const end = parseDay(to, new Date());
  const startDefault = new Date();
  startDefault.setUTCDate(startDefault.getUTCDate() - 29);
  const start = parseDay(from, startDefault);

  const rows = await AiUsageDaily.find({
    organization: organizationId,
    date: { $gte: start, $lte: end },
  })
    .sort({ date: 1 })
    .lean();

  const series = rows.map((row) => ({
    date: row.date,
    requests: (row.geminiRequests || 0) + (row.embeddingRequests || 0),
    geminiRequests: row.geminiRequests || 0,
    embeddingRequests: row.embeddingRequests || 0,
    tokens: row.totalTokens || 0,
    promptTokens: row.promptTokens || 0,
    completionTokens: row.completionTokens || 0,
    errors: (row.geminiErrors || 0) + (row.embeddingErrors || 0),
    embeddingChars: row.embeddingChars || 0,
    estimatedCostUsd: Number(row.estimatedCostUsd || 0),
  }));

  const totals = series.reduce(
    (acc, day) => {
      acc.requests += day.requests;
      acc.geminiRequests += day.geminiRequests;
      acc.embeddingRequests += day.embeddingRequests;
      acc.tokens += day.tokens;
      acc.promptTokens += day.promptTokens;
      acc.completionTokens += day.completionTokens;
      acc.errors += day.errors;
      acc.embeddingChars += day.embeddingChars;
      acc.estimatedCostUsd += day.estimatedCostUsd;
      return acc;
    },
    {
      requests: 0,
      geminiRequests: 0,
      embeddingRequests: 0,
      tokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      errors: 0,
      embeddingChars: 0,
      estimatedCostUsd: 0,
    },
  );
  totals.estimatedCostUsd = Number(totals.estimatedCostUsd.toFixed(6));

  const budgetUsd = Number.parseFloat(
    process.env.AI_USAGE_DAILY_BUDGET_USD || "",
  );
  const today = series.find((d) => d.date === utcDayKey());
  const budgetAlert =
    Number.isFinite(budgetUsd) && budgetUsd > 0
      ? {
          enabled: true,
          dailyBudgetUsd: budgetUsd,
          todayCostUsd: today?.estimatedCostUsd || 0,
          exceeded: (today?.estimatedCostUsd || 0) >= budgetUsd,
        }
      : {
          enabled: false,
          dailyBudgetUsd: null,
          todayCostUsd: null,
          exceeded: false,
        };

  return {
    from: start,
    to: end,
    series,
    totals,
    budgetAlert,
  };
};
