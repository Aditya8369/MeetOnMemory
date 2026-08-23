import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

// Mock userModel
jest.unstable_mockModule("../models/userModel.js", () => ({
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

// Mock dataExportQueue
jest.unstable_mockModule("../queues/dataExportQueue.js", () => ({
  default: {
    add: jest.fn(),
  },
}));

const userModel = (await import("../models/userModel.js")).default;
const dataExportQueue = (await import("../queues/dataExportQueue.js")).default;
const { requestDataExport, getDataExportStatus, downloadExport } =
  await import("../controllers/userController.js");

describe("User Data Export Controller (#2033)", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test_jwt_secret_key_12345";

    req = {
      user: { id: "usr_507f1f77bcf86cd799439011" },
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      download: jest.fn(),
    };
  });

  describe("requestDataExport", () => {
    it("should accept export request when cooldown has passed", async () => {
      userModel.findById.mockResolvedValue({
        _id: "usr_507f1f77bcf86cd799439011",
        email: "user@example.com",
        lastExportRequestedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h ago
      });
      dataExportQueue.add.mockResolvedValue({ id: "job_123" });
      userModel.findByIdAndUpdate.mockResolvedValue({});

      await requestDataExport(req, res);

      expect(dataExportQueue.add).toHaveBeenCalledWith("export", {
        userId: "usr_507f1f77bcf86cd799439011",
        email: "user@example.com",
      });
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "usr_507f1f77bcf86cd799439011",
        expect.objectContaining({
          lastExportStatus: "processing",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ status: "processing" }),
        }),
      );
    });

    it("should reject export request with 429 when inside 24h cooldown", async () => {
      userModel.findById.mockResolvedValue({
        _id: "usr_507f1f77bcf86cd799439011",
        email: "user@example.com",
        lastExportRequestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
      });

      await requestDataExport(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("one data export per 24 hours"),
        }),
      );
      expect(dataExportQueue.add).not.toHaveBeenCalled();
    });
  });

  describe("getDataExportStatus", () => {
    it("should return export status and canRequest when idle", async () => {
      userModel.findById.mockResolvedValue({
        _id: "usr_507f1f77bcf86cd799439011",
        lastExportRequestedAt: null,
        lastExportStatus: "idle",
      });

      await getDataExportStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: "idle",
            canRequest: true,
            cooldownRemainingMs: 0,
          }),
        }),
      );
    });

    it("should return processing status when an export is ongoing", async () => {
      userModel.findById.mockResolvedValue({
        _id: "usr_507f1f77bcf86cd799439011",
        lastExportRequestedAt: new Date(),
        lastExportStatus: "processing",
      });

      await getDataExportStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: "processing",
            canRequest: false,
          }),
        }),
      );
    });
  });

  describe("downloadExport", () => {
    it("should reject invalid or missing tokens with 400 or 401", async () => {
      req.params = { token: "" };
      await downloadExport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      req.params = { token: "invalid_jwt_token" };
      await downloadExport(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should reject token if fileName does not match userId pattern", async () => {
      const forgedToken = jwt.sign(
        { userId: "usr_123", fileName: "export_otheruser_999.zip" },
        process.env.JWT_SECRET,
      );
      req.params = { token: forgedToken };

      await downloadExport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Unauthorized access to requested export file.",
        }),
      );
    });
  });
});
