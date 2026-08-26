import { jest } from "@jest/globals";
import mongoose from "mongoose";

const mockPagesCreate = jest.fn();
const mockSearch = jest.fn();

jest.unstable_mockModule("@notionhq/client", () => ({
  Client: jest.fn().mockImplementation(() => ({
    pages: { create: mockPagesCreate },
    search: mockSearch,
  })),
  APIResponseError: class APIResponseError extends Error {
    constructor(status) {
      super(`Notion API error ${status}`);
      this.status = status;
      this.headers = new Map();
    }
  },
}));

jest.unstable_mockModule("../utils/crypto.js", () => ({
  decryptToken: jest.fn((t) => t),
  encryptToken: jest.fn((t) => t),
}));

const { createMeetingPage, fetchDatabases } =
  await import("../services/notionSyncService.js");
const { APIResponseError } = await import("@notionhq/client");

describe("Notion Sync Service — Issue #1602", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  function makeIntegration(overrides = {}) {
    return {
      _id: new mongoose.Types.ObjectId(),
      accessToken: "encrypted-token",
      targetDatabaseId: "db-123",
      syncHistory: [],
      save: jest.fn(),
      ...overrides,
    };
  }

  describe("createMeetingPage", () => {
    it("should create a Notion page with meeting details", async () => {
      mockPagesCreate.mockResolvedValue({
        id: "page-1",
        url: "https://notion.so/page-1",
      });

      const meeting = {
        _id: new mongoose.Types.ObjectId(),
        title: "Quarterly Review",
        summary: "Discussed Q1 results.",
        structuredMoM: {
          actionItems: [{ task: "Update roadmap", assignee: "Alice" }],
        },
      };

      const integration = makeIntegration();
      const result = await createMeetingPage(meeting, integration);

      expect(result.pageId).toBe("page-1");
      expect(result.alreadySynced).toBe(false);
      expect(integration.save).toHaveBeenCalled();
      expect(integration.syncHistory.length).toBe(1);
      expect(integration.syncHistory[0].meetingId.toString()).toBe(
        meeting._id.toString(),
      );
    });

    it("should skip duplicate sync when meeting already synced", async () => {
      const meetingId = new mongoose.Types.ObjectId();
      const integration = makeIntegration({
        syncHistory: [
          {
            meetingId,
            notionPageId: "existing-page",
            notionPageUrl: "https://notion.so/existing",
            status: "success",
          },
        ],
      });

      const result = await createMeetingPage(
        { _id: meetingId, title: "Sync" },
        integration,
      );

      expect(result.alreadySynced).toBe(true);
      expect(result.pageId).toBe("existing-page");
      expect(mockPagesCreate).not.toHaveBeenCalled();
    });

    it("should throw when targetDatabaseId is missing", async () => {
      const integration = makeIntegration({ targetDatabaseId: null });
      await expect(
        createMeetingPage(
          { _id: new mongoose.Types.ObjectId(), title: "X" },
          integration,
        ),
      ).rejects.toThrow("Target Notion database is not configured");
    });

    it("should include DB action items as to_do blocks", async () => {
      mockPagesCreate.mockResolvedValue({ id: "page-2", url: null });

      const actionItems = [{ text: "Fix bug", owner: "Bob", status: "open" }];

      const integration = makeIntegration();
      await createMeetingPage(
        { _id: new mongoose.Types.ObjectId(), title: "Sync" },
        integration,
        actionItems,
      );

      const callArgs = mockPagesCreate.mock.calls[0][0];
      const todos = callArgs.children.filter((b) => b.type === "to_do");
      expect(todos.length).toBeGreaterThan(0);
      expect(todos[0].to_do.rich_text[0].text.content).toContain("Fix bug");
    });
  });

  describe("fetchDatabases", () => {
    it("should return formatted database list", async () => {
      mockSearch.mockResolvedValue({
        results: [
          {
            id: "db-1",
            title: [{ plain_text: "Meeting Notes" }],
            url: "https://notion.so/db-1",
          },
        ],
      });

      const databases = await fetchDatabases("token");
      expect(databases).toEqual([
        { id: "db-1", title: "Meeting Notes", url: "https://notion.so/db-1" },
      ]);
    });
  });

  describe("Rate limit / retry handling", () => {
    it("should retry on 429 and succeed", async () => {
      const rateLimitError = new APIResponseError(429);
      mockPagesCreate
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ id: "page-retry", url: null });

      const integration = makeIntegration();
      const result = await createMeetingPage(
        { _id: new mongoose.Types.ObjectId(), title: "Retry Test" },
        integration,
      );

      expect(result.pageId).toBe("page-retry");
      expect(mockPagesCreate).toHaveBeenCalledTimes(2);
    });

    it("should throw after exhausting retries", async () => {
      const serverError = new APIResponseError(500);
      mockPagesCreate.mockRejectedValue(serverError);

      const integration = makeIntegration();
      await expect(
        createMeetingPage(
          { _id: new mongoose.Types.ObjectId(), title: "Fail" },
          integration,
        ),
      ).rejects.toThrow();

      expect(mockPagesCreate).toHaveBeenCalledTimes(4); // 1 + 3 retries
    });
  });
});
