const calendarService = require("./calendarService");

/**
 * @desc Core scheduling algorithm that analyzes participant availability
 * and generates ranked time slot proposals based on constraints and preferences.
 */
class SmartScheduler {
  /**
   * Generates optimal meeting slots for a group of participants.
   * @param {Object} params - { participants, duration, dateRange, preferences, organizerToken }
   * @returns {Promise<Array>} Array of proposed slots with scores.
   */
  static async generateProposals({
    participants,
    duration,
    dateRange,
    preferences,
    organizerToken,
  }) {
    // 1. Fetch calendar availability for all participants
    const emails = participants.map((p) => p.email);
    const freeBusyData = await calendarService.getGoogleFreeBusy(
      emails,
      dateRange.start,
      dateRange.end,
      organizerToken,
    );

    // 2. Generate all possible time slots within the date range
    const allSlots = this.generateTimeSlots(
      dateRange.start,
      dateRange.end,
      duration,
      preferences,
    );

    // 3. Score and rank each slot based on availability and preferences
    const scoredSlots = allSlots.map((slot) => {
      const analysis = this.analyzeSlot(
        slot,
        participants,
        freeBusyData,
        preferences,
      );
      return {
        startTime: slot.start,
        endTime: slot.end,
        score: analysis.score,
        conflicts: analysis.conflicts,
        attendeeCount: analysis.attendeeCount,
      };
    });

    // 4. Sort by score descending and return top 10
    return scoredSlots
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .filter((slot) => slot.score > 0); // Only return viable slots
  }

  /**
   * Generates discrete time slots (e.g., every 30 mins) within a date range.
   */
  static generateTimeSlots(startDate, endDate, duration, preferences) {
    const slots = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    const step = 30 * 60 * 1000; // 30-minute intervals

    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + duration * 60 * 1000);

      // Apply preference filters
      if (this.isValidSlot(slotStart, slotEnd, preferences)) {
        slots.push({ start: slotStart, end: slotEnd });
      }

      current.setTime(current.getTime() + step);
    }

    return slots;
  }

  /**
   * Checks if a slot meets basic preference constraints (working hours, weekends).
   */
  static isValidSlot(start, end, preferences) {
    const dayOfWeek = start.getDay();
    const hour = start.getHours();

    // Avoid weekends if preferred
    if (preferences.avoidWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return false;
    }

    // Standard working hours (9 AM - 6 PM)
    if (hour < 9 || hour >= 18) {
      return false;
    }

    // Ensure meeting doesn't end after 6 PM
    if (end.getHours() >= 18 && end.getMinutes() > 0) {
      return false;
    }

    return true;
  }

  /**
   * Calculates an optimality score (0-100) for a specific time slot.
   */
  static analyzeSlot(slot, participants, freeBusyData, preferences) {
    let score = 100;
    const conflicts = [];
    let availableCount = 0;

    participants.forEach((participant) => {
      const busyIntervals = freeBusyData[participant.email]?.busy || [];
      const isBusy = this.hasConflict(slot, busyIntervals);

      if (isBusy) {
        conflicts.push(participant._id || participant.id);
        score -= 20; // Heavy penalty for conflicts
      } else {
        availableCount++;
      }
    });

    // Bonus for high attendance
    const attendanceRate = availableCount / participants.length;
    score += attendanceRate * 20; // Up to +20 points for 100% attendance

    // Bonus for preferred times (e.g., mornings)
    const hour = slot.start.getHours();
    if (
      preferences.preferredTimes?.includes("morning") &&
      hour >= 9 &&
      hour < 12
    ) {
      score += 10;
    } else if (
      preferences.preferredTimes?.includes("afternoon") &&
      hour >= 13 &&
      hour < 17
    ) {
      score += 10;
    }

    // Penalty for very early or very late times (timezone fairness)
    if (hour < 9 || hour >= 17) {
      score -= 15;
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      conflicts,
      attendeeCount: availableCount,
    };
  }

  /**
   * Checks if a proposed slot overlaps with any busy intervals.
   */
  static hasConflict(slot, busyIntervals) {
    return busyIntervals.some((busy) => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);

      // Overlap condition: A starts before B ends AND A ends after B starts
      return slot.start < busyEnd && slot.end > busyStart;
    });
  }
}

module.exports = SmartScheduler;
