import GuestAccessService from "../guestAccessService.js";
import GuestAccessToken from "../../models/guestAccessTokenModel.js";
import mongoose from "mongoose";
import { jest } from "@jest/globals";

// We will use jest.spyOn inside the tests instead of jest.mock()

describe("GuestAccessService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateToken", () => {
    it("should create a token and return raw and hashed token", async () => {
      const mockCreatedToken = { _id: "123" };
      const createSpy = jest
        .spyOn(GuestAccessToken, "create")
        .mockResolvedValue(mockCreatedToken);

      const params = {
        meetingId: new mongoose.Types.ObjectId().toString(),
        guestEmail: "test@example.com",
        permissions: ["view_summary"],
        expiresAt: new Date(Date.now() + 86400000), // 1 day future
        maxViews: 2,
        createdBy: new mongoose.Types.ObjectId().toString(),
      };

      const result = await GuestAccessService.generateToken(params);

      expect(result).toHaveProperty("rawToken");
      expect(result.rawToken).toHaveLength(64); // 32 bytes hex = 64 chars
      expect(result).toHaveProperty("guestToken", mockCreatedToken);
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          guestEmail: "test@example.com",
          meetingId: params.meetingId,
          tokenHash: expect.any(String), // hashed
          permissions: ["view_summary"],
        }),
      );
    });
  });

  describe("validateAndRecordView", () => {
    it("should validate a good token and increment views", async () => {
      const mockToken = {
        _id: "123",
        expiresAt: new Date(Date.now() + 86400000), // future
        revoked: false,
        maxViews: 2,
        currentViews: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock chainable populate
      const populateMock = jest.fn().mockResolvedValue(mockToken);
      jest
        .spyOn(GuestAccessToken, "findOne")
        .mockReturnValue({ populate: populateMock });

      const result =
        await GuestAccessService.validateAndRecordView("dummyrawtoken");

      expect(result).toBe(mockToken);
      expect(mockToken.currentViews).toBe(1);
      expect(mockToken.save).toHaveBeenCalled();
    });

    it("should reject expired token", async () => {
      const mockToken = {
        _id: "123",
        expiresAt: new Date(Date.now() - 86400000), // past
        revoked: false,
        maxViews: 0,
        currentViews: 0,
      };

      const populateMock = jest.fn().mockResolvedValue(mockToken);
      jest
        .spyOn(GuestAccessToken, "findOne")
        .mockReturnValue({ populate: populateMock });

      await expect(
        GuestAccessService.validateAndRecordView("dummy"),
      ).rejects.toThrow("expired");
    });

    it("should reject revoked token", async () => {
      const mockToken = {
        _id: "123",
        expiresAt: new Date(Date.now() + 86400000), // future
        revoked: true,
        maxViews: 0,
        currentViews: 0,
      };

      const populateMock = jest.fn().mockResolvedValue(mockToken);
      jest
        .spyOn(GuestAccessToken, "findOne")
        .mockReturnValue({ populate: populateMock });

      await expect(
        GuestAccessService.validateAndRecordView("dummy"),
      ).rejects.toThrow("revoked");
    });

    it("should reject when max views exceeded", async () => {
      const mockToken = {
        _id: "123",
        expiresAt: new Date(Date.now() + 86400000), // future
        revoked: false,
        maxViews: 2,
        currentViews: 2,
      };

      const populateMock = jest.fn().mockResolvedValue(mockToken);
      jest
        .spyOn(GuestAccessToken, "findOne")
        .mockReturnValue({ populate: populateMock });

      await expect(
        GuestAccessService.validateAndRecordView("dummy"),
      ).rejects.toThrow("maximum allowed views");
    });
  });

  describe("revokeToken", () => {
    it("should revoke an existing token", async () => {
      const mockToken = {
        _id: "123",
        revoked: false,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(GuestAccessToken, "findById").mockResolvedValue(mockToken);

      await GuestAccessService.revokeToken("123", "adminId", null);

      expect(mockToken.revoked).toBe(true);
      expect(mockToken.save).toHaveBeenCalled();
    });
  });
});
