/**
 * Issue #1399 / #1386 — Workspace socket registration, Clerk auth, and
 * meeting authorization. Client-supplied userId fields must never authorize.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";
import { authenticateSocket } from "../middleware/socketAuth.js";
import {
  initWorkspaceSocket,
  authorizeWorkspaceAccess,
  ensureWorkspaceEventAccess,
  resetWorkspaceSocketRegistration,
  isWorkspaceSocketInitialized,
} from "../socket/workspaceSocket.js";
import Meeting from "../models/meetingModel.js";
import User from "../models/userModel.js";
import { verifyClerkSessionToken } from "../utils/authUtils.js";
import { findUserByClerkId } from "../services/authLinkingService.js";

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

vi.mock("../services/workspaceSyncService.js", () => ({
  workspaceSyncService: {
    persistCanvasElement: vi.fn().mockResolvedValue(undefined),
    clearCanvas: vi.fn().mockResolvedValue(undefined),
    reorderActionItem: vi.fn().mockResolvedValue({ movedItem: null }),
    analyzeBottlenecks: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../utils/authUtils.js", () => ({
  verifyClerkSessionToken: vi.fn(),
}));

vi.mock("../services/authLinkingService.js", () => ({
  findUserByClerkId: vi.fn(),
  provisionOrLinkClerkUser: vi.fn(),
}));

const USER_A_ID = new mongoose.Types.ObjectId("669bb3f78e472659c23b5bf5");
const USER_B_ID = new mongoose.Types.ObjectId("669bb3f78e472659c23b5bf7");
const MEETING_ID = new mongoose.Types.ObjectId("669bb3f78e472659c23b5bf8");
const ORG_A = new mongoose.Types.ObjectId("669bb3f78e472659c23b5bf6");
const ORG_B = new mongoose.Types.ObjectId("669bb3f78e472659c23b5bf9");

const mockMeetingDoc = (overrides = {}) => ({
  _id: MEETING_ID,
  uploadedBy: USER_B_ID,
  organization: ORG_A,
  participants: [],
  ...overrides,
});

const mockUserDoc = (overrides = {}) => ({
  _id: USER_A_ID,
  name: "Alice",
  email: "alice@example.com",
  organization: ORG_A,
  ...overrides,
});

const mockMeetingFind = (doc) => {
  Meeting.findById.mockReturnValue({
    select: vi.fn().mockResolvedValue(doc),
  });
};

const mockUserFind = (doc) => {
  User.findById.mockReturnValue({
    select: vi.fn().mockResolvedValue(doc),
  });
};

describe("Workspace Socket Registration & Auth (#1399)", () => {
  let middlewares;
  let connectionCallback;
  let mockNsp;
  let mockIo;

  const bootNamespace = () => {
    middlewares = [];
    connectionCallback = null;
    mockNsp = {
      use: vi.fn((mw) => {
        middlewares.push(mw);
      }),
      on: vi.fn((event, cb) => {
        if (event === "connection") {
          connectionCallback = cb;
        }
      }),
    };
    mockIo = {
      of: vi.fn((path) => {
        expect(path).toBe("/workspace");
        return mockNsp;
      }),
    };
    return initWorkspaceSocket(mockIo);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetWorkspaceSocketRegistration();
    bootNamespace();
  });

  afterEach(() => {
    resetWorkspaceSocketRegistration();
  });

  const createSocket = (overrides = {}) => {
    const base = {
      id: "socket_ws_1",
      handshake: {
        headers: { authorization: "Bearer valid_clerk_token" },
        auth: {
          meetingId: MEETING_ID.toString(),
        },
        query: {},
      },
      join: vi.fn(),
      emit: vi.fn(),
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      on: vi.fn(),
      ...overrides,
    };
    if (overrides.handshake) {
      base.handshake = {
        headers: { authorization: "Bearer valid_clerk_token" },
        auth: { meetingId: MEETING_ID.toString() },
        query: {},
        ...overrides.handshake,
      };
    }
    return base;
  };

  describe("Namespace registration", () => {
    it("registers the /workspace namespace during startup wiring", () => {
      expect(mockIo.of).toHaveBeenCalledWith("/workspace");
      expect(isWorkspaceSocketInitialized()).toBe(true);
      expect(middlewares.length).toBeGreaterThanOrEqual(2);
      expect(middlewares[0]).toBe(authenticateSocket);
      expect(middlewares[1]).toBe(authorizeWorkspaceAccess);
      expect(connectionCallback).toBeTypeOf("function");
    });

    it("registers only once on repeated initialization", () => {
      const firstNsp = mockNsp;
      initWorkspaceSocket(mockIo);
      initWorkspaceSocket(mockIo);

      expect(mockIo.of).toHaveBeenCalledTimes(1);
      expect(firstNsp.use).toHaveBeenCalledTimes(2);
      expect(isWorkspaceSocketInitialized()).toBe(true);
    });

    it("can re-register safely after a reset (restart path)", () => {
      resetWorkspaceSocketRegistration();
      expect(isWorkspaceSocketInitialized()).toBe(false);

      bootNamespace();
      expect(isWorkspaceSocketInitialized()).toBe(true);
      expect(mockIo.of).toHaveBeenCalledWith("/workspace");
    });
  });

  describe("Clerk identity resolution", () => {
    it("allows a valid Clerk-authenticated user to connect", async () => {
      const socket = createSocket();
      const next = vi.fn();

      verifyClerkSessionToken.mockResolvedValue({ sub: "clerk_user_a" });
      findUserByClerkId.mockResolvedValue({
        _id: USER_A_ID,
        name: "Alice",
        email: "alice@example.com",
        role: "member",
        organization: ORG_A,
      });

      await authenticateSocket(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe(USER_A_ID.toString());
      expect(socket.user.email).toBe("alice@example.com");
    });

    it("rejects an invalid Clerk token", async () => {
      const socket = createSocket();
      const next = vi.fn();

      verifyClerkSessionToken.mockRejectedValue(new Error("bad token"));

      await authenticateSocket(socket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication error: Invalid Clerk token",
        }),
      );
      expect(socket.userId).toBeUndefined();
    });

    it("rejects a missing Clerk token", async () => {
      const socket = createSocket({
        handshake: { headers: {}, auth: { meetingId: MEETING_ID.toString() } },
      });
      const next = vi.fn();

      await authenticateSocket(socket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authentication error: No token provided",
        }),
      );
    });
  });

  describe("Workspace authorization", () => {
    it("joins when the authenticated user is a participant", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: mockUserDoc(),
      });
      mockMeetingFind(
        mockMeetingDoc({
          participants: [
            { user: USER_A_ID, email: "alice@example.com" },
            { user: USER_B_ID, email: "owner@example.com" },
          ],
        }),
      );
      mockUserFind(mockUserDoc({ organization: ORG_B })); // participant outside org still allowed
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.meetingId).toBe(MEETING_ID.toString());
      expect(socket.userId).toBe(USER_A_ID.toString());

      connectionCallback(socket);
      expect(socket.join).toHaveBeenCalledWith(
        `meeting-war-room-${MEETING_ID}`,
      );
    });

    it("allows the meeting owner to connect", async () => {
      const socket = createSocket({
        userId: USER_B_ID.toString(),
        user: mockUserDoc({
          _id: USER_B_ID,
          name: "Owner",
          email: "owner@example.com",
          organization: ORG_B,
        }),
      });
      mockMeetingFind(
        mockMeetingDoc({ uploadedBy: USER_B_ID, participants: [] }),
      );
      mockUserFind(
        mockUserDoc({
          _id: USER_B_ID,
          name: "Owner",
          email: "owner@example.com",
          organization: ORG_B,
        }),
      );
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe(USER_B_ID.toString());
    });

    it("allows same-organization members even when not listed as participants", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: mockUserDoc({ organization: ORG_A }),
      });
      mockMeetingFind(
        mockMeetingDoc({
          organization: ORG_A,
          uploadedBy: USER_B_ID,
          participants: [],
        }),
      );
      mockUserFind(mockUserDoc({ organization: ORG_A }));
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("denies cross-organization access for non-participants", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: mockUserDoc({ organization: ORG_B }),
      });
      mockMeetingFind(
        mockMeetingDoc({
          organization: ORG_A,
          uploadedBy: USER_B_ID,
          participants: [{ user: USER_B_ID, email: "owner@example.com" }],
        }),
      );
      mockUserFind(mockUserDoc({ organization: ORG_B }));
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/Unauthorized|Forbidden/i),
        }),
      );
    });

    it("denies unauthorized workspace access", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: mockUserDoc({ organization: ORG_B }),
      });
      mockMeetingFind(
        mockMeetingDoc({
          organization: ORG_A,
          uploadedBy: USER_B_ID,
          participants: [{ user: USER_B_ID, email: "owner@example.com" }],
        }),
      );
      mockUserFind(mockUserDoc({ organization: ORG_B }));
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });

  describe("Client identity spoofing defenses", () => {
    it("ignores spoofed handshake.auth.userId and keeps Clerk identity", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: mockUserDoc(),
        handshake: {
          headers: { authorization: "Bearer valid_clerk_token" },
          auth: {
            meetingId: MEETING_ID.toString(),
            userId: USER_B_ID.toString(),
            email: "owner@example.com",
          },
          query: {},
        },
      });
      mockMeetingFind(
        mockMeetingDoc({
          participants: [{ user: USER_A_ID, email: "alice@example.com" }],
        }),
      );
      mockUserFind(mockUserDoc());
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe(USER_A_ID.toString());
      expect(socket.userId).not.toBe(USER_B_ID.toString());
      expect(socket.userName).toBe("Alice");
    });

    it("prevents User A from impersonating User B via auth.userId", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: mockUserDoc({ organization: ORG_B }),
        handshake: {
          headers: { authorization: "Bearer valid_clerk_token" },
          auth: {
            meetingId: MEETING_ID.toString(),
            userId: USER_B_ID.toString(),
          },
          query: { userId: USER_B_ID.toString() },
        },
      });
      mockMeetingFind(
        mockMeetingDoc({
          uploadedBy: USER_B_ID,
          participants: [{ user: USER_B_ID, email: "owner@example.com" }],
        }),
      );
      mockUserFind(mockUserDoc({ organization: ORG_B }));
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(socket.userId).toBe(USER_A_ID.toString());
    });

    it("authorization uses authenticated MongoDB user only (not query.userId)", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: mockUserDoc(),
        handshake: {
          headers: {},
          auth: { meetingId: MEETING_ID.toString() },
          query: { userId: USER_B_ID.toString() },
        },
      });
      mockMeetingFind(
        mockMeetingDoc({
          participants: [{ user: USER_A_ID, email: "alice@example.com" }],
        }),
      );
      mockUserFind(mockUserDoc());
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe(USER_A_ID.toString());
      expect(User.findById).toHaveBeenCalledWith(USER_A_ID.toString());
    });
  });

  describe("Runtime event authorization & reconnect semantics", () => {
    it("broadcasts collaboration events with authenticated socket.userId", async () => {
      const roomEmit = vi.fn();
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        meetingId: MEETING_ID.toString(),
        userName: "Alice",
        userColor: "#111111",
        user: mockUserDoc(),
        to: vi.fn().mockReturnValue({ emit: roomEmit }),
      });

      mockMeetingFind(
        mockMeetingDoc({
          participants: [{ user: USER_A_ID, email: "alice@example.com" }],
        }),
      );
      mockUserFind(mockUserDoc());

      connectionCallback(socket);

      const voteHandler = socket.on.mock.calls.find(
        (c) => c[0] === "workspace:vote-topic",
      )?.[1];
      expect(voteHandler).toBeTypeOf("function");

      await voteHandler({ topicId: "t1", voteType: "up" });

      expect(roomEmit).toHaveBeenCalledWith(
        "workspace:vote-topic",
        expect.objectContaining({
          userId: USER_A_ID.toString(),
          topicId: "t1",
          voteType: "up",
        }),
      );
    });

    it("ignores spoofed payload.userId on workspace events", async () => {
      const roomEmit = vi.fn();
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        meetingId: MEETING_ID.toString(),
        userName: "Alice",
        user: mockUserDoc(),
        to: vi.fn().mockReturnValue({ emit: roomEmit }),
      });

      mockMeetingFind(
        mockMeetingDoc({
          organization: ORG_A,
          participants: [],
        }),
      );
      mockUserFind(mockUserDoc({ organization: ORG_A }));

      connectionCallback(socket);

      const drawHandler = socket.on.mock.calls.find(
        (c) => c[0] === "workspace:canvas-draw",
      )?.[1];

      await drawHandler({
        type: "path",
        payload: { d: "M0" },
        userId: USER_B_ID.toString(),
      });

      expect(roomEmit).toHaveBeenCalledWith(
        "workspace:canvas-draw",
        expect.objectContaining({
          userId: USER_A_ID.toString(),
        }),
      );
      expect(roomEmit.mock.calls[0][1].userId).not.toBe(USER_B_ID.toString());
    });

    it("blocks unauthorized events after access is revoked mid-session", async () => {
      const roomEmit = vi.fn();
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        meetingId: MEETING_ID.toString(),
        userName: "Alice",
        user: mockUserDoc({ organization: ORG_A }),
        to: vi.fn().mockReturnValue({ emit: roomEmit }),
        emit: vi.fn(),
      });

      connectionCallback(socket);

      // Access revoked: different org, not participant/owner
      mockMeetingFind(
        mockMeetingDoc({
          organization: ORG_A,
          uploadedBy: USER_B_ID,
          participants: [],
        }),
      );
      mockUserFind(mockUserDoc({ organization: ORG_B }));

      const voteHandler = socket.on.mock.calls.find(
        (c) => c[0] === "workspace:vote-topic",
      )?.[1];

      await voteHandler({ topicId: "t1", voteType: "up" });

      expect(roomEmit).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith(
        "workspace:error",
        expect.objectContaining({ message: expect.any(String) }),
      );
    });

    it("ensureWorkspaceEventAccess revalidates on every call (reconnect-safe)", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        meetingId: MEETING_ID.toString(),
        user: mockUserDoc({ organization: ORG_A }),
      });

      mockMeetingFind(
        mockMeetingDoc({
          organization: ORG_A,
          participants: [],
        }),
      );
      mockUserFind(mockUserDoc({ organization: ORG_A }));

      const first = await ensureWorkspaceEventAccess(socket);
      expect(first.ok).toBe(true);

      mockUserFind(mockUserDoc({ organization: ORG_B }));
      const second = await ensureWorkspaceEventAccess(socket);
      expect(second.ok).toBe(false);
    });

    it("disconnect handler notifies the room with authenticated identity", () => {
      const roomEmit = vi.fn();
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        meetingId: MEETING_ID.toString(),
        userName: "Alice",
        user: mockUserDoc(),
        to: vi.fn().mockReturnValue({ emit: roomEmit }),
      });

      connectionCallback(socket);

      const disconnectHandler = socket.on.mock.calls.find(
        (c) => c[0] === "disconnect",
      )?.[1];
      disconnectHandler();

      expect(roomEmit).toHaveBeenCalledWith(
        "workspace:user-left",
        expect.objectContaining({
          userId: USER_A_ID.toString(),
          userName: "Alice",
        }),
      );
    });
  });
});
