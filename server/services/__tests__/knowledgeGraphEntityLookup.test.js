import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEntityNeighborhood } from "../knowledgeGraphService.js";
import Meeting from "../../models/meetingModel.js";
import Decision from "../../models/decisionModel.js";
import ActionItem from "../../models/actionItemModel.js";

vi.mock("../../models/meetingModel.js");
vi.mock("../../models/decisionModel.js");
vi.mock("../../models/actionItemModel.js");

describe("Knowledge Graph Targeted Entity Lookup (#1678)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retrieves meeting entity with only its local decisions, actions, and participants", async () => {
    const mockMeeting = {
      _id: "m_123",
      title: "Architecture Review",
      date: new Date("2026-08-10"),
      meetingType: "architecture",
      status: "completed",
      duration: 3600,
      organization: "org_1",
      uploadedBy: { _id: "u_1", name: "Alice", email: "alice@example.com" },
      participants: [{ _id: "u_2", name: "Bob", email: "bob@example.com" }],
    };

    const mockQuery = {
      populate: vi.fn().mockReturnThis(),
    };
    mockQuery.populate.mockReturnValueOnce(mockQuery);
    mockQuery.populate.mockResolvedValueOnce(mockMeeting);

    Meeting.findOne.mockReturnValue(mockQuery);

    Decision.find.mockResolvedValue([
      {
        _id: "d_1",
        text: "Adopt GraphQL for API gateway",
        status: "accepted",
        owner: "Alice",
        createdAt: new Date("2026-08-10"),
      },
    ]);

    ActionItem.find.mockResolvedValue([
      {
        _id: "a_1",
        text: "Prototype schema stitching",
        owner: "Bob",
        status: "open",
        dueDate: new Date("2026-08-20"),
        lifecycleState: "active",
      },
    ]);

    const result = await getEntityNeighborhood("org_1", "meeting", "m_123");

    expect(Meeting.findOne).toHaveBeenCalledWith({
      _id: "m_123",
      organization: "org_1",
    });
    expect(result).toBeDefined();
    expect(result.entity.id).toBe("meeting-m_123");
    expect(result.entity.label).toBe("Architecture Review");

    const relatedDecision = result.relatedEntities.find(
      (e) => e.id === "decision-d_1",
    );
    expect(relatedDecision).toBeDefined();

    const relatedAction = result.relatedEntities.find(
      (e) => e.id === "action-a_1",
    );
    expect(relatedAction).toBeDefined();

    expect(result.relationships.length).toBeGreaterThanOrEqual(3);
  });

  it("returns null when entity belongs to another organization (tenant isolation)", async () => {
    const mockQuery = {
      populate: vi.fn().mockReturnThis(),
    };
    mockQuery.populate.mockReturnValueOnce(mockQuery);
    mockQuery.populate.mockResolvedValueOnce(null);

    Meeting.findOne.mockReturnValue(mockQuery);

    const result = await getEntityNeighborhood(
      "org_1",
      "meeting",
      "m_foreign_org",
    );

    expect(result).toBeNull();
  });
});
