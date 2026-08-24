import { describe, it, expect, vi, beforeEach } from "vitest";

const { findOneAndUpdate, find } = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn(),
  find: vi.fn(),
}));

vi.mock("../models/aiUsageDailyModel.js", () => ({
  default: {
    findOneAndUpdate,
    find: (...args) => find(...args),
  },
}));

import {
  estimateGeminiCostUsd,
  recordAiUsage,
  getOrgAiUsageMetrics,
  runWithAiUsageContext,
  utcDayKey,
} from "../services/aiUsageMetricsService.js";

describe("aiUsageMetricsService (Issue #2083)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_USAGE_DAILY_BUDGET_USD;
  });

  it("estimates gemini cost from token counts", () => {
    process.env.AI_COST_GEMINI_INPUT_PER_M = "0.10";
    process.env.AI_COST_GEMINI_OUTPUT_PER_M = "0.40";
    const cost = estimateGeminiCostUsd({
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    });
    expect(cost).toBe(0.5);
  });

  it("records gemini counters without prompt fields", async () => {
    findOneAndUpdate.mockResolvedValue({ date: utcDayKey() });

    await runWithAiUsageContext({ organizationId: "org1" }, async () => {
      await recordAiUsage({
        kind: "gemini",
        promptTokens: 100,
        completionTokens: 20,
        totalTokens: 120,
      });
    });

    expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter, update] = findOneAndUpdate.mock.calls[0];
    expect(filter.organization).toBe("org1");
    expect(update.$inc.geminiRequests).toBe(1);
    expect(update.$inc.promptTokens).toBe(100);
    expect(JSON.stringify(update)).not.toMatch(/transcript|content/i);
  });

  it("skips writes when no organization context", async () => {
    await recordAiUsage({ kind: "embedding", embeddingChars: 50 });
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("aggregates org usage over a date range", async () => {
    find.mockReturnValue({
      sort: () => ({
        lean: async () => [
          {
            date: "2026-08-01",
            geminiRequests: 2,
            embeddingRequests: 1,
            totalTokens: 300,
            promptTokens: 200,
            completionTokens: 100,
            geminiErrors: 1,
            embeddingErrors: 0,
            embeddingChars: 40,
            estimatedCostUsd: 0.01,
          },
          {
            date: "2026-08-02",
            geminiRequests: 1,
            embeddingRequests: 0,
            totalTokens: 50,
            promptTokens: 40,
            completionTokens: 10,
            geminiErrors: 0,
            embeddingErrors: 0,
            embeddingChars: 0,
            estimatedCostUsd: 0.002,
          },
        ],
      }),
    });

    const metrics = await getOrgAiUsageMetrics({
      organizationId: "org1",
      from: "2026-08-01",
      to: "2026-08-02",
    });

    expect(metrics.series).toHaveLength(2);
    expect(metrics.totals.requests).toBe(4);
    expect(metrics.totals.tokens).toBe(350);
    expect(metrics.totals.errors).toBe(1);
    expect(metrics.totals.estimatedCostUsd).toBe(0.012);
    expect(metrics.budgetAlert.enabled).toBe(false);
  });

  it("flags budget alert when today exceeds threshold", async () => {
    process.env.AI_USAGE_DAILY_BUDGET_USD = "0.005";
    const today = utcDayKey();
    find.mockReturnValue({
      sort: () => ({
        lean: async () => [
          {
            date: today,
            geminiRequests: 1,
            embeddingRequests: 0,
            totalTokens: 10,
            promptTokens: 8,
            completionTokens: 2,
            geminiErrors: 0,
            embeddingErrors: 0,
            embeddingChars: 0,
            estimatedCostUsd: 0.01,
          },
        ],
      }),
    });

    const metrics = await getOrgAiUsageMetrics({
      organizationId: "org1",
      from: today,
      to: today,
    });

    expect(metrics.budgetAlert.enabled).toBe(true);
    expect(metrics.budgetAlert.exceeded).toBe(true);
  });
});
