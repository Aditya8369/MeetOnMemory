import MeetingRisk from "../models/meetingRiskModel.js";
import Meeting from "../models/meetingModel.js";
import { calculateRiskScore } from "../services/riskScoringService.js";

export const createRisk = async (req, res) => {
  try {
    const {
      meetingId,
      title,
      description,
      category,
      probability,
      impact,
      mitigationPlan,
      ownerId,
    } = req.body;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    const riskScore = calculateRiskScore(probability, impact);

    const newRisk = await MeetingRisk.create({
      meetingId,
      organizationId: meeting.organization,
      title,
      description,
      category,
      probability,
      impact,
      riskScore,
      mitigationPlan,
      ownerId,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: newRisk });
  } catch (error) {
    console.error("Error creating risk:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getRisksByOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const risks = await MeetingRisk.find({ organizationId })
      .populate("meetingId", "title date")
      .populate("ownerId", "firstName lastName avatar")
      .populate("actionItemIds")
      .sort("-createdAt");

    res.status(200).json({ success: true, data: risks });
  } catch (error) {
    console.error("Error fetching organization risks:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getRisksByMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const risks = await MeetingRisk.find({ meetingId })
      .populate("ownerId", "firstName lastName avatar")
      .populate("actionItemIds")
      .sort("-createdAt");

    res.status(200).json({ success: true, data: risks });
  } catch (error) {
    console.error("Error fetching meeting risks:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateRisk = async (req, res) => {
  try {
    const { riskId } = req.params;
    const {
      title,
      description,
      category,
      probability,
      impact,
      status,
      mitigationPlan,
      ownerId,
    } = req.body;

    const risk = await MeetingRisk.findById(riskId);
    if (!risk) {
      return res
        .status(404)
        .json({ success: false, message: "Risk not found" });
    }

    if (title) risk.title = title;
    if (description !== undefined) risk.description = description;
    if (category) risk.category = category;
    if (probability !== undefined) risk.probability = probability;
    if (impact !== undefined) risk.impact = impact;
    if (status) risk.status = status;
    if (mitigationPlan !== undefined) risk.mitigationPlan = mitigationPlan;
    if (ownerId !== undefined) risk.ownerId = ownerId;

    if (probability !== undefined || impact !== undefined) {
      risk.riskScore = calculateRiskScore(risk.probability, risk.impact);
    }

    await risk.save();

    res.status(200).json({ success: true, data: risk });
  } catch (error) {
    console.error("Error updating risk:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteRisk = async (req, res) => {
  try {
    const { riskId } = req.params;
    const risk = await MeetingRisk.findByIdAndDelete(riskId);
    if (!risk) {
      return res
        .status(404)
        .json({ success: false, message: "Risk not found" });
    }
    res.status(200).json({ success: true, message: "Risk deleted" });
  } catch (error) {
    console.error("Error deleting risk:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const linkActionItem = async (req, res) => {
  try {
    const { riskId } = req.params;
    const { actionItemId } = req.body;

    const risk = await MeetingRisk.findById(riskId);
    if (!risk) {
      return res
        .status(404)
        .json({ success: false, message: "Risk not found" });
    }

    if (!risk.actionItemIds.includes(actionItemId)) {
      risk.actionItemIds.push(actionItemId);
      await risk.save();
    }

    const updatedRisk =
      await MeetingRisk.findById(riskId).populate("actionItemIds");

    res.status(200).json({ success: true, data: updatedRisk });
  } catch (error) {
    console.error("Error linking action item:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
