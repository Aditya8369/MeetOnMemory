import { jest } from "@jest/globals";
import mongoose from "mongoose";

const mockMeetingFindById = jest.fn();
const mockClipFindById = jest.fn();
const mockExtractSegments = jest.fn();

jest.unstable_mockModule("../models/meetingModel.js", () => ({
  default: {
    findById: (...args) => mockMeetingFindById(...args),
  },
}));

jest.unstable_mockModule("../models/meetingClipModel.js", () => {
  const MeetingClip = function MeetingClip(doc) {
    Object.assign(this, doc);
    this.save = jest.fn().mockResolvedValue(this);
  };
  MeetingClip.findById = (...args) => mockClipFindById(...args);
  MeetingClip.findByIdAndDelete = jest.fn();
  return { default: MeetingClip };
});

jest.unstable_mockModule("../services/clipExtractionService.js", () => ({
  default: {
    extractSegments: (...args) => mockExtractSegments(...args),
  },
}));

const { requireOrgAccess } = await import("../middleware/rbac.js");
const { createClip, updateClip, deleteClip } =
  await import("../controllers/meetingClipController.js");
const { default: Meeting } = await import("../models/meetingModel.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();

const makeRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status: jest.fn(function (code) {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn(function (body) {
      res.body = body;
      return res;
    }),
  };
  return res;
};

const userInOrg = (org = ORG_A, role = "member") => ({
  _id: new mongoose.Types.ObjectId(),
  organization: org,
  role,
});

describe("Meeting clip tenant isolation (#1987)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks listing clips when requireOrgAccess sees a different organization", async () => {
    const meetingId = new mongoose.Types.ObjectId();
    mockMeetingFindById.mockResolvedValue({
      _id: meetingId,
      organization: ORG_A,
      uploadedBy: new mongoose.Types.ObjectId(),
    });

    const req = {
      params: { meetingId: meetingId.toString() },
      user: userInOrg(ORG_B),
    };
    const res = makeRes();
    const next = jest.fn();

    await requireOrgAccess(Meeting)(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/don't have access/i);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects creating a clip for a meeting in another organization", async () => {
    const meetingId = new mongoose.Types.ObjectId();
    mockMeetingFindById.mockResolvedValue({
      _id: meetingId,
      organization: ORG_A,
      uploadedBy: new mongoose.Types.ObjectId(),
    });

    const req = {
      body: {
        meetingId: meetingId.toString(),
        title: "Foreign clip",
        startTime: 0,
        endTime: 10,
      },
      user: userInOrg(ORG_B),
    };
    const res = makeRes();

    await createClip(req, res);

    expect(res.statusCode).toBe(403);
    expect(mockExtractSegments).not.toHaveBeenCalled();
  });

  it("does not leak a clip from another organization on update or delete", async () => {
    const clipId = new mongoose.Types.ObjectId();
    const meetingId = new mongoose.Types.ObjectId();
    mockClipFindById.mockResolvedValue({
      _id: clipId,
      meeting: meetingId,
      createdBy: new mongoose.Types.ObjectId(),
      title: "Secret",
    });
    mockMeetingFindById.mockResolvedValue({
      _id: meetingId,
      organization: ORG_A,
      uploadedBy: new mongoose.Types.ObjectId(),
    });

    const req = {
      params: { clipId: clipId.toString() },
      body: { title: "Hijacked" },
      user: userInOrg(ORG_B),
    };

    const updateRes = makeRes();
    await updateClip(req, updateRes);
    expect(updateRes.statusCode).toBe(404);

    const deleteRes = makeRes();
    await deleteClip(req, deleteRes);
    expect(deleteRes.statusCode).toBe(404);
  });
});
