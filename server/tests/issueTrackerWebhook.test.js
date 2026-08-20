import { jest } from "@jest/globals";
import {
  handleJiraWebhook,
  handleLinearWebhook,
} from "../controllers/issueTrackerWebhookController.js";
import ActionItem from "../models/actionItemModel.js";

describe("Issue Tracker Webhooks", () => {
  let mockReq;
  let mockRes;
  let mockActionItem;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockActionItem = {
      status: "open",
      save: jest.fn(),
    };

    jest.spyOn(ActionItem, "findOne").mockResolvedValue(mockActionItem);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Jira Webhook", () => {
    it("should complete action item when Jira issue is done", async () => {
      mockReq = {
        body: {
          issue: {
            key: "PROJ-123",
            fields: {
              status: { name: "Done" },
            },
          },
        },
      };

      await handleJiraWebhook(mockReq, mockRes);

      expect(ActionItem.findOne).toHaveBeenCalledWith({
        externalJiraIssueId: "PROJ-123",
      });
      expect(mockActionItem.status).toBe("completed");
      expect(mockActionItem.completedAt).toBeDefined();
      expect(mockActionItem.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith("OK");
    });

    it("should set action item to in-progress", async () => {
      mockReq = {
        body: {
          issue: {
            key: "PROJ-123",
            fields: {
              status: { name: "In Progress" },
            },
          },
        },
      };

      await handleJiraWebhook(mockReq, mockRes);
      expect(mockActionItem.status).toBe("in-progress");
      expect(mockActionItem.save).toHaveBeenCalled();
    });
  });

  describe("Linear Webhook", () => {
    it("should complete action item when Linear issue is done", async () => {
      mockReq = {
        body: {
          action: "update",
          type: "Issue",
          data: {
            id: "lin-123",
            state: { name: "Done" },
          },
        },
      };

      await handleLinearWebhook(mockReq, mockRes);

      expect(ActionItem.findOne).toHaveBeenCalledWith({
        externalLinearIssueId: "lin-123",
      });
      expect(mockActionItem.status).toBe("completed");
      expect(mockActionItem.completedAt).toBeDefined();
      expect(mockActionItem.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith("OK");
    });
  });
});
