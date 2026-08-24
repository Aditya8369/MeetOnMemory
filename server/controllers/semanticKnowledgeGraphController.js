import Meeting from "../models/meetingModel.js";
import semanticKnowledgeGraphExtractionService from "../services/semanticKnowledgeGraphExtractionService.js";

/**
 * Controller handling semantic entity-relation extraction and k-hop neighborhood querying
 */
export const extractSemanticGraphFromMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const organizationId =
      req.user?.organizationId || req.headers["x-organization-id"];

    const meeting = await Meeting.findOne({
      _id: meetingId,
      ...(organizationId ? { organizationId } : {}),
    })
      .populate("actionItems.assignee", "name email")
      .lean();

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const graph =
      semanticKnowledgeGraphExtractionService.extractSemanticRelationships(
        meeting,
      );

    return res.status(200).json({ graph });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getSemanticNeighborhood = async (req, res) => {
  try {
    const organizationId =
      req.user?.organizationId || req.headers["x-organization-id"];
    const { seedNodeId, kHops = 1 } = req.query;

    if (!seedNodeId) {
      return res
        .status(400)
        .json({ error: "seedNodeId query parameter is required" });
    }

    // Fetch recent meetings in organization to build the graph pool
    const meetings = await Meeting.find({
      ...(organizationId ? { organizationId } : {}),
    })
      .limit(50)
      .populate("actionItems.assignee", "name email")
      .lean();

    let allNodes = [];
    let allEdges = [];

    for (const meeting of meetings) {
      const { nodes, edges } =
        semanticKnowledgeGraphExtractionService.extractSemanticRelationships(
          meeting,
        );
      allNodes.push(...nodes);
      allEdges.push(...edges);
    }

    // De-duplicate nodes
    const nodeMap = new Map();
    allNodes.forEach((n) => nodeMap.set(n.id, n));
    allNodes = Array.from(nodeMap.values());

    const neighborhood =
      semanticKnowledgeGraphExtractionService.expandNeighborhood(
        allNodes,
        allEdges,
        seedNodeId,
        parseInt(kHops, 10) || 1,
      );

    return res.status(200).json(neighborhood);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
