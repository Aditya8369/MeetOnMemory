import Reaction from "../models/reactionModel.js";
import { verifyMeetingSocketAccess } from "../utils/meetingSocketAccess.js";

/**
 * Rate limiting store, keyed on the authenticated user (Issue #1564).
 *
 * It used to be keyed on `socket.id` and cleared on `disconnect`, so a client
 * that reconnected got a fresh budget and the cap meant nothing. The user id
 * survives reconnects, which is what the limit is actually about.
 */
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const MAX_REACTIONS_PER_WINDOW = 5;

/**
 * Entries are no longer dropped on disconnect, so expired ones are swept here.
 * The sweep only runs once the map is larger than any plausible set of
 * concurrently-reacting users, which keeps the common path a single lookup.
 */
const SWEEP_THRESHOLD = 1000;

const sweepExpired = (now) => {
  if (rateLimitStore.size < SWEEP_THRESHOLD) return;
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) rateLimitStore.delete(key);
  }
};

/**
 * Records one reaction against the user's budget.
 * @returns {boolean} false when the user is over the limit
 */
const consumeRateLimit = (userId, now) => {
  const entry = rateLimitStore.get(userId);

  if (!entry || now > entry.resetTime) {
    sweepExpired(now);
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (entry.count >= MAX_REACTIONS_PER_WINDOW) {
    return false;
  }

  entry.count++;
  return true;
};

const validEmojis = ["👍", "❤️", "😂", "🎉", "🤔", "👏"];

export default (io) => {
  io.on("connection", (socket) => {
    socket.on("reaction:send", async (payload) => {
      try {
        const { roomId, emoji, transcriptSegmentIndex } = payload || {};

        if (!roomId || !emoji || !validEmojis.includes(emoji)) {
          return;
        }

        // Must be authenticated via the middleware in meetingSocket.js
        if (!socket.userId) {
          return;
        }

        // `roomId` comes straight from the client. Authorize it before anything
        // is broadcast or written — the previous order emitted to the room and
        // created the Reaction first, so a caller from another organization
        // could inject reactions into any meeting by id, and the injected row
        // then surfaced (with their name and email) through the properly
        // guarded reaction timeline endpoint.
        const authorized = await verifyMeetingSocketAccess(roomId, socket);
        if (!authorized) {
          socket.emit("reaction:error", {
            message: "Forbidden: You don't have access to this meeting",
          });
          return;
        }

        if (!consumeRateLimit(socket.userId.toString(), Date.now())) {
          socket.emit("reaction:error", {
            message: "Rate limit exceeded. Try again later.",
          });
          return;
        }

        // Persist first so a broadcast never advertises a reaction that failed
        // to save — an invalid payload used to emit anyway and swallow the
        // write error into console.error.
        await Reaction.create({
          meeting: roomId,
          user: socket.userId,
          emoji,
          timestamp: new Date(),
          transcriptSegmentIndex,
        });

        socket.to(roomId).emit("reaction:new", {
          userId: socket.userId,
          emoji,
          timestamp: new Date().toISOString(),
          transcriptSegmentIndex,
        });
      } catch (error) {
        console.error("Error handling reaction:", error);
        socket.emit("reaction:error", {
          message: "Failed to record reaction.",
        });
      }
    });
  });
};
