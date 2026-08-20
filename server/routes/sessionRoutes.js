import express from "express";
import { generateSession } from "../controllers/sessionController.js";
import userAuth from "../middleware/userAuth.js";
import { writeLimiter } from "../middleware/rateLimiter.js";
import { requirePermission, requireOrgMembership } from "../middleware/rbac.js";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();

const uploadDir = path.resolve("uploads/sessions");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${uniqueSuffix}-${basename}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

const uploadFields = upload.fields([
  { name: "slides", maxCount: 10 },
  { name: "video", maxCount: 1 },
]);

// Helper to catch Multer errors and return a structured JSON response
const handleMulterUpload = (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res
          .status(400)
          .json({ success: false, error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

// Generate session card
router.post(
  "/generate",
  userAuth,
  requireOrgMembership,
  requirePermission("ai_search", "search"),
  writeLimiter,
  handleMulterUpload,
  generateSession,
);

export default router;
