/**
 * Issue #1388 — Yjs document mutations must re-authorize meeting access
 * on every sync-update (join-time auth alone is insufficient).
 */

delete process.env.REDIS_URI;
delete process.env.REDIS_URL;

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import mongoose from "mongoose";
import * as Y from "yjs";
import { authorizeCollaborativeDocAccess } from "../utils/collaborativeDocAccess.js";
import Meeting from "../models/meetingModel.js";
import User from "../models/userModel.js";

vi.mock("../models/meetingModel.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("../models/userModel.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("../services/documentService.js", () => ({
  loadDocumentState: vi.fn().mockResolvedValue(null),
  saveDocumentState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../middleware/socketAuth.js", () => ({
  default: (socket, next) => next(),
}));

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();
const MEETING_A = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();
const USER_B = new mongoose.Types.ObjectId();
const OWNER_ID = new mongoose.Types.ObjectId();

describe("authorizeCollaborativeDocAccess (#1388)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const socketFor = (userId) => ({
    userId: userId.toString(),
    user: { _id: userId },
  });

  it("allows an authorized same-organization participant", async () => {
    Meeting.findById.mockResolvedValue({
      _id: MEETING_A,
      organization: ORG_A,
      uploadedBy: OWNER_ID,
      participants: [],
    });
    User.findById.mockResolvedValue({
      _id: USER_A,
      organization: ORG_A,
      email: "alice@example.com",
    });

    const result = await authorizeCollaborativeDocAccess(
      socketFor(USER_A),
      MEETING_A.toString(),
    );

    expect(result.ok).toBe(true);
    expect(Meeting.findById).toHaveBeenCalledWith(MEETING_A.toString());
    expect(User.findById).toHaveBeenCalledWith(USER_A.toString());
  });

  it("allows the meeting owner", async () => {
    Meeting.findById.mockResolvedValue({
      _id: MEETING_A,
      organization: ORG_A,
      uploadedBy: OWNER_ID,
      participants: [],
    });
    User.findById.mockResolvedValue({
      _id: OWNER_ID,
      organization: ORG_B, // even if org differs, owner retains access
      email: "owner@example.com",
    });

    const result = await authorizeCollaborativeDocAccess(
      socketFor(OWNER_ID),
      MEETING_A.toString(),
    );

    expect(result.ok).toBe(true);
  });

  it("allows a listed participant by email", async () => {
    Meeting.findById.mockResolvedValue({
      _id: MEETING_A,
      organization: ORG_A,
      uploadedBy: OWNER_ID,
      participants: [{ email: "guest@example.com" }],
    });
    User.findById.mockResolvedValue({
      _id: USER_B,
      organization: ORG_B,
      email: "guest@example.com",
    });

    const result = await authorizeCollaborativeDocAccess(
      socketFor(USER_B),
      MEETING_A.toString(),
    );

    expect(result.ok).toBe(true);
  });

  it("denies cross-organization users without participant listing", async () => {
    Meeting.findById.mockResolvedValue({
      _id: MEETING_A,
      organization: ORG_A,
      uploadedBy: OWNER_ID,
      participants: [],
    });
    User.findById.mockResolvedValue({
      _id: USER_B,
      organization: ORG_B,
      email: "mallory@example.com",
    });

    const result = await authorizeCollaborativeDocAccess(
      socketFor(USER_B),
      MEETING_A.toString(),
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("forbidden");
  });

  it("denies users removed from the organization (fresh membership check)", async () => {
    Meeting.findById.mockResolvedValue({
      _id: MEETING_A,
      organization: ORG_A,
      uploadedBy: OWNER_ID,
      participants: [],
    });
    // Previously in ORG_A; now no organization
    User.findById.mockResolvedValue({
      _id: USER_A,
      organization: null,
      email: "alice@example.com",
    });

    const result = await authorizeCollaborativeDocAccess(
      socketFor(USER_A),
      MEETING_A.toString(),
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("forbidden");
  });

  it("denies users removed from meeting participant access", async () => {
    Meeting.findById.mockResolvedValue({
      _id: MEETING_A,
      organization: ORG_A,
      uploadedBy: OWNER_ID,
      participants: [{ email: "someone-else@example.com" }],
    });
    User.findById.mockResolvedValue({
      _id: USER_B,
      organization: ORG_B,
      email: "guest@example.com",
    });

    const result = await authorizeCollaborativeDocAccess(
      socketFor(USER_B),
      MEETING_A.toString(),
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("forbidden");
  });

  it("rejects missing authentication", async () => {
    const result = await authorizeCollaborativeDocAccess(
      {},
      MEETING_A.toString(),
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe("unauthenticated");
    expect(Meeting.findById).not.toHaveBeenCalled();
  });

  it("rejects invalid meeting ids", async () => {
    const result = await authorizeCollaborativeDocAccess(
      socketFor(USER_A),
      "not-a-valid-id",
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe("invalid_meeting");
    expect(Meeting.findById).not.toHaveBeenCalled();
  });

  it("rejects missing meetings", async () => {
    Meeting.findById.mockResolvedValue(null);
    User.findById.mockResolvedValue({
      _id: USER_A,
      organization: ORG_A,
      email: "alice@example.com",
    });

    const result = await authorizeCollaborativeDocAccess(
      socketFor(USER_A),
      MEETING_A.toString(),
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("not_found");
  });
});

describe("documentSync sync-update authorization (#1388)", () => {
  let connectionCallback;
  let documentSync;

  beforeAll(async () => {
    documentSync = (await import("../socket/documentSync.js")).default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    connectionCallback = null;
    const nsp = {
      use: vi.fn(),
      on: vi.fn((event, cb) => {
        if (event === "connection") connectionCallback = cb;
      }),
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      adapter: { rooms: new Map() },
    };
    documentSync({
      of: vi.fn(() => nsp),
    });
  });

  const createSocket = (overrides = {}) => {
    const handlers = {};
    return {
      id: "sock_1",
      userId: USER_A.toString(),
      user: {
        _id: USER_A,
        organization: ORG_A,
        email: "alice@example.com",
        name: "Alice",
      },
      join: vi.fn(),
      emit: vi.fn(),
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      on: vi.fn((event, handler) => {
        handlers[event] = handler;
      }),
      _handlers: handlers,
      ...overrides,
    };
  };

  const getHandler = (socket, event) => socket._handlers[event];

  it("allows authorized participant updates to reach Yjs state", async () => {
    Meeting.findById.mockResolvedValue({
      _id: MEETING_A,
      organization: ORG_A,
      uploadedBy: OWNER_ID,
      participants: [],
    });
    User.findById.mockResolvedValue({
      _id: USER_A,
      organization: ORG_A,
      email: "alice@example.com",
    });

    const socket = createSocket();
    connectionCallback(socket);

    const join = getHandler(socket, "join-document");
    await join({ meetingId: MEETING_A.toString() });
    expect(socket.emit).toHaveBeenCalledWith(
      "sync-full",
      expect.objectContaining({ update: expect.anything() }),
    );

    const local = new Y.Doc();
    local.getText("notes").insert(0, "hello");
    const update = Y.encodeStateAsUpdate(local);

    const syncUpdate = getHandler(socket, "sync-update");
    await syncUpdate({
      meetingId: MEETING_A.toString(),
      update: Array.from(update),
    });

    expect(socket.emit).not.toHaveBeenCalledWith(
      "doc-error",
      expect.objectContaining({
        message: expect.stringMatching(/Unauthorized/i),
      }),
    );
    // Auth was consulted for join + update
    expect(Meeting.findById).toHaveBeenCalledTimes(2);
    expect(User.findById).toHaveBeenCalledTimes(2);
  });

  it("rejects cross-organization sync-update and does not broadcast", async () => {
    // First allow join as org A member
    Meeting.findById.mockResolvedValue({
      _id: MEETING_A,
      organization: ORG_A,
      uploadedBy: OWNER_ID,
      participants: [],
    });
    User.findById.mockResolvedValue({
      _id: USER_A,
      organization: ORG_A,
      email: "alice@example.com",
    });

    const socket = createSocket();
    connectionCallback(socket);
    await getHandler(
      socket,
      "join-document",
    )({
      meetingId: MEETING_A.toString(),
    });

    // Then simulate membership change / attacker from org B on update
    User.findById.mockResolvedValue({
      _id: USER_A,
      organization: ORG_B,
      email: "alice@example.com",
    });

    const roomEmit = vi.fn();
    socket.to = vi.fn().mockReturnValue({ emit: roomEmit });

    const local = new Y.Doc();
    local.getText("notes").insert(0, "pwned");
    const update = Y.encodeStateAsUpdate(local);

    await getHandler(
      socket,
      "sync-update",
    )({
      meetingId: MEETING_A.toString(),
      update: Array.from(update),
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "doc-error",
      expect.objectContaining({
        message: expect.stringMatching(/Unauthorized/i),
      }),
    );
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it("rejects sync-update when authentication is missing", async () => {
    const socket = createSocket({ userId: null, user: null });
    connectionCallback(socket);

    await getHandler(
      socket,
      "sync-update",
    )({
      meetingId: MEETING_A.toString(),
      update: [1, 2, 3],
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "doc-error",
      expect.objectContaining({
        message: expect.stringMatching(/Authentication required/i),
      }),
    );
    expect(Meeting.findById).not.toHaveBeenCalled();
  });

  it("rejects sync-update for invalid meeting ids without mutating", async () => {
    const socket = createSocket();
    connectionCallback(socket);

    await getHandler(
      socket,
      "sync-update",
    )({
      meetingId: "bad-id",
      update: [1, 2, 3],
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "doc-error",
      expect.objectContaining({
        message: expect.stringMatching(/Invalid meeting/i),
      }),
    );
    expect(Meeting.findById).not.toHaveBeenCalled();
  });

  it("still allows authorized join-document after reconnect-style re-auth", async () => {
    Meeting.findById.mockResolvedValue({
      _id: MEETING_A,
      organization: ORG_A,
      uploadedBy: OWNER_ID,
      participants: [],
    });
    User.findById.mockResolvedValue({
      _id: USER_A,
      organization: ORG_A,
      email: "alice@example.com",
    });

    const socket = createSocket();
    connectionCallback(socket);

    await getHandler(
      socket,
      "join-document",
    )({
      meetingId: MEETING_A.toString(),
    });

    expect(socket.join).toHaveBeenCalledWith(`doc:${MEETING_A}`);
    expect(socket.emit).toHaveBeenCalledWith(
      "sync-full",
      expect.objectContaining({ update: expect.anything() }),
    );
  });

  it("runs authorization on every sync-update (not only join)", async () => {
    Meeting.findById.mockResolvedValue({
      _id: MEETING_A,
      organization: ORG_A,
      uploadedBy: OWNER_ID,
      participants: [],
    });
    User.findById.mockResolvedValue({
      _id: USER_A,
      organization: ORG_A,
      email: "alice@example.com",
    });

    const socket = createSocket();
    connectionCallback(socket);
    await getHandler(
      socket,
      "join-document",
    )({
      meetingId: MEETING_A.toString(),
    });

    const local = new Y.Doc();
    local.getText("notes").insert(0, "a");
    const update = Array.from(Y.encodeStateAsUpdate(local));

    await getHandler(
      socket,
      "sync-update",
    )({
      meetingId: MEETING_A.toString(),
      update,
    });
    await getHandler(
      socket,
      "sync-update",
    )({
      meetingId: MEETING_A.toString(),
      update,
    });

    // 1 join + 2 updates
    expect(Meeting.findById).toHaveBeenCalledTimes(3);
    expect(User.findById).toHaveBeenCalledTimes(3);
  });
});
