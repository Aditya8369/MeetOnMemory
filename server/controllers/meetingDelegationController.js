import {
  createDelegationRequest,
  approveDelegationRequest,
  rejectDelegationRequest,
  revokeDelegationRequest,
} from "../services/meetingDelegationService.js";
import MeetingDelegation from "../models/meetingDelegationModel.js";
import User from "../models/userModel.js";
import Meeting from "../models/meetingModel.js";

export const createDelegation = async (req, res) => {
  try {
    const { meetingId, delegateeId, scope } = req.body;
    const delegatorId = req.user.id;

    if (delegatorId === delegateeId) {
      return res.status(400).json({ error: "Cannot delegate to yourself." });
    }

    const delegator = await User.findById(delegatorId);
    const delegatee = await User.findById(delegateeId);
    const meeting = await Meeting.findById(meetingId);

    if (!delegator || !delegatee || !meeting) {
      return res.status(404).json({ error: "User or Meeting not found." });
    }

    const delegation = await createDelegationRequest(
      meetingId,
      delegatorId,
      delegateeId,
      scope,
      delegator.name,
      delegatee.name,
      meeting.title,
    );

    res.status(201).json({ message: "Delegation requested", delegation });
  } catch (error) {
    console.error("Error creating delegation:", error);
    res.status(500).json({ error: error.message });
  }
};

export const approveDelegation = async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization check - only delegatee can approve
    const delegationObj = await MeetingDelegation.findById(id);
    if (!delegationObj)
      return res.status(404).json({ error: "Delegation not found" });
    if (delegationObj.delegateeId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const delegation = await approveDelegationRequest(id);
    res.status(200).json({ message: "Delegation approved", delegation });
  } catch (error) {
    console.error("Error approving delegation:", error);
    res.status(500).json({ error: error.message });
  }
};

export const rejectDelegation = async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization check - only delegatee can reject
    const delegationObj = await MeetingDelegation.findById(id);
    if (!delegationObj)
      return res.status(404).json({ error: "Delegation not found" });
    if (delegationObj.delegateeId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const delegation = await rejectDelegationRequest(id);
    res.status(200).json({ message: "Delegation rejected", delegation });
  } catch (error) {
    console.error("Error rejecting delegation:", error);
    res.status(500).json({ error: error.message });
  }
};

export const revokeDelegation = async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization check - only delegator can revoke
    const delegationObj = await MeetingDelegation.findById(id);
    if (!delegationObj)
      return res.status(404).json({ error: "Delegation not found" });
    if (delegationObj.delegatorId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const delegation = await revokeDelegationRequest(id);
    res.status(200).json({ message: "Delegation revoked", delegation });
  } catch (error) {
    console.error("Error revoking delegation:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getMyDelegations = async (req, res) => {
  try {
    const userId = req.user.id;

    const delegatedByMe = await MeetingDelegation.find({ delegatorId: userId })
      .populate("delegateeId", "name email profilePic")
      .populate("meetingId", "title date status")
      .sort({ createdAt: -1 });

    const delegatedToMe = await MeetingDelegation.find({ delegateeId: userId })
      .populate("delegatorId", "name email profilePic")
      .populate("meetingId", "title date status")
      .sort({ createdAt: -1 });

    res.status(200).json({ delegatedByMe, delegatedToMe });
  } catch (error) {
    console.error("Error fetching delegations:", error);
    res.status(500).json({ error: "Failed to fetch delegations." });
  }
};

export const getMeetingDelegation = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    // A user can see if they have delegated or have been delegated for this meeting
    const delegation = await MeetingDelegation.findOne({
      meetingId,
      $or: [{ delegatorId: userId }, { delegateeId: userId }],
    })
      .populate("delegatorId", "name email profilePic")
      .populate("delegateeId", "name email profilePic");

    if (!delegation) {
      return res.status(200).json({ delegation: null });
    }

    res.status(200).json({ delegation });
  } catch (error) {
    console.error("Error fetching meeting delegation:", error);
    res.status(500).json({ error: "Failed to fetch meeting delegation." });
  }
};
