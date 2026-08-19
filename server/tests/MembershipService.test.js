/**
 * Issue #1361 — Membership.role and User.role stay in sync.
 */

import { jest } from "@jest/globals";
import mongoose from "mongoose";

const mockSave = jest.fn();
const mockFindById = jest.fn();
const mockStartSession = jest.fn();

jest.unstable_mockModule("../models/membershipModel.js", () => ({
  default: {},
}));

jest.unstable_mockModule("../models/userModel.js", () => ({
  default: {
    findById: mockFindById,
  },
}));

const originalStartSession = mongoose.startSession;

beforeAll(() => {
  mongoose.startSession = mockStartSession;
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  mongoose.startSession = originalStartSession;
});

const { syncMembershipAndUserRole, runMembershipTransaction } =
  await import("../services/MembershipService.js");

describe("MembershipService — syncMembershipAndUserRole (#1361)", () => {
  const orgId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    // Default: standalone topology (no multi-doc transactions)
    Object.defineProperty(mongoose.connection, "client", {
      configurable: true,
      value: {
        topology: { description: { type: "Single" } },
      },
    });
  });

  const makeMembership = (role = "member") => ({
    user: userId,
    organization: { _id: orgId },
    role,
    save: mockSave.mockResolvedValue(undefined),
  });

  it("returns unchanged without writing when role is already set", async () => {
    const membership = makeMembership("admin");
    const result = await syncMembershipAndUserRole(membership, "admin");

    expect(result.unchanged).toBe(true);
    expect(result.userSynced).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it("updates Membership.role and User.role for the primary organization", async () => {
    const membership = makeMembership("member");
    const targetUser = {
      organization: orgId,
      role: "member",
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockFindById.mockReturnValue({
      session: jest.fn().mockResolvedValue(targetUser),
    });

    const result = await syncMembershipAndUserRole(membership, "admin");

    expect(result.unchanged).toBe(false);
    expect(result.userSynced).toBe(true);
    expect(membership.role).toBe("admin");
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(targetUser.role).toBe("admin");
    expect(targetUser.save).toHaveBeenCalledTimes(1);
  });

  it("does not rewrite User.role when it already matches the new role", async () => {
    const membership = makeMembership("member");
    const targetUser = {
      organization: orgId,
      role: "admin", // already synced (legacy inconsistency on Membership only)
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockFindById.mockReturnValue({
      session: jest.fn().mockResolvedValue(targetUser),
    });

    const result = await syncMembershipAndUserRole(membership, "admin");

    expect(membership.role).toBe("admin");
    expect(result.userSynced).toBe(false);
    expect(targetUser.save).not.toHaveBeenCalled();
  });

  it("updates Membership only when it is not the user's primary organization", async () => {
    const membership = makeMembership("member");
    const otherOrg = new mongoose.Types.ObjectId();
    const targetUser = {
      organization: otherOrg,
      role: "member",
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockFindById.mockReturnValue({
      session: jest.fn().mockResolvedValue(targetUser),
    });

    const result = await syncMembershipAndUserRole(membership, "admin");

    expect(membership.role).toBe("admin");
    expect(result.userSynced).toBe(false);
    expect(targetUser.role).toBe("member");
    expect(targetUser.save).not.toHaveBeenCalled();
  });

  it("updates Membership when the linked user is missing", async () => {
    const membership = makeMembership("member");
    mockFindById.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    });

    const result = await syncMembershipAndUserRole(membership, "admin");

    expect(membership.role).toBe("admin");
    expect(result.userSynced).toBe(false);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it("rolls back membership changes when User.save fails inside a transaction", async () => {
    Object.defineProperty(mongoose.connection, "client", {
      configurable: true,
      value: {
        topology: { description: { type: "ReplicaSetWithPrimary" } },
      },
    });

    const abortTransaction = jest.fn().mockResolvedValue(undefined);
    const commitTransaction = jest.fn().mockResolvedValue(undefined);
    const endSession = jest.fn();
    mockStartSession.mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction,
      abortTransaction,
      endSession,
    });

    const membership = makeMembership("member");
    const targetUser = {
      organization: orgId,
      role: "member",
      save: jest.fn().mockRejectedValue(new Error("user write failed")),
    };
    mockFindById.mockReturnValue({
      session: jest.fn().mockResolvedValue(targetUser),
    });

    await expect(
      syncMembershipAndUserRole(membership, "admin"),
    ).rejects.toThrow("user write failed");

    expect(abortTransaction).toHaveBeenCalledTimes(1);
    expect(commitTransaction).not.toHaveBeenCalled();
    expect(endSession).toHaveBeenCalledTimes(1);
  });

  it("commits both updates when the transaction succeeds", async () => {
    Object.defineProperty(mongoose.connection, "client", {
      configurable: true,
      value: {
        topology: { description: { type: "ReplicaSetWithPrimary" } },
      },
    });

    const abortTransaction = jest.fn().mockResolvedValue(undefined);
    const commitTransaction = jest.fn().mockResolvedValue(undefined);
    const endSession = jest.fn();
    const session = {
      startTransaction: jest.fn(),
      commitTransaction,
      abortTransaction,
      endSession,
    };
    mockStartSession.mockResolvedValue(session);

    const membership = makeMembership("member");
    const targetUser = {
      organization: orgId,
      role: "member",
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockFindById.mockReturnValue({
      session: jest.fn().mockResolvedValue(targetUser),
    });

    const result = await syncMembershipAndUserRole(membership, "admin");

    expect(result.userSynced).toBe(true);
    expect(commitTransaction).toHaveBeenCalledTimes(1);
    expect(abortTransaction).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith({ session });
    expect(targetUser.save).toHaveBeenCalledWith({ session });
  });
});

describe("runMembershipTransaction", () => {
  it("runs work without a session on standalone topology", async () => {
    Object.defineProperty(mongoose.connection, "client", {
      configurable: true,
      value: {
        topology: { description: { type: "Single" } },
      },
    });

    const work = jest.fn().mockResolvedValue("ok");
    const result = await runMembershipTransaction(work);

    expect(result).toBe("ok");
    expect(work).toHaveBeenCalledWith(null);
    expect(mockStartSession).not.toHaveBeenCalled();
  });
});
