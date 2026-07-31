import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { getAuthProviderFlag } from "../utils/authUtils.js";
import {
  findUserByClerkId,
  provisionOrLinkClerkUser,
} from "../services/authLinkingService.js";
import { verifyToken } from "@clerk/express";
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
    hasAuthCookie: Boolean(req.cookies?.token),
    hasAuthorizationHeader: Boolean(authorization),
  };
}

const isVerboseAuthLoggingEnabled = () => process.env.NODE_ENV !== "production";

const userAuth = async (req, res, next) => {
  const safeRequest = sanitizeAuthRequestForLog(req);

  try {
    if (isVerboseAuthLoggingEnabled()) {
      logger.info("Auth middleware request", safeRequest);
    }

    const authProvider = getAuthProviderFlag();
    const token =
      req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token found. Please login first.",
      });
    }

    let user = null;

    // 1. Try Clerk Authentication (if dual or clerk)
    if (authProvider === "clerk" || authProvider === "dual") {
      try {
        const decodedClerk = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });

        if (decodedClerk && decodedClerk.sub) {
          user = await findUserByClerkId(decodedClerk.sub);
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
        }
      } catch (_err) {
        if (authProvider === "clerk") {
          return res.status(401).json({
            success: false,
            message: "Invalid Clerk token.",
          });
        }
      }
    }

    // 2. Try Legacy JWT Authentication (if dual or legacy, and user not found yet)
    if (!user && (authProvider === "legacy" || authProvider === "dual")) {
      try {
        const decodedJwt = jwt.verify(token, process.env.JWT_SECRET);
        user = await userModel.findById(decodedJwt.id).select("-password");
        if (!user && authProvider === "legacy") {
          return res.status(404).json({
            success: false,
            message: "User not found or token invalid.",
          });
        }
      } catch (_err) {
        if (authProvider === "legacy") {
          return res.status(401).json({
            success: false,
            message: "Unauthorized or token expired. Please login again.",
          });
        }
      }
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
