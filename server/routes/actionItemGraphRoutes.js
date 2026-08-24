import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  addActionItemDependency,
  getActionItemGraph,
  resolveActionItemBlocker,
  removeActionItemDependency,
} from "../controllers/actionItemGraphController.js";

const router = express.Router();

router.use(userAuth);

router.post("/dependencies", addActionItemDependency);
router.get("/topology", getActionItemGraph);
router.patch("/resolve/:actionItemId", resolveActionItemBlocker);
router.delete("/dependencies/:id", removeActionItemDependency);

export default router;
