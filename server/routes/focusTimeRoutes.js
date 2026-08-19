import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createFocusTimeBlock,
  getFocusTimeBlocks,
  updateFocusTimeBlock,
  deleteFocusTimeBlock,
  getFocusTimeAnalytics,
} from "../controllers/focusTimeController.js";

const router = express.Router();

router.use(protect); // Ensure all routes are protected

router.route("/").get(getFocusTimeBlocks).post(createFocusTimeBlock);

router.route("/analytics").get(getFocusTimeAnalytics);

router.route("/:id").put(updateFocusTimeBlock).delete(deleteFocusTimeBlock);

export default router;
