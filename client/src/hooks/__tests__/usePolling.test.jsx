import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { usePolling } from "../usePolling.js";

/**
 * Issue #1455 — five call sites started a poll from an event handler and kept
 * the timer id in a `const` scoped to that handler, so nothing on the unmount
 * path could clear it.
 *
 * The tests below are organised around the two failures that were actually
 * observed in the app:
 *
 *   - a poll that outlives its component (MeetingQuality, MeetingAnalytics,
 *     MeetingActions), and
 *   - a poll whose callback throws every tick with no deadline to stop it,
 *     which is what a popup-blocked `authWindow.closed` did in Settings.
 */

describe("usePolling (#1455)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Advances timers inside `act` so React state updates are flushed. */
  const advance = async (ms) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  };

  describe("the leak: polls must not outlive the component", () => {
    it("stops polling on unmount", async () => {
      const poll = vi.fn(() => false);
      const { result, unmount } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(poll, {
          intervalMs: 1000,
          timeoutMs: 60000,
        });
      });

      await advance(3000);
      expect(poll).toHaveBeenCalledTimes(3);

      unmount();

      // Previously this kept firing for the full deadline, fetching and
      // calling setState on an unmounted component every tick.
      await advance(30000);
      expect(poll).toHaveBeenCalledTimes(3);
    });

    it("clears the deadline timer on unmount too", async () => {
      const onTimeout = vi.fn();
      const { result, unmount } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(() => false, {
          intervalMs: 1000,
          timeoutMs: 5000,
          onTimeout,
        });
      });

      unmount();
      await advance(10000);

      // The old code's `setTimeout(..., 30000)` was untracked and fired after
      // unmount, calling setState from a component that no longer existed.
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it("aborts the in-flight request on unmount", async () => {
      let capturedSignal;
      const { result, unmount } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(
          ({ signal }) => {
            capturedSignal = signal;
            return new Promise(() => {}); // never settles
          },
          { intervalMs: 1000 },
        );
      });

      await advance(1000);
      expect(capturedSignal.aborted).toBe(false);

      unmount();
      expect(capturedSignal.aborted).toBe(true);
    });

    it("does not act on a result that arrives after unmount", async () => {
      const onDone = vi.fn();
      let resolvePoll;
      const { result, unmount } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(
          () =>
            new Promise((resolve) => {
              resolvePoll = resolve;
            }),
          { intervalMs: 1000 },
        );
      });

      await advance(1000);
      unmount();

      await act(async () => {
        resolvePoll(true);
        await Promise.resolve();
      });

      expect(onDone).not.toHaveBeenCalled();
    });
  });

  describe("the infinite error loop: a throwing poll must still terminate", () => {
    it("keeps polling after an error but stops at the deadline", async () => {
      // This is the popup-blocked Settings case: `authWindow.closed` threw a
      // TypeError every tick, and the only clearInterval was inside the branch
      // that had just thrown, so it never stopped.
      const onError = vi.fn();
      const onTimeout = vi.fn();
      const poll = vi.fn(() => {
        throw new TypeError(
          "Cannot read properties of null (reading 'closed')",
        );
      });

      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(poll, {
          intervalMs: 500,
          timeoutMs: 3000,
          onError,
          onTimeout,
        });
      });

      await advance(3000);

      expect(onError).toHaveBeenCalled();
      expect(onTimeout).toHaveBeenCalledTimes(1);

      const callsAtDeadline = poll.mock.calls.length;
      await advance(10000);
      expect(poll).toHaveBeenCalledTimes(callsAtDeadline);
    });

    it("does not report an abort as a polling error", async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(
          async ({ signal }) => {
            await new Promise((resolve, reject) => {
              signal.addEventListener("abort", () =>
                reject(
                  Object.assign(new Error("aborted"), { name: "AbortError" }),
                ),
              );
            });
          },
          { intervalMs: 500 },
        );
      });

      await advance(500);
      act(() => result.current.stopPolling());
      await act(async () => {
        await Promise.resolve();
      });

      // Stopping is the cause of the abort — surfacing it as an error would
      // put a spurious message in front of the user on every cancel.
      expect(onError).not.toHaveBeenCalled();
    });

    it("survives a throwing onError handler", async () => {
      const { result } = renderHook(() => usePolling());
      vi.spyOn(console, "error").mockImplementation(() => {});

      act(() => {
        result.current.startPolling(
          () => {
            throw new Error("poll failed");
          },
          {
            intervalMs: 500,
            timeoutMs: 2000,
            onError: () => {
              throw new Error("handler failed too");
            },
          },
        );
      });

      await expect(advance(2000)).resolves.toBeUndefined();
      expect(result.current.isPolling).toBe(false);
    });
  });

  describe("stopping", () => {
    it("stops when the poll function returns truthy", async () => {
      const poll = vi.fn();
      poll.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(poll, { intervalMs: 1000 });
      });

      await advance(5000);
      expect(poll).toHaveBeenCalledTimes(2);
      expect(result.current.isPolling).toBe(false);
    });

    it("stops when the caller calls stopPolling", async () => {
      const poll = vi.fn(() => false);
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(poll, { intervalMs: 1000 });
      });

      await advance(2000);
      act(() => result.current.stopPolling());
      await advance(10000);

      expect(poll).toHaveBeenCalledTimes(2);
    });

    it("stops via the function returned by startPolling", async () => {
      const poll = vi.fn(() => false);
      const { result } = renderHook(() => usePolling());
      let stop;

      act(() => {
        stop = result.current.startPolling(poll, { intervalMs: 1000 });
      });

      await advance(2000);
      act(() => stop());
      await advance(10000);

      expect(poll).toHaveBeenCalledTimes(2);
    });

    it("does not call onTimeout when the poll finished first", async () => {
      const onTimeout = vi.fn();
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(() => true, {
          intervalMs: 1000,
          timeoutMs: 5000,
          onTimeout,
        });
      });

      await advance(10000);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it("tolerates stopPolling when nothing is running", () => {
      const { result } = renderHook(() => usePolling());

      expect(() => {
        act(() => {
          result.current.stopPolling();
          result.current.stopPolling();
        });
      }).not.toThrow();
    });
  });

  describe("run management", () => {
    it("replaces a previous run instead of stacking a second loop", async () => {
      const first = vi.fn(() => false);
      const second = vi.fn(() => false);
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(first, { intervalMs: 1000 });
      });
      await advance(2000);

      act(() => {
        result.current.startPolling(second, { intervalMs: 1000 });
      });
      await advance(3000);

      // A user double-clicking "Recalculate" must not end up with two loops.
      expect(first).toHaveBeenCalledTimes(2);
      expect(second).toHaveBeenCalledTimes(3);
    });

    it("does not re-enter a tick that has not settled", async () => {
      let settle;
      const poll = vi.fn(
        () =>
          new Promise((resolve) => {
            settle = resolve;
          }),
      );
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(poll, { intervalMs: 100 });
      });

      // Ten intervals elapse while the first request is still outstanding; a
      // slow endpoint should degrade the rate, not stack ten requests.
      await advance(1000);
      expect(poll).toHaveBeenCalledTimes(1);

      await act(async () => {
        settle(false);
        await Promise.resolve();
      });

      await advance(100);
      expect(poll).toHaveBeenCalledTimes(2);
    });

    it("runs one tick straight away when immediate is set", async () => {
      const poll = vi.fn(() => false);
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(poll, {
          intervalMs: 5000,
          immediate: true,
        });
      });

      expect(poll).toHaveBeenCalledTimes(1);
    });

    it("waits for the first interval by default", async () => {
      const poll = vi.fn(() => false);
      const { result } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(poll, { intervalMs: 5000 });
      });

      expect(poll).not.toHaveBeenCalled();
      await advance(5000);
      expect(poll).toHaveBeenCalledTimes(1);
    });

    it("reports isPolling across the run", async () => {
      const { result } = renderHook(() => usePolling());
      expect(result.current.isPolling).toBe(false);

      act(() => {
        result.current.startPolling(() => false, { intervalMs: 1000 });
      });
      expect(result.current.isPolling).toBe(true);

      act(() => result.current.stopPolling());
      expect(result.current.isPolling).toBe(false);
    });

    it("rejects a non-function poll", () => {
      const { result } = renderHook(() => usePolling());

      expect(() => result.current.startPolling(null)).toThrow(TypeError);
    });

    it("exposes isActive so a caller can guard its own state updates", async () => {
      const seen = [];
      const { result, unmount } = renderHook(() => usePolling());

      act(() => {
        result.current.startPolling(
          ({ isActive }) => {
            seen.push(isActive());
            return false;
          },
          { intervalMs: 1000 },
        );
      });

      await advance(2000);
      expect(seen).toEqual([true, true]);

      unmount();
    });
  });
});
