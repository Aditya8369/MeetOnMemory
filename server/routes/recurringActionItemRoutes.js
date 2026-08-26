import express from "express";
import {
  getRecurringActionItems,
  getRecurringActionItemById,
  createRecurringActionItem,
  updateRecurringActionItem,
  deleteRecurringActionItem,
} from "../controllers/recurringActionItemController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import rbacMiddleware from "../middleware/rbacMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", rbacMiddleware("read:action_items"), getRecurringActionItems);
router.get(
  "/:id",
  rbacMiddleware("read:action_items"),
  getRecurringActionItemById,
);
router.post(
  "/",
  rbacMiddleware("create:action_items"),
  createRecurringActionItem,
);
router.put(
  "/:id",
  rbacMiddleware("update:action_items"),
  updateRecurringActionItem,
);
router.delete(
  "/:id",
  rbacMiddleware("delete:action_items"),
  deleteRecurringActionItem,
);

export default router;
