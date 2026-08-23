import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import { PERMISSIONS, ROLE_HIERARCHY } from "../utils/rbacPermissions.js";

let testRole = "admin";

jest.unstable_mockModule("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    req.user = { _id: "user123", role: testRole };
    next();
  },
}));

jest.unstable_mockModule("../middleware/rateLimiter.js", () => ({
  apiLimiter: (req, res, next) => next(),
  writeLimiter: (req, res, next) => next(),
}));

const { default: adminRbacRoutes } =
  await import("../routes/adminRbacRoutes.js");
const { default: express } = await import("express");

describe("Admin RBAC Matrix API", () => {
  let app;

  beforeEach(() => {
    testRole = "admin";
    app = express();
    app.use(express.json());
    app.use("/api/admin/rbac", adminRbacRoutes);
  });

  it("returns 200 and permissions matrix for admin user", async () => {
    testRole = "admin";
    const res = await request(app).get("/api/admin/rbac/matrix");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.roleHierarchy).toEqual(ROLE_HIERARCHY);
    expect(res.body.data.permissions).toEqual(PERMISSIONS);
    expect(Array.isArray(res.body.data.roles)).toBe(true);
    expect(res.body.data.roles.length).toBe(Object.keys(ROLE_HIERARCHY).length);
  });

  it("returns 200 and permissions matrix for owner user", async () => {
    testRole = "owner";
    const res = await request(app).get("/api/admin/rbac/matrix");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("blocks non-admin/owner roles with 403 Forbidden", async () => {
    const forbiddenRoles = ["member", "viewer", "guest", "moderator"];

    for (const role of forbiddenRoles) {
      testRole = role;
      const res = await request(app).get("/api/admin/rbac/matrix");

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    }
  });
});
