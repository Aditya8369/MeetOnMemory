import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  getMappings,
  suggestMappings,
  saveAndApplyMapping,
  revertMapping,
} from "../speakerMappingController.js";
import Meeting from "../../models/meetingModel.js";
import SpeakerMapping from "../../models/speakerMappingModel.js";
import speakerIdentificationService from "../../services/speakerIdentificationService.js";

vi.mock("../../models/meetingModel.js");
vi.mock("../../models/speakerMappingModel.js");
vi.mock("../../services/speakerIdentificationService.js");

describe("Speaker Mapping Security & Validation (#1851)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validMeetingId = new mongoose.Types.ObjectId().toString();
  const validMappingId = new mongoose.Types.ObjectId().toString();
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

  it("returns 400 if meetingId is not a valid ObjectId", async () => {
    const req = { params: { meetingId: "invalid-id" }, user };
    const res = createMockRes();

    await getMappings(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid meeting ID format",
      }),
    );
  });

  it("returns 404 if meeting is not found", async () => {
    Meeting.findById.mockResolvedValue(null);

    const req = { params: { meetingId: validMeetingId }, user };
    const res = createMockRes();

    await suggestMappings(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Meeting not found",
      }),
    );
  });

  it("returns 403 if meeting belongs to a different organization", async () => {
    Meeting.findById.mockResolvedValue({
      _id: validMeetingId,
      organization: foreignOrgId,
    });

    const req = {
      params: { meetingId: validMeetingId },
      body: { originalLabel: "Speaker 1", mappedName: "Bob" },
      user,
    };
    const res = createMockRes();

    await saveAndApplyMapping(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Forbidden: You don't have access to this meeting",
      }),
    );
  });

  it("returns 400 in revertMapping if mappingId is invalid", async () => {
    const req = {
      params: { meetingId: validMeetingId, mappingId: "invalid-mapping-id" },
      user,
    };
    const res = createMockRes();

    await revertMapping(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Invalid mapping ID format",
      }),
    );
  });

  it("allows access for meeting belonging to user organization", async () => {
    Meeting.findById.mockResolvedValue({
      _id: validMeetingId,
      organization: userOrgId,
    });
    SpeakerMapping.find.mockResolvedValue([
      {
        meeting: validMeetingId,
        originalLabel: "Speaker 1",
        mappedName: "Alice",
      },
    ]);

    const req = { params: { meetingId: validMeetingId }, user };
    const res = createMockRes();

    await getMappings(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.any(Array),
      }),
    );
  });
});
