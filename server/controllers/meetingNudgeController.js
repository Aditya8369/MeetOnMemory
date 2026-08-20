import {
  getPersonalNudges,
  updateNudgeStatus,
  getMeetingReadiness,
} from "../services/meetingNudgeService.js";

export const getMyNudges = async (req, res) => {
  try {
    const nudges = await getPersonalNudges(
      req.user._id,
      req.query.organization,
    );
    res.json(nudges);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch nudges", error: err.message });
  }
};

export const updateNudge = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["PENDING", "SENT", "DISMISSED", "ACTED_ON"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const updated = await updateNudgeStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ message: "Nudge not found" });
    res.json(updated);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update nudge", error: err.message });
  }
};

export const getReadiness = async (req, res) => {
  try {
    const readiness = await getMeetingReadiness(req.params.meetingId);
    res.json(readiness || { averageScore: 100, participants: [] });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch readiness", error: err.message });
  }
};
