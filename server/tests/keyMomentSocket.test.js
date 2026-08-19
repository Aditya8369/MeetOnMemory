import { jest } from "@jest/globals";
import Meeting from "../models/meetingModel.js";
import { hasPermission } from "../utils/rbacPermissions.js";
import keyMomentSocket, {
  getKeyMomentsRoom,
} from "../socket/keyMomentSocket.js";

jest.mock("../models/meetingModel.js", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

jest.mock("../utils/rbacPermissions.js", () => ({
  hasPermission: jest.fn(),
}));

const createSocketHarness = (user = {}) => {
  const handlers = new Map();
  const socket = {
    id: "socket-1",
    userId: user.userId || "user-1",
    userRole: user.userRole || "member",
    userOrganization: user.userOrganization || "org-1",
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event, handler) => handlers.set(event, handler)),
  };

  const io = {
    on: jest.fn((event, handler) => {
      if (event === "connection") handler(socket);
    }),
  };

  keyMomentSocket(io);

  return { socket, handlers };
};

describe("Key Moment realtime socket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hasPermission.mockReturnValue(true);
  });

  it("uses a dedicated room for each meeting", () => {
    expect(getKeyMomentsRoom("meeting-123")).toBe(
      "meeting:meeting-123:key-moments",
    );
  });

  it("joins an authorized user's meeting room", async () => {
    Meeting.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        uploadedBy: { toString: () => "owner-1" },
        organization: { toString: () => "org-1" },
      }),
    });

    const { socket, handlers } = createSocketHarness({
      userId: "member-1",
      userRole: "member",
      userOrganization: "org-1",
    });

    await handlers.get("join-key-moments-room")({ meetingId: "meeting-123" });

    expect(socket.join).toHaveBeenCalledWith("meeting:meeting-123:key-moments");
    expect(socket.emit).toHaveBeenCalledWith("keyMoment:room-joined", {
      meetingId: "meeting-123",
    });
  });

  it("rejects users outside the meeting organization", async () => {
    Meeting.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        uploadedBy: { toString: () => "owner-1" },
        organization: { toString: () => "other-org" },
      }),
    });

    const { socket, handlers } = createSocketHarness({
      userId: "member-1",
      userRole: "member",
      userOrganization: "org-1",
    });

    await handlers.get("join-key-moments-room")({ meetingId: "meeting-123" });

    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith("keyMoment:error", {
      message: "Forbidden: You don't have access to this meeting",
    });
  });

  it("rejects users without meeting-view permission", async () => {
    hasPermission.mockReturnValue(false);

    const { socket, handlers } = createSocketHarness();

    await handlers.get("join-key-moments-room")({ meetingId: "meeting-123" });

    expect(Meeting.findById).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith("keyMoment:error", {
      message: "Forbidden: You don't have access to this meeting",
    });
  });

  it("rejoins the room after a client reconnects", async () => {
    Meeting.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        uploadedBy: { toString: () => "owner-1" },
        organization: { toString: () => "org-1" },
      }),
    });

    const { socket, handlers } = createSocketHarness();

    await handlers.get("join-key-moments-room")({ meetingId: "meeting-123" });
    await handlers.get("leave-key-moments-room")({ meetingId: "meeting-123" });

    expect(socket.leave).toHaveBeenCalledWith(
      "meeting:meeting-123:key-moments",
    );
  });
});
