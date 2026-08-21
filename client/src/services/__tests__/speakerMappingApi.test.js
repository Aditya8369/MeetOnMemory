import { describe, expect, it, vi, beforeEach } from "vitest";
import { speakerMappingApi } from "../speakerMappingApi.js";
import api from "../apiClient.js";

vi.mock("../apiClient.js", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("speakerMappingApi (#1886)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends getMappings requests with /api/speaker-mapping prefix", async () => {
    api.get.mockResolvedValue({ data: [] });
    await speakerMappingApi.getMappings("meeting-123");
    expect(api.get).toHaveBeenCalledWith("/api/speaker-mapping/meeting-123");
  });

  it("sends suggestMappings requests with /api/speaker-mapping prefix", async () => {
    api.get.mockResolvedValue({ data: [] });
    await speakerMappingApi.suggestMappings("meeting-123");
    expect(api.get).toHaveBeenCalledWith(
      "/api/speaker-mapping/meeting-123/suggest",
    );
  });

  it("sends saveAndApplyMapping requests with /api/speaker-mapping prefix", async () => {
    api.post.mockResolvedValue({ data: {} });
    await speakerMappingApi.saveAndApplyMapping(
      "meeting-123",
      "Speaker 1",
      "John",
    );
    expect(api.post).toHaveBeenCalledWith("/api/speaker-mapping/meeting-123", {
      originalLabel: "Speaker 1",
      mappedName: "John",
    });
  });

  it("sends revertMapping requests with /api/speaker-mapping prefix", async () => {
    api.delete.mockResolvedValue({ data: {} });
    await speakerMappingApi.revertMapping("meeting-123", "mapping-456");
    expect(api.delete).toHaveBeenCalledWith(
      "/api/speaker-mapping/meeting-123/mapping-456",
    );
  });
});
