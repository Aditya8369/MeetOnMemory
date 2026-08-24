import {
  generateIcebreakers,
  selectIcebreaker,
} from "../services/icebreakerService.js";

export const generate = async (req, res, next) => {
  try {
    const { meetingId, participantIds } = req.body;
    const organizationId = req.user.organization;

    if (!meetingId && (!participantIds || participantIds.length === 0)) {
      return res
        .status(400)
        .json({ error: "meetingId or participantIds required" });
    }

    const icebreakers = await generateIcebreakers(
      meetingId,
      organizationId,
      participantIds,
    );
    res.status(200).json({ icebreakers });
  } catch (error) {
    console.error("Error in icebreakerController.generate:", error);
    next(error);
  }
};

export const select = async (req, res, next) => {
  try {
    const { meetingId, category, promptText } = req.body;
    const organizationId = req.user.organization;

    if (!meetingId || !category || !promptText) {
      return res
        .status(400)
        .json({ error: "meetingId, category, and promptText are required" });
    }

    const icebreaker = await selectIcebreaker(
      meetingId,
      organizationId,
      category,
      promptText,
    );
    res.status(200).json(icebreaker);
  } catch (error) {
    console.error("Error in icebreakerController.select:", error);
    next(error);
  }
};

export const getActiveIcebreaker = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    // Assume the most recently created or updated icebreaker for this meeting is active
    const icebreaker = await import("../models/icebreakerModel.js")
      .then((m) => m.default)
      .then((Icebreaker) =>
        Icebreaker.findOne({ usedInMeetings: meetingId }).sort({
          updatedAt: -1,
        }),
      );

    if (icebreaker) {
      res.status(200).json({ icebreaker });
    } else {
      res.status(404).json({ message: "No active icebreaker found" });
    }
  } catch (error) {
    console.error("Error fetching active icebreaker:", error);
    next(error);
  }
};
