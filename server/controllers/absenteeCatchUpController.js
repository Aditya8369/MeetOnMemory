import AbsenteeCatchUpService from "../services/absenteeCatchUpService.js";

/**
 * Get all pending catch-ups for the authenticated user.
 */
export const getMyCatchUps = async (req, res) => {
  try {
    const userId = req.user.id;
    const catchUps = await AbsenteeCatchUpService.getPendingCatchUps(userId);
    res.status(200).json({ success: true, catchUps });
  } catch (error) {
    console.error("Error fetching catch-ups:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch catch-ups" });
  }
};

/**
 * Mark a catch-up digest as read.
 */
export const markCatchUpAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await AbsenteeCatchUpService.markAsRead(id);
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Catch-up not found" });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Error marking catch-up read:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to mark catch-up read" });
  }
};

/**
 * Manually trigger delivery for a catch-up (can be used by organizer or system).
 */
export const deliverCatchUp = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await AbsenteeCatchUpService.deliverCatchUp(id);
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Catch-up not found" });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Error delivering catch-up:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to deliver catch-up" });
  }
};
