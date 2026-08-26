import express from "express";
import protect from "../middleware/userAuth.js";
import {
  getWorkload,
  suggestRebalance,
  executeRebalance,
} from "../controllers/workloadController.js";

const router = express.Router();

router.use(protect);

router.get("/", getWorkload);
router.get("/suggest", suggestRebalance);
router.post("/rebalance", executeRebalance);

export default router;
