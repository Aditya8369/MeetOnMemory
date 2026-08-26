import SkillEndorsement from "../models/skillEndorsementModel.js";
import Meeting from "../models/meetingModel.js";
import mongoose from "mongoose";

class SkillEndorsementService {
  async createEndorsement(data) {
    const {
      endorserId,
      recipientId,
      meetingId,
      skillTag,
      comment,
      visibility,
    } = data;

    if (endorserId.toString() === recipientId.toString()) {
      throw new Error("You cannot endorse yourself.");
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error("Meeting not found.");
    }

    // Check if both users attended the meeting
    const isEndorserParticipant = meeting.participants.some(
      (p) => p.user && p.user.toString() === endorserId.toString(),
    );
    const isRecipientParticipant = meeting.participants.some(
      (p) => p.user && p.user.toString() === recipientId.toString(),
    );

    if (!isEndorserParticipant || !isRecipientParticipant) {
      throw new Error("Both users must be participants in the meeting.");
    }

    // Determine organization ID if present
    const organizationId = meeting.organization || null;

    const endorsement = new SkillEndorsement({
      endorserId,
      recipientId,
      meetingId,
      organizationId,
      skillTag,
      comment,
      visibility,
    });

    await endorsement.save();
    return endorsement;
  }

  async getEndorsementsForMeeting(meetingId) {
    return SkillEndorsement.find({ meetingId })
      .populate("endorserId", "name profilePic")
      .populate("recipientId", "name profilePic")
      .sort({ createdAt: -1 });
  }

  async aggregateUserSkills(userId) {
    return SkillEndorsement.aggregate([
      { $match: { recipientId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$skillTag",
          count: { $sum: 1 },
          endorsements: {
            $push: {
              meetingId: "$meetingId",
              endorserId: "$endorserId",
              comment: "$comment",
              createdAt: "$createdAt",
            },
          },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          skillTag: "$_id",
          count: 1,
          endorsements: { $slice: ["$endorsements", 5] }, // Top 5 recent for preview
          _id: 0,
        },
      },
    ]);
  }
}

export default new SkillEndorsementService();
