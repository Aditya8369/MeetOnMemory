import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  toggleFavorite,
  getFavorites,
  getFavoriteStatus,
} from "../favoriteController.js";
import Favorite from "../../models/favoriteModel.js";
import Meeting from "../../models/meetingModel.js";

vi.mock("../../models/favoriteModel.js");
vi.mock("../../models/meetingModel.js");

describe("Favorite Controller Organization Isolation (#1854)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validMeetingId = new mongoose.Types.ObjectId().toString();
  const userOrgId = new mongoose.Types.ObjectId().toString();
  const foreignOrgId = new mongoose.Types.ObjectId().toString();

  const user = {
    _id: new mongoose.Types.ObjectId(),
    organization: userOrgId,
  };

  const createMockRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("returns 404 in getFavoriteStatus when meeting does not exist", async () => {
    Meeting.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const req = { params: { meetingId: validMeetingId }, user };
    const res = createMockRes();

    await getFavoriteStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Meeting not found" });
  });

  it("returns 403 in getFavoriteStatus when meeting belongs to another organization", async () => {
    Meeting.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: validMeetingId,
        organization: foreignOrgId,
      }),
    });

    const req = { params: { meetingId: validMeetingId }, user };
    const res = createMockRes();

    await getFavoriteStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Meeting does not belong to your organization",
    });
  });

  it("returns 200 with favorited status when meeting is accessible", async () => {
    Meeting.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: validMeetingId,
        organization: userOrgId,
      }),
    });
    Favorite.findOne.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

    const req = { params: { meetingId: validMeetingId }, user };
    const res = createMockRes();

    await getFavoriteStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ favorited: true });
  });

  it("filters out favorites belonging to other organizations in getFavorites", async () => {
    const meetingSameOrg = { _id: validMeetingId, organization: userOrgId };
    const meetingForeignOrg = {
      _id: new mongoose.Types.ObjectId().toString(),
      organization: foreignOrgId,
    };

    Favorite.find.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi
          .fn()
          .mockResolvedValue([
            { meeting: meetingSameOrg },
            { meeting: meetingForeignOrg },
          ]),
      }),
    });

    const req = { user };
    const res = createMockRes();

    await getFavorites(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      favorites: [validMeetingId],
    });
  });
});
