import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getMyCatchUps,
  markCatchUpAsRead,
  deliverCatchUp,
} from "../controllers/absenteeCatchUpController.js";

const router = express.Router();

router.use(protect); // All routes require authentication

router.get("/pending", getMyCatchUps);
router.post("/:id/mark-read", markCatchUpAsRead);
router.post("/:id/deliver", deliverCatchUp);

export default router;
