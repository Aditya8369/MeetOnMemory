import request from "supertest";
import mongoose from "mongoose";

const { default: express } = await import("express");
const { getConfig, updateConfig } =
  await import("../controllers/issueTrackerController.js");
const { getUserScore } =
  await import("../controllers/gamificationController.js");
const { default: IssueTrackerIntegration } =
  await import("../models/issueTrackerIntegrationModel.js");
const { default: GamificationScore } =
  await import("../models/gamificationScoreModel.js");

describe("Organization Schema Property Drift Fix Integration Tests (#1893)", () => {
  const ORG_ID = new mongoose.Types.ObjectId();
  const USER_ID = new mongoose.Types.ObjectId();
  let app;

  beforeEach(async () => {
    await IssueTrackerIntegration.deleteMany({});
    await GamificationScore.deleteMany({});

    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      // Mock the logged-in user matching User model format (uses organization instead of organizationId)
      req.user = {
        _id: USER_ID,
        id: USER_ID.toString(),
        organization: ORG_ID,
      };
      next();
    });

    app.get("/api/issue-tracker/config/:provider", getConfig);
    app.post("/api/issue-tracker/config/:provider", updateConfig);
    app.get("/api/gamification/score", getUserScore);
  });

  describe("Issue Tracker Controller", () => {
    it("successfully creates and retrieves config scoped by req.user.organization", async () => {
      // 1. Create config
      const createRes = await request(app)
        .post("/api/issue-tracker/config/jira")
        .send({
          accessToken: "valid-token-123",
          config: { projectKey: "PROJ" },
        });

      expect(createRes.status).toBe(200);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.data.organization).toBe(ORG_ID.toString());

      // Verify record exists in DB using ORG_ID
      const dbRecord = await IssueTrackerIntegration.findOne({
        organization: ORG_ID,
        provider: "jira",
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord.accessToken).toBe("valid-token-123");

      // 2. Retrieve config
      const getRes = await request(app).get("/api/issue-tracker/config/jira");
      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.config.projectKey).toBe("PROJ");
    });
  });

  describe("Gamification Controller", () => {
    it("retrieves user score scoped by req.user.organization", async () => {
      // Create user score in DB
      await GamificationScore.create({
        user: USER_ID,
        organization: ORG_ID,
        totalPoints: 150,
      });

      const res = await request(app).get("/api/gamification/score");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalPoints).toBe(150);
    });
  });
});
