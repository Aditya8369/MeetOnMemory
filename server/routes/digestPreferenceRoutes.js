// server/routes/digestPreferenceRoutes.js
// NOTE: Live mount uses digestRoutes.js at /api/digest-preferences.
// This file is kept for compatibility; do not reintroduce authMiddleware.

import express from "express";
import {
  getPreferences,
  updatePreferences,
  sendTestDigest,
} from "../controllers/digestPreferenceController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

/**
 * @route   GET /api/digest-preferences
 * @desc    Get current user's digest preferences
 * @access  Private
 */
router.get("/", userAuth, getPreferences);

/**
 * @route   PUT /api/digest-preferences
 * @desc    Update current user's digest preferences
 * @access  Private
 */
router.put("/", userAuth, updatePreferences);

/**
 * @route   POST /api/digest-preferences/test
 * @desc    Send a real test digest email to the current user
 * @access  Private
 */
router.post("/test", userAuth, sendTestDigest);

export default router;
