import express from "express";
import protect from "../middleware/userAuth.js";
import {
  createFilter,
  getFilters,
  updateFilter,
  deleteFilter,
  togglePin,
} from "../controllers/savedFilterController.js";

const router = express.Router();

// Every saved-filter operation requires an authenticated Clerk-backed user.
router.use(protect);

router.route("/").post(createFilter).get(getFilters);
router.route("/:id").put(updateFilter).delete(deleteFilter);
router.put("/:id/pin", togglePin);

export default router;
