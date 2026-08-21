import { assignRolesForNextOccurrence } from "../roleAssignmentService.js";
import MeetingSeries from "../../models/meetingSeriesModel.js";
import RoleRotation from "../../models/roleRotationModel.js";
import mongoose from "mongoose";
import { jest } from "@jest/globals";

describe("roleAssignmentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("assigns roles using LRU correctly", async () => {
    const seriesId = new mongoose.Types.ObjectId().toString();
    const meetingId = new mongoose.Types.ObjectId().toString();
    const userA = new mongoose.Types.ObjectId().toString();
    const userB = new mongoose.Types.ObjectId().toString();
    const userC = new mongoose.Types.ObjectId().toString();

    jest.spyOn(MeetingSeries, "findById").mockResolvedValue({
      _id: seriesId,
      enableRoleRotation: true,
      roleRotationPool: [userA, userB, userC],
    });

    // Mock history: userA did facilitator yesterday, userB did scribe 2 days ago, userC never did anything.
    jest
      .spyOn(RoleRotation, "findOne")
      .mockImplementation(({ userId, role }) => {
        const q = { sort: jest.fn().mockResolvedValue(null) };

        if (userId === userA && role === "facilitator") {
          q.sort = jest
            .fn()
            .mockResolvedValue({ createdAt: new Date(Date.now() - 86400000) });
        }
        if (userId === userB && role === "scribe") {
          q.sort = jest.fn().mockResolvedValue({
            createdAt: new Date(Date.now() - 86400000 * 2),
          });
        }

        return q;
      });

    jest.spyOn(RoleRotation, "insertMany").mockResolvedValue([]);

    const assignments = await assignRolesForNextOccurrence(
      seriesId,
      meetingId,
      [userA, userB, userC],
    );

    expect(Object.keys(assignments)).toEqual([
      "facilitator",
      "scribe",
      "timekeeper",
    ]);
    expect(MeetingSeries.findById).toHaveBeenCalledWith(seriesId);
    expect(RoleRotation.insertMany).toHaveBeenCalled();
  });
});
