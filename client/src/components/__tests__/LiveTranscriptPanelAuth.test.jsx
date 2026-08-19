import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LiveTranscriptPanel from "../LiveTranscriptPanel.jsx";

// Mock Clerk auth state
let mockIsSignedIn = true;
let mockIsLoaded = true;

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    isSignedIn: mockIsSignedIn,
    isLoaded: mockIsLoaded,
  }),
}));

// Mock socket.io-client
const { mockSocketInstances, mockIo } = vi.hoisted(() => {
  const instances = [];
  const ioMock = vi.fn((url, options) => {
    const listeners = {};
    const socket = {
      id: `socket_${instances.length + 1}`,
      auth: options?.auth || {},
      on: vi.fn((event, cb) => {
        listeners[event] = cb;
      }),
      emit: vi.fn(),
      disconnect: vi.fn(),
      // Helper to fire events locally in tests
      fireEvent: (event, data) => {
        if (listeners[event]) {
          listeners[event](data);
        }
      },
    };
    instances.push(socket);
    return socket;
  });
  return { mockSocketInstances: instances, mockIo: ioMock };
});

vi.mock("socket.io-client", () => ({
  io: mockIo,
}));

let mockToken = "initial_clerk_token";

vi.mock("../../services/apiClient.js", () => ({
  createClerkSocketOptions: vi.fn(async (extra) => ({
    auth: { token: mockToken },
    ...extra,
  })),
  getClerkBearerToken: vi.fn(async () => mockToken),
}));

vi.mock("../../config/backendConfig.js", () => ({
  getBackendUrl: vi.fn(() => "http://localhost:5000"),
}));

describe("LiveTranscriptPanel Clerk Auth and Reconnection Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocketInstances.length = 0;
    mockIsSignedIn = true;
    mockIsLoaded = true;
    mockToken = "initial_clerk_token";
  });

  it("should not establish socket connection if Clerk is not loaded", async () => {
    mockIsLoaded = false;
    mockIsSignedIn = false;

    render(<LiveTranscriptPanel meetingId="meeting-123" />);

    // Wait a brief tick
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(mockIo).not.toHaveBeenCalled();
    expect(
      screen.getByText(/connecting to transcript service/i),
    ).toBeInTheDocument();
  });

  it("should not establish socket connection if user is not signed in", async () => {
    mockIsLoaded = true;
    mockIsSignedIn = false;

    render(<LiveTranscriptPanel meetingId="meeting-123" />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(mockIo).not.toHaveBeenCalled();
  });

  it("should connect socket with token when Clerk is ready and signed in", async () => {
    render(<LiveTranscriptPanel meetingId="meeting-123" />);

    // Wait for the async connection logic inside useEffect
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(mockIo).toHaveBeenCalledTimes(1);
    expect(mockIo).toHaveBeenCalledWith(
      "http://localhost:5000",
      expect.objectContaining({
        auth: { token: "initial_clerk_token" },
      }),
    );

    const socket = mockSocketInstances[0];
    expect(socket.on).toHaveBeenCalledWith("connect", expect.any(Function));
  });

  it("should disconnect socket cleanly when session is signed out", async () => {
    const { rerender } = render(
      <LiveTranscriptPanel meetingId="meeting-123" />,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(mockSocketInstances).toHaveLength(1);
    const socket = mockSocketInstances[0];

    // Simulate signout
    mockIsSignedIn = false;

    await act(async () => {
      rerender(<LiveTranscriptPanel meetingId="meeting-123" />);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it("should fetch a fresh token dynamically during socket reconnect_attempt event", async () => {
    render(<LiveTranscriptPanel meetingId="meeting-123" />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(mockSocketInstances).toHaveLength(1);
    const socket = mockSocketInstances[0];

    // Change the mock token to simulate token rotation
    mockToken = "refreshed_clerk_token";

    // Simulate the socket firing reconnect_attempt
    await act(async () => {
      await socket.fireEvent("reconnect_attempt");
    });

    expect(socket.auth.token).toBe("refreshed_clerk_token");
  });
});
