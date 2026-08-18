import EscalationPolicy from "../models/escalationPolicyModel.js";
import EscalationEvent from "../models/escalationEventModel.js";
import ActionItem from "../models/actionItemModel.js";

// @route   GET /api/escalation-policies
// @desc    Get all escalation policies for an organization
// @access  Private
export const getPolicies = async (req, res) => {
  try {
    const { organizationId } = req.query; // Or get from req.user
    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "organizationId is required" });
    }

    const policies = await EscalationPolicy.find({
      organization: organizationId,
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: policies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/escalation-policies/:id
// @desc    Get a single escalation policy
// @access  Private
export const getPolicyById = async (req, res) => {
  try {
    const policy = await EscalationPolicy.findById(req.params.id);
    if (!policy) {
      return res
        .status(404)
        .json({ success: false, message: "Policy not found" });
    }
    res.json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   POST /api/escalation-policies
// @desc    Create an escalation policy
// @access  Private
export const createPolicy = async (req, res) => {
  try {
    const policy = await EscalationPolicy.create(req.body);
    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   PUT /api/escalation-policies/:id
// @desc    Update an escalation policy
// @access  Private
export const updatePolicy = async (req, res) => {
  try {
    const policy = await EscalationPolicy.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );
    if (!policy) {
      return res
        .status(404)
        .json({ success: false, message: "Policy not found" });
    }
    res.json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   DELETE /api/escalation-policies/:id
// @desc    Delete an escalation policy
// @access  Private
export const deletePolicy = async (req, res) => {
  try {
    const policy = await EscalationPolicy.findByIdAndDelete(req.params.id);
    if (!policy) {
      return res
        .status(404)
        .json({ success: false, message: "Policy not found" });
    }
    // Also delete events associated with this policy
    await EscalationEvent.deleteMany({ policy: req.params.id });
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route   GET /api/escalation-events/dashboard
// @desc    Get metrics and active escalations for the dashboard
// @access  Private
export const getEscalationDashboardMetrics = async (req, res) => {
  try {
    const { organizationId } = req.query;
    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "organizationId is required" });
    }

    // Recent events
    const recentEvents = await EscalationEvent.find({
      organization: organizationId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({ path: "actionItem", select: "text status assignee" })
      .populate({ path: "policy", select: "name" });

    // Active escalated items (action items that have events and are not resolved)
    const escalatedItemsList = await EscalationEvent.distinct("actionItem", {
      organization: organizationId,
    });

    const activeEscalatedItems = await ActionItem.find({
      _id: { $in: escalatedItemsList },
      status: {
        $in: ["open", "in-progress", "pending", "in_progress", "overdue"],
      },
    }).populate("assignee");

    // Total escalated
    const totalEscalated = escalatedItemsList.length;

    // Resolved after escalation
    const resolvedEscalatedItems = await ActionItem.countDocuments({
      _id: { $in: escalatedItemsList },
      status: { $in: ["resolved", "completed"] },
    });

    const resolutionRate =
      totalEscalated > 0
        ? ((resolvedEscalatedItems / totalEscalated) * 100).toFixed(1)
        : 0;

    res.json({
      success: true,
      data: {
        recentEvents,
        activeEscalatedItems,
        metrics: {
          totalEscalated,
          activeEscalated: activeEscalatedItems.length,
          resolvedEscalated: resolvedEscalatedItems,
          resolutionRate,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
