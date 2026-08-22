// @vitest-environment jsdom
import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCollaborativeNote } from "../useCollaborativeNote.js";
import { io } from "socket.io-client";
import { toast } from "react-toastify";

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    userId: "user-123",
    getToken: vi.fn().mockResolvedValue("test-clerk-token"),
    isSignedIn: true,
  }),
}));

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("socket.io-client", () => {
  const listeners = {};
  const mockSocket = {
    on: vi.fn((event, callback) => {
      listeners[event] = callback;
    }),
    emit: vi.fn((event, data, cb) => {
      if (event === "join-meeting" && cb) {
        cb({ success: true, userColor: "#ff0000", activeUsers: [] });
      }
    }),
    disconnect: vi.fn(),
    __trigger: (event, payload) => {
      if (listeners[event]) listeners[event](payload);
    },
  };
  return {
    io: vi.fn(() => mockSocket),
  };
});

describe("useCollaborativeNote socket URL & backend config alignment (#2002)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("connects to ${getBackendUrl()}/notes using shared Clerk socket options", async () => {
    renderHook(() => useCollaborativeNote("meeting-123"));

    await waitFor(() => {
      expect(io).toHaveBeenCalledWith(
        expect.stringMatching(/^http:\/\/.*\/notes$/),
        expect.objectContaining({
          transports: expect.arrayContaining(["websocket"]),
        }),
      );
    });
  });

  it("handles connect_error, updates error state, and triggers toast error", async () => {
    const { result } = renderHook(() => useCollaborativeNote("meeting-123"));

    await waitFor(() => {
      expect(io).toHaveBeenCalled();
    });

    const mockSocket = io.mock.results[0].value;
    act(() => {
      mockSocket.__trigger("connect_error", new Error("Authentication failed"));
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Authentication failed");
      expect(result.current.isConnected).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Authentication failed"),
      );
    });
  });
});
