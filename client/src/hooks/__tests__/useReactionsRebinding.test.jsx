import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useReactions from "../useReactions.js";

const createMockSocket = () => {
  const listeners = {};
  return {
    on: vi.fn((event, cb) => {
      listeners[event] = cb;
    }),
    off: vi.fn((event, cb) => {
      if (listeners[event] === cb) {
        delete listeners[event];
      }
    }),
    emit: vi.fn(),
    // Helper to fire events locally for testing
    fireEvent: (event, payload) => {
      if (listeners[event]) {
        listeners[event](payload);
      }
    },
  };
};

describe("useReactions Hook Rebinding & Authentication Lifecycle", () => {
  it("should register event listeners on connection", () => {
    const socket = createMockSocket();
    renderHook(() => useReactions("room_123", socket));

    expect(socket.on).toHaveBeenCalledWith(
      "reaction:new",
      expect.any(Function),
    );
    expect(socket.on).toHaveBeenCalledWith(
      "reaction:error",
      expect.any(Function),
    );
  });

  it("should deregister old listeners and register on new socket during rebinding", () => {
    const socket1 = createMockSocket();
    const socket2 = createMockSocket();

    const { rerender } = renderHook(
      ({ socket }) => useReactions("room_123", socket),
      { initialProps: { socket: socket1 } },
    );

    expect(socket1.on).toHaveBeenCalledTimes(2);

    // Rerender with a new socket instance (simulating token refresh/rebind)
    rerender({ socket: socket2 });

    // Expect old listeners to be removed
    expect(socket1.off).toHaveBeenCalledWith(
      "reaction:new",
      expect.any(Function),
    );
    expect(socket1.off).toHaveBeenCalledWith(
      "reaction:error",
      expect.any(Function),
    );

    // Expect new listeners to be added
    expect(socket2.on).toHaveBeenCalledWith(
      "reaction:new",
      expect.any(Function),
    );
    expect(socket2.on).toHaveBeenCalledWith(
      "reaction:error",
      expect.any(Function),
    );
  });

  it("should emit reaction:send on socket", () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useReactions("room_123", socket));

    act(() => {
      result.current.sendReaction("👍");
    });

    expect(socket.emit).toHaveBeenCalledWith("reaction:send", {
      roomId: "room_123",
      emoji: "👍",
    });
  });

  it("should update reactions state when reaction:new event is received", () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useReactions("room_123", socket));

    act(() => {
      socket.fireEvent("reaction:new", {
        emoji: "🎉",
        userId: "user_456",
      });
    });

    expect(result.current.reactions).toHaveLength(1);
    expect(result.current.reactions[0]).toEqual(
      expect.objectContaining({
        emoji: "🎉",
        userId: "user_456",
      }),
    );
  });

  it("should clear socket bindings cleanly when socket becomes null on logout", () => {
    const socket = createMockSocket();
    const { rerender } = renderHook(
      ({ socket }) => useReactions("room_123", socket),
      { initialProps: { socket } },
    );

    expect(socket.on).toHaveBeenCalledTimes(2);

    // Logout sets socket to null
    rerender({ socket: null });

    expect(socket.off).toHaveBeenCalledWith(
      "reaction:new",
      expect.any(Function),
    );
    expect(socket.off).toHaveBeenCalledWith(
      "reaction:error",
      expect.any(Function),
    );
  });
});
