import request from "supertest";
import mongoose from "mongoose";

const { default: express } = await import("express");
const { default: preMeetingBriefingRoutes } =
  await import("../routes/preMeetingBriefingRoutes.js");

describe("Pre-Meeting Briefing Routes Integration Tests (#1871)", () => {
  const ORG_ID = new mongoose.Types.ObjectId();
  const USER_ID = new mongoose.Types.ObjectId();
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    // Mock userAuth middleware response
    app.use((req, res, next) => {
      req.user = {
        _id: USER_ID,
        organization: ORG_ID,
      };
      next();
    });
    app.use("/api/briefings", preMeetingBriefingRoutes);
  });

  it("resolves route integration paths successfully without undefined import crashes", async () => {
    const resGenerate = await request(app).post(
      "/api/briefings/invalid-meeting-id/generate",
    );
    expect(resGenerate.status).toBe(400); // Invalid ObjectId format check in controller

    const resGet = await request(app).get("/api/briefings/invalid-meeting-id");
    expect(resGet.status).toBe(400); // Invalid ObjectId format check in controller
  });
});
