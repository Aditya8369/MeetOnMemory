import express from "express";
import userAuth from "../middleware/userAuth.js";
import { getMarketplaceStatusAggregation } from "../controllers/integrationMarketplaceController.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(userAuth);

// GET /api/integrations/marketplace
router.get("/marketplace", getMarketplaceStatusAggregation);

export default router;
