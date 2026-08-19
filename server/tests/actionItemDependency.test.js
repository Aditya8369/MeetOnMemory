import request from "supertest";
import mongoose from "mongoose";
import { app } from "../server.js";
import ActionItem from "../models/actionItemModel.js";
import ActionItemDependency from "../models/actionItemDependencyModel.js";
import Organization from "../models/organizationModel.js";
import User from "../models/userModel.js";
import { createClerkTestToken, authHeader } from "./helpers/clerkTestAuth.js";

describe("Action Item Dependencies API", () => {
  let user;
  let token;
  let org;
  let itemA, itemB, itemC;

  beforeEach(async () => {
    // 1. Create Organization
    org = await Organization.create({
      name: "Test Org",
      domain: "test.com",
      owner: new mongoose.Types.ObjectId(),
      slug: "test-org",
    });

    // 2. Create User
    user = await User.create({
      email: "test@test.com",
      name: "Test User",
      firstName: "Test",
      lastName: "User",
      password: "password123",
      organization: org._id,
      currentOrganization: org._id,
      organizations: [
        { organization: org._id, role: "admin", status: "active" },
      ],
    });
    user.clerkUserId = `user_test_${user._id}`;
    await user.save();

    token = createClerkTestToken({
      clerkUserId: user.clerkUserId,
      email: user.email,
    });

    // 3. Create Action Items
    const meetingId = new mongoose.Types.ObjectId();
    itemA = await ActionItem.create({
      text: "Task A",
      sourceMeetingId: meetingId,
      organization: org._id,
    });
    itemB = await ActionItem.create({
      text: "Task B",
      sourceMeetingId: meetingId,
      organization: org._id,
    });
    itemC = await ActionItem.create({
      text: "Task C",
      sourceMeetingId: meetingId,
      organization: org._id,
    });
  });

  it("should add a valid dependency (B blocked by A)", async () => {
    const res = await request(app)
      .post("/api/action-item-dependencies")
      .set(authHeader(token))
      .send({
        dependentId: itemB._id,
        blockerId: itemA._id,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const dep = await ActionItemDependency.findOne({
      dependentItem: itemB._id,
      blockedByItem: itemA._id,
    });
    expect(dep).not.toBeNull();
  });

  it("should prevent self-referencing dependency", async () => {
    const res = await request(app)
      .post("/api/action-item-dependencies")
      .set(authHeader(token))
      .send({
        dependentId: itemA._id,
        blockerId: itemA._id,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should prevent circular dependency (A blocked by B, B blocked by A)", async () => {
    // A blocks B
    await ActionItemDependency.create({
      dependentItem: itemB._id,
      blockedByItem: itemA._id,
      organization: org._id,
    });

    // Try to make B block A
    const res = await request(app)
      .post("/api/action-item-dependencies")
      .set(authHeader(token))
      .send({
        dependentId: itemA._id,
        blockerId: itemB._id,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("circular dependency");
  });

  it("should prevent deeper circular dependency (A->B->C->A)", async () => {
    // A blocks B
    await ActionItemDependency.create({
      dependentItem: itemB._id,
      blockedByItem: itemA._id,
      organization: org._id,
    });
    // B blocks C
    await ActionItemDependency.create({
      dependentItem: itemC._id,
      blockedByItem: itemB._id,
      organization: org._id,
    });

    // Try to make C block A
    const res = await request(app)
      .post("/api/action-item-dependencies")
      .set(authHeader(token))
      .send({
        dependentId: itemA._id, // A is blocked by
        blockerId: itemC._id, // C
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("circular dependency");
  });

  it("should remove a dependency", async () => {
    await ActionItemDependency.create({
      dependentItem: itemB._id,
      blockedByItem: itemA._id,
      organization: org._id,
    });

    const res = await request(app)
      .delete(`/api/action-item-dependencies/${itemB._id}/${itemA._id}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);

    const dep = await ActionItemDependency.findOne({
      dependentItem: itemB._id,
      blockedByItem: itemA._id,
    });
    expect(dep).toBeNull();
  });

  it("should get dependencies for an item", async () => {
    // A blocks B (B is dependent on A)
    await ActionItemDependency.create({
      dependentItem: itemB._id,
      blockedByItem: itemA._id,
      organization: org._id,
    });

    // B blocks C (C is dependent on B)
    await ActionItemDependency.create({
      dependentItem: itemC._id,
      blockedByItem: itemB._id,
      organization: org._id,
    });

    const res = await request(app)
      .get(`/api/action-item-dependencies/${itemB._id}`)
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // For itemB:
    // blockers: should be itemA
    // blocking: should be itemC
    expect(res.body.data.blockers).toHaveLength(1);
    expect(res.body.data.blockers[0]._id.toString()).toBe(itemA._id.toString());

    expect(res.body.data.blocking).toHaveLength(1);
    expect(res.body.data.blocking[0]._id.toString()).toBe(itemC._id.toString());
  });
});
