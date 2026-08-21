import request from "supertest";
import mongoose from "mongoose";

const { default: express } = await import("express");
const { default: escalationRoutes } =
  await import("../routes/escalationRoutes.js");

describe("Escalation Routes Integration Tests (#1870)", () => {
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
    app.use("/api/escalations", escalationRoutes);
  });

  it("resolves route integration paths successfully without undefined import crashes", async () => {
    const resDashboard = await request(app).get("/api/escalations/dashboard");
    expect(resDashboard.status).not.toBe(500);

    const resList = await request(app).get("/api/escalations");
    expect(resList.status).not.toBe(500);

    const resSingle = await request(app).get(
      `/api/escalations/${new mongoose.Types.ObjectId()}`,
    );
    expect(resSingle.status).not.toBe(500);
  });
});
