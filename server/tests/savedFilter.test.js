import mongoose from "mongoose";
import savedFilterService from "../services/savedFilterService.js";

describe("SavedFilterService", () => {
  describe("buildQuery", () => {
    it("should build a query with organization if orgId is provided", () => {
      const filters = {};
      const orgId = new mongoose.Types.ObjectId();
      const query = savedFilterService.buildQuery(filters, orgId);

      expect(query.deletedAt).toBeNull();
      expect(query.organization).toBe(orgId);
    });

    it("should handle search queries", () => {
      const filters = { searchQuery: "policy" };
      const query = savedFilterService.buildQuery(filters);

      expect(query.$or).toBeDefined();
      expect(query.$or.length).toBe(4);
      expect(query.$or[0].title).toBeInstanceOf(RegExp);
    });

    it("should handle status filters", () => {
      const filters = { status: "completed" };
      const query = savedFilterService.buildQuery(filters);

      expect(query.status).toBe("completed");
    });

    it("should handle meeting type filters", () => {
      const filters = { meetingType: "policy" };
      const query = savedFilterService.buildQuery(filters);

      expect(query.meetingType).toBe("policy");
    });
  });
});
