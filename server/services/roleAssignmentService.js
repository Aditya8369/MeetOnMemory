import RoleRotation from "../models/roleRotationModel.js";
import MeetingSeries from "../models/meetingSeriesModel.js";

/**
 * Assigns roles for the next occurrence of a meeting series using an LRU algorithm.
 * @param {string} seriesId
 * @param {string} meetingId
 * @param {string[]} participantIds - the pool of available participants for this meeting
 */
export const assignRolesForNextOccurrence = async (
  seriesId,
  meetingId,
  participantIds,
) => {
  const series = await MeetingSeries.findById(seriesId);
  if (!series || !series.enableRoleRotation) {
    return null;
  }

  // Intersect participantIds with the series rotation pool
  const pool = series.roleRotationPool.map((id) => id.toString());
  const availablePool = participantIds.filter((id) =>
    pool.includes(id.toString()),
  );

  if (availablePool.length === 0) {
    return null;
  }

  const roles = ["facilitator", "scribe", "timekeeper"];
  const assignments = {};
  let remainingPool = [...availablePool];

  for (const role of roles) {
    if (remainingPool.length === 0) break;

    // Find the user in remainingPool who hasn't done this role the longest
    let lruUser = remainingPool[0];
    let oldestDate = new Date();

    for (const userId of remainingPool) {
      const lastRotation = await RoleRotation.findOne({
        seriesId,
        userId,
        role,
      }).sort({ createdAt: -1 });
      if (!lastRotation) {
        // Never done it, pick immediately
        lruUser = userId;
        break;
      } else if (lastRotation.createdAt < oldestDate) {
        oldestDate = lastRotation.createdAt;
        lruUser = userId;
      }
    }

    assignments[role] = lruUser;
    remainingPool = remainingPool.filter((id) => id !== lruUser);
  }

  // Persist the assignments
  const rotationDocs = Object.keys(assignments).map((role) => ({
    seriesId,
    meetingId,
    userId: assignments[role],
    role,
  }));

  if (rotationDocs.length > 0) {
    await RoleRotation.insertMany(rotationDocs);
  }

  return assignments;
};

export const getRoleAssignmentsForMeeting = async (meetingId) => {
  const assignments = await RoleRotation.find({ meetingId }).populate(
    "userId",
    "name email",
  );
  return assignments;
};

export const overrideRoleAssignment = async (
  seriesId,
  meetingId,
  userId,
  role,
) => {
  // Remove existing assignment for this role in this meeting
  await RoleRotation.findOneAndDelete({ meetingId, role });

  // Create new assignment
  const newAssignment = new RoleRotation({
    seriesId,
    meetingId,
    userId,
    role,
  });
  await newAssignment.save();
  return newAssignment;
};
