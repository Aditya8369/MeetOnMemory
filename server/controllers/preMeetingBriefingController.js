import {
  generateBriefing,
  getBriefing,
} from "../services/preMeetingBriefingService.js";

export const triggerBriefingGeneration = async (req, res) => {
  try {
    const { meetingId } = req.params;

    // We start the generation process asynchronously and return a 202 Accepted
    // This prevents the frontend from hanging on a long-running Gemini request
    generateBriefing(meetingId).catch((error) => {
      console.error(
        `Briefing generation failed for meeting ${meetingId}:`,
        error,
      );
    });

    res.status(202).json({ message: "Briefing generation started" });
  } catch (error) {
    console.error("Error triggering briefing generation:", error);
    res.status(500).json({ error: "Failed to trigger briefing generation" });
  }
};

export const getBriefingByMeetingId = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const briefing = await getBriefing(meetingId);

    if (!briefing) {
      return res.status(404).json({ error: "Briefing not found" });
    }

    res.json(briefing);
  } catch (error) {
    console.error("Error retrieving briefing:", error);
    res.status(500).json({ error: "Failed to retrieve briefing" });
  }
};
