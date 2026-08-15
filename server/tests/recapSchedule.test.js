import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";

const ORG_ID = new mongoose.Types.ObjectId();
const USER_ID = new mongoose.Types.ObjectId();

// Mock middleware — authenticated org member (Issue #1381 requires membership)
jest.unstable_mockModule("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    req.user = {
      _id: USER_ID,
      organization: ORG_ID,
      role: "member",
    };
    next();
  },
}));

// Mock models and queue
jest.unstable_mockModule("../models/recapScheduleModel.js", () => ({
  default: {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule("../models/recapDeliveryModel.js", () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.unstable_mockModule("../services/queueService.js", () => ({
  recapDeliveryQueue: {
    isActive: true,
    add: jest.fn(),
  },
}));

const { default: recapScheduleRoutes } =
  await import("../routes/recapScheduleRoutes.js");
const { default: RecapSchedule } =
  await import("../models/recapScheduleModel.js");
const { default: RecapDelivery } =
  await import("../models/recapDeliveryModel.js");

const app = express();
app.use(express.json());
app.use("/api/recap-schedule", recapScheduleRoutes);

describe("Recap Schedule API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PUT /api/recap-schedule/:organizationId", () => {
    it("should create or update a schedule successfully", async () => {
      const mockSchedule = {
        organizationId: ORG_ID.toString(),
        userId: USER_ID.toString(),
        scheduleType: "daily",
        deliveryChannel: "email",
        preferredTime: "10:00",
        timezone: "EST",
      };

      RecapSchedule.findOneAndUpdate.mockResolvedValue(mockSchedule);

      const res = await request(app).put(`/api/recap-schedule/${ORG_ID}`).send({
        scheduleType: "daily",
        deliveryChannel: "email",
        preferredTime: "10:00",
        timezone: "EST",
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockSchedule);
      expect(RecapSchedule.findOneAndUpdate).toHaveBeenCalledWith(
        { organizationId: ORG_ID.toString(), userId: USER_ID },
        expect.any(Object),
        { new: true, upsert: true },
      );
    });

    it("should return 400 for invalid data", async () => {
      const res = await request(app).put(`/api/recap-schedule/${ORG_ID}`).send({
        scheduleType: "invalid_type", // Invalid enum
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/recap-schedule/:organizationId", () => {
    it("should return the schedule", async () => {
      const mockSchedule = { scheduleType: "weekly" };
      RecapSchedule.findOne.mockResolvedValue(mockSchedule);

      const res = await request(app).get(`/api/recap-schedule/${ORG_ID}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockSchedule);
    });

    it("should return 404 if schedule not found", async () => {
      RecapSchedule.findOne.mockResolvedValue(null);

      const res = await request(app).get(`/api/recap-schedule/${ORG_ID}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/recap-schedule/history/deliveries", () => {
    it("should return delivery history", async () => {
      const mockDeliveries = [
        {
          _id: "del-1",
          meetingId: { title: "Sync", organization: ORG_ID },
        },
      ];
      const mockPopulate = jest.fn().mockReturnThis();
      const mockSort = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue(mockDeliveries);

      RecapDelivery.find.mockReturnValue({
        populate: mockPopulate,
        sort: mockSort,
        limit: mockLimit,
      });

      // Chain: find().populate().sort().limit()
      mockPopulate.mockReturnValue({
        sort: mockSort,
      });
      mockSort.mockReturnValue({
        limit: mockLimit,
      });

      const res = await request(app).get(
        "/api/recap-schedule/history/deliveries",
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockDeliveries);
      expect(mockPopulate).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "meetingId",
          match: { organization: ORG_ID.toString() },
        }),
      );
    });

    it("filters out rows whose meeting did not match the org populate", async () => {
      RecapDelivery.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              { _id: "gone", meetingId: null },
              {
                _id: "kept",
                meetingId: { title: "Ok", organization: ORG_ID },
              },
            ]),
          }),
        }),
      });

      const res = await request(app).get(
        "/api/recap-schedule/history/deliveries",
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        { _id: "kept", meetingId: { title: "Ok", organization: ORG_ID } },
      ]);
    });
  });

  describe("POST /api/recap-schedule/retry/:deliveryId", () => {
    it("should enqueue retry job and return 200", async () => {
      RecapDelivery.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: "del-1",
          meetingId: { _id: "meet-1", organization: ORG_ID },
          userId: USER_ID,
        }),
      });

      const res = await request(app).post("/api/recap-schedule/retry/del-1");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Delivery retry enqueued successfully");
    });

    it("should return 404 if delivery not found", async () => {
      RecapDelivery.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app).post(
        "/api/recap-schedule/retry/invalid-del",
      );

      expect(res.status).toBe(404);
    });
  });
});
