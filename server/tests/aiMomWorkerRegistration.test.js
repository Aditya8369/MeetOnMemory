import { describe, it, expect, vi, beforeEach } from "vitest";
import { startWorkers } from "../config/workers.js";
import * as queueService from "../services/queueService.js";

vi.mock("../services/redisService.js", () => ({
  initRedis: vi.fn().mockResolvedValue(true),
}));

vi.mock("../services/queueService.js", () => ({
  initAIWorker: vi.fn().mockReturnValue({ id: "worker-ai" }),
  initDataExportWorker: vi.fn().mockReturnValue({ id: "worker-export" }),
  initExportCleanupWorker: vi.fn().mockResolvedValue({ id: "worker-cleanup" }),
  initConflictScanWorker: vi.fn().mockReturnValue({ id: "worker-conflict" }),
  initSentimentWorker: vi.fn().mockReturnValue({ id: "worker-sentiment" }),
  initRecalculateImportanceWorker: vi
    .fn()
    .mockReturnValue({ id: "worker-importance" }),
  initMemoryLifecycleWorker: vi
    .fn()
    .mockResolvedValue({ id: "worker-lifecycle" }),
  initRecapDeliveryWorker: vi.fn().mockReturnValue({ id: "worker-recap" }),
}));

vi.mock("../services/webhookDispatcherService.js", () => ({
  initWebhookWorker: vi.fn().mockReturnValue({ id: "worker-webhook" }),
}));

describe("AI MoM Worker Registration (#1392)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers and initializes the AI MoM worker during startWorkers execution", async () => {
    const mockApp = {};
    const result = await startWorkers(mockApp);

    expect(queueService.initAIWorker).toHaveBeenCalledWith(mockApp);
    expect(result.started).toContain("AI Worker");
    expect(result.failed).toHaveLength(0);
  });
});
