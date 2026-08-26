import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../apiClient.js";
import {
  fetchRules,
  fetchRuleById,
  createRule,
  updateRule,
  toggleRuleStatus,
  deleteRule,
} from "../automationRuleApi.js";

vi.mock("../apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("automationRuleApi /api prefix verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls GET /api/automation-rules when fetching rules", async () => {
    api.get.mockResolvedValueOnce({
      data: { data: { rules: [{ _id: "r1" }] } },
    });
    const result = await fetchRules();
    expect(api.get).toHaveBeenCalledWith("/api/automation-rules");
    expect(result).toEqual([{ _id: "r1" }]);
  });

  it("calls GET /api/automation-rules/:id when fetching rule by ID", async () => {
    api.get.mockResolvedValueOnce({ data: { data: { rule: { _id: "r1" } } } });
    const result = await fetchRuleById("r1");
    expect(api.get).toHaveBeenCalledWith("/api/automation-rules/r1");
    expect(result).toEqual({ _id: "r1" });
  });

  it("calls POST /api/automation-rules when creating a rule", async () => {
    const payload = { name: "Test Rule", trigger: {}, actions: [] };
    api.post.mockResolvedValueOnce({
      data: { data: { rule: { _id: "r1", ...payload } } },
    });
    const result = await createRule(payload);
    expect(api.post).toHaveBeenCalledWith("/api/automation-rules", payload);
    expect(result).toEqual({ _id: "r1", ...payload });
  });

  it("calls PUT /api/automation-rules/:id when updating a rule", async () => {
    const payload = { name: "Updated Rule" };
    api.put.mockResolvedValueOnce({
      data: { data: { rule: { _id: "r1", ...payload } } },
    });
    const result = await updateRule("r1", payload);
    expect(api.put).toHaveBeenCalledWith("/api/automation-rules/r1", payload);
    expect(result).toEqual({ _id: "r1", ...payload });
  });

  it("calls PATCH /api/automation-rules/:id/toggle when toggling rule status", async () => {
    api.patch.mockResolvedValueOnce({
      data: { data: { rule: { _id: "r1", enabled: true } } },
    });
    const result = await toggleRuleStatus("r1", true);
    expect(api.patch).toHaveBeenCalledWith("/api/automation-rules/r1/toggle", {
      enabled: true,
    });
    expect(result).toEqual({ _id: "r1", enabled: true });
  });

  it("calls DELETE /api/automation-rules/:id when deleting a rule", async () => {
    api.delete.mockResolvedValueOnce({ data: { data: { success: true } } });
    const result = await deleteRule("r1");
    expect(api.delete).toHaveBeenCalledWith("/api/automation-rules/r1");
    expect(result).toEqual({ success: true });
  });
});
