import RecapSchedule from "../models/recapScheduleModel.js";
import RecapDelivery from "../models/recapDeliveryModel.js";
import { recapDeliveryQueue } from "../services/queueService.js";
import { z } from "zod";

const scheduleSchema = z.object({
  scheduleType: z.enum(["immediate", "daily", "weekly"]),
  deliveryChannel: z.enum(["email", "webhook", "in_app"]).optional(),
  preferredTime: z.string().optional(),
  timezone: z.string().optional(),
});

/**
 * Server-resolved org from requireOrganizationParamMatch, with membership fallback.
 * Never use req.params.organizationId for queries (Issue #1381).
 */
const resolveAuthorizedOrganizationId = (req) =>
  req.authorizedOrganizationId ||
  (req.user?.organization?._id || req.user?.organization)?.toString();

export const upsertSchedule = async (req, res) => {
  try {
    const organizationId = resolveAuthorizedOrganizationId(req);
    const userId = req.user._id;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Organization membership required",
      });
    }

    const parsedData = scheduleSchema.parse(req.body);

    const schedule = await RecapSchedule.findOneAndUpdate(
      { organizationId, userId },
      { ...parsedData, organizationId, userId },
      { new: true, upsert: true },
    );

    res.status(200).json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("[recapScheduleController.upsertSchedule] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSchedule = async (req, res) => {
  try {
    const organizationId = resolveAuthorizedOrganizationId(req);
    const userId = req.user._id;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Organization membership required",
      });
    }

    const schedule = await RecapSchedule.findOne({ organizationId, userId });
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    res.status(200).json(schedule);
  } catch (error) {
    console.error("[recapScheduleController.getSchedule] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDeliveryHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    // Membership org only — never trust a client-supplied organization id (#1401).
    const organizationId = resolveAuthorizedOrganizationId(req);

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Organization membership required",
      });
    }

    const deliveries = await RecapDelivery.find({ userId })
      .populate({
        path: "meetingId",
        select: "title date organization",
        // Drop meetings outside the caller's organization at populate time.
        match: { organization: organizationId },
      })
      .sort({ deliveredAt: -1 })
      .limit(50);

    // Non-matching orgs leave meetingId null — omit those rows from the response.
    const scoped = (deliveries || []).filter((d) => d.meetingId != null);

    res.status(200).json(scoped);
  } catch (error) {
    console.error("[recapScheduleController.getDeliveryHistory] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const retryDelivery = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const userId = req.user._id;
    const organizationId = resolveAuthorizedOrganizationId(req);

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Organization membership required",
      });
    }

    const delivery = await RecapDelivery.findOne({
      _id: deliveryId,
      userId,
    }).populate("meetingId", "organization title");

    if (!delivery) {
      return res.status(404).json({ error: "Delivery not found" });
    }

    const meetingOrg = (
      delivery.meetingId?.organization?._id || delivery.meetingId?.organization
    )?.toString?.();

    if (meetingOrg && meetingOrg !== organizationId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Cross-organization access denied",
      });
    }

    if (recapDeliveryQueue.isActive) {
      await recapDeliveryQueue.add("retry-delivery", {
        deliveryId: delivery._id,
        meetingId: delivery.meetingId?._id || delivery.meetingId,
        userId: delivery.userId,
      });
    } else {
      // Mock retry if queue not active
      console.log(`[Mock] Retrying delivery for ${deliveryId}`);
    }

    res.status(200).json({ message: "Delivery retry enqueued successfully" });
  } catch (error) {
    console.error("[recapScheduleController.retryDelivery] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
