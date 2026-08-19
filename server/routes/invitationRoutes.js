// server/routes/invitationRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import {
  createInvitation,
  getOrganizationInvitations,
  getUserInvitations,
  acceptInvitation,
  rejectInvitation,
  revokeInvitation,
  getInvitationByToken,
  resendInvitation,
  expireInvitation,
  bulkImportInvitations,
} from "../controllers/invitationController.js";
import userAuth from "../middleware/userAuth.js";
import {
  apiLimiter,
  writeLimiter,
  uploadLimiter,
  invitationCreateLimiter,
} from "../middleware/rateLimiter.js";
import { requirePermission, requireOrgMembership } from "../middleware/rbac.js";

const router = express.Router();

// ──────────────────────────────────────────────
// Multer — CSV bulk invite upload (Issue #1362)
// Reuses the project's multer patterns (memoryStorage + limits + fileFilter),
// same style as meeting transcript chunks / policy uploads.
// ──────────────────────────────────────────────
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1 * 1024 * 1024, // 1 MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    const allowedMime = [
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "text/plain",
    ];
    if (ext === ".csv" || allowedMime.includes(mime)) {
      cb(null, true);
      return;
    }
    cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Only CSV files are allowed.",
      ),
      false,
    );
  },
});

const handleCsvUpload = (req, res, next) => {
  csvUpload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum allowed size is 1 MB.",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.field || err.message || "File upload error.",
      });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Apply rate limiting to all routes
router.use(apiLimiter);

// All routes except getInvitationByToken require authentication
router.post(
  "/",
  userAuth,
  writeLimiter,
  requirePermission("team_members", "invite"),
  // Issue #1360: 10 invitation creations per organization per hour (Redis-backed)
  invitationCreateLimiter,
  createInvitation,
);

// Bulk CSV import — registered before /:id and /:token routes
router.post(
  "/bulk",
  userAuth,
  uploadLimiter,
  writeLimiter,
  requirePermission("team_members", "invite"),
  handleCsvUpload,
  bulkImportInvitations,
);

router.get(
  "/organization/:organizationId",
  userAuth,
  requireOrgMembership,
  requirePermission("team_members", "view"),
  getOrganizationInvitations,
);
router.get(
  "/user",
  userAuth,
  requirePermission("team_members", "view"),
  getUserInvitations,
);
router.post("/:token/accept", userAuth, writeLimiter, acceptInvitation);
router.post("/:token/reject", userAuth, writeLimiter, rejectInvitation);
router.delete(
  "/:id",
  userAuth,
  writeLimiter,
  requirePermission("team_members", "remove"),
  revokeInvitation,
);
router.post(
  "/:id/resend",
  userAuth,
  writeLimiter,
  requirePermission("team_members", "invite"),
  resendInvitation,
);
router.post(
  "/:id/expire",
  userAuth,
  writeLimiter,
  requirePermission("team_members", "invite"),
  expireInvitation,
);
router.get("/:token", getInvitationByToken);

export default router;
