export const DEFAULT_MEETING_DURATION_MINUTES = 60;

const toDate = (value) => {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const buildScheduleSlot = (date, time, durationMinutes) => {
  if (!date || !time) return null;

  const [year, month, day] = String(date).split("-").map(Number);
  const [hours, minutes] = String(time).split(":").map(Number);
  const duration = Number(durationMinutes || DEFAULT_MEETING_DURATION_MINUTES);

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return null;
  }

  const start = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start.getTime() + duration * 60 * 1000);
  return { start, end };
};

export const rangesOverlap = (leftStart, leftEnd, rightStart, rightEnd) => {
  const aStart = toDate(leftStart);
  const aEnd = toDate(leftEnd);
  const bStart = toDate(rightStart);
  const bEnd = toDate(rightEnd);

  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart < bEnd && aEnd > bStart;
};

const getRecurringOccurrence = (block, day) => {
  const blockStart = toDate(block.startTime);
  const blockEnd = toDate(block.endTime);
  if (!blockStart || !blockEnd) return null;

  const duration = blockEnd.getTime() - blockStart.getTime();
  if (duration <= 0) return null;

  const occurrence = new Date(day);
  occurrence.setHours(
    blockStart.getHours(),
    blockStart.getMinutes(),
    blockStart.getSeconds(),
    blockStart.getMilliseconds(),
  );

  return {
    start: occurrence,
    end: new Date(occurrence.getTime() + duration),
  };
};

export const findFocusConflicts = (blocks = [], slot) => {
  if (!slot) return [];

  const conflicts = [];
  const seen = new Set();

  for (const block of blocks) {
    if (!block) continue;

    if (block.isRecurring) {
      const firstDay = new Date(slot.start);
      firstDay.setHours(0, 0, 0, 0);
      const lastDay = new Date(slot.end);
      lastDay.setHours(0, 0, 0, 0);

      for (
        const day = new Date(firstDay);
        day <= lastDay;
        day.setDate(day.getDate() + 1)
      ) {
        if (
          !Array.isArray(block.daysOfWeek) ||
          !block.daysOfWeek.includes(day.getDay())
        ) {
          continue;
        }

        const occurrence = getRecurringOccurrence(block, day);
        if (
          occurrence &&
          rangesOverlap(slot.start, slot.end, occurrence.start, occurrence.end)
        ) {
          const key = `${block._id || block.id || block.title || "focus"}-${occurrence.start.toISOString()}`;
          if (!seen.has(key)) {
            seen.add(key);
            conflicts.push({
              ...block,
              conflictStart: occurrence.start,
              conflictEnd: occurrence.end,
            });
          }
        }
      }
      continue;
    }

    const start = toDate(block.startTime);
    const end = toDate(block.endTime);
    if (rangesOverlap(slot.start, slot.end, start, end)) {
      conflicts.push({
        ...block,
        conflictStart: start,
        conflictEnd: end,
      });
    }
  }

  return conflicts.sort((a, b) => a.conflictStart - b.conflictStart);
};

const collectBusyMaps = (freeBusyData = {}) => {
  const maps = [];
  for (const provider of ["google", "microsoft"]) {
    if (
      freeBusyData?.[provider] &&
      typeof freeBusyData[provider] === "object"
    ) {
      maps.push(freeBusyData[provider]);
    }
  }

  if (freeBusyData?.data && typeof freeBusyData.data === "object") {
    return collectBusyMaps(freeBusyData.data);
  }

  if (maps.length === 0 && typeof freeBusyData === "object") {
    maps.push(freeBusyData);
  }
  return maps;
};

export const findBusyParticipants = (
  freeBusyData = {},
  participants = [],
  slot,
) => {
  if (!slot) return [];

  const requested = new Map(
    participants
      .filter((participant) => participant?.email)
      .map((participant) => [
        participant.email.trim().toLowerCase(),
        participant,
      ]),
  );

  const busy = [];
  const seen = new Set();

  for (const map of collectBusyMaps(freeBusyData)) {
    for (const [email, calendar] of Object.entries(map || {})) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!requested.has(normalizedEmail)) continue;

      for (const interval of calendar?.busy || []) {
        if (
          !rangesOverlap(slot.start, slot.end, interval.start, interval.end)
        ) {
          continue;
        }

        const key = `${normalizedEmail}-${interval.start}-${interval.end}`;
        if (seen.has(key)) continue;
        seen.add(key);

        busy.push({
          email: requested.get(normalizedEmail)?.email || email,
          name: requested.get(normalizedEmail)?.name || email,
          start: new Date(interval.start),
          end: new Date(interval.end),
        });
      }
    }
  }

  return busy.sort((a, b) => a.start - b.start);
};
