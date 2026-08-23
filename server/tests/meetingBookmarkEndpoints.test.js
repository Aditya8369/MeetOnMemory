import { vi, describe, it, expect, beforeEach } from "vitest";
import mongoose from "mongoose";

const mockBookmarkFindOne = vi.fn();
const mockBookmarkDeleteOne = vi.fn();
const mockBookmarkCreate = vi.fn();
const mockBookmarkFind = vi.fn();

vi.mock("../models/bookmarkModel.js", () => ({
  default: {
    findOne: (...args) => mockBookmarkFindOne(...args),
    deleteOne: (...args) => mockBookmarkDeleteOne(...args),
    create: (...args) => mockBookmarkCreate(...args),
    find: (...args) => mockBookmarkFind(...args),
  },
}));

const mockMeetingFindById = vi.fn();

vi.mock("../models/meetingModel.js", () => ({
  default: {
    findById: (...args) => mockMeetingFindById(...args),
  },
}));

import {
  addMeetingBookmark,
  removeMeetingBookmark,
  getMeetingBookmarkStatus,
  getBookmarkedMeetings,
} from "../controllers/bookmarkController.js";

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();

const makeRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status: vi.fn(function (code) {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn(function (body) {
      res.body = body;
      return res;
    }),
  };
  return res;
};

describe("Meeting Bookmark Endpoints (#1827)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/meetings/:id/bookmark (addMeetingBookmark)", () => {
    it("adds a bookmark for authorized user in same org", async () => {
      const meetingId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();
      const user = { _id: userId, organization: ORG_A };

      mockMeetingFindById.mockReturnValue({
        select: vi
          .fn()
          .mockResolvedValue({ _id: meetingId, organization: ORG_A }),
      });
      mockBookmarkFindOne.mockResolvedValue(null);
      mockBookmarkCreate.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        user: userId,
        meeting: meetingId,
      });

      const req = {
        params: { id: meetingId.toString() },
        body: { collectionName: "Project X" },
        user,
      };
      const res = makeRes();

      await addMeetingBookmark(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.bookmarked).toBe(true);
      expect(mockBookmarkCreate).toHaveBeenCalled();
    });

    it("denies bookmark creation across organizations", async () => {
      const meetingId = new mongoose.Types.ObjectId();
      const user = { _id: new mongoose.Types.ObjectId(), organization: ORG_B };

      mockMeetingFindById.mockReturnValue({
        select: vi
          .fn()
          .mockResolvedValue({ _id: meetingId, organization: ORG_A }),
      });

      const req = {
        params: { id: meetingId.toString() },
        user,
      };
      const res = makeRes();

      await addMeetingBookmark(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  describe("DELETE /api/meetings/:id/bookmark (removeMeetingBookmark)", () => {
    it("removes bookmark", async () => {
      const meetingId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      mockBookmarkDeleteOne.mockResolvedValue({ deletedCount: 1 });

      const req = {
        params: { id: meetingId.toString() },
        user: { _id: userId },
      };
      const res = makeRes();

      await removeMeetingBookmark(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.bookmarked).toBe(false);
      expect(mockBookmarkDeleteOne).toHaveBeenCalledWith({
        user: userId,
        meeting: meetingId.toString(),
      });
    });
  });

  describe("GET /api/meetings/:id/bookmark (getMeetingBookmarkStatus)", () => {
    it("returns true when bookmarked", async () => {
      const meetingId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      mockBookmarkFindOne.mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        user: userId,
        meeting: meetingId,
      });

      const req = {
        params: { id: meetingId.toString() },
        user: { _id: userId },
      };
      const res = makeRes();

      await getMeetingBookmarkStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.bookmarked).toBe(true);
    });
  });

  describe("GET /api/meetings/bookmarked (getBookmarkedMeetings)", () => {
    it("returns list of bookmarked meetings", async () => {
      const userId = new mongoose.Types.ObjectId();
      const meetingId = new mongoose.Types.ObjectId();

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            collectionName: "Favorites",
            notes: "Important",
            color: "#3b82f6",
            createdAt: new Date(),
            meeting: {
              _id: meetingId,
              title: "Board Sync",
              toObject: () => ({ _id: meetingId, title: "Board Sync" }),
            },
          },
        ]),
      };
      mockBookmarkFind.mockReturnValue(mockQuery);

      const req = {
        query: {},
        user: { _id: userId },
      };
      const res = makeRes();

      await getBookmarkedMeetings(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].title).toBe("Board Sync");
    });
  });
});
