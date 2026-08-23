import { jest } from "@jest/globals";

// Mock PushSubscription model
jest.unstable_mockModule("../models/pushSubscriptionModel.js", () => ({
  default: {
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    find: jest.fn(),
  },
}));

// Mock NotificationPreference model
jest.unstable_mockModule("../models/notificationPreferenceModel.js", () => ({
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

// Mock notificationModel
jest.unstable_mockModule("../models/notificationModel.js", () => ({
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    updateMany: jest.fn(),
  },
}));

const PushSubscription = (await import("../models/pushSubscriptionModel.js"))
  .default;
const { getVapidPublicKey, subscribePush, unsubscribePush, sendTestPush } =
  await import("../controllers/notificationController.js");

describe("Web Push Notification Controller (#2029)", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: "usr_507f1f77bcf86cd799439011" },
      body: {},
      headers: { "user-agent": "Mozilla/5.0 TestBrowser" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("getVapidPublicKey", () => {
    it("should return the public VAPID key", async () => {
      await getVapidPublicKey(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            publicKey: expect.any(String),
          }),
        }),
      );
    });
  });

  describe("subscribePush", () => {
    it("should save or update push subscription", async () => {
      req.body = {
        endpoint: "https://fcm.googleapis.com/fcm/send/123",
        keys: {
          p256dh: "key_p256dh",
          auth: "key_auth",
        },
      };

      PushSubscription.findOneAndUpdate.mockResolvedValue({
        _id: "sub_123",
        endpoint: req.body.endpoint,
      });

      await subscribePush(req, res);

      expect(PushSubscription.findOneAndUpdate).toHaveBeenCalledWith(
        { endpoint: req.body.endpoint },
        expect.objectContaining({
          user: "usr_507f1f77bcf86cd799439011",
          endpoint: req.body.endpoint,
        }),
        { upsert: true, new: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Push subscription registered successfully.",
        }),
      );
    });

    it("should reject invalid subscription payload with 400", async () => {
      req.body = { endpoint: "" };

      await subscribePush(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Invalid push subscription object.",
        }),
      );
    });
  });

  describe("unsubscribePush", () => {
    it("should remove push subscription by endpoint", async () => {
      req.body = { endpoint: "https://fcm.googleapis.com/fcm/send/123" };
      PushSubscription.findOneAndDelete.mockResolvedValue({ _id: "sub_123" });

      await unsubscribePush(req, res);

      expect(PushSubscription.findOneAndDelete).toHaveBeenCalledWith({
        user: "usr_507f1f77bcf86cd799439011",
        endpoint: req.body.endpoint,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("sendTestPush", () => {
    it("should return test push payload and recipient count", async () => {
      PushSubscription.find.mockResolvedValue([{ _id: "sub_123" }]);

      await sendTestPush(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            recipientCount: 1,
            payload: expect.objectContaining({
              title: "Test Notification",
            }),
          }),
        }),
      );
    });
  });
});
