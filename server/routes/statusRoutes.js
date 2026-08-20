import express from "express";
import { createGetPlatformStatusHandler } from "../controllers/statusController.js";

/**
 * @param {object} [healthOptions] - injectable mongo/redis checks for tests
 * @returns {import("express").Router}
 */
export const createStatusRoutes = (healthOptions = {}) => {
  const router = express.Router();
  router.get("/", createGetPlatformStatusHandler(healthOptions));
  return router;
};

export default createStatusRoutes();
