import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";

let currentUser = null;

jest.unstable_mockModule("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    req.user = currentUser;
    next();
  },
}));

const { default: keywordAlertRoutes } =
  await import("../routes/keywordAlertRoutes.js");
const { default: KeywordAlert } =
  await import("../models/keywordAlertModel.js");
const { scanTranscriptForKeywords } =
  await import("../services/keywordAlertService.js");
const { default: notificationService } =
  await import("../services/notificationService.js");
const { default: EmailService } = await import("../services/EmailService.js");
const { default: express } = await import("express");

const app = express();
app.use(express.json());
app.use("/api/alerts/keywords", keywordAlertRoutes);

describe("Keyword Alert Watchlist Limits (#1680)", () => {
  const ORG_ID = new mongoose.Types.ObjectId();
  const USER_ID = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    currentUser = {
      _id: USER_ID,
      organization: ORG_ID,
      role: "member",
    };

    await KeywordAlert.deleteMany({});
    jest.clearAllMocks();

    // Mock services
    jest
      .spyOn(notificationService, "createNotifications")
      .mockResolvedValue([]);
    jest.spyOn(EmailService, "sendMail").mockResolvedValue(true);
  });

  it("allows creating / retrieving watchlist successfully", async () => {
    const res = await request(app).get("/api/alerts/keywords");
    expect(res.status).toBe(200);
    expect(res.body.keywords).toEqual([]);
  });

  it("allows updating watchlist with valid keyword count and lengths", async () => {
    const res = await request(app)
      .put("/api/alerts/keywords")
      .send({
        keywords: ["alpha", "beta", "gamma"],
      });

    expect(res.status).toBe(200);
    expect(res.body.keywords).toEqual(["alpha", "beta", "gamma"]);
  });

  it("rejects update request if keyword count exceeds 50 (400)", async () => {
    const tooManyKeywords = Array.from({ length: 51 }, (_, i) => `kw-${i}`);

    const res = await request(app).put("/api/alerts/keywords").send({
      keywords: tooManyKeywords,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot exceed 50 keywords/i);
  });

  it("rejects update request if any individual keyword length exceeds 50 (400)", async () => {
    const longKeyword = "a".repeat(51);

    const res = await request(app)
      .put("/api/alerts/keywords")
      .send({
        keywords: ["valid", longKeyword],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot exceed 50 characters/i);
  });

  it("defends transcript scanning against pre-existing/bypassed oversized alert records", async () => {
    // Manually force-insert an oversized record to bypass controller validation checks
    const oversizedKeywords = Array.from(
      { length: 100 },
      (_, i) => `keyword${i}_` + "a".repeat(60),
    );

    // Save bypassing validation using a raw insert or direct mongo validation override if necessary,
    // but here we can just mock activeAlerts or mock the schema behavior. Let's insert directly
    const badAlert = new KeywordAlert({
      user: USER_ID,
      organization: ORG_ID,
      keywords: oversizedKeywords,
      isActive: true,
    });
    // save with validateBeforeSave false to simulate pre-existing bad db record
    await badAlert.save({ validateBeforeSave: false });

    // Spy on KeywordAlert.find to return this badAlert
    jest.spyOn(KeywordAlert, "find").mockReturnValue({
      populate: jest.fn().mockResolvedValue([
        {
          _id: badAlert._id,
          organization: ORG_ID,
          isActive: true,
          notifyViaApp: true,
          notifyViaEmail: false,
          keywords: oversizedKeywords,
          user: { _id: USER_ID, name: "Test User", email: "test@example.com" },
        },
      ]),
    });

    const meeting = {
      _id: new mongoose.Types.ObjectId(),
      organization: ORG_ID,
      title: "Vulnerability Demo",
    };

    // Scan a transcript containing one of the clamped keywords (e.g. keyword0_ + 42 'a's since it's sliced at 50 chars)
    // keyword0_ is 9 chars, so we pad it with 41 'a's to reach 50 character limit
    const expectedClampedKeyword = "keyword0_" + "a".repeat(41);
    await scanTranscriptForKeywords(
      meeting,
      `Hello team, please check the status of ${expectedClampedKeyword}`,
    );

    // Verify it triggered notification for the clamped version (meaning it safely sliced and bounded keywords list)
    expect(notificationService.createNotifications).toHaveBeenCalled();
    const notificationPayload =
      notificationService.createNotifications.mock.calls[0][1];
    expect(notificationPayload.description).toContain(expectedClampedKeyword);
  });
});
