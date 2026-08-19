import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../models/reactionModel.js", () => ({
  default: { create: vi.fn() },
}));

vi.mock("../models/meetingModel.js", () => ({
  default: { findById: vi.fn() },
}));

vi.mock("../models/userModel.js", () => ({
  default: { findById: vi.fn() },
}));

import reactionSocket from "../socket/reactionSocket.js";
import Reaction from "../models/reactionModel.js";
import Meeting from "../models/meetingModel.js";
import User from "../models/userModel.js";

const ORG_A = "507f1f77bcf86cd799439011";
const ORG_B = "507f1f77bcf86cd799439012";
const MEETING_ID = "507f1f77bcf86cd799439031";
const OTHER_USER_ID = "507f1f77bcf86cd799439022";
const SPOOFED_USER_ID = "507f1f77bcf86cd799439099";

/**
 * The rate-limit budget lives in module scope and is deliberately no longer
 * cleared on disconnect, so it outlives a single socket. Giving each test its
 * own user id isolates that state without adding a test-only reset hook to the
 * production module — and it is the same property the limiter relies on.
 */
let userCounter = 0;
const nextUserId = () =>
  `507f1f77bcf86cd7994400${(userCounter++).toString().padStart(2, "0")}`;

describe("reaction:send meeting authorization (#1564 / #1385)", () => {
  let connectionCallback;
  let mockIo;
  let roomEmit;
  let USER_ID;

  /** Makes Meeting.findById resolve to a meeting owned by `org`/`uploader`. */
  const meetingOwnedBy = (org, uploadedBy = OTHER_USER_ID, participants = []) =>
    Meeting.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: MEETING_ID,
        organization: org,
        uploadedBy,
        participants,
      }),
    });

  /** Fresh MongoDB user used by resolveMeetingSocketAccess on every send. */
  const userInDb = (overrides = {}) =>
    User.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: USER_ID,
        organization: ORG_A,
        email: "react@example.com",
        name: "Reactor",
        role: "member",
        ...overrides,
      }),
    });

  const createSocket = (overrides = {}) => {
    const handlers = {};
    const socket = {
      id: "socket_123",
      userId: USER_ID,
      userRole: "member",
      userOrganization: ORG_A,
      emit: vi.fn(),
      on: vi.fn((event, cb) => {
        handlers[event] = cb;
      }),
      to: vi.fn(() => ({ emit: roomEmit })),
      ...overrides,
    };
    connectionCallback(socket);
    // The handler registered by the module under test.
    socket.send = (payload) => handlers["reaction:send"](payload);
    return socket;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    USER_ID = nextUserId();
    roomEmit = vi.fn();
    Reaction.create.mockResolvedValue({ _id: "reaction_1" });
    meetingOwnedBy(ORG_A);
    userInDb();

    mockIo = {
      on: vi.fn((event, cb) => {
        if (event === "connection") connectionCallback = cb;
      }),
    };
    reactionSocket(mockIo);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("authorized reactions (#1385)", () => {
    it("persists and broadcasts when same-org member reacts", async () => {
      const socket = createSocket();

      await socket.send({
        roomId: MEETING_ID,
        emoji: "👍",
        transcriptSegmentIndex: 3,
      });

      expect(User.findById).toHaveBeenCalledWith(USER_ID);
      expect(Reaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          meeting: MEETING_ID,
          user: USER_ID,
          emoji: "👍",
          transcriptSegmentIndex: 3,
        }),
      );
      expect(socket.to).toHaveBeenCalledWith(MEETING_ID);
      expect(roomEmit).toHaveBeenCalledWith(
        "reaction:new",
        expect.objectContaining({
          userId: USER_ID,
          emoji: "👍",
          transcriptSegmentIndex: 3,
        }),
      );
      expect(socket.emit).not.toHaveBeenCalledWith(
        "reaction:error",
        expect.anything(),
      );
    });

    it("allows the meeting owner even from a different organization", async () => {
      meetingOwnedBy(ORG_B, USER_ID);
      userInDb({ organization: ORG_A });
      const socket = createSocket({ userOrganization: ORG_A });

      await socket.send({ roomId: MEETING_ID, emoji: "🎉" });

      expect(Reaction.create).toHaveBeenCalled();
      expect(roomEmit).toHaveBeenCalled();
    });

    it("allows a listed participant outside the meeting organization", async () => {
      meetingOwnedBy(ORG_B, OTHER_USER_ID, [{ user: USER_ID }]);
      userInDb({ organization: ORG_A });
      const socket = createSocket();

      await socket.send({ roomId: MEETING_ID, emoji: "👏" });

      expect(Reaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          meeting: MEETING_ID,
          user: USER_ID,
          emoji: "👏",
        }),
      );
      expect(roomEmit).toHaveBeenCalled();
    });

    it("allows a participant matched by email", async () => {
      meetingOwnedBy(ORG_B, OTHER_USER_ID, [{ email: "react@example.com" }]);
      userInDb({ organization: ORG_A, email: "react@example.com" });
      const socket = createSocket();

      await socket.send({ roomId: MEETING_ID, emoji: "❤️" });

      expect(Reaction.create).toHaveBeenCalled();
      expect(roomEmit).toHaveBeenCalled();
    });
  });

  describe("unauthorized reactions are rejected (#1385)", () => {
    it("neither broadcasts nor writes for another organization's meeting", async () => {
      meetingOwnedBy(ORG_B);
      const socket = createSocket();

      await socket.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(Reaction.create).not.toHaveBeenCalled();
      expect(roomEmit).not.toHaveBeenCalled();
      expect(socket.to).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("reaction:error", {
        message: "Forbidden: You don't have access to this meeting",
      });
    });

    it("rejects a non-participant with no org overlap", async () => {
      meetingOwnedBy(ORG_B, OTHER_USER_ID, [{ user: OTHER_USER_ID }]);
      userInDb({ organization: ORG_A });
      const socket = createSocket();

      await socket.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(Reaction.create).not.toHaveBeenCalled();
      expect(roomEmit).not.toHaveBeenCalled();
    });

    it("rejects when the meeting does not exist", async () => {
      Meeting.findById.mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });
      const socket = createSocket();

      await socket.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(Reaction.create).not.toHaveBeenCalled();
      expect(roomEmit).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("reaction:error", {
        message: "Meeting not found",
      });
    });

    it("rejects a caller with no organization and no participant listing", async () => {
      userInDb({ organization: undefined });
      const socket = createSocket({ userOrganization: undefined });

      await socket.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(Reaction.create).not.toHaveBeenCalled();
      expect(roomEmit).not.toHaveBeenCalled();
    });

    it("rejects a caller whose role cannot view meetings", async () => {
      userInDb({ role: undefined });
      const socket = createSocket({ userRole: undefined });

      await socket.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(Reaction.create).not.toHaveBeenCalled();
      expect(roomEmit).not.toHaveBeenCalled();
    });

    it("ignores an unauthenticated socket without querying anything", async () => {
      const socket = createSocket({ userId: undefined });

      await socket.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(User.findById).not.toHaveBeenCalled();
      expect(Meeting.findById).not.toHaveBeenCalled();
      expect(Reaction.create).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("reaction:error", {
        message: "Unauthorized: Authentication required",
      });
    });

    it("revalidates membership on every event after org removal", async () => {
      const socket = createSocket({ userOrganization: ORG_A });

      await socket.send({ roomId: MEETING_ID, emoji: "👍" });
      expect(Reaction.create).toHaveBeenCalledTimes(1);

      // Stale socket.userOrganization still says ORG_A, but DB says removed.
      userInDb({ organization: ORG_B });
      await socket.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(Reaction.create).toHaveBeenCalledTimes(1);
      expect(roomEmit).toHaveBeenCalledTimes(1);
      expect(socket.emit).toHaveBeenCalledWith("reaction:error", {
        message: "Forbidden: You don't have access to this meeting",
      });
    });
  });

  describe("identity spoofing is ignored (#1385)", () => {
    it("ignores payload.userId and persists as the authenticated user", async () => {
      const socket = createSocket();

      await socket.send({
        roomId: MEETING_ID,
        emoji: "👍",
        userId: SPOOFED_USER_ID,
      });

      expect(Reaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: USER_ID,
          meeting: MEETING_ID,
        }),
      );
      expect(Reaction.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ user: SPOOFED_USER_ID }),
      );
      expect(roomEmit).toHaveBeenCalledWith(
        "reaction:new",
        expect.objectContaining({ userId: USER_ID }),
      );
    });

    it("does not trust handshake.auth.userId over socket.userId", async () => {
      const socket = createSocket({
        handshake: { auth: { userId: SPOOFED_USER_ID } },
      });

      await socket.send({ roomId: MEETING_ID, emoji: "😂" });

      expect(User.findById).toHaveBeenCalledWith(USER_ID);
      expect(Reaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ user: USER_ID }),
      );
    });
  });

  describe("payload validation", () => {
    it("rejects a roomId that is not an ObjectId, with no broadcast", async () => {
      const socket = createSocket();

      await socket.send({ roomId: "not-an-id", emoji: "👍" });

      expect(roomEmit).not.toHaveBeenCalled();
      expect(Reaction.create).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith(
        "reaction:error",
        expect.anything(),
      );
    });

    it("rejects an emoji outside the allow list with an error", async () => {
      const socket = createSocket();

      await socket.send({ roomId: MEETING_ID, emoji: "💀" });

      expect(User.findById).not.toHaveBeenCalled();
      expect(Meeting.findById).not.toHaveBeenCalled();
      expect(Reaction.create).not.toHaveBeenCalled();
      expect(roomEmit).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("reaction:error", {
        message: "Invalid reaction emoji",
      });
    });

    it("rejects a missing payload with an error", async () => {
      const socket = createSocket();

      await socket.send(undefined);

      expect(Reaction.create).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("reaction:error", {
        message: "Invalid reaction payload",
      });
    });

    it("rejects an invalid transcriptSegmentIndex", async () => {
      const socket = createSocket();

      await socket.send({
        roomId: MEETING_ID,
        emoji: "👍",
        transcriptSegmentIndex: -1,
      });

      expect(Reaction.create).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("reaction:error", {
        message: "Invalid transcriptSegmentIndex",
      });
    });

    it("does not broadcast when the write fails", async () => {
      Reaction.create.mockRejectedValue(new Error("write failed"));
      const socket = createSocket();

      await socket.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(roomEmit).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("reaction:error", {
        message: "Failed to record reaction.",
      });
    });
  });

  describe("rate limiting is keyed on the user, not the socket", () => {
    it("blocks the sixth reaction inside the window", async () => {
      const socket = createSocket();

      for (let i = 0; i < 5; i++) {
        await socket.send({ roomId: MEETING_ID, emoji: "👍" });
      }
      expect(Reaction.create).toHaveBeenCalledTimes(5);

      await socket.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(Reaction.create).toHaveBeenCalledTimes(5);
      expect(socket.emit).toHaveBeenCalledWith("reaction:error", {
        message: "Rate limit exceeded. Try again later.",
      });
    });

    it("survives a reconnect — a new socket does not reset the budget", async () => {
      const first = createSocket();
      for (let i = 0; i < 5; i++) {
        await first.send({ roomId: MEETING_ID, emoji: "👍" });
      }
      expect(Reaction.create).toHaveBeenCalledTimes(5);

      const reconnected = createSocket({ id: "socket_456" });
      await reconnected.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(Reaction.create).toHaveBeenCalledTimes(5);
      expect(reconnected.emit).toHaveBeenCalledWith("reaction:error", {
        message: "Rate limit exceeded. Try again later.",
      });
    });

    it("does not limit a different user", async () => {
      const first = createSocket();
      for (let i = 0; i < 5; i++) {
        await first.send({ roomId: MEETING_ID, emoji: "👍" });
      }

      userInDb({ _id: OTHER_USER_ID, organization: ORG_A });
      const other = createSocket({ id: "socket_789", userId: OTHER_USER_ID });
      await other.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(Reaction.create).toHaveBeenCalledTimes(6);
    });

    it("refills once the window has elapsed", async () => {
      vi.useFakeTimers();
      const socket = createSocket();

      for (let i = 0; i < 5; i++) {
        await socket.send({ roomId: MEETING_ID, emoji: "👍" });
      }
      expect(Reaction.create).toHaveBeenCalledTimes(5);

      vi.advanceTimersByTime(10001);
      await socket.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(Reaction.create).toHaveBeenCalledTimes(6);
    });

    it("only counts reactions that were actually authorized", async () => {
      meetingOwnedBy(ORG_B);
      const socket = createSocket();

      for (let i = 0; i < 6; i++) {
        await socket.send({ roomId: MEETING_ID, emoji: "👍" });
      }

      // All six were rejected on authorization, so none consumed budget.
      meetingOwnedBy(ORG_A);
      await socket.send({ roomId: MEETING_ID, emoji: "👍" });

      expect(Reaction.create).toHaveBeenCalledTimes(1);
    });
  });
});
