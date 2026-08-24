import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "../apiClient";
import searchApi from "../searchApi";

vi.mock("../apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("searchApi Service (#2010)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls GET /api/search/voice in voiceSearch", async () => {
    const mockResults = [{ _id: "m-1", title: "Voice Result" }];
    apiClient.get.mockResolvedValue({
      data: { success: true, results: mockResults },
    });

    const res = await searchApi.voiceSearch("action items");
    expect(apiClient.get).toHaveBeenCalledWith("/api/search/voice", {
      params: { query: "action items" },
    });
    expect(res.results).toEqual(mockResults);
  });

  it("calls POST /api/search/federated in federatedSearch", async () => {
    const payload = { query: "q3 goals", organizationIds: ["org-1", "org-2"] };
    apiClient.post.mockResolvedValue({ data: { success: true, results: [] } });

    const res = await searchApi.federatedSearch(payload);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/search/federated",
      payload,
    );
    expect(res.success).toBe(true);
  });

  it("calls POST /api/search/hybrid in hybridSearch", async () => {
    const payload = {
      query: "architecture decision",
      semanticWeight: 0.7,
      graphWeight: 0.3,
    };
    apiClient.post.mockResolvedValue({ data: { success: true, results: [] } });

    const res = await searchApi.hybridSearch(payload);
    expect(apiClient.post).toHaveBeenCalledWith("/api/search/hybrid", payload);
    expect(res.success).toBe(true);
  });

  it("calls POST /api/search in semanticSearch", async () => {
    const payload = { query: "policy document" };
    apiClient.post.mockResolvedValue({ data: { success: true, results: [] } });

    const res = await searchApi.semanticSearch(payload);
    expect(apiClient.post).toHaveBeenCalledWith("/api/search", payload);
    expect(res.success).toBe(true);
  });
});
