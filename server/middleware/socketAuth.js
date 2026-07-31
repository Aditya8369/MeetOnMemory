import jwt from "jsonwebtoken";
import { verifyToken } from "@clerk/express";
import userModel from "../models/userModel.js";
import { getAuthProviderFlag } from "../utils/authUtils.js";
import {
  findUserByClerkId,
  provisionOrLinkClerkUser,
} from "../services/authLinkingService.js";

const parseCookie = (str = "") =>
  str
    .split(";")
    .map((v) => v.split("="))
    .reduce((acc, v) => {
      if (v[0] && v[1] !== undefined) {
        acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
      }
      return acc;
    }, {});

/**
 * Socket.IO Authentication Middleware for Clerk & Dual Auth support.
 * Authenticates socket connections via Clerk session tokens or legacy application JWTs.
 * Resolves/provisions MongoDB user identity and attaches userId, userRole, and userOrganization.
 */
export const authenticateSocket = async (socket, next) => {
  try {
    const authHeader = socket.handshake?.headers?.authorization;
    const authObjectToken = socket.handshake?.auth?.token;
    const cookieHeader = socket.request?.headers?.cookie || "";
    const cookies = parseCookie(cookieHeader);

    let token =
      authObjectToken ||
      (authHeader ? authHeader.replace("Bearer ", "").trim() : null) ||
      cookies.token ||
      cookies["clerk-db-jwt"];

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const authProvider = getAuthProviderFlag();
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
          return next(new Error("Authentication error: Invalid Clerk token"));
        }
      }
    }

    // 2. Fallback to Legacy JWT Authentication (if dual or legacy, and user not found yet)
    if (!user && (authProvider === "legacy" || authProvider === "dual")) {
      try {
        const decodedJwt = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedJwt.id || decodedJwt._id || decodedJwt.userId;
        if (userId) {
          user = await userModel.findById(userId).select("-password");
        }
      } catch (_err) {
        if (authProvider === "legacy") {
          return next(new Error("Authentication error: Invalid token"));
        }
      }
    }

    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    // Attach resolved MongoDB user attributes to socket instance
    socket.user = user;
    socket.userId = user._id ? user._id.toString() : user.id;
    socket.userRole = user.role;
    socket.userOrganization = user.organization;

    next();
  } catch (error) {
    console.error("Socket authentication error:", error.message);
    return next(new Error("Authentication error"));
  }
};

export default authenticateSocket;
