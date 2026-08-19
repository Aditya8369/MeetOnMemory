import { describe, it, expect, vi, beforeEach } from "vitest";
import transcriptSocketHandler from "../transcriptSocket.js";

describe("Transcript Socket Room Membership Security (#1676)", () => {
  let ioMock;
  let socketMock;
  let eventHandlers;

  beforeEach(() => {
    eventHandlers = {};
    socketMock = {
      id: "socket_123",
      userId: "user_123",
      userRole: "member",
      userOrganization: "org_123",
      rooms: new Set(["socket_123"]),
      on: vi.fn((event, handler) => {
        eventHandlers[event] = handler;
      }),
      emit: vi.fn(),
      to: vi.fn().mockReturnThis(),
      join: vi.fn((room) => socketMock.rooms.add(room)),
      leave: vi.fn((room) => socketMock.rooms.delete(room)),
    };

    ioMock = {
      on: vi.fn((event, handler) => {
        if (event === "connection") {
          handler(socketMock);
        }
      }),
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };

    transcriptSocketHandler(ioMock);
  });

  it("rejects transcript-segment if socket has not joined the meeting transcript room", () => {
    eventHandlers["transcript-segment"]({
      meetingId: "meeting_target",
      segment: { text: "unauthorized injection" },
    });

    expect(socketMock.emit).toHaveBeenCalledWith("transcript-error", {
      message: "Forbidden: You have not joined this transcript room",
    });
    expect(socketMock.to).not.toHaveBeenCalled();
  });

  it("allows transcript-segment if socket has joined the meeting transcript room", () => {
    const roomId = "meeting:meeting_target:transcript";
    socketMock.rooms.add(roomId);

    eventHandlers["transcript-segment"]({
      meetingId: "meeting_target",
      segment: { text: "authorized segment" },
    });

    expect(socketMock.to).toHaveBeenCalledWith(roomId);
    expect(socketMock.emit).not.toHaveBeenCalledWith(
      "transcript-error",
      expect.anything(),
    );
  });

  it("rejects transcript-final if socket has not joined the meeting transcript room", () => {
    eventHandlers["transcript-final"]({
      meetingId: "meeting_target",
      transcript: { fullText: "forged final transcript" },
    });

    expect(socketMock.emit).toHaveBeenCalledWith("transcript-error", {
      message: "Forbidden: You have not joined this transcript room",
    });
    expect(ioMock.to).not.toHaveBeenCalled();
  });

  it("allows transcript-final if socket has joined the meeting transcript room", () => {
    const roomId = "meeting:meeting_target:transcript";
    socketMock.rooms.add(roomId);

    eventHandlers["transcript-final"]({
      meetingId: "meeting_target",
      transcript: { fullText: "valid final transcript" },
    });

    expect(ioMock.to).toHaveBeenCalledWith(roomId);
  });
});
