import request from "supertest";
import mongoose from "mongoose";

const { default: express } = await import("express");
const { getPatterns, acknowledgePattern } =
  await import("../controllers/meetingPatternController.js");
const { default: MeetingPattern } =
  await import("../models/meetingPatternModel.js");

describe("MeetingPatternController Tests (#1816)", () => {
  beforeEach(async () => {
    await MeetingPattern.deleteMany({});
  });

  it("fetches meeting patterns scoped to req.user.organization", async () => {
    const userOrg = new mongoose.Types.ObjectId();
    const otherOrg = new mongoose.Types.ObjectId();

    // Create a pattern for the user's org
    const pattern1 = await MeetingPattern.create({
      patternType: "overtime_trend",
      severity: "medium",
      description: "Sample pattern 1",
      organization: userOrg,
    });

    // Create a pattern for a different org
    await MeetingPattern.create({
      patternType: "agenda_bloat",
      severity: "high",
      description: "Sample pattern 2",
      organization: otherOrg,
    });

    const appWithOrg = express();
    appWithOrg.use(express.json());
    appWithOrg.use((req, res, next) => {
      req.user = { organization: userOrg };
      next();
    });
    appWithOrg.get("/api/patterns", getPatterns);

    const res = await request(appWithOrg).get("/api/patterns");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0]._id).toBe(pattern1._id.toString());
  });

  it("acknowledges meeting patterns scoped to req.user.organization", async () => {
    const userOrg = new mongoose.Types.ObjectId();

    const pattern = await MeetingPattern.create({
      patternType: "overtime_trend",
      severity: "medium",
      description: "Sample pattern",
      organization: userOrg,
    });

    const appWithOrg = express();
    appWithOrg.use(express.json());
    appWithOrg.use((req, res, next) => {
      req.user = { organization: userOrg };
      next();
    });
    appWithOrg.patch("/api/patterns/:id/acknowledge", acknowledgePattern);

    const res = await request(appWithOrg).patch(
      `/api/patterns/${pattern._id}/acknowledge`,
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("acknowledged");
  });
});
