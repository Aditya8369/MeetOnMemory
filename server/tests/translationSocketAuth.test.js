import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { authenticateSocket } from "../middleware/socketAuth.js";
import translationSocket from "../socket/translationSocket.js";
import Meeting from "../models/meetingModel.js";
import RealtimeTranslationCache from "../models/TranslationCache.js";
import * as rtcService from "../services/realtimeTranslationService.js";
import { verifyClerkSessionToken } from "../utils/authUtils.js";
import { findUserByClerkId } from "../services/authLinkingService.js";

vi.mock("../models/meetingModel.js", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("../models/TranslationCache.js", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock("../services/realtimeTranslationService.js", () => ({
  translateSegment: vi.fn(),
  submitCorrection: vi.fn(),
  getQualityMetrics: vi.fn(),
}));

vi.mock("../utils/authUtils.js", () => ({
  verifyClerkSessionToken: vi.fn(),
}));

vi.mock("../services/authLinkingService.js", () => ({
  findUserByClerkId: vi.fn(),
  provisionOrLinkClerkUser: vi.fn(),
}));

describe("Translation Socket Wiring and Integration Authentication Flow", () => {
  let connectionCallback;
  let mockIo;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIo = {
      on: vi.fn((event, cb) => {
        if (event === "connection") {
          connectionCallback = cb;
        }
      }),
      to: vi.fn().mockReturnValue({ emit: vi.fn() }),
    };
    translationSocket(mockIo);
  });

  const createMockSocket = (overrides = {}) => {
    return {
      id: "socket_123",
      handshake: {
        headers: { authorization: "Bearer valid_clerk_token" },
        auth: {},
      },
      join: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn(),
      ...overrides,
    };
  };

  describe("Central authenticateSocket Middleware", () => {
    it("should successfully authenticate a socket and populate credentials", async () => {
      const socket = createMockSocket();
      const next = vi.fn();

      verifyClerkSessionToken.mockResolvedValue({ sub: "clerk_123" });
      findUserByClerkId.mockResolvedValue({
        _id: new mongoose.Types.ObjectId("669bb3f78e472659c23b5bf5"),
        role: "member",
        organization: new mongoose.Types.ObjectId("669bb3f78e472659c23b5bf6"),
      });

      await authenticateSocket(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe("669bb3f78e472659c23b5bf5");
      expect(socket.userRole).toBe("member");
      expect(socket.userOrganization.toString()).toBe(
        "669bb3f78e472659c23b5bf6",
      );
    });

    it("should reject connection when Clerk token is invalid", async () => {
      const socket = createMockSocket();
      const next = vi.fn();

      verifyClerkSessionToken.mockRejectedValue(new Error("Invalid token"));

      await authenticateSocket(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(socket.userId).toBeUndefined();
    });

    it("should reject connection when no token is provided", async () => {
      const socket = createMockSocket({
        handshake: { headers: {}, auth: {} },
      });
      const next = vi.fn();

      await authenticateSocket(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("Realtime Event Authorization & Boundary Checks", () => {
    let socket;
    const meetingId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
      socket = createMockSocket({
        userId: "user_123",
        userRole: "member",
        userOrganization: "org_123",
      });
      connectionCallback(socket);
    });

    const getHandler = (event) => {
      const call = socket.on.mock.calls.find((c) => c[0] === event);
      return call ? call[1] : null;
    };

    it("should reject connection in translationSocket if socket.userId is missing", () => {
      const unauthSocket = createMockSocket({ userId: null });
      connectionCallback(unauthSocket);
      expect(unauthSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it("should authorize same-organization user to join translation room", async () => {
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: "owner_999",
        organization: "org_123",
      });

      const handler = getHandler("translation:join");
      await handler({ meetingId });

      expect(socket.join).toHaveBeenCalledWith(meetingId);
      expect(socket.emit).toHaveBeenCalledWith("translation:joined", {
        meetingId,
      });
    });

    it("should block cross-organization user from joining translation room", async () => {
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: "owner_999",
        organization: "org_other",
      });

      const handler = getHandler("translation:join");
      await handler({ meetingId });

      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("translation:error", {
        message: "Forbidden: You don't have access to this meeting",
      });
    });

    it("should block translation requests from cross-organization user", async () => {
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: "owner_999",
        organization: "org_other",
      });

      const handler = getHandler("translation:request");
      await handler({
        meetingId,
        segmentId: "seg_1",
        sourceText: "Hello",
        sourceLanguage: "en",
        targetLanguage: "es",
      });

      expect(rtcService.translateSegment).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("translation:error", {
        segmentId: "seg_1",
        error: "Forbidden: You don't have access to this meeting",
      });
    });

    it("should block language changes from cross-organization user", async () => {
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: "owner_999",
        organization: "org_other",
      });

      const handler = getHandler("translation:language-change");
      await handler({ meetingId, language: "es" });

      expect(mockIo.to).not.toHaveBeenCalled();
    });

    it("should broadcast language change using authenticated socket.userId identity", async () => {
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: "owner_999",
        organization: "org_123",
      });

      const handler = getHandler("translation:language-change");
      await handler({ meetingId, language: "es" });

      expect(mockIo.to).toHaveBeenCalledWith(meetingId);
      const mockEmit = mockIo.to(meetingId).emit;
      expect(mockEmit).toHaveBeenCalledWith(
        "translation:language-change",
        expect.objectContaining({
          userId: "user_123",
          language: "es",
        }),
      );
    });

    it("should block manual translation corrections from cross-organization user", async () => {
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: "owner_999",
        organization: "org_other",
      });

      const handler = getHandler("translation:correction");
      await handler({
        meetingId,
        segmentId: "seg_1",
        language: "es",
        correctedText: "Hola",
      });

      expect(socket.emit).toHaveBeenCalledWith("translation:error", {
        segmentId: "seg_1",
        error: "Forbidden: You don't have access to this meeting",
      });
    });

    it("should broadcast manual correction using authenticated socket.userId identity", async () => {
      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: "owner_999",
        organization: "org_123",
      });

      const handler = getHandler("translation:correction");
      await handler({
        meetingId,
        segmentId: "seg_1",
        language: "es",
        correctedText: "Hola",
      });

      expect(mockIo.to).toHaveBeenCalledWith(meetingId);
      const mockEmit = mockIo.to(meetingId).emit;
      expect(mockEmit).toHaveBeenCalledWith(
        "translation:correction",
        expect.objectContaining({
          segmentId: "seg_1",
          language: "es",
          correctedText: "Hola",
          userId: "user_123",
        }),
      );
    });

    it("should block quality update requests if the associated segment belongs to another organization's meeting", async () => {
      RealtimeTranslationCache.findOne.mockResolvedValue({
        meeting: meetingId,
        segmentId: "seg_1",
      });

      Meeting.findById.mockResolvedValue({
        _id: meetingId,
        uploadedBy: "owner_999",
        organization: "org_other",
      });

      const handler = getHandler("translation:quality-request");
      await handler({ segmentId: "seg_1" });

      expect(rtcService.getQualityMetrics).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith("translation:error", {
        segmentId: "seg_1",
        error: "Forbidden: You don't have access to this meeting",
      });
    });
  });
});
