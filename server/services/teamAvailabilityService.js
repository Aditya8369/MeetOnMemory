import mongoose from "mongoose";
import Meeting from "../models/meetingModel.js";
import FocusTimeBlock from "../models/focusTimeBlockModel.js";
import AvailabilityPreference from "../models/availabilityPreferenceModel.js";
import User from "../models/userModel.js";

class TeamAvailabilityService {
  async getPreferences(userId, orgId) {
    const prefs = await AvailabilityPreference.findOne({
      user: userId,
      organization: orgId,
    });
    if (!prefs) {
      // Return default preferences if not set
      return {
        timezone: "UTC",
        weeklyHours: [
          {
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "17:00",
            isAvailable: true,
          },
          {
            dayOfWeek: 2,
            startTime: "09:00",
            endTime: "17:00",
            isAvailable: true,
          },
          {
            dayOfWeek: 3,
            startTime: "09:00",
            endTime: "17:00",
            isAvailable: true,
          },
          {
            dayOfWeek: 4,
            startTime: "09:00",
            endTime: "17:00",
            isAvailable: true,
          },
          {
            dayOfWeek: 5,
            startTime: "09:00",
            endTime: "17:00",
            isAvailable: true,
          },
        ],
        meetingLoadLimit: 4,
        bufferBetweenMeetings: 0,
      };
    }
    return prefs;
  }

  async updatePreferences(userId, orgId, preferences) {
    const updated = await AvailabilityPreference.findOneAndUpdate(
      { user: userId, organization: orgId },
      { $set: preferences },
      { new: true, upsert: true },
    );
    return updated;
  }

  async buildTeamHeatmap(orgId, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all users in the org
    const users = await User.find({ organization: orgId }, "_id name").lean();
    const userIds = users.map((u) => u._id);

    // Get all meetings in the range for this org
    const meetings = await Meeting.find({
      organization: orgId,
      date: { $gte: start, $lte: end },
      status: { $ne: "failed" },
      deletedAt: null,
    })
      .populate("participants.user", "name")
      .lean();

    // Get all focus time blocks for these users in range (simplified for non-recurring)
    // In a real app we'd need to expand recurring blocks
    const focusBlocks = await FocusTimeBlock.find({
      userId: { $in: userIds },
      $or: [{ startTime: { $gte: start, $lte: end } }, { isRecurring: true }],
    }).lean();

    // Generate grid: 7 days x 24 hours
    // We'll return an array of { date, hours: [{ hour: 0, density: 0, users: [] }] }
    const grid = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayData = { date: dateStr, hours: [] };

      for (let h = 0; h < 24; h++) {
        dayData.hours.push({ hour: h, density: 0, busyUsers: [] });
      }
      grid.push(dayData);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Populate meetings
    meetings.forEach((meeting) => {
      if (!meeting.duration || meeting.duration <= 0) return;

      const mDate = new Date(meeting.date);

      // Basic time parsing assuming time is "HH:mm" and matches date (UTC)
      let startHour = mDate.getUTCHours();
      let startMins = mDate.getUTCMinutes();
      if (meeting.time) {
        const [h, m] = meeting.time.split(":").map(Number);
        startHour = h;
        startMins = m;
      }

      const durationMs = meeting.duration * 60000;
      const mStart = new Date(mDate);
      mStart.setUTCHours(startHour, startMins, 0, 0);
      const mEnd = new Date(mStart.getTime() + durationMs);

      // Find the grid slot
      const daySlot = grid.find(
        (d) => d.date === mStart.toISOString().split("T")[0],
      );
      if (daySlot) {
        // Mark users as busy
        const busyUserIds = meeting.participants
          .filter((p) => p.user)
          .map((p) => (p.user._id ? p.user._id.toString() : p.user.toString()));

        // Distribute across hours
        let currTime = new Date(mStart);
        while (currTime < mEnd) {
          const h = currTime.getUTCHours();
          const hourSlot = daySlot.hours.find((hr) => hr.hour === h);
          if (hourSlot) {
            busyUserIds.forEach((uid) => {
              if (!hourSlot.busyUsers.some((u) => u.id === uid)) {
                const userObj = users.find((u) => u._id.toString() === uid);
                hourSlot.busyUsers.push({
                  id: uid,
                  name: userObj ? userObj.name : "Unknown",
                  type: "meeting",
                });
                hourSlot.density += 1;
              }
            });
          }
          currTime.setUTCHours(currTime.getUTCHours() + 1, 0, 0, 0); // Jump to next hour
        }
      }
    });

    // Populate focus blocks (simplified handling)
    focusBlocks.forEach((block) => {
      // If recurring, we would need to check if it applies to each day in the grid
      // For simplicity, just handling non-recurring here
      if (!block.isRecurring) {
        const bStart = new Date(block.startTime);
        const bEnd = new Date(block.endTime);
        const bDateStr = bStart.toISOString().split("T")[0];

        const daySlot = grid.find((d) => d.date === bDateStr);
        if (daySlot) {
          let currTime = new Date(bStart);
          while (currTime < bEnd) {
            const h = currTime.getUTCHours();
            const hourSlot = daySlot.hours.find((hr) => hr.hour === h);
            if (hourSlot) {
              const uid = block.userId.toString();
              if (!hourSlot.busyUsers.some((u) => u.id === uid)) {
                const userObj = users.find((u) => u._id.toString() === uid);
                hourSlot.busyUsers.push({
                  id: uid,
                  name: userObj ? userObj.name : "Unknown",
                  type: "focus",
                });
                hourSlot.density += 1;
              }
            }
            currTime.setUTCHours(currTime.getUTCHours() + 1, 0, 0, 0);
          }
        }
      } else {
        // Handle recurring block matching days of week
        grid.forEach((daySlot) => {
          const d = new Date(daySlot.date);
          const dayOfWeek = d.getUTCDay();
          if (block.daysOfWeek.includes(dayOfWeek)) {
            const bStart = new Date(block.startTime);
            const bEnd = new Date(block.endTime);
            let startH = bStart.getUTCHours();
            let endH = bEnd.getUTCHours();

            for (let h = startH; h <= endH; h++) {
              const hourSlot = daySlot.hours.find((hr) => hr.hour === h);
              if (hourSlot) {
                const uid = block.userId.toString();
                if (!hourSlot.busyUsers.some((u) => u.id === uid)) {
                  const userObj = users.find((u) => u._id.toString() === uid);
                  hourSlot.busyUsers.push({
                    id: uid,
                    name: userObj ? userObj.name : "Unknown",
                    type: "focus",
                  });
                  hourSlot.density += 1;
                }
              }
            }
          }
        });
      }
    });

    return grid;
  }

  async findCommonFreeSlots(userIds, durationMinutes, dateRange) {
    // A simplified slot finder
    const { startDate, endDate } = dateRange;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // Assume we're looking in org context, but we don't strictly need orgId if we have userIds
    // Get meetings for these users
    const userObjectIds = userIds.map((id) => new mongoose.Types.ObjectId(id));

    const meetings = await Meeting.find({
      "participants.user": { $in: userObjectIds },
      date: { $gte: start, $lte: end },
      status: { $ne: "failed" },
      deletedAt: null,
    }).lean();

    const focusBlocks = await FocusTimeBlock.find({
      userId: { $in: userObjectIds },
      $or: [{ startTime: { $gte: start, $lte: end } }, { isRecurring: true }],
    }).lean();

    // Map busy times
    const busyIntervals = []; // Array of {start: timestamp, end: timestamp}

    meetings.forEach((m) => {
      if (!m.duration) return;
      const mStart = new Date(m.date);
      if (m.time) {
        const [h, min] = m.time.split(":").map(Number);
        mStart.setUTCHours(h, min, 0, 0);
      }
      const mEnd = new Date(mStart.getTime() + m.duration * 60000);
      busyIntervals.push({ start: mStart.getTime(), end: mEnd.getTime() });
    });

    focusBlocks.forEach((b) => {
      if (!b.isRecurring) {
        busyIntervals.push({
          start: new Date(b.startTime).getTime(),
          end: new Date(b.endTime).getTime(),
        });
      }
      // Note: skipping recurring mapping for brevity in this simple finder
    });

    // Sort intervals
    busyIntervals.sort((a, b) => a.start - b.start);

    // Merge overlapping intervals
    const mergedIntervals = [];
    if (busyIntervals.length > 0) {
      let current = busyIntervals[0];
      for (let i = 1; i < busyIntervals.length; i++) {
        if (busyIntervals[i].start <= current.end) {
          current.end = Math.max(current.end, busyIntervals[i].end);
        } else {
          mergedIntervals.push(current);
          current = busyIntervals[i];
        }
      }
      mergedIntervals.push(current);
    }

    // Find gaps
    const freeSlots = [];
    const durationMs = durationMinutes * 60000;
    const workingStartHour = 9; // 9 AM UTC
    const workingEndHour = 17; // 5 PM UTC

    let currTime = new Date(start);
    currTime.setUTCHours(workingStartHour, 0, 0, 0);

    while (currTime <= end) {
      const dayEnd = new Date(currTime);
      dayEnd.setUTCHours(workingEndHour, 0, 0, 0);

      let searchTime = currTime.getTime();
      const searchDayEnd = dayEnd.getTime();

      while (searchTime + durationMs <= searchDayEnd) {
        const proposedEnd = searchTime + durationMs;

        // Check if this slot overlaps with any busy interval
        const isConflict = mergedIntervals.some(
          (interval) =>
            (searchTime >= interval.start && searchTime < interval.end) ||
            (proposedEnd > interval.start && proposedEnd <= interval.end) ||
            (searchTime <= interval.start && proposedEnd >= interval.end),
        );

        if (!isConflict) {
          freeSlots.push({
            start: new Date(searchTime),
            end: new Date(proposedEnd),
          });
          // Jump ahead to find next distinct slot (or we could just increment by e.g. 30 mins)
          searchTime += durationMs;
        } else {
          // Find the conflicting interval and jump to its end
          const conflict = mergedIntervals.find(
            (interval) =>
              (searchTime >= interval.start && searchTime < interval.end) ||
              (proposedEnd > interval.start && proposedEnd <= interval.end) ||
              (searchTime <= interval.start && proposedEnd >= interval.end),
          );
          searchTime = conflict ? conflict.end : searchTime + 30 * 60000;
        }
      }

      currTime.setDate(currTime.getDate() + 1);
      currTime.setUTCHours(workingStartHour, 0, 0, 0);
    }

    return freeSlots;
  }

  async calculateLoadDistribution(orgId, dateRange) {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);

    const meetings = await Meeting.find({
      organization: orgId,
      date: { $gte: start, $lte: end },
      status: { $ne: "failed" },
      deletedAt: null,
    }).lean();

    const distributionByDay = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }; // Sunday to Saturday
    const distributionByHour = Array(24).fill(0);

    meetings.forEach((m) => {
      if (!m.duration) return;
      const mDate = new Date(m.date);
      let startHour = mDate.getUTCHours();
      if (m.time) {
        const [h] = m.time.split(":").map(Number);
        startHour = h;
      }

      distributionByDay[mDate.getUTCDay()] += 1;
      distributionByHour[startHour] += 1;
    });

    return {
      byDay: distributionByDay,
      byHour: distributionByHour,
    };
  }
}

export default new TeamAvailabilityService();
