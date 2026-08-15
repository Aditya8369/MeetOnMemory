import { jest } from "@jest/globals";
import mongoose from "mongoose";
import RecapEmailService from "../services/recapEmailService.js";
import RecapPreference from "../models/recapPreferenceModel.js";
import RecapDelivery from "../models/recapDeliveryModel.js";
import Meeting from "../models/meetingModel.js";
import User from "../models/userModel.js";
import NotificationPreference from "../models/notificationPreferenceModel.js";
import EmailService from "../services/EmailService.js";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Meeting.deleteMany({});
  await RecapPreference.deleteMany({});
  await RecapDelivery.deleteMany({});
  await NotificationPreference.deleteMany({});
  jest.clearAllMocks();
});

jest.spyOn(EmailService, "sendMail").mockResolvedValue(true);

describe("RecapEmailService (#1398)", () => {
  let user;
  let meeting;
  let orgId;

  beforeEach(async () => {
    orgId = new mongoose.Types.ObjectId();
    user = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: "password",
      organization: orgId,
    });

    meeting = await Meeting.create({
      title: "Test Meeting",
      date: new Date(),
      uploadedBy: user._id,
      organization: orgId,
      participants: [{ name: "Test User", email: "test@example.com" }],
      status: "completed",
      summary: "This is a summary",
    });
  });

  describe("sendImmediateRecap", () => {
    it("should send email if user prefers immediate delivery", async () => {
      await RecapPreference.create({
        userId: user._id,
        deliveryTiming: "immediate",
      });

      await RecapEmailService.sendImmediateRecap(meeting._id);

      expect(EmailService.sendMail).toHaveBeenCalledTimes(1);

      const delivery = await RecapDelivery.findOne({
        meetingId: meeting._id,
        userId: user._id,
      });
      expect(delivery).toBeTruthy();
    });

    it("should NOT send email if user prefers daily delivery", async () => {
      await RecapPreference.create({
        userId: user._id,
        deliveryTiming: "daily",
      });

      await RecapEmailService.sendImmediateRecap(meeting._id);

      expect(EmailService.sendMail).not.toHaveBeenCalled();

      const delivery = await RecapDelivery.findOne({
        meetingId: meeting._id,
        userId: user._id,
      });
      expect(delivery).toBeFalsy();
    });

    it("should prevent duplicate delivery", async () => {
      await RecapPreference.create({
        userId: user._id,
        deliveryTiming: "immediate",
      });

      await RecapEmailService.sendImmediateRecap(meeting._id);
      expect(EmailService.sendMail).toHaveBeenCalledTimes(1);

      await RecapEmailService.sendImmediateRecap(meeting._id);
      expect(EmailService.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  describe("batchRecapsByUser", () => {
    it("should send daily digest for undelivered meetings", async () => {
      await RecapPreference.create({
        userId: user._id,
        deliveryTiming: "daily",
      });

      await RecapEmailService.batchRecapsByUser(user._id, "daily");

      expect(EmailService.sendMail).toHaveBeenCalledTimes(1);
      expect(EmailService.sendMail.mock.calls[0][0].subject).toContain("Daily");

      const delivery = await RecapDelivery.findOne({
        meetingId: meeting._id,
        userId: user._id,
      });
      expect(delivery).toBeTruthy();
    });

    it("should not send daily digest if user prefers weekly", async () => {
      await RecapPreference.create({
        userId: user._id,
        deliveryTiming: "weekly",
      });

      const result = await RecapEmailService.batchRecapsByUser(
        user._id,
        "daily",
      );

      expect(result.skipped).toBe(true);
      expect(EmailService.sendMail).not.toHaveBeenCalled();
    });

    it("skips users in quiet hours", async () => {
      await RecapPreference.create({
        userId: user._id,
        deliveryTiming: "daily",
        // Equal start/end hits the wrap-around branch and is always quiet.
        quietHoursStart: 0,
        quietHoursEnd: 0,
        timezone: "UTC",
      });

      const result = await RecapEmailService.batchRecapsByUser(
        user._id,
        "daily",
      );

      expect(result).toEqual({ skipped: true, reason: "quiet_hours" });
      expect(EmailService.sendMail).not.toHaveBeenCalled();
    });

    it("skips unsubscribed weekly recipients", async () => {
      await RecapPreference.create({
        userId: user._id,
        deliveryTiming: "weekly",
      });
      await NotificationPreference.create({
        user: user._id,
        emailWeeklyDigest: false,
      });

      const result = await RecapEmailService.batchRecapsByUser(
        user._id,
        "weekly",
      );

      expect(result).toEqual({ skipped: true, reason: "unsubscribed" });
      expect(EmailService.sendMail).not.toHaveBeenCalled();
    });

    it("does not include another organization's meetings", async () => {
      const otherOrg = new mongoose.Types.ObjectId();
      const foreignMeeting = await Meeting.create({
        title: "Foreign Org Meeting",
        date: new Date(),
        uploadedBy: user._id,
        organization: otherOrg,
        participants: [{ name: "Test User", email: "test@example.com" }],
        status: "completed",
        summary: "Should not leak",
      });

      await RecapPreference.create({
        userId: user._id,
        deliveryTiming: "daily",
      });

      await RecapEmailService.batchRecapsByUser(user._id, "daily");

      expect(EmailService.sendMail).toHaveBeenCalledTimes(1);
      const html = EmailService.sendMail.mock.calls[0][0].html;
      expect(html).toContain("Test Meeting");
      expect(html).not.toContain("Foreign Org Meeting");

      const foreignDelivery = await RecapDelivery.findOne({
        meetingId: foreignMeeting._id,
        userId: user._id,
      });
      expect(foreignDelivery).toBeFalsy();
    });

    it("does not resend for an already delivered meeting window", async () => {
      await RecapPreference.create({
        userId: user._id,
        deliveryTiming: "daily",
      });
      await RecapDelivery.create({
        meetingId: meeting._id,
        userId: user._id,
      });

      const result = await RecapEmailService.batchRecapsByUser(
        user._id,
        "daily",
      );

      expect(result.reason).toBe("nothing_to_deliver");
      expect(EmailService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe("processScheduledBatch", () => {
    it("processes eligible preference holders in bounded pages", async () => {
      const users = [];
      for (let i = 0; i < 3; i++) {
        const u = await User.create({
          name: `Batch User ${i}`,
          email: `batch${i}@example.com`,
          password: "password",
          organization: orgId,
        });
        users.push(u);
        await RecapPreference.create({
          userId: u._id,
          deliveryTiming: "daily",
        });
        await Meeting.create({
          title: `Meeting ${i}`,
          date: new Date(),
          uploadedBy: u._id,
          organization: orgId,
          participants: [{ name: u.name, email: u.email }],
          status: "completed",
          summary: `Summary ${i}`,
        });
      }

      // Immediate preference must not be processed by the daily batch.
      await RecapPreference.create({
        userId: user._id,
        deliveryTiming: "immediate",
      });

      const summary = await RecapEmailService.processScheduledBatch("daily", {
        batchSize: 2,
      });

      expect(summary.processed).toBe(3);
      expect(summary.errors).toBe(0);
      expect(EmailService.sendMail).toHaveBeenCalledTimes(3);
    });

    it("continues after a per-user delivery failure", async () => {
      const failing = await User.create({
        name: "Failing User",
        email: "fail@example.com",
        password: "password",
        organization: orgId,
      });
      const ok = await User.create({
        name: "Ok User",
        email: "ok@example.com",
        password: "password",
        organization: orgId,
      });

      for (const u of [failing, ok]) {
        await RecapPreference.create({
          userId: u._id,
          deliveryTiming: "daily",
        });
        await Meeting.create({
          title: `M-${u.email}`,
          date: new Date(),
          uploadedBy: u._id,
          organization: orgId,
          participants: [{ name: u.name, email: u.email }],
          status: "completed",
          summary: "x",
        });
      }

      EmailService.sendMail
        .mockRejectedValueOnce(new Error("smtp down"))
        .mockResolvedValueOnce(true);

      const summary = await RecapEmailService.processScheduledBatch("daily", {
        batchSize: 10,
      });

      expect(summary.errors).toBe(1);
      expect(summary.processed).toBe(2);
      expect(EmailService.sendMail).toHaveBeenCalledTimes(2);

      const okDelivery = await RecapDelivery.findOne({ userId: ok._id });
      expect(okDelivery).toBeTruthy();

      const failDelivery = await RecapDelivery.findOne({
        userId: failing._id,
      });
      expect(failDelivery).toBeFalsy();
    });

    it("does not load an unbounded User.find of all accounts", async () => {
      const findSpy = jest.spyOn(User, "find");
      await RecapPreference.create({
        userId: user._id,
        deliveryTiming: "weekly",
      });

      await RecapEmailService.processScheduledBatch("weekly", {
        batchSize: 50,
      });

      // Preference-driven paging — never User.find({}) for the whole table.
      const unbounded = findSpy.mock.calls.some(
        (args) =>
          args.length === 2 &&
          JSON.stringify(args[0]) === "{}" &&
          args[1] === "_id",
      );
      expect(unbounded).toBe(false);
      findSpy.mockRestore();
    });
  });

  describe("buildRecapHtml", () => {
    it("should include summary if requested", async () => {
      const prefs = { includeSummary: true };
      const html = await RecapEmailService.buildRecapHtml(meeting, prefs);
      expect(html).toContain("This is a summary");
    });

    it("should not include summary if not requested", async () => {
      const prefs = { includeSummary: false };
      const html = await RecapEmailService.buildRecapHtml(meeting, prefs);
      expect(html).not.toContain("This is a summary");
    });
  });
});
