import {
  findUserByClerkId,
  provisionOrLinkClerkUser,
} from "../services/authLinkingService.js";
import { verifyClerkSessionToken } from "../utils/authUtils.js";
import logger from "../utils/logger.js";

/**
 * Build a log-safe snapshot of an auth request.
 * Never includes cookies, Authorization headers, tokens, or other credentials.
 */
export function sanitizeAuthRequestForLog(req = {}) {
  const headers = req.headers || {};
  const authorization =
    typeof req.header === "function"
      ? req.header("Authorization")
      : headers.authorization || headers.Authorization;

  return {
    method: req.method || undefined,
    url: req.originalUrl || req.url || undefined,
    ip: req.ip || headers["x-forwarded-for"] || undefined,
    origin: headers.origin || undefined,
    hasAuthorizationHeader: Boolean(authorization),
  };
}

const isVerboseAuthLoggingEnabled = () => process.env.NODE_ENV !== "production";

const extractBearerToken = (req) => {
  const header =
    typeof req.header === "function"
      ? req.header("Authorization")
      : req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== "string") return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
};

/**
 * Clerk-only HTTP authentication.
 * Resolves MongoDB `req.user` via authLinkingService (RBAC source of truth).
 */
const userAuth = async (req, res, next) => {
  const safeRequest = sanitizeAuthRequestForLog(req);

  try {
    if (isVerboseAuthLoggingEnabled()) {
      logger.info("Auth middleware request", safeRequest);
    }

    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token found. Please login first.",
      });
    }

    let decodedClerk;
    try {
      decodedClerk = await verifyClerkSessionToken(token);
    } catch (_err) {
      return res.status(401).json({
        success: false,
        message: "Invalid Clerk token.",
      });
    }

    if (!decodedClerk?.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid Clerk token.",
      });
    }

    let user = await findUserByClerkId(decodedClerk.sub);
    if (!user) {
      user = await provisionOrLinkClerkUser({
        clerkUserId: decodedClerk.sub,
        email:
          decodedClerk.email ||
          decodedClerk.email_address ||
          decodedClerk.primary_email_address,
        name:
          decodedClerk.name ||
          (decodedClerk.first_name
            ? `${decodedClerk.first_name} ${decodedClerk.last_name || ""}`.trim()
            : null),
        profilePic: decodedClerk.picture || decodedClerk.image_url,
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed. Invalid token.",
      });
    }

    req.user = user;

    if (isVerboseAuthLoggingEnabled()) {
      logger.info("Auth middleware success", {
        ...safeRequest,
        userId: user._id?.toString?.() || user.id || undefined,
      });
    }

    next();
  } catch (error) {
    logger.error("Auth middleware error", error, safeRequest);
    return res.status(401).json({
      success: false,
      message: "Unauthorized or token expired.",
    });
  }
};

export default userAuth;
