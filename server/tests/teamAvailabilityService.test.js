import mongoose from "mongoose";
import { jest } from "@jest/globals";
import teamAvailabilityService from "../services/teamAvailabilityService.js";
import Meeting from "../models/meetingModel.js";
import FocusTimeBlock from "../models/focusTimeBlockModel.js";
import User from "../models/userModel.js";

// Remove jest.mock for models
// We will use jest.spyOn instead

describe("TeamAvailabilityService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("buildTeamHeatmap", () => {
    it("should generate a 7-day 24-hour grid correctly with meeting density", async () => {
      const orgId = new mongoose.Types.ObjectId().toString();
      const startDate = "2026-08-01";
      const endDate = "2026-08-07";

      // Setup mock data
      const mockUsers = [
        { _id: new mongoose.Types.ObjectId(), name: "Alice" },
        { _id: new mongoose.Types.ObjectId(), name: "Bob" },
      ];

      jest.spyOn(User, "find").mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUsers),
      });

      const mockMeeting = {
        _id: new mongoose.Types.ObjectId(),
        organization: orgId,
        date: new Date("2026-08-01T10:00:00Z"),
        time: "10:00",
        duration: 120, // 2 hours
        participants: [{ user: mockUsers[0] }, { user: mockUsers[1] }],
      };

      jest.spyOn(Meeting, "find").mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockMeeting]),
        }),
      });

      jest.spyOn(FocusTimeBlock, "find").mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const heatmap = await teamAvailabilityService.buildTeamHeatmap(
        orgId,
        startDate,
        endDate,
      );

      expect(heatmap).toHaveLength(7); // 7 days
      expect(heatmap[0].date).toBe("2026-08-01");

      // Check 10 AM slot (hour 10)
      const tenAmSlot = heatmap[0].hours.find((h) => h.hour === 10);
      expect(tenAmSlot.density).toBe(2); // Alice and Bob
      expect(tenAmSlot.busyUsers).toHaveLength(2);

      // Check 11 AM slot (hour 11) - should also have density 2 since duration is 120 mins
      const elevenAmSlot = heatmap[0].hours.find((h) => h.hour === 11);
      expect(elevenAmSlot.density).toBe(2);

      // Check 12 PM slot (hour 12) - should be empty
      const twelvePmSlot = heatmap[0].hours.find((h) => h.hour === 12);
      expect(twelvePmSlot.density).toBe(0);
    });
  });

  describe("findCommonFreeSlots", () => {
    it("should find free slots outside of meetings and focus blocks", async () => {
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();

      // Meeting 10:00 - 11:00
      const mockMeeting = {
        date: new Date("2026-08-01T10:00:00Z"),
        time: "10:00",
        duration: 60,
      };

      jest.spyOn(Meeting, "find").mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockMeeting]),
      });

      // Focus block 13:00 - 15:00
      const mockFocus = {
        startTime: new Date("2026-08-01T13:00:00Z"),
        endTime: new Date("2026-08-01T15:00:00Z"),
        isRecurring: false,
      };

      jest.spyOn(FocusTimeBlock, "find").mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockFocus]),
      });

      const freeSlots = await teamAvailabilityService.findCommonFreeSlots(
        [user1Id.toString(), user2Id.toString()],
        60, // 60 mins duration
        { startDate: "2026-08-01", endDate: "2026-08-01" },
      );

      // Expecting slots to be returned within 9 AM - 5 PM working hours
      // Busy intervals: 10:00-11:00, 13:00-15:00
      // Slots should be e.g., 09:00-10:00, 11:00-12:00, 12:00-13:00, 15:00-16:00, 16:00-17:00
      expect(freeSlots.length).toBeGreaterThan(0);

      // Verify no slots overlap with the meeting (10:00 - 11:00)
      const overlapsMeeting = freeSlots.some(
        (slot) =>
          slot.start.getTime() >= new Date("2026-08-01T10:00:00Z").getTime() &&
          slot.start.getTime() < new Date("2026-08-01T11:00:00Z").getTime(),
      );
      expect(overlapsMeeting).toBe(false);
    });
  });
});
