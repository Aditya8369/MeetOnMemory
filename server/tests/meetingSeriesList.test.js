import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../models/meetingSeriesModel.js", () => ({
  default: {
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));
vi.mock("../models/meetingModel.js", () => ({
  default: {
    findOne: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

import MeetingSeries from "../models/meetingSeriesModel.js";
import Meeting from "../models/meetingModel.js";
import {
  listSeries,
  pauseSeries,
} from "../controllers/meetingSeriesController.js";

describe("meetingSeries list/pause (Issue #2036)", () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      user: { _id: "u1", organization: "org1" },
      params: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it("lists org series with next occurrence and status", async () => {
    MeetingSeries.find.mockReturnValue({
      sort: () => ({
        lean: async () => [
          {
            _id: "s1",
            title: "Weekly Sync",
            recurrencePattern: "weekly",
            isActive: true,
            time: "10:00",
          },
        ],
      }),
    });
    Meeting.findOne.mockReturnValue({
      sort: () => ({
        select: () => ({
          lean: async () => ({
            date: "2026-09-01T10:00:00.000Z",
            time: "10:00",
            title: "Weekly Sync",
            seriesOccurrence: 3,
          }),
        }),
      }),
    });
    Meeting.countDocuments.mockResolvedValue(5);

    await listSeries(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        series: [
          expect.objectContaining({
            title: "Weekly Sync",
            status: "active",
            occurrenceCount: 5,
            nextOccurrence: expect.objectContaining({ time: "10:00" }),
          }),
        ],
      }),
    );
  });

  it("pauses an active series", async () => {
    req.params.id = "s1";
    MeetingSeries.findOneAndUpdate.mockResolvedValue({
      _id: "s1",
      isActive: false,
      title: "Weekly Sync",
    });

    await pauseSeries(req, res);

    expect(MeetingSeries.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
      { isActive: false },
      { new: true },
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});
