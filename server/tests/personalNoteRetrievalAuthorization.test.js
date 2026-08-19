/**
 * Issue #1389 — Personal note retrieval by meetingId must use
 * resolveAccessibleMeeting before any PersonalNote query.
 */

import { jest } from "@jest/globals";
import mongoose from "mongoose";

const findByIdSpy = jest.fn();
const findOneSpy = jest.fn();

jest.unstable_mockModule("../models/meetingModel.js", () => ({
  default: {
    findById: (...args) => findByIdSpy(...args),
    find: jest.fn(),
  },
}));

jest.unstable_mockModule("../models/personalNoteModel.js", () => ({
  default: {
    findOne: (...args) => findOneSpy(...args),
    find: jest.fn(),
    create: jest.fn(),
  },
}));

const { getNoteByMeetingId, resolveAccessibleMeeting } =
  await import("../controllers/personalNoteController.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();
const MEETING_A = new mongoose.Types.ObjectId();
const MEETING_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();
const USER_B = new mongoose.Types.ObjectId();
const OWNER_ID = new mongoose.Types.ObjectId();

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("resolveAccessibleMeeting (#1389)", () => {
  beforeEach(() => {
    findByIdSpy.mockReset();
    findOneSpy.mockReset();
  });

  it("allows the meeting owner", async () => {
    findByIdSpy.mockResolvedValue({
      _id: MEETING_A,
      uploadedBy: OWNER_ID,
      organization: ORG_A,
    });

    const result = await resolveAccessibleMeeting(MEETING_A.toString(), {
      _id: OWNER_ID,
      organization: ORG_B,
    });

    expect(result.error).toBeUndefined();
    expect(result.meeting._id).toEqual(MEETING_A);
  });

  it("allows an authorized same-organization member", async () => {
    findByIdSpy.mockResolvedValue({
      _id: MEETING_A,
      uploadedBy: OWNER_ID,
      organization: ORG_A,
    });

    const result = await resolveAccessibleMeeting(MEETING_A.toString(), {
      _id: USER_A,
      organization: ORG_A,
    });

    expect(result.error).toBeUndefined();
  });

  it("denies cross-organization access", async () => {
    findByIdSpy.mockResolvedValue({
      _id: MEETING_A,
      uploadedBy: OWNER_ID,
      organization: ORG_A,
    });

    const result = await resolveAccessibleMeeting(MEETING_A.toString(), {
      _id: USER_B,
      organization: ORG_B,
    });

    expect(result.error).toMatchObject({
      status: 403,
      message: expect.stringMatching(/access/i),
    });
  });

  it("rejects invalid meeting ids", async () => {
    const result = await resolveAccessibleMeeting("not-valid", {
      _id: USER_A,
      organization: ORG_A,
    });

    expect(result.error.status).toBe(400);
    expect(findByIdSpy).not.toHaveBeenCalled();
  });

  it("rejects missing meetings", async () => {
    findByIdSpy.mockResolvedValue(null);

    const result = await resolveAccessibleMeeting(MEETING_A.toString(), {
      _id: USER_A,
      organization: ORG_A,
    });

    expect(result.error.status).toBe(404);
  });
});

describe("GET personal note retrieval authorization (#1389)", () => {
  beforeEach(() => {
    findByIdSpy.mockReset();
    findOneSpy.mockReset();
  });

  it("returns the owner's note for an accessible meeting", async () => {
    findByIdSpy.mockResolvedValue({
      _id: MEETING_A,
      uploadedBy: USER_A,
      organization: ORG_A,
    });
    findOneSpy.mockResolvedValue({
      userId: USER_A,
      meetingId: MEETING_A,
      content: "my private note",
      title: "Title",
      annotations: [],
      isPinned: false,
      toObject() {
        return {
          userId: USER_A,
          meetingId: MEETING_A,
          content: "my private note",
          title: "Title",
          annotations: [],
          isPinned: false,
        };
      },
    });

    const req = {
      params: { meetingId: MEETING_A.toString() },
      user: { _id: USER_A, organization: ORG_A, role: "member" },
    };
    const res = mockRes();

    await getNoteByMeetingId(req, res);

    expect(findByIdSpy).toHaveBeenCalledWith(MEETING_A.toString());
    expect(findOneSpy).toHaveBeenCalledWith({
      userId: USER_A,
      meetingId: MEETING_A,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        note: expect.objectContaining({ content: "my private note" }),
      }),
    );
  });

  it("allows an authorized org participant to retrieve their own empty note shell", async () => {
    findByIdSpy.mockResolvedValue({
      _id: MEETING_A,
      uploadedBy: OWNER_ID,
      organization: ORG_A,
    });
    findOneSpy.mockResolvedValue(null);

    const req = {
      params: { meetingId: MEETING_A.toString() },
      user: { _id: USER_A, organization: ORG_A, role: "member" },
    };
    const res = mockRes();

    await getNoteByMeetingId(req, res);

    expect(findOneSpy).toHaveBeenCalledWith({
      userId: USER_A,
      meetingId: MEETING_A,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        note: expect.objectContaining({ content: "" }),
      }),
    );
  });

  it("denies cross-organization retrieval and does not query notes", async () => {
    findByIdSpy.mockResolvedValue({
      _id: MEETING_B,
      uploadedBy: OWNER_ID,
      organization: ORG_B,
    });

    const req = {
      params: { meetingId: MEETING_B.toString() },
      user: { _id: USER_A, organization: ORG_A, role: "member" },
    };
    const res = mockRes();

    await getNoteByMeetingId(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(findOneSpy).not.toHaveBeenCalled();
  });

  it("denies unauthorized users for inaccessible meetings without querying notes", async () => {
    findByIdSpy.mockResolvedValue({
      _id: MEETING_A,
      uploadedBy: OWNER_ID,
      organization: null,
    });

    const req = {
      params: { meetingId: MEETING_A.toString() },
      user: { _id: USER_B, organization: ORG_A, role: "member" },
    };
    const res = mockRes();

    await getNoteByMeetingId(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(findOneSpy).not.toHaveBeenCalled();
  });

  it("handles invalid meeting ids without querying notes", async () => {
    const req = {
      params: { meetingId: "bad-id" },
      user: { _id: USER_A, organization: ORG_A, role: "member" },
    };
    const res = mockRes();

    await getNoteByMeetingId(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(findByIdSpy).not.toHaveBeenCalled();
    expect(findOneSpy).not.toHaveBeenCalled();
  });

  it("handles missing meetings without querying notes", async () => {
    findByIdSpy.mockResolvedValue(null);

    const req = {
      params: { meetingId: MEETING_A.toString() },
      user: { _id: USER_A, organization: ORG_A, role: "member" },
    };
    const res = mockRes();

    await getNoteByMeetingId(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(findOneSpy).not.toHaveBeenCalled();
  });

  it("denies unauthenticated requests before meeting/note lookups", async () => {
    const req = {
      params: { meetingId: MEETING_A.toString() },
      user: null,
    };
    const res = mockRes();

    await getNoteByMeetingId(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(findByIdSpy).not.toHaveBeenCalled();
    expect(findOneSpy).not.toHaveBeenCalled();
  });

  it("never returns another user's note for an accessible meeting", async () => {
    findByIdSpy.mockResolvedValue({
      _id: MEETING_A,
      uploadedBy: OWNER_ID,
      organization: ORG_A,
    });
    // findOne is scoped by userId — simulate no note for USER_B
    findOneSpy.mockResolvedValue(null);

    const req = {
      params: { meetingId: MEETING_A.toString() },
      user: { _id: USER_B, organization: ORG_A, role: "member" },
    };
    const res = mockRes();

    await getNoteByMeetingId(req, res);

    expect(findOneSpy).toHaveBeenCalledWith({
      userId: USER_B,
      meetingId: MEETING_A,
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        note: expect.objectContaining({ content: "" }),
      }),
    );
  });
});
