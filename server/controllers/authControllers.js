import { sendSuccess, sendError } from "../utils/responseHandler.js";
import AuthService from "../services/AuthService.js";
import { provisionOrLinkClerkUser } from "../services/authLinkingService.js";

// --------------------------- HELPERS ---------------------------
const validateFields = (fields, res) => {
  const missing = Object.entries(fields).filter(([_, val]) => !val);
  if (missing.length > 0) {
    res.json({ success: false, message: "Missing details" });
    return false;
  }
  return true;
};

// --------------------------- REGISTER ---------------------------
export const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!validateFields({ name, email, password }, res)) return;

  try {
    const { token } = await AuthService.register({ name, email, password });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res
      .status(201)
      .json({ success: true, message: "Registration successful" });
  } catch (error) {
    console.error("Register error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// --------------------------- LOGIN ---------------------------
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!validateFields({ email, password }, res)) return;

  try {
    const { token } = await AuthService.login({ email, password });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

// --------------------------- LOGOUT ---------------------------
const DIAG = "[SYNC-CLERK-DIAG]";

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

// --------------------------- SEND VERIFY OTP ---------------------------
export const sendVerifyOtp = async (req, res) => {
  try {
    const { userId } = req;
    
    await AuthService.sendVerifyOtp(userId);

    res.json({ success: true, message: "Verification OTP sent on email" });
  } catch (error) {
    console.error("SendVerifyOtp error:", error.message);
    // Maintain old generic error for sendVerifyOtp to not break tests if it relies on exact string
    if (error.message === "Authentication failed" || error.message === "Account already verified") {
      res.json({ success: false, message: error.message });
    } else {
      res.json({ success: false, message: "Failed to send verification OTP" });
    }
  }
};

// --------------------------- VERIFY EMAIL ---------------------------
export const verifyEmail = async (req, res) => {
  const { otp } = req.body;
  const { userId } = req;
  if (!validateFields({ userId, otp }, res)) return;

  try {
    await AuthService.verifyEmail({ userId, otp });

    return res.json({ success: true, message: "Email verified successfully!" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// --------------------------- CHECK AUTH ---------------------------
export const isAuthenticated = async (req, res) => {
  try {
    return res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// --------------------------- SEND PASSWORD RESET OTP ---------------------------
export const sendResetOtp = async (req, res) => {
  const { email } = req.body;
  if (!validateFields({ email }, res)) return;

  try {
    await AuthService.sendResetOtp({ email });

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("SendResetOtp error:", error.message);
    res.json({
      success: false,
      message: "Failed to process password reset request",
    });
  }
};

// --------------------------- RESET PASSWORD ---------------------------
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!validateFields({ email, otp, newPassword }, res)) return;

  try {
    await AuthService.resetPassword({ email, otp, newPassword });

    return res.json({
      success: true,
      message: "Password has been reset successfully",
    });
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
    console.error("Error fetching user data:", error.message);
    if (error.statusCode === 404) {
      sendError(res, 404, "User not found");
    } else {
      sendError(res, 500, "Server error");
    }
  }
};

export const syncClerkUser = async (req, res) => {
  // TEMP DIAGNOSTIC — remove after root-cause confirmed in Render logs
  console.error(`${DIAG} 1. Request entered syncClerkUser`, {
    method: req.method,
    url: req.originalUrl || req.url,
    hasAuthHeader: Boolean(
      req.headers?.authorization || req.headers?.Authorization,
    ),
    bodyKeys: req.body ? Object.keys(req.body) : [],
    reqUserId: req.user?._id?.toString?.() || req.user?.id || null,
    reqUserClerkId: req.user?.clerkUserId || null,
    reqUserEmail: req.user?.email || null,
  });

  try {
    const { clerkUserId, email, name, profilePic } = req.body || {};
    const targetClerkId = clerkUserId || req.user?.clerkUserId;
    const targetEmail = email || req.user?.email;

    console.error(`${DIAG} 3/4. Resolved sync inputs`, {
      targetClerkId: targetClerkId || null,
      targetEmail: targetEmail || null,
      name: name || null,
      hasProfilePic: Boolean(profilePic),
      bodyClerkUserId: clerkUserId || null,
      bodyEmail: email || null,
    });

    res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/profile?sync=success`);
  } catch (error) {
    console.error("Google Calendar Callback error:", error.message);
    if (error.statusCode === 401) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    } else if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: "User not found" });
    if (!targetClerkId) {
      console.error(`${DIAG} FAIL early: clerkUserId missing`);
      return sendError(res, 400, "clerkUserId is required for sync");
    }

    console.error(`${DIAG} Calling provisionOrLinkClerkUser…`);
    const user = await provisionOrLinkClerkUser({
      clerkUserId: targetClerkId,
      email: targetEmail,
      name,
      profilePic,
    });

    console.error(`${DIAG} provisionOrLinkClerkUser returned`, {
      mongoUserId: user?._id?.toString?.() || user?.id || null,
      clerkUserId: user?.clerkUserId || null,
      email: user?.email || null,
      role: user?.role ?? null,
      organization:
        user?.organization?.toString?.() || user?.organization || null,
      hasCompletedOnboarding: user?.hasCompletedOnboarding,
    });

    console.error(
      `${DIAG} 9. Organization bootstrap: NOT invoked on this path (identity sync only)`,
    );

    return sendSuccess(res, { user }, "User synchronized successfully");
  } catch (error) {
    // Do not swallow — dump full exception for Render logs
    console.error(`${DIAG} EXCEPTION in syncClerkUser`);
    console.error(error);
    console.error(error?.stack);
    console.error(`${DIAG} exception meta`, {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      keyPattern: error?.keyPattern,
      keyValue: error?.keyValue,
      errors: error?.errors
        ? Object.fromEntries(
            Object.entries(error.errors).map(([k, v]) => [
              k,
              {
                message: v?.message,
                kind: v?.kind,
                path: v?.path,
                value: v?.value,
              },
            ]),
          )
        : undefined,
    });
    return sendError(res, 500, error.message || "Failed to sync user");
  }
};
