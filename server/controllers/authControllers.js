import { sendSuccess, sendError } from "../utils/responseHandler.js";
import AuthService from "../services/AuthService.js";
import { provisionOrLinkClerkUser } from "../services/authLinkingService.js";

/**
 * Clerk-aware logout acknowledgement.
 * Client must call Clerk signOut; server clears any residual legacy cookie.
 */
export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });
    return sendSuccess(res, {}, "Logged out successfully");
  } catch (error) {
    sendError(res, 400, error.message);
  }
};

export const isAuthenticated = async (req, res) => {
  try {
    return sendSuccess(res);
  } catch (error) {
    sendError(res, 400, error.message);
  }
};

export const getUserData = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await AuthService.getUserData(userId);
    sendSuccess(res, { user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    if (error.statusCode === 404) {
      sendError(res, 404, "User not found");
    } else {
      sendError(res, 500, "Server error");
    }
  }
};

export const syncClerkUser = async (req, res) => {
  try {
    const { clerkUserId, email, name, profilePic } = req.body;
    const targetClerkId = clerkUserId || req.user?.clerkUserId;
    const targetEmail = email || req.user?.email;

    if (!targetClerkId) {
      return sendError(res, 400, "clerkUserId is required for sync");
    }

    const user = await provisionOrLinkClerkUser({
      clerkUserId: targetClerkId,
      email: targetEmail,
      name,
      profilePic,
    });

    return sendSuccess(res, { user }, "User synchronized successfully");
  } catch (error) {
    console.error("syncClerkUser error:", error);
    return sendError(res, 500, error.message || "Failed to sync user");
  }
};
