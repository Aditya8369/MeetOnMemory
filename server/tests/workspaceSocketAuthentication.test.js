/**
 * Issue #1386 — Workspace socket must authenticate identity from Clerk only.
 * Client-supplied handshake.auth.userId / query.userId must never authorize access.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { authenticateSocket } from "../middleware/socketAuth.js";
import {
  initWorkspaceSocket,
  authorizeWorkspaceAccess,
} from "../socket/workspaceSocket.js";
import Meeting from "../models/meetingModel.js";
import { verifyClerkSessionToken } from "../utils/authUtils.js";
import { findUserByClerkId } from "../services/authLinkingService.js";

vi.mock("../models/meetingModel.js", () => ({
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
const ORG_ID = new mongoose.Types.ObjectId("669bb3f78e472659c23b5bf6");

describe("Workspace Socket Clerk Authentication (#1386)", () => {
  let middlewares;
  let connectionCallback;
  let mockNsp;

  beforeEach(() => {
    vi.clearAllMocks();
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
    const mockIo = {
      of: vi.fn((path) => {
        expect(path).toBe("/workspace");
        return mockNsp;
      }),
    };
    initWorkspaceSocket(mockIo);
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

  const mockAuthorizedMeetingForUser = (userId, email) => {
    Meeting.findById.mockResolvedValue({
      _id: MEETING_ID,
      uploadedBy: USER_B_ID,
      organization: ORG_ID,
      participants: [
        { user: userId, email },
        { user: USER_B_ID, email: "owner@example.com" },
      ],
    });
  };

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
        organization: ORG_ID,
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

  describe("Namespace middleware wiring", () => {
    it("registers authenticateSocket before workspace authorization", () => {
      expect(middlewares.length).toBeGreaterThanOrEqual(2);
      expect(middlewares[0]).toBe(authenticateSocket);
      expect(middlewares[1]).toBe(authorizeWorkspaceAccess);
    });
  });

  describe("Workspace participant authorization", () => {
    it("joins workspace successfully when the authenticated user is a participant", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: {
          _id: USER_A_ID,
          name: "Alice",
          email: "alice@example.com",
        },
      });
      mockAuthorizedMeetingForUser(USER_A_ID, "alice@example.com");
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.meetingId).toBe(MEETING_ID.toString());
      expect(socket.userId).toBe(USER_A_ID.toString());

      connectionCallback(socket);
      expect(socket.join).toHaveBeenCalledWith(
        `meeting-war-room-${MEETING_ID}`,
      );
      expect(socket.to).toHaveBeenCalledWith(`meeting-war-room-${MEETING_ID}`);
    });

    it("allows the meeting owner to connect", async () => {
      const socket = createSocket({
        userId: USER_B_ID.toString(),
        user: {
          _id: USER_B_ID,
          name: "Owner",
          email: "owner@example.com",
        },
      });
      Meeting.findById.mockResolvedValue({
        _id: MEETING_ID,
        uploadedBy: USER_B_ID,
        participants: [],
      });
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe(USER_B_ID.toString());
    });

    it("denies unauthorized workspace access", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: {
          _id: USER_A_ID,
          name: "Alice",
          email: "alice@example.com",
        },
      });
      Meeting.findById.mockResolvedValue({
        _id: MEETING_ID,
        uploadedBy: USER_B_ID,
        participants: [{ user: USER_B_ID, email: "owner@example.com" }],
      });
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Forbidden: You are not a participant of this meeting",
        }),
      );
      expect(Meeting.findById).toHaveBeenCalled();
    });
  });

  describe("Client identity spoofing defenses", () => {
    it("ignores spoofed handshake.auth.userId and keeps Clerk-authenticated identity", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: {
          _id: USER_A_ID,
          name: "Alice",
          email: "alice@example.com",
        },
        handshake: {
          headers: { authorization: "Bearer valid_clerk_token" },
          auth: {
            meetingId: MEETING_ID.toString(),
            userId: USER_B_ID.toString(), // spoofed
            email: "owner@example.com", // spoofed email must not grant access alone
          },
          query: {},
        },
      });
      // Alice is a participant; Bob is owner. Spoofed Bob id must not replace Alice.
      mockAuthorizedMeetingForUser(USER_A_ID, "alice@example.com");
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe(USER_A_ID.toString());
      expect(socket.userId).not.toBe(USER_B_ID.toString());
    });

    it("prevents User A from impersonating User B via auth.userId", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: {
          _id: USER_A_ID,
          name: "Alice",
          email: "alice@example.com",
        },
        handshake: {
          headers: { authorization: "Bearer valid_clerk_token" },
          auth: {
            meetingId: MEETING_ID.toString(),
            userId: USER_B_ID.toString(),
          },
          query: { userId: USER_B_ID.toString() },
        },
      });
      // Meeting only allows Bob (owner). Spoofed Bob id must not authorize Alice.
      Meeting.findById.mockResolvedValue({
        _id: MEETING_ID,
        uploadedBy: USER_B_ID,
        participants: [{ user: USER_B_ID, email: "owner@example.com" }],
      });
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Forbidden: You are not a participant of this meeting",
        }),
      );
      expect(socket.userId).toBe(USER_A_ID.toString());
    });

    it("authorization uses authenticated MongoDB user only (not query.userId)", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: {
          _id: USER_A_ID,
          name: "Alice",
          email: "alice@example.com",
        },
        handshake: {
          headers: {},
          auth: { meetingId: MEETING_ID.toString() },
          query: { userId: USER_B_ID.toString() },
        },
      });
      mockAuthorizedMeetingForUser(USER_A_ID, "alice@example.com");
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe(USER_A_ID.toString());

      const participantCheckArgs = Meeting.findById.mock.calls[0][0];
      expect(participantCheckArgs).toBe(MEETING_ID.toString());
    });

    it("does not grant access via spoofed handshake.auth.email alone", async () => {
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        user: {
          _id: USER_A_ID,
          name: "Alice",
          email: "alice@example.com",
        },
        handshake: {
          headers: {},
          auth: {
            meetingId: MEETING_ID.toString(),
            email: "owner@example.com",
          },
          query: {},
        },
      });
      Meeting.findById.mockResolvedValue({
        _id: MEETING_ID,
        uploadedBy: USER_B_ID,
        participants: [{ user: USER_B_ID, email: "owner@example.com" }],
      });
      const next = vi.fn();

      await authorizeWorkspaceAccess(socket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Forbidden: You are not a participant of this meeting",
        }),
      );
    });
  });

  describe("Collaboration behavior after auth", () => {
    it("broadcasts collaboration events with authenticated socket.userId", async () => {
      const roomEmit = vi.fn();
      const socket = createSocket({
        userId: USER_A_ID.toString(),
        meetingId: MEETING_ID.toString(),
        userName: "Alice",
        userColor: "#111111",
        user: {
          _id: USER_A_ID,
          name: "Alice",
          email: "alice@example.com",
        },
        to: vi.fn().mockReturnValue({ emit: roomEmit }),
      });

      connectionCallback(socket);

      const voteHandler = socket.on.mock.calls.find(
        (c) => c[0] === "workspace:vote-topic",
      )?.[1];
      expect(voteHandler).toBeTypeOf("function");

      voteHandler({ topicId: "t1", voteType: "up" });

      expect(roomEmit).toHaveBeenCalledWith(
        "workspace:vote-topic",
        expect.objectContaining({
          userId: USER_A_ID.toString(),
          topicId: "t1",
          voteType: "up",
        }),
      );
    });
  });
});
