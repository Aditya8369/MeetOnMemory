// server/routes/notificationRoutes.js
import express from "express";
import userAuth from "../middleware/userAuth.js";
import { apiLimiter, writeLimiter } from "../middleware/rateLimiter.js";
import { requirePermission } from "../middleware/rbac.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  markGroupAsRead,
  deleteNotification,
  getUnreadCount,
  getPreferences,
  updatePreferences,
  muteMeeting,
  unmuteMeeting,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  sendTestPush,
} from "../controllers/notificationController.js";

const notificationRouter = express.Router();

notificationRouter.use(userAuth, apiLimiter);

notificationRouter.get(
  "/",
  requirePermission("notifications", "view"),
  getNotifications,
);
notificationRouter.get(
  "/unread-count",
  requirePermission("notifications", "view"),
  getUnreadCount,
);
notificationRouter.patch(
  "/mark-all-read",
  writeLimiter,
  requirePermission("notifications", "self_manage"),
  markAllAsRead,
);
notificationRouter.patch(
  "/mark-group-read",
  writeLimiter,
  requirePermission("notifications", "self_manage"),
  markGroupAsRead,
);
notificationRouter.post(
  "/mute-meeting/:meetingId",
  writeLimiter,
  requirePermission("notifications", "self_manage"),
  muteMeeting,
);
notificationRouter.delete(
  "/mute-meeting/:meetingId",
  writeLimiter,
  requirePermission("notifications", "self_manage"),
  unmuteMeeting,
);
notificationRouter.patch(
  "/:id/read",
  writeLimiter,
  requirePermission("notifications", "view"),
  markAsRead,
);
notificationRouter.get(
  "/preferences",
  requirePermission("notifications", "view"),
  getPreferences,
);
notificationRouter.put(
  "/preferences",
  writeLimiter,
  requirePermission("notifications", "self_manage"),
  updatePreferences,
);

// Web Push endpoints
notificationRouter.get(
  "/push/public-key",
  requirePermission("notifications", "view"),
  getVapidPublicKey,
);
notificationRouter.post(
  "/push/subscribe",
  writeLimiter,
  requirePermission("notifications", "self_manage"),
  subscribePush,
);
notificationRouter.post(
  "/push/unsubscribe",
  writeLimiter,
  requirePermission("notifications", "self_manage"),
  unsubscribePush,
);
notificationRouter.post(
  "/push/test",
  writeLimiter,
  requirePermission("notifications", "self_manage"),
  sendTestPush,
);

notificationRouter.delete(
  "/:id",
  writeLimiter,
  requirePermission("notifications", "self_manage"),
  deleteNotification,
);

export default notificationRouter;
