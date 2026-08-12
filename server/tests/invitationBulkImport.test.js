/**
 * Integration tests for POST /api/invitations/bulk (Issue #1362).
 */

import request from "supertest";
import mongoose from "mongoose";
import { jest } from "@jest/globals";
import { app } from "../server.js";
import { createClerkTestToken, authHeader } from "./helpers/clerkTestAuth.js";
import User from "../models/userModel.js";
import Organization from "../models/organizationModel.js";
import Membership from "../models/membershipModel.js";
import Invitation from "../models/invitationModel.js";
import { clearBulkInvitationJobs } from "../services/bulkInvitationProgress.js";
import { MAX_BULK_INVITATIONS } from "../services/InvitationService.js";

jest.mock("../config/nodeMailer.js", () => ({
  sendMail: jest.fn(),
  __esModule: true,
  default: { sendMail: jest.fn() },
}));

describe("POST /api/invitations/bulk (Issue #1362)", () => {
  let adminUser;
  let adminToken;
  let normalUser;
  let normalToken;
  let organization;

  beforeEach(async () => {
    clearBulkInvitationJobs();

    organization = await Organization.create({
      name: "Bulk Corp",
      slug: "bulk-corp-" + Math.random().toString(36).substring(7),
      owner: new mongoose.Types.ObjectId(),
    });

    adminUser = await User.create({
      name: "Bulk Admin",
      email: `bulk-admin-${Math.random()}@example.com`,
      password: "password123",
      organization: organization._id,
      role: "admin",
      isAccountVerified: true,
    });
    adminUser.clerkUserId = `user_test_${adminUser._id}`;
    await adminUser.save();
    adminToken = createClerkTestToken({
      clerkUserId: adminUser.clerkUserId,
      email: adminUser.email,
    });

    organization.owner = adminUser._id;
    await organization.save();

    await Membership.create({
      user: adminUser._id,
      organization: organization._id,
      role: "admin",
      status: "active",
    });

    normalUser = await User.create({
      name: "Bulk Member",
      email: `bulk-member-${Math.random()}@example.com`,
      password: "password123",
      organization: organization._id,
      role: "member",
      isAccountVerified: true,
    });
    normalUser.clerkUserId = `user_test_${normalUser._id}`;
    await normalUser.save();
    normalToken = createClerkTestToken({
      clerkUserId: normalUser.clerkUserId,
      email: normalUser.email,
    });

    await Membership.create({
      user: normalUser._id,
      organization: organization._id,
      role: "member",
      status: "active",
    });
  });

  const postCsv = (token, csv, orgId = organization._id.toString()) =>
    request(app)
      .post("/api/invitations/bulk")
      .set(authHeader(token))
      .field("organizationId", orgId)
      .attach("file", Buffer.from(csv, "utf8"), {
        filename: "invites.csv",
        contentType: "text/csv",
      });

  it("imports a valid CSV and reports progress", async () => {
    const csv = [
      "email,role,message",
      "alice@example.com,member,Welcome Alice",
      "bob@example.com,admin,",
    ].join("\n");

    const res = await postCsv(adminToken, csv);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalRows).toBe(2);
    expect(res.body.successful).toBe(2);
    expect(res.body.failed).toBe(0);
    expect(res.body.progress).toBe(100);
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0]).toMatchObject({
      row: 2,
      email: "alice@example.com",
      success: true,
    });
    expect(res.body.results[0].invitationId).toBeTruthy();

    const created = await Invitation.find({
      organization: organization._id,
      email: { $in: ["alice@example.com", "bob@example.com"] },
    });
    expect(created).toHaveLength(2);
  });

  it("marks invalid email rows as failed without aborting the batch", async () => {
    const csv = [
      "email,role",
      "not-an-email,member",
      "ok@example.com,member",
    ].join("\n");

    const res = await postCsv(adminToken, csv);

    expect(res.statusCode).toBe(200);
    expect(res.body.successful).toBe(1);
    expect(res.body.failed).toBe(1);
    expect(res.body.progress).toBe(100);
    expect(res.body.results[0].success).toBe(false);
    expect(res.body.results[0].error).toMatch(/email/i);
    expect(res.body.results[1].success).toBe(true);
  });

  it("marks invalid role rows as failed", async () => {
    const csv = ["email,role", "rolefail@example.com,superuser"].join("\n");

    const res = await postCsv(adminToken, csv);

    expect(res.statusCode).toBe(200);
    expect(res.body.successful).toBe(0);
    expect(res.body.failed).toBe(1);
    expect(res.body.results[0].error).toMatch(/role/i);
  });

  it("supports mixed success and failure in one batch", async () => {
    const csv = [
      "email,role,message",
      "good@example.com,member,hi",
      "bad-email,member,",
      "also-good@example.com,viewer,",
    ].join("\n");

    const res = await postCsv(adminToken, csv);

    expect(res.statusCode).toBe(200);
    expect(res.body.totalRows).toBe(3);
    expect(res.body.successful).toBe(2);
    expect(res.body.failed).toBe(1);
    expect(res.body.progress).toBe(100);
  });

  it("returns 400 for an empty CSV", async () => {
    const res = await postCsv(adminToken, "");

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/empty|required|csv/i);
  });

  it("returns 400 when required headers are missing", async () => {
    const res = await postCsv(adminToken, "name,title\na,b");

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/email.*role/i);
  });

  it("returns 400 for malformed CSV", async () => {
    const res = await postCsv(
      adminToken,
      'email,role\n"broken@example.com,member',
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/malformed|quote/i);
  });

  it("returns 400 when CSV exceeds 100 rows", async () => {
    const lines = ["email,role"];
    for (let i = 0; i < MAX_BULK_INVITATIONS + 1; i += 1) {
      lines.push(`user${i}@example.com,member`);
    }

    const res = await postCsv(adminToken, lines.join("\n"));

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/100/);
  });

  it("rejects members without invite permission", async () => {
    const csv = ["email,role", "x@example.com,member"].join("\n");

    const res = await postCsv(normalToken, csv);

    expect(res.statusCode).toBe(403);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post("/api/invitations/bulk")
      .field("organizationId", organization._id.toString())
      .attach("file", Buffer.from("email,role\na@b.com,member"), {
        filename: "invites.csv",
        contentType: "text/csv",
      });

    expect(res.statusCode).toBe(401);
  });

  it("reports duplicate pending invitations as row failures", async () => {
    await Invitation.create({
      organization: organization._id,
      email: "dup@example.com",
      invitedBy: adminUser._id,
      token: "existing_bulk_token",
      role: "member",
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000),
    });

    const csv = ["email,role", "dup@example.com,member"].join("\n");
    const res = await postCsv(adminToken, csv);

    expect(res.statusCode).toBe(200);
    expect(res.body.successful).toBe(0);
    expect(res.body.failed).toBe(1);
    expect(res.body.results[0].error).toMatch(/pending invitation/i);
  });

  it("returns 400 when no file is uploaded", async () => {
    const res = await request(app)
      .post("/api/invitations/bulk")
      .set(authHeader(adminToken))
      .field("organizationId", organization._id.toString());

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/csv file is required/i);
  });

  it("returns 403 when organizationId belongs to another org the user cannot invite to", async () => {
    const otherOrg = await Organization.create({
      name: "Other Org",
      slug: "other-" + Math.random().toString(36).substring(7),
      owner: new mongoose.Types.ObjectId(),
    });

    const csv = ["email,role", "outsider@example.com,member"].join("\n");
    const res = await postCsv(adminToken, csv, otherOrg._id.toString());

    expect(res.statusCode).toBe(403);
  });
});
