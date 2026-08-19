import mongoose from "mongoose";
import FocusTimeService from "../services/focusTimeService.js";
import FocusTimeBlock from "../models/focusTimeBlockModel.js";
import { addDays } from "date-fns";

describe("FocusTimeService", () => {
  const userId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    // In a real environment, we'd connect to an in-memory db here.
    // Assuming jest is set up to handle db connection globally in setupTests.
  });

  afterEach(async () => {
    await FocusTimeBlock.deleteMany({});
  });

  describe("expandRecurringBlock", () => {
    it("should expand a recurring block over a date range", () => {
      const today = new Date();
      const nextWeek = addDays(today, 7);

      const block = {
        startTime: new Date("2023-01-01T09:00:00Z"),
        endTime: new Date("2023-01-01T11:00:00Z"),
        isRecurring: true,
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      };

      const occurrences = FocusTimeService.expandRecurringBlock(
        block,
        today,
        nextWeek,
      );

      // Should find at least one occurrence in a 7-day span
      expect(occurrences.length).toBeGreaterThan(0);
      occurrences.forEach((occ) => {
        expect(occ.start.getHours()).toBe(9);
        expect(occ.end.getHours()).toBe(11);
      });
    });
  });

  describe("getActiveIntervals", () => {
    it("should return intervals for non-recurring blocks", async () => {
      const today = new Date();
      const tomorrow = addDays(today, 1);

      await FocusTimeBlock.create({
        userId,
        startTime: today,
        endTime: tomorrow,
        isRecurring: false,
      });

      const intervals = await FocusTimeService.getActiveIntervals(
        userId,
        addDays(today, -1),
        addDays(tomorrow, 1),
      );

      expect(intervals.length).toBe(1);
    });
  });

  describe("isTimeSlotProtected", () => {
    it("should return true if a slot overlaps with a focus block", async () => {
      const start = new Date("2024-01-01T10:00:00Z");
      const end = new Date("2024-01-01T12:00:00Z");

      await FocusTimeBlock.create({
        userId,
        startTime: start,
        endTime: end,
        isRecurring: false,
      });

      // Complete overlap
      const result = await FocusTimeService.isTimeSlotProtected(
        userId,
        new Date("2024-01-01T10:30:00Z"),
        new Date("2024-01-01T11:30:00Z"),
      );

      expect(result).toBe(true);
    });

    it("should return false if there is no overlap", async () => {
      const start = new Date("2024-01-01T10:00:00Z");
      const end = new Date("2024-01-01T12:00:00Z");

      await FocusTimeBlock.create({
        userId,
        startTime: start,
        endTime: end,
        isRecurring: false,
      });

      // No overlap
      const result = await FocusTimeService.isTimeSlotProtected(
        userId,
        new Date("2024-01-01T13:00:00Z"),
        new Date("2024-01-01T14:00:00Z"),
      );

      expect(result).toBe(false);
    });
  });
});
