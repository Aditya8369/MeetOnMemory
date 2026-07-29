import request from "supertest";
import { app } from "../server.js";

describe("Organization Endpoints", () => {
  describe("Route verification for Issue #787", () => {
    it("should return 401 for old /api/organizations/members route (removed - now caught by auth middleware)", async () => {
      const res = await request(app).get("/api/organizations/members");

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("success", false);
    });

    it("should return 401 for new /api/organizations/:id/members route without auth", async () => {
      const res = await request(app).get("/api/organizations/507f1f77bcf86cd799439011/members");

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("success", false);
    });
  });

  describe("POST /api/organizations/create-or-join", () => {
    it("should return 401 if user is not authenticated", async () => {
      const res = await request(app)
        .post("/api/organizations/create-or-join")
        .send({ name: "Test Org" });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("success", false);
    });
  });
});
