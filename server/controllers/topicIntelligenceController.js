import TopicIntelligence from "../models/topicIntelligenceModel.js";
import TopicCluster from "../models/topicClusterModel.js";
import { generateTopicBriefing } from "../services/topicIntelligenceService.js";

export const getDashboardData = async (req, res) => {
  try {
    const orgId = req.user.organization;

    // Get all clusters for the org (not needed for the current logic directly, intelRecords have it populated)

    // Get all intelligence records for the org
    const intelRecords = await TopicIntelligence.find({ organization: orgId })
      .populate("clusterId", "label")
      .sort({ weekStarting: 1 }); // Chronological

    // Group by cluster for sparklines/trends
    const trendsByCluster = {};
    intelRecords.forEach((record) => {
      if (!record.clusterId) return;
      const cid = record.clusterId._id.toString();
      if (!trendsByCluster[cid]) {
        trendsByCluster[cid] = {
          clusterId: cid,
          label: record.clusterId.label,
          history: [],
          currentTrend: record.trendDirection,
          isOrphaned: record.isOrphaned,
        };
      }
      trendsByCluster[cid].history.push({
        weekStarting: record.weekStarting,
        occurrences: record.occurrences,
      });
      // Update with the latest trend/orphan status
      trendsByCluster[cid].currentTrend = record.trendDirection;
      trendsByCluster[cid].isOrphaned = record.isOrphaned;
    });

    res.status(200).json({ trends: Object.values(trendsByCluster) });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching dashboard data", error: error.message });
  }
};

export const getOrphanedTopics = async (req, res) => {
  try {
    const orgId = req.user.organization;

    const orphanedIntel = await TopicIntelligence.find({
      organization: orgId,
      isOrphaned: true,
    })
      .populate("clusterId", "label")
      .sort({ weekStarting: -1 });

    // Deduplicate by clusterId (taking the most recent)
    const uniqueOrphans = {};
    orphanedIntel.forEach((intel) => {
      if (!intel.clusterId) return;
      const cid = intel.clusterId._id.toString();
      if (!uniqueOrphans[cid]) {
        uniqueOrphans[cid] = {
          clusterId: cid,
          label: intel.clusterId.label,
          weekStarting: intel.weekStarting,
        };
      }
    });

    res.status(200).json({ orphanedTopics: Object.values(uniqueOrphans) });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching orphaned topics",
      error: error.message,
    });
  }
};

export const getCoOccurrenceGraph = async (req, res) => {
  try {
    const orgId = req.user.organization;

    // To build the graph, we need nodes (clusters) and links (relatedTopics)
    const clusters = await TopicCluster.find({ organization: orgId });

    // Get the most recent intelligence record for each cluster to get relations
    const nodes = [];
    const links = [];

    for (const cluster of clusters) {
      nodes.push({
        id: cluster._id.toString(),
        label: cluster.label,
        val: cluster.meetingCount || 1,
      });

      const latestIntel = await TopicIntelligence.findOne({
        organization: orgId,
        clusterId: cluster._id,
      }).sort({ weekStarting: -1 });

      if (latestIntel && latestIntel.relatedTopics) {
        latestIntel.relatedTopics.forEach((rel) => {
          if (rel.clusterId) {
            // Avoid duplicates by enforcing id1 < id2
            const source = cluster._id.toString();
            const target = rel.clusterId.toString();
            if (source < target) {
              links.push({
                source,
                target,
                weight: rel.weight,
              });
            }
          }
        });
      }
    }

    res.status(200).json({ nodes, links });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching co-occurrence graph",
      error: error.message,
    });
  }
};

export const generateBriefing = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const { clusterId } = req.params;

    const briefing = await generateTopicBriefing(orgId, clusterId);

    res.status(200).json({ briefing });
  } catch (error) {
    res.status(500).json({
      message: "Error generating topic briefing",
      error: error.message,
    });
  }
};
