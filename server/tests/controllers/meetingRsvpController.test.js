import { jest } from "@jest/globals";

const findById = jest.fn();
const getMeetingRsvpSummary = jest.fn();
const resolveAccessibleMeeting = jest.fn();

jest.unstable_mockModule("../../models/meetingModel.js", () => ({
  default: { findById },
}));

jest.unstable_mockModule("../../services/meetingRsvpService.js", () => ({
  initializeRsvps: jest.fn(),
  updateRsvpStatus: jest.fn(),
  getPendingRsvpsForUser: jest.fn(),
  getMeetingRsvpSummary,
  getAllRsvpsForUser: jest.fn(),
}));

jest.unstable_mockModule("../../utils/resolveAccessibleMeeting.js", () => ({
  resolveAccessibleMeeting,
  default: resolveAccessibleMeeting,
}));

const { getMeetingSummary } =
  await import("../../controllers/meetingRsvpController.js");

describe("meetingRsvpController.getMeetingSummary", () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { meetingId: "meeting123" },
      user: {
        _id: "user1",
        role: "user",
        organization: "orgABC",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should retrieve RSVP summary for authorized same-organization users", async () => {
    resolveAccessibleMeeting.mockResolvedValue({
      meeting: { _id: "meeting123", organization: "orgABC" },
    });
    const mockSummary = { total: 5, participants: [{ name: "Test User" }] };
    getMeetingRsvpSummary.mockResolvedValue(mockSummary);

    await getMeetingSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockSummary,
    });
    expect(getMeetingRsvpSummary).toHaveBeenCalledWith("meeting123");
  });

  it("should return 403 for cross-organization access to prevent IDOR and PII exposure", async () => {
    resolveAccessibleMeeting.mockResolvedValue({
      error: {
        status: 403,
        message: "Forbidden: You don't have access to this meeting",
      },
    });

    await getMeetingSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(getMeetingRsvpSummary).not.toHaveBeenCalled();
  });

  it("should return 404 for nonexistent meetings", async () => {
    resolveAccessibleMeeting.mockResolvedValue({
      error: { status: 404, message: "Meeting not found" },
    });

    await getMeetingSummary(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(getMeetingRsvpSummary).not.toHaveBeenCalled();
  });
});
