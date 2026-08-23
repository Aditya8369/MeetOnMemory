import * as retrospectiveService from "../services/seriesRetrospectiveService.js";
import MeetingSeries from "../models/meetingSeriesModel.js";

const getOrgId = (req) => req.user?.organization || req.user?.organizationId;

const checkSeriesAccess = async (seriesId, orgId) => {
  const series = await MeetingSeries.findOne({
    _id: seriesId,
    organization: orgId,
  });
  if (!series) {
    const error = new Error("Meeting series not found");
    error.status = 404;
    throw error;
  }
  return series;
};

export const getOverview = async (req, res) => {
  try {
    const orgId = getOrgId(req);
    await checkSeriesAccess(req.params.id, orgId);

    const overview = await retrospectiveService.getRetrospectiveOverview(
      req.params.id,
      orgId,
    );
    res.json({ success: true, ...overview });
  } catch (error) {
    if (error.status === 404)
      return res.status(404).json({ success: false, message: error.message });
    console.error("Error fetching series overview:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching overview" });
  }
};

export const getTopics = async (req, res) => {
  try {
    const orgId = getOrgId(req);
    await checkSeriesAccess(req.params.id, orgId);

    const meetings = await retrospectiveService.getSeriesMeetings(
      req.params.id,
      orgId,
    );
    const meetingIds = meetings.map((m) => m._id);
    const topics = await retrospectiveService.getTopicRecurrence(meetingIds);

    res.json({ success: true, topics });
  } catch (error) {
    if (error.status === 404)
      return res.status(404).json({ success: false, message: error.message });
    console.error("Error fetching series topics:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching topics" });
  }
};

export const getActionItems = async (req, res) => {
  try {
    const orgId = getOrgId(req);
    await checkSeriesAccess(req.params.id, orgId);

    const meetings = await retrospectiveService.getSeriesMeetings(
      req.params.id,
      orgId,
    );
    const meetingIds = meetings.map((m) => m._id);
    const actionItems =
      await retrospectiveService.getActionItemTrends(meetingIds);

    res.json({ success: true, ...actionItems });
  } catch (error) {
    if (error.status === 404)
      return res.status(404).json({ success: false, message: error.message });
    console.error("Error fetching series action items:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching action items" });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const orgId = getOrgId(req);
    await checkSeriesAccess(req.params.id, orgId);

    const meetings = await retrospectiveService.getSeriesMeetings(
      req.params.id,
      orgId,
    );
    const attendance =
      await retrospectiveService.getAttendanceConsistency(meetings);

    res.json({ success: true, attendance });
  } catch (error) {
    if (error.status === 404)
      return res.status(404).json({ success: false, message: error.message });
    console.error("Error fetching series attendance:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching attendance" });
  }
};

export const getSentiment = async (req, res) => {
  try {
    const orgId = getOrgId(req);
    await checkSeriesAccess(req.params.id, orgId);

    const meetings = await retrospectiveService.getSeriesMeetings(
      req.params.id,
      orgId,
    );
    const meetingIds = meetings.map((m) => m._id);
    const sentiment = await retrospectiveService.getSentimentTrends(meetingIds);

    res.json({ success: true, sentiment });
  } catch (error) {
    if (error.status === 404)
      return res.status(404).json({ success: false, message: error.message });
    console.error("Error fetching series sentiment:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching sentiment" });
  }
};

export const getDecisions = async (req, res) => {
  try {
    const orgId = getOrgId(req);
    await checkSeriesAccess(req.params.id, orgId);

    const meetings = await retrospectiveService.getSeriesMeetings(
      req.params.id,
      orgId,
    );
    const meetingIds = meetings.map((m) => m._id);
    const decisions =
      await retrospectiveService.getDecisionFollowThrough(meetingIds);

    res.json({ success: true, ...decisions });
  } catch (error) {
    if (error.status === 404)
      return res.status(404).json({ success: false, message: error.message });
    console.error("Error fetching series decisions:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching decisions" });
  }
};
