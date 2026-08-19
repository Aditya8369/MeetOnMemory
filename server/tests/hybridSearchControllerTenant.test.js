/**
 * Issue #1539 — Hybrid search controller tenant boundary.
 */

import { jest } from "@jest/globals";
import mongoose from "mongoose";

const mockHybridRetrieve = jest.fn();

jest.unstable_mockModule("../services/hybridRetrievalService.js", () => ({
  hybridRetrieve: (...args) => mockHybridRetrieve(...args),
}));

const { hybridSearch } =
  await import("../controllers/hybridSearchController.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();

describe("hybridSearch controller tenant isolation (#1539)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHybridRetrieve.mockResolvedValue({ results: [], meta: {} });
  });

  it("returns 403 when the authenticated user has no organization", async () => {
    const req = {
      body: { query: "attendance policy" },
      user: { _id: new mongoose.Types.ObjectId() },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await hybridSearch(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockHybridRetrieve).not.toHaveBeenCalled();
  });

  it("ignores client organizationId and scopes to the authenticated org", async () => {
    const req = {
      body: {
        query: "attendance policy",
        organizationId: ORG_B.toString(),
        topK: 4,
      },
      user: {
        _id: new mongoose.Types.ObjectId(),
        organization: ORG_A.toString(),
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await hybridSearch(req, res);

    expect(mockHybridRetrieve).toHaveBeenCalledWith(
      "attendance policy",
      ORG_A.toString(),
      { topK: 4 },
    );
  });
});
