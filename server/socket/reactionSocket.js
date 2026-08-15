import Reaction from "../models/reactionModel.js";
import { resolveMeetingSocketAccess } from "../utils/meetingSocketAccess.js";

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

const VALID_EMOJIS = new Set(["👍", "❤️", "😂", "🎉", "🤔", "👏"]);

/**
 * Validate reaction:send payload shape before any persistence (#1385).
 * Client-supplied identity fields (userId, etc.) are intentionally ignored.
 */
const validateReactionPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "Invalid reaction payload" };
  }

  const { roomId, emoji, transcriptSegmentIndex } = payload;

  if (!roomId || typeof roomId !== "string") {
    return { ok: false, message: "roomId is required" };
  }

  if (!emoji || typeof emoji !== "string" || !VALID_EMOJIS.has(emoji)) {
    return { ok: false, message: "Invalid reaction emoji" };
  }

  if (
    transcriptSegmentIndex !== undefined &&
    transcriptSegmentIndex !== null &&
    (typeof transcriptSegmentIndex !== "number" ||
      !Number.isFinite(transcriptSegmentIndex) ||
      transcriptSegmentIndex < 0)
  ) {
    return { ok: false, message: "Invalid transcriptSegmentIndex" };
  }

  return {
    ok: true,
    roomId,
    emoji,
    transcriptSegmentIndex:
      typeof transcriptSegmentIndex === "number"
        ? transcriptSegmentIndex
        : undefined,
  };
};

export default (io) => {
  io.on("connection", (socket) => {
    // Issue #1385: authorize roomId → meeting on EVERY reaction:send.
    // Never trust handshake.auth.userId, payload.userId, or prior socket.join.
    socket.on("reaction:send", async (payload) => {
      try {
        const validated = validateReactionPayload(payload);
        if (!validated.ok) {
          socket.emit("reaction:error", { message: validated.message });
          return;
        }

        // Identity comes only from Clerk-authenticated socket context.
        if (!socket.userId) {
          socket.emit("reaction:error", {
            message: "Unauthorized: Authentication required",
          });
          return;
        }

        const access = await resolveMeetingSocketAccess(
          validated.roomId,
          socket,
        );
        if (!access.authorized) {
          socket.emit("reaction:error", {
            message:
              access.message ||
              "Forbidden: You don't have access to this meeting",
          });
          return;
        }

        const authenticatedUserId = access.user._id.toString();
        if (!consumeRateLimit(authenticatedUserId, Date.now())) {
          socket.emit("reaction:error", {
            message: "Rate limit exceeded. Try again later.",
          });
          return;
        }

        // Persist against the server-resolved meeting id and authenticated user.
        const authorizedMeetingId = access.meeting._id;
        await Reaction.create({
          meeting: authorizedMeetingId,
          user: authenticatedUserId,
          emoji: validated.emoji,
          timestamp: new Date(),
          transcriptSegmentIndex: validated.transcriptSegmentIndex,
        });

        const roomKey = authorizedMeetingId.toString();
        socket.to(roomKey).emit("reaction:new", {
          userId: authenticatedUserId,
          emoji: validated.emoji,
          timestamp: new Date().toISOString(),
          transcriptSegmentIndex: validated.transcriptSegmentIndex,
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
