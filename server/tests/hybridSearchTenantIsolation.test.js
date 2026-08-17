/**
 * Issue #1539 — Hybrid Search tenant isolation.
 */

import { jest } from "@jest/globals";
import mongoose from "mongoose";
import {
  stripClientTenantFields,
  resolveHybridSearchContext,
  filterHybridResultsByTenant,
} from "../utils/resolveSearchTenant.js";

const mockEmbedText = jest.fn();
const mockSearchVectorStore = jest.fn();

jest.unstable_mockModule("../utils/embeddingUtils.js", () => ({
  embedText: mockEmbedText,
  searchVectorStore: mockSearchVectorStore,
}));

const Decision = (await import("../models/decisionModel.js")).default;
const Meeting = (await import("../models/meetingModel.js")).default;
const User = (await import("../models/userModel.js")).default;
const { nodeKey, NODE_TYPES } = await import("../graph/graphIndex.js");
const hybridRetrievalService =
  await import("../services/hybridRetrievalService.js");
const { hybridRetrieve, resolveOptions } = hybridRetrievalService;

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();

async function makeMeeting(organization = ORG_A, overrides = {}) {
  const owner = await User.create({
    name: "Owner",
    email: `owner-${new mongoose.Types.ObjectId()}@example.com`,
    password: "hashedpw123",
  });

  return Meeting.create({
    title: "Team Sync",
    transcript: "Discussed roadmap and priorities.",
    uploadedBy: owner._id,
    organization,
    date: new Date(),
    ...overrides,
  });
}

describe("Hybrid search tenant isolation (#1539)", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchVectorStore.mockResolvedValue([]);
    mockEmbedText.mockResolvedValue([1, 0, 0]);
  });

  describe("resolveSearchTenant utilities", () => {
    it("strips client-controlled tenant fields from options", () => {
      expect(
        stripClientTenantFields({
          topK: 5,
          organizationId: ORG_B.toString(),
          organization: ORG_B.toString(),
          tenantId: "evil",
          orgId: "evil",
        }),
      ).toEqual({ topK: 5 });
    });

    it("resolveHybridSearchContext uses req.user.organization only", () => {
      const ctx = resolveHybridSearchContext({
        body: {
          query: "policy update",
          organizationId: ORG_B.toString(),
          topK: 8,
        },
        user: { _id: "user-a", organization: ORG_A.toString() },
      });

      expect(ctx.organizationId).toBe(ORG_A.toString());
      expect(ctx.options).toEqual({ topK: 8 });
      expect(ctx.options.organizationId).toBeUndefined();
    });

    it("filterHybridResultsByTenant removes foreign-organization rows", () => {
      const graphNodes = new Map([
        [
          nodeKey(NODE_TYPES.DECISION, "d-foreign"),
          { organization: ORG_B.toString() },
        ],
      ]);

      const filtered = filterHybridResultsByTenant(
        [
          {
            key: nodeKey(NODE_TYPES.DECISION, "d-local"),
            organization: ORG_A.toString(),
          },
          {
            key: nodeKey(NODE_TYPES.DECISION, "d-foreign"),
            organization: ORG_B.toString(),
          },
        ],
        graphNodes,
        ORG_A.toString(),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].key).toBe(nodeKey(NODE_TYPES.DECISION, "d-local"));
    });
  });

  describe("hybridRetrieve service", () => {
    it("throws when organization context is missing", async () => {
      await expect(hybridRetrieve("valid query", null)).rejects.toThrow(
        "Organization context is required for hybrid search",
      );
    });

    it("resolveOptions strips spoofed organization identifiers", () => {
      const opts = resolveOptions({
        organizationId: ORG_B.toString(),
        topK: 7,
      });
      expect(opts.topK).toBe(7);
    });

    it("returns only Organization A decisions when scoped to Organization A", async () => {
      const meeting = await makeMeeting(ORG_A);

      await Decision.create({
        text: "Org A only decision",
        sourceMeetingId: meeting._id,
        organization: ORG_A,
        embedding: [1, 0, 0],
      });
      await Decision.create({
        text: "Org B only decision",
        sourceMeetingId: meeting._id,
        organization: ORG_B,
        embedding: [1, 0, 0],
      });

      const { results } = await hybridRetrieve("decision", ORG_A.toString(), {
        includeTypes: ["decision"],
      });

      expect(results.some((r) => r.title === "Org B only decision")).toBe(
        false,
      );
      expect(results.some((r) => r.title === "Org A only decision")).toBe(true);
    });

    it("passes authenticated organization to Pinecone vector search", async () => {
      mockSearchVectorStore.mockResolvedValue([
        {
          meetingId: new mongoose.Types.ObjectId().toString(),
          title: "Org A Meeting",
          summary: "summary",
          similarityScore: 0.9,
          organization: ORG_A.toString(),
        },
      ]);

      await hybridRetrieve("meeting notes", ORG_A.toString(), {
        includeTypes: ["meeting"],
      });

      expect(mockSearchVectorStore).toHaveBeenCalledWith("meeting notes", {
        limit: expect.any(Number),
        organization: ORG_A.toString(),
      });
    });

    it("drops foreign-organization vector hits before returning results", async () => {
      const localMeeting = await makeMeeting(ORG_A, { title: "Local Meeting" });

      mockSearchVectorStore.mockResolvedValue([
        {
          meetingId: localMeeting._id.toString(),
          title: "Local Meeting",
          summary: "local",
          similarityScore: 0.95,
          organization: ORG_A.toString(),
        },
        {
          meetingId: new mongoose.Types.ObjectId().toString(),
          title: "Foreign Meeting",
          summary: "foreign",
          similarityScore: 0.99,
          organization: ORG_B.toString(),
        },
      ]);

      const { results } = await hybridRetrieve("meeting", ORG_A.toString(), {
        includeTypes: ["meeting"],
        maxHops: 0,
      });

      expect(results.some((r) => r.title === "Foreign Meeting")).toBe(false);
      expect(results.some((r) => r.title === "Local Meeting")).toBe(true);
    });

    it("does not enrich meetings from another organization during lookup", async () => {
      const meetingA = await makeMeeting(ORG_A, { title: "Org A Meeting" });
      const meetingB = await makeMeeting(ORG_B, { title: "Org B Meeting" });

      await Decision.create({
        text: "Decision tied to foreign meeting id",
        sourceMeetingId: meetingB._id,
        organization: ORG_A,
        embedding: [1, 0, 0],
      });

      mockSearchVectorStore.mockResolvedValue([
        {
          meetingId: meetingA._id.toString(),
          title: "Org A Meeting",
          summary: "summary",
          similarityScore: 0.9,
          organization: ORG_A.toString(),
        },
      ]);

      const { results } = await hybridRetrieve("meeting", ORG_A.toString(), {
        includeTypes: ["meeting", "decision"],
        maxHops: 1,
      });

      for (const result of results) {
        expect(result.sourceMeeting?.title).not.toBe("Org B Meeting");
        if (result.organization) {
          expect(result.organization.toString()).toBe(ORG_A.toString());
        }
      }
    });
  });
});
