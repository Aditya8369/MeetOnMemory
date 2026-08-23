import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  apiLimiter,
  writeLimiter,
  dataExportLimiter,
} from "../middleware/rateLimiter.js";
import { requirePermission } from "../middleware/rbac.js";
import {
  getUserData,
  getCurrentUser,
  updateUserProfile,
  requestDataExport,
  getDataExportStatus,
  downloadExport,
  getDashboardPreferences,
  updateDashboardPreferences,
} from "../controllers/userController.js";

const userRouter = express.Router();

// Apply rate limiting to all routes
userRouter.use(apiLimiter);

userRouter.get(
  "/data",
  userAuth,
  requirePermission("settings", "self_view"),
  getUserData,
);
userRouter.get("/me", userAuth, getCurrentUser);
userRouter.put(
  "/update",
  userAuth,
  writeLimiter,
  requirePermission("settings", "self_edit"),
  updateUserProfile,
);

userRouter.get("/preferences/dashboard", userAuth, getDashboardPreferences);

userRouter.put(
  "/preferences/dashboard",
  userAuth,
  writeLimiter,
  updateDashboardPreferences,
);

userRouter.get(
  "/data-export-status",
  userAuth,
  requirePermission("settings", "self_view"),
  getDataExportStatus,
);

userRouter.post(
  "/request-data-export",
  userAuth,
  dataExportLimiter,
  requirePermission("settings", "view"),
  requestDataExport,
);
userRouter.get("/download-export/:token", downloadExport);

export default userRouter;

