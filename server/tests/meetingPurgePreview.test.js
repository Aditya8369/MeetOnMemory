import request from "supertest";
import { app } from "../server.js";
import { describe, it, expect, beforeEach } from "vitest";
import Meeting from "../models/meetingModel.js";
import User from "../models/userModel.js";
import Organization from "../models/organizationModel.js";
import DataRetentionPolicy from "../models/dataRetentionPolicyModel.js";
import { createClerkTestToken, authHeader } from "./helpers/clerkTestAuth.js";

let owner;
let organization;
let headers;

beforeEach(async () => {
  await Promise.all([
    Meeting.deleteMany({}),
    Organization.deleteMany({}),
    User.deleteMany({ email: /purge-test/ }),
    DataRetentionPolicy.deleteMany({}),
  ]);

  owner = await User.create({
    name: "Purge Admin",
    email: `purge-test-${Date.now()}@example.com`,
    password: "Password123!",
    role: "owner",
    clerkUserId: `user_purge_${Date.now()}`,
  });
  organization = await Organization.create({
    name: "Purge Test Org",
    slug: `purge-test-org-${Date.now()}`,
    owner: owner._id,
  });
  owner.organization = organization._id;
  await owner.save();

  headers = authHeader(
    createClerkTestToken({
      clerkUserId: owner.clerkUserId,
      email: owner.email,
    }),
  );

  // Set up Data Retention Policy
  await DataRetentionPolicy.create({
    organization: organization._id,
    enabled: true,
    retentionPeriodDays: 30,
    gracePeriodDays: 7,
  });
});

describe("Meeting Recycle Bin Purge and Preview (#2274)", () => {
  it("returns purge preview with counts, types, and samples respecting retention policy", async () => {
    // 1. Create an active meeting (not in trash)
    await Meeting.create({
      uploadedBy: owner._id,
      organization: organization._id,
      title: "Active Meeting",
      meetingType: "conference",
      date: new Date(),
    });

    // 2. Create a soft-deleted meeting (in trash)
    await Meeting.create({
      uploadedBy: owner._id,
      organization: organization._id,
      title: "Deleted Meeting",
      meetingType: "policy",
      date: new Date(),
      deletedAt: new Date(),
    });

    // 3. Create an old meeting that is eligible for sweep/deletion
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days old (retention + grace = 37)
    await Meeting.create({
      uploadedBy: owner._id,
      organization: organization._id,
      title: "Old Expired Meeting",
      meetingType: "internal",
      date: oldDate,
      createdAt: oldDate,
    });

    const res = await request(app)
      .get("/api/meetings/trash/purge-preview")
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { trash, sweep, policy } = res.body.data;
    expect(policy.enabled).toBe(true);
    expect(policy.retentionPeriodDays).toBe(30);

    // Trash section checks
    expect(trash.totalCount).toBe(1);
    expect(trash.countsByType.policy).toBe(1);
    expect(trash.samples[0].title).toBe("Deleted Meeting");

    // Sweep section checks
    expect(sweep.totalCount).toBe(1);
    expect(sweep.countsByType.internal).toBe(1);
    expect(sweep.samples[0].title).toBe("Old Expired Meeting");
  });

  it("purges all soft-deleted meetings in the trash on DELETE", async () => {
    // 1. Create one active meeting
    const active = await Meeting.create({
      uploadedBy: owner._id,
      organization: organization._id,
      title: "Keep Me",
      date: new Date(),
    });

    // 2. Create one soft-deleted meeting
    const deleted = await Meeting.create({
      uploadedBy: owner._id,
      organization: organization._id,
      title: "Purge Me",
      date: new Date(),
      deletedAt: new Date(),
    });

    const res = await request(app)
      .delete("/api/meetings/trash/purge")
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deletedCount).toBe(1);

    // Check database state
    expect(await Meeting.findById(deleted._id)).toBeNull();
    expect(await Meeting.findById(active._id)).not.toBeNull();
  });
});
