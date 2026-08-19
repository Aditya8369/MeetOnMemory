import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Owns the lifetime of a "poll until done or give up" loop (Issue #1455).
 *
 * ─── What this replaces ──────────────────────────────────────────────────────
 *
 * Five places started a poll from an event handler and kept the timer id in a
 * `const` scoped to that handler:
 *
 *     const pollInterval = setInterval(async () => {
 *       ...
 *       if (done) clearInterval(pollInterval);
 *     }, 2000);
 *
 *     setTimeout(() => { clearInterval(pollInterval); }, 30000);
 *
 * Nothing outside the handler could reach that id, so nothing on the unmount
 * path could clear it. Navigating away mid-poll left the interval running:
 * still fetching, still calling `setState` on an unmounted component, once
 * every 2–5 seconds for the full deadline. The deadline `setTimeout` was
 * untracked too, so it also fired after unmount.
 *
 * The two calendar-OAuth cases in `Settings.jsx` were worse. They polled
 * `authWindow.closed` with no deadline at all, and `window.open` returns `null`
 * when a popup blocker intervenes — which is the common case for a popup opened
 * after an `await`, because the user-gesture token is already spent. With
 * `authWindow === null`, `authWindow.closed` threw a `TypeError` twice a second
 * forever, since the only `clearInterval` sat inside the branch that had just
 * thrown.
 *
 * ─── What this guarantees ────────────────────────────────────────────────────
 *
 *   1. **Unmount stops everything.** The interval, the deadline, and any
 *      in-flight request are all torn down by one effect cleanup.
 *   2. **A throwing poll cannot become an infinite error loop.** `onError` is
 *      called and polling continues, but the deadline is always armed, so the
 *      loop is bounded by construction.
 *   3. **Ticks never overlap.** A tick that is still awaiting is not re-entered
 *      when the next interval fires; a slow endpoint degrades the polling rate
 *      instead of stacking requests.
 *   4. **No state updates after unmount.** Callers get an `AbortSignal` and can
 *      also check `isActive()`.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *     const { startPolling, stopPolling, isPolling } = usePolling();
 *
 *     startPolling(
 *       async ({ signal }) => {
 *         const res = await fetch(url, { signal });
 *         const data = await res.json();
 *         if (data.status === "completed") { apply(data); return true; }
 *         return false;                       // keep going
 *       },
 *       {
 *         intervalMs: 2000,
 *         timeoutMs: 30000,
 *         onTimeout: () => setCalculating(false),
 *         onError: (err) => console.error(err),
 *       },
 *     );
 *
 * Returning a truthy value from the poll function stops the loop. That is the
 * whole protocol — callers never touch a timer id.
 */

/** Interval used when a caller does not specify one. */
export const DEFAULT_POLL_INTERVAL_MS = 2000;

/** Deadline used when a caller does not specify one. */
export const DEFAULT_POLL_TIMEOUT_MS = 60000;

export const usePolling = () => {
  /** Everything belonging to the current run; null when idle. */
  const runRef = useRef(null);

  /** False from the unmount cleanup onwards, so late callbacks can bail. */
  const mountedRef = useRef(true);

  const [isPolling, setIsPolling] = useState(false);

  /**
   * Tears the current run down.
   *
   * Safe to call at any time and any number of times — from a poll function,
   * from a deadline, from unmount, or from a caller that changed its mind.
   *
   * @param {object} [options]
   * @param {boolean} [options.timedOut] whether to invoke the run's `onTimeout`
   */
  const stopPolling = useCallback(({ timedOut = false } = {}) => {
    const run = runRef.current;
    if (!run) return;

    runRef.current = null;

    clearInterval(run.intervalId);
    clearTimeout(run.timeoutId);
    run.controller.abort();

    // Only touch React state if the component is still around. Setting it
    // during the unmount cleanup is exactly the warning this hook exists to
    // remove.
    if (mountedRef.current) setIsPolling(false);

    if (timedOut && mountedRef.current) {
      try {
        run.onTimeout?.();
      } catch (error) {
        console.error("Polling onTimeout handler failed:", error);
      }
    }
  }, []);

  /**
   * Starts polling. Any run already in progress is stopped first, so a caller
   * that fires the same action twice cannot end up with two loops.
   *
   * @param {(ctx: {signal: AbortSignal, isActive: () => boolean}) => unknown} pollFn
   *   Called on every tick. Return truthy — or a promise resolving truthy — to
   *   stop. May be synchronous.
   * @param {object} [options]
   * @param {number} [options.intervalMs=DEFAULT_POLL_INTERVAL_MS]
   * @param {number} [options.timeoutMs=DEFAULT_POLL_TIMEOUT_MS]
   * @param {() => void} [options.onTimeout] runs if the deadline is reached
   * @param {(error: unknown) => void} [options.onError] runs per failed tick
   * @param {boolean} [options.immediate=false] run one tick before the first
   *   interval elapses
   * @returns {() => void} a stop function for this run
   */
  const startPolling = useCallback(
    (
      pollFn,
      {
        intervalMs = DEFAULT_POLL_INTERVAL_MS,
        timeoutMs = DEFAULT_POLL_TIMEOUT_MS,
        onTimeout,
        onError,
        immediate = false,
      } = {},
    ) => {
      if (typeof pollFn !== "function") {
        throw new TypeError("usePolling: pollFn must be a function");
      }

      stopPolling();

      if (!mountedRef.current) return () => {};

      const run = {
        controller: new AbortController(),
        onTimeout,
        // Guards against re-entering a tick that has not settled yet.
        inFlight: false,
        intervalId: null,
        timeoutId: null,
      };

      const isActive = () => runRef.current === run && mountedRef.current;

      const tick = async () => {
        if (!isActive() || run.inFlight) return;
        run.inFlight = true;

        try {
          const done = await pollFn({
            signal: run.controller.signal,
            isActive,
          });

          // `isActive()` is re-checked *after* the await: the component may
          // have unmounted while the request was in flight, and acting on the
          // result then is the state-update-after-unmount warning.
          if (done && isActive()) stopPolling();
        } catch (error) {
          // An aborted request is the expected consequence of stopping, not a
          // failure worth reporting.
          const aborted =
            error?.name === "AbortError" ||
            error?.name === "CanceledError" ||
            error?.code === "ERR_CANCELED";

          if (!aborted && isActive()) {
            try {
              onError?.(error);
            } catch (handlerError) {
              console.error("Polling onError handler failed:", handlerError);
            }
          }
        } finally {
          run.inFlight = false;
        }
      };

      run.intervalId = setInterval(tick, intervalMs);

      // The deadline is armed unconditionally. It is what makes a poll function
      // that always throws terminate instead of looping forever.
      if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
        run.timeoutId = setTimeout(() => {
          if (runRef.current === run) stopPolling({ timedOut: true });
        }, timeoutMs);
      }

      runRef.current = run;
      setIsPolling(true);

      if (immediate) tick();

      return () => {
        if (runRef.current === run) stopPolling();
      };
    },
    [stopPolling],
  );

  useEffect(
    () => () => {
      mountedRef.current = false;
      stopPolling();
    },
    [stopPolling],
  );

  return { startPolling, stopPolling, isPolling };
};

export default usePolling;
