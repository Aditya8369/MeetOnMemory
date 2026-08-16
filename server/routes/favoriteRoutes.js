import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  toggleFavorite,
  getFavorites,
  getFavoriteStatus,
} from "../controllers/favoriteController.js";

const router = express.Router();

router.use(userAuth);

router.post("/toggle", toggleFavorite);
router.get("/", getFavorites);
router.get("/status/:meetingId", getFavoriteStatus);

export default router;