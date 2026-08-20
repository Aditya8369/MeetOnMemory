import express from "express";
import { createSubmitContactHandler } from "../controllers/contactController.js";
import { createContactSubmitLimiter } from "../middleware/rateLimiter.js";

/**
 * @param {object} [options]
 * @param {import("express").RequestHandler} [options.submitLimiter]
 * @returns {import("express").Router}
 */
export const createContactRoutes = (options = {}) => {
  const router = express.Router();
  const submitLimiter = options.submitLimiter ?? createContactSubmitLimiter();

  router.post("/", submitLimiter, createSubmitContactHandler());

  return router;
};

export default createContactRoutes();
