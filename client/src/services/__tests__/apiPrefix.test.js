import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../apiClient";
import { compareMeetings, getComparableMeetings } from "../comparisonApi";
import { meetingSeriesApi } from "../meetingSeriesApi";
import { speakerMappingApi } from "../speakerMappingApi";

vi.mock("../apiClient", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("API Services Endpoint Prefix (#803)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("comparisonApi", () => {
    it("should call /api/comparison/compare for compareMeetings", async () => {
      api.post.mockResolvedValueOnce({ data: { result: "success" } });
      await compareMeetings("m1", "m2");
      expect(api.post).toHaveBeenCalledWith("/api/comparison/compare", {
        meetingIdA: "m1",
        meetingIdB: "m2",
      });
    });

    it("should call /api/comparison/comparable/:meetingId for getComparableMeetings", async () => {
      api.get.mockResolvedValueOnce({ data: [] });
      await getComparableMeetings("m1");
      expect(api.get).toHaveBeenCalledWith("/api/comparison/comparable/m1");
    });
  });

  describe("meetingSeriesApi", () => {
    it("should call /api/meeting-series for createSeries", async () => {
      meetingSeriesApi.createSeries({ name: "Weekly Sync" });
      expect(api.post).toHaveBeenCalledWith("/api/meeting-series", {
        name: "Weekly Sync",
      });
    });

    it("should call /api/meeting-series/:id for getSeriesById", async () => {
      meetingSeriesApi.getSeriesById("s1");
      expect(api.get).toHaveBeenCalledWith("/api/meeting-series/s1");
    });

    it("should call /api/meeting-series/:id/meetings with pagination for getSeriesMeetings", async () => {
      meetingSeriesApi.getSeriesMeetings("s1", 2, 10);
      expect(api.get).toHaveBeenCalledWith(
        "/api/meeting-series/s1/meetings?page=2&limit=10",
      );
    });

    it("should call /api/meeting-series/:id/cancel for cancelSeries", async () => {
      meetingSeriesApi.cancelSeries("s1");
      expect(api.patch).toHaveBeenCalledWith("/api/meeting-series/s1/cancel");
    });
  });

  describe("speakerMappingApi", () => {
    it("should call /api/speaker-mappings/:meetingId for getMappings", async () => {
      api.get.mockResolvedValueOnce({ data: { data: [] } });
      await speakerMappingApi.getMappings("m1");
      expect(api.get).toHaveBeenCalledWith("/api/speaker-mappings/m1");
    });

    it("should call /api/speaker-mappings/:meetingId/suggest for suggestMappings", async () => {
      api.get.mockResolvedValueOnce({ data: { data: [] } });
      await speakerMappingApi.suggestMappings("m1");
      expect(api.get).toHaveBeenCalledWith("/api/speaker-mappings/m1/suggest");
    });

    it("should call /api/speaker-mappings/:meetingId for saveAndApplyMapping", async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } });
      await speakerMappingApi.saveAndApplyMapping("m1", "Speaker 1", "Alice");
      expect(api.post).toHaveBeenCalledWith("/api/speaker-mappings/m1", {
        originalLabel: "Speaker 1",
        mappedName: "Alice",
      });
    });

    it("should call /api/speaker-mappings/:meetingId/:mappingId for revertMapping", async () => {
      api.delete.mockResolvedValueOnce({ data: { success: true } });
      await speakerMappingApi.revertMapping("m1", "map-1");
      expect(api.delete).toHaveBeenCalledWith("/api/speaker-mappings/m1/map-1");
    });
  });
});
