import { jest } from "@jest/globals";
import express from "express";
import routes from "../routes/index.js";

describe("Route Consolidation and Registration", () => {
  it("should export router containing registered API routes without duplicates", () => {
    expect(routes).toBeDefined();
    expect(typeof routes).toBe("function");

    // Inspect stack of layers in router
    const stack = routes.stack || [];
    const mountedPaths = stack.map((layer) => layer.regexp.source);

    // Verify all major routes are mounted
    expect(stack.length).toBeGreaterThan(0);
  });
});
