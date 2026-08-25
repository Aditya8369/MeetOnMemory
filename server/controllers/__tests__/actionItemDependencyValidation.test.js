import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  addDependency,
  removeDependency,
  getDependencies,
} from "../actionItemDependencyController.js";
import actionItemDependencyService from "../../services/actionItemDependencyService.js";

vi.mock("../../services/actionItemDependencyService.js");

describe("Action Item Dependency Parameter & Org Validation (#1960)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validOrgId = new mongoose.Types.ObjectId().toString();
  const validDependentId = new mongoose.Types.ObjectId().toString();
  const validBlockerId = new mongoose.Types.ObjectId().toString();

  const user = {
    _id: new mongoose.Types.ObjectId(),
    organization: validOrgId,
  };

  const createMockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("returns 400 when organization is missing or invalid in addDependency", async () => {
    const req = {
      body: { dependentId: validDependentId, blockerId: validBlockerId },
      user: { organization: "bad-org-id" },
    };
    const res = createMockRes();

    await addDependency(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Organization ID is required and must be valid",
      }),
    );
  });

  it("returns 400 when dependentId or blockerId is not a valid ObjectId in addDependency", async () => {
    const req = {
      body: { dependentId: "invalid-id", blockerId: validBlockerId },
      user,
    };
    const res = createMockRes();

    await addDependency(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid dependentId or blockerId format",
      }),
    );
  });

  it("returns 400 when removeDependency receives invalid blockerId", async () => {
    const req = {
      params: { dependentId: validDependentId, blockerId: "invalid-blocker" },
      user,
    };
    const res = createMockRes();

    await removeDependency(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid dependentId or blockerId format",
      }),
    );
  });

  it("returns 400 when getDependencies receives invalid itemId", async () => {
    const req = {
      params: { itemId: "invalid-item-id" },
      user,
    };
    const res = createMockRes();

    await getDependencies(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid itemId format",
      }),
    );
  });

  it("successfully calls service and returns 201 on valid addDependency", async () => {
    actionItemDependencyService.addDependency.mockResolvedValue({
      _id: "dep-1",
      dependent: validDependentId,
      blocker: validBlockerId,
    });

    const req = {
      body: { dependentId: validDependentId, blockerId: validBlockerId },
      user,
    };
    const res = createMockRes();

    await addDependency(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(actionItemDependencyService.addDependency).toHaveBeenCalledWith(
      validDependentId,
      validBlockerId,
      validOrgId,
    );
  });
});
