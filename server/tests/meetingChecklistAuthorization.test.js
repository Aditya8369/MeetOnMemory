import mongoose from "mongoose";

const meetingFindById = jest.fn();
const checklistFindOne = jest.fn();
const checklistCreate = jest.fn();
const checklistFindOneAndUpdate = jest.fn();
const checklistFindOneAndDelete = jest.fn();

jest.unstable_mockModule("../models/meetingModel.js", () => ({
  default: { findById: meetingFindById },
}));

jest.unstable_mockModule("../models/meetingChecklistModel.js", () => ({
  default: {
    findOne: checklistFindOne,
    create: checklistCreate,
    findOneAndUpdate: checklistFindOneAndUpdate,
    findOneAndDelete: checklistFindOneAndDelete,
  },
}));

const {
  createChecklist,
  getChecklist,
  toggleItem,
  deleteChecklist,
  getReadiness,
} = await import("../controllers/meetingChecklistController.js");

const makeResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const makeNext = () => jest.fn();

const meetingId = new mongoose.Types.ObjectId();
const organizationId = new mongoose.Types.ObjectId();
const ownerId = new mongoose.Types.ObjectId();
const memberId = new mongoose.Types.ObjectId();
const otherOrganizationId = new mongoose.Types.ObjectId();

const makeMeeting = (overrides = {}) => ({
  _id: meetingId,
  organization: organizationId,
  uploadedBy: ownerId,
  participants: [{ user: memberId, name: "Member" }],
  ...overrides,
});

const makeUser = (overrides = {}) => ({
  _id: ownerId,
  id: ownerId.toString(),
  organization: organizationId,
  activeOrganization: organizationId,
  role: "owner",
  ...overrides,
});

describe("Meeting Checklist authorization (Issue #1537)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects cross-organization checklist reads", async () => {
    meetingFindById.mockResolvedValue(
      makeMeeting({ organization: otherOrganizationId }),
    );

    const req = {
      params: { meetingId: meetingId.toString() },
      user: makeUser(),
    };
    const res = makeResponse();
    const next = makeNext();

    await getChecklist(req, res, next);

    expect(checklistFindOne).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "You don't have access to this meeting's organization",
      }),
    );
  });

  test("rejects checklist reads for a user without meeting access", async () => {
    const outsiderId = new mongoose.Types.ObjectId();
    meetingFindById.mockResolvedValue(
      makeMeeting({ uploadedBy: ownerId, participants: [] }),
    );

    const req = {
      params: { meetingId: meetingId.toString() },
      user: makeUser({ _id: outsiderId, id: outsiderId.toString() }),
    };
    const res = makeResponse();
    const next = makeNext();

    await getChecklist(req, res, next);

    expect(checklistFindOne).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "You don't have access to this meeting",
      }),
    );
  });

  test("allows an authorized organization member to read a checklist", async () => {
    const checklist = { meetingId, organization: organizationId, items: [] };
    meetingFindById.mockResolvedValue(makeMeeting());
    checklistFindOne.mockResolvedValue(checklist);

    const req = {
      params: { meetingId: meetingId.toString() },
      user: makeUser({
        role: "member",
        _id: memberId,
        id: memberId.toString(),
      }),
    };
    const res = makeResponse();
    const next = makeNext();

    await getChecklist(req, res, next);

    expect(checklistFindOne).toHaveBeenCalledWith({
      meetingId,
      organization: organizationId,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("prevents a viewer from modifying a checklist", async () => {
    meetingFindById.mockResolvedValue(makeMeeting());

    const req = {
      params: { meetingId: meetingId.toString() },
      user: makeUser({ role: "viewer" }),
      body: { itemIndex: 0 },
    };
    const res = makeResponse();
    const next = makeNext();

    await toggleItem(req, res, next);

    expect(checklistFindOne).not.toHaveBeenCalled();
    expect(checklistFindOneAndUpdate).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "You don't have permission to edit this meeting",
      }),
    );
  });

  test("prevents a non-owner member from creating a checklist", async () => {
    meetingFindById.mockResolvedValue(makeMeeting());

    const req = {
      params: { meetingId: meetingId.toString() },
      user: makeUser({
        role: "member",
        _id: memberId,
        id: memberId.toString(),
      }),
      body: { items: [{ text: "Prepare agenda" }] },
    };
    const res = makeResponse();
    const next = makeNext();

    await createChecklist(req, res, next);

    expect(checklistCreate).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "Only the meeting owner or an organization administrator can manage the checklist",
      }),
    );
  });

  test("scopes toggle and delete operations to the resolved meeting organization", async () => {
    const checklist = {
      meetingId,
      organization: organizationId,
      items: [{ text: "Prepare agenda" }],
      completions: [],
    };
    meetingFindById.mockResolvedValue(makeMeeting());
    checklistFindOne.mockResolvedValue(checklist);
    checklistFindOneAndUpdate.mockResolvedValue(checklist);
    checklistFindOneAndDelete.mockResolvedValue(checklist);

    const req = {
      params: { meetingId: meetingId.toString() },
      user: makeUser(),
      body: { itemIndex: 0 },
    };
    const res = makeResponse();
    const next = makeNext();

    await toggleItem(req, res, next);
    await deleteChecklist({ ...req, body: undefined }, res, next);

    expect(checklistFindOneAndUpdate).toHaveBeenCalledWith(
      { meetingId, organization: organizationId },
      expect.any(Object),
      { new: true },
    );
    expect(checklistFindOneAndDelete).toHaveBeenCalledWith({
      meetingId,
      organization: organizationId,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("does not expose readiness for a cross-organization meeting", async () => {
    meetingFindById.mockResolvedValue(
      makeMeeting({ organization: otherOrganizationId }),
    );

    const req = {
      params: { meetingId: meetingId.toString() },
      user: makeUser(),
    };
    const res = makeResponse();
    const next = makeNext();

    await getReadiness(req, res, next);

    expect(checklistFindOne).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "You don't have access to this meeting's organization",
      }),
    );
  });
});
