import request from "supertest";
import mongoose from "mongoose";

const { default: express } = await import("express");
const { default: githubRoutes } =
  await import("../routes/githubIntegrationRoutes.js");

describe("GitHub Integration Routes Security & Authorization Tests (#1806)", () => {
  const ORG_A = new mongoose.Types.ObjectId();
  const ORG_B = new mongoose.Types.ObjectId();
  const USER_ID = new mongoose.Types.ObjectId();

  describe("Without Authentication", () => {
    let app;

    beforeAll(() => {
      app = express();
      app.use(express.json());
      app.use("/api/github", githubRoutes);
    });

    it("rejects GET /status without auth", async () => {
      const res = await request(app).get("/api/github/status");
      expect(res.status).toBe(401);
    });

    it("rejects GET /status/:organizationId without auth", async () => {
      const res = await request(app).get(`/api/github/status/${ORG_A}`);
      expect(res.status).toBe(401);
    });

    it("rejects GET /connect without auth", async () => {
      const res = await request(app).get("/api/github/connect");
      expect(res.status).toBe(401);
    });

    it("rejects POST /disconnect without auth", async () => {
      const res = await request(app).post("/api/github/disconnect");
      expect(res.status).toBe(401);
    });

    it("rejects DELETE /disconnect/:organizationId without auth", async () => {
      const res = await request(app).delete(`/api/github/disconnect/${ORG_A}`);
      expect(res.status).toBe(401);
    });
  });

  describe("With Authentication (Cross-Tenant Authorization)", () => {
    let app;

    beforeAll(() => {
      app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        // Logged-in user belongs to ORG_A
        req.user = {
          _id: USER_ID,
          organization: ORG_A,
        };
        next();
      });
      app.use("/api/github", githubRoutes);
    });

    it("allows accessing own organization status", async () => {
      const res = await request(app).get(`/api/github/status/${ORG_A}`);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("rejects accessing another organization status with 403", async () => {
      const res = await request(app).get(`/api/github/status/${ORG_B}`);
      expect(res.status).toBe(403);
    });

    it("rejects disconnecting another organization with 403", async () => {
      const res = await request(app).delete(`/api/github/disconnect/${ORG_B}`);
      expect(res.status).toBe(403);
    });
  });
});
