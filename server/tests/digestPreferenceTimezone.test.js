import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPreferences,
  updatePreferences,
} from "../controllers/digestPreferenceController.js";
import DigestPreference from "../models/digestPreferenceModel.js";
import mongoose from "mongoose";

describe("DigestPreference Controller - Timezone Context (#1686)", () => {
  let req, res;
  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: {
        _id: userId,
        role: "member",
        organization: new mongoose.Types.ObjectId().toString(),
      },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe("getPreferences", () => {
    it("returns default timezone 'UTC' when no preference document exists", async () => {
      vi.spyOn(DigestPreference, "findOne").mockResolvedValue(null);

      await getPreferences(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            timezone: "UTC",
          }),
        }),
      );
    });

    it("returns saved timezone when preference document exists", async () => {
      vi.spyOn(DigestPreference, "findOne").mockResolvedValue({
        user: userId,
        frequency: "weekly",
        deliveryDay: "Monday",
        deliveryHour: 10,
        timezone: "America/New_York",
        includeSections: ["summaries"],
      });

      await getPreferences(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            timezone: "America/New_York",
          }),
        }),
      );
    });
  });

  describe("updatePreferences", () => {
    it("persists timezone field when provided", async () => {
      req.body = {
        frequency: "weekly",
        deliveryDay: "Tuesday",
        deliveryHour: 14,
        timezone: "Asia/Kolkata",
        includeSections: ["decisions"],
      };

      const mockUpdated = {
        user: userId,
        frequency: "weekly",
        deliveryDay: "Tuesday",
        deliveryHour: 14,
        timezone: "Asia/Kolkata",
        includeSections: ["decisions"],
      };

      vi.spyOn(DigestPreference, "findOneAndUpdate").mockResolvedValue(
        mockUpdated,
      );

      await updatePreferences(req, res);

      expect(DigestPreference.findOneAndUpdate).toHaveBeenCalledWith(
        { $or: [{ user: userId }, { userId }] },
        expect.objectContaining({
          timezone: "Asia/Kolkata",
        }),
        expect.anything(),
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            timezone: "Asia/Kolkata",
          }),
        }),
      );
    });
  });
});
