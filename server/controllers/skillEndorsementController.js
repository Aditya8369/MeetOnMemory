import skillEndorsementService from "../services/skillEndorsementService.js";

export const createEndorsement = async (req, res) => {
  try {
    const { recipientId, meetingId, skillTag, comment, visibility } = req.body;
    const endorserId = req.user._id;

    if (!recipientId || !meetingId || !skillTag) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const endorsement = await skillEndorsementService.createEndorsement({
      endorserId,
      recipientId,
      meetingId,
      skillTag,
      comment,
      visibility,
    });

    res.status(201).json({ success: true, data: endorsement });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "You have already endorsed this user for this skill in this meeting.",
        });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMeetingEndorsements = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const endorsements =
      await skillEndorsementService.getEndorsementsForMeeting(meetingId);
    res.status(200).json({ success: true, data: endorsements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserEndorsements = async (req, res) => {
  try {
    const { userId } = req.params;
    const skills = await skillEndorsementService.aggregateUserSkills(userId);
    res.status(200).json({ success: true, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
