import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import mongoose from "mongoose";

let currentUser = null;

jest.unstable_mockModule("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    req.user = currentUser;
    next();
  },
}));

const mockGenerateAI = jest.fn().mockResolvedValue([
  {
    text: "Review Q3 Roadmap",
    description: "Go over roadmap goals",
    estimatedDuration: 15,
    sourceType: "action_item",
    sourceId: new mongoose.Types.ObjectId().toString(),
    sourceTitle: "AI Generated",
  },
]);

jest.unstable_mockModule("../services/GenerativeAIService.js", () => ({
  generateAgendaSuggestions: mockGenerateAI,
  generateText: jest.fn(),
  parseJsonOutput: jest.fn(),
}));

const { default: agendaSuggestionRoutes } =
  await import("../routes/agendaSuggestionRoutes.js");
const { default: Meeting } = await import("../models/meetingModel.js");
const { default: AgendaSuggestion } =
  await import("../models/agendaSuggestionModel.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();

const aliceMember = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "member",
};

const aliceViewer = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "viewer",
};

const malloryOtherOrg = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_B,
  role: "admin",
};

const noOrgUser = {
  _id: new mongoose.Types.ObjectId(),
  organization: null,
  role: "member",
};

let app;

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
  }

  app = express();
  app.use(express.json());
  app.use("/api/agenda-suggestions", agendaSuggestionRoutes);
});

beforeEach(() => {
  currentUser = aliceMember;
  mockGenerateAI.mockClear();
});

afterEach(async () => {
  await Meeting.deleteMany({});
  await AgendaSuggestion.deleteMany({});
});

const seedMeeting = async ({
  organization = ORG_A,
  uploadedBy = aliceMember._id,
  title = "Planning Meeting",
} = {}) => {
  return Meeting.create({
    uploadedBy,
    organization,
    title,
    date: new Date(),
    agendaItems: [],
  });
};

const seedSuggestion = async ({ organization = ORG_A, meeting } = {}) => {
  return AgendaSuggestion.create({
    meeting: meeting._id,
    organization,
    suggestions: [
      {
        text: "Discuss Architecture",
        description: "Scale services",
        estimatedDuration: 20,
        source: {
          type: "action_item",
          title: "Architecture task",
        },
        status: "pending",
      },
    ],
  });
};

describe("Agenda suggestions authorization (#1384)", () => {
  describe("Authentication and Organization Guards", () => {
    it("returns 401 when unauthenticated", async () => {
      currentUser = null;
      const res = await request(app).get(
        `/api/agenda-suggestions/meeting/${new mongoose.Types.ObjectId()}`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 403 when user has no organization", async () => {
      currentUser = noOrgUser;
      const res = await request(app).get(
        `/api/agenda-suggestions/meeting/${new mongoose.Types.ObjectId()}`,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/agenda-suggestions/generate", () => {
    it("allows authorized member with edit permission to generate suggestions", async () => {
      const meeting = await seedMeeting({ organization: ORG_A });
      const res = await request(app)
        .post("/api/agenda-suggestions/generate")
        .send({ meetingId: meeting._id, organizationId: ORG_A.toString() });

      expect(res.status).toBe(201);
      expect(res.body.suggestions).toHaveLength(1);
      expect(res.body.suggestions[0].text).toBe("Review Q3 Roadmap");
    });

    it("rejects generation when viewer lacks edit permission", async () => {
      currentUser = aliceViewer;
      const meeting = await seedMeeting({ organization: ORG_A });
      const res = await request(app)
        .post("/api/agenda-suggestions/generate")
        .send({ meetingId: meeting._id });

      expect(res.status).toBe(403);
    });

    it("rejects generation if client supplies foreign organization ID", async () => {
      const meeting = await seedMeeting({ organization: ORG_A });
      const res = await request(app)
        .post("/api/agenda-suggestions/generate")
        .send({ meetingId: meeting._id, organizationId: ORG_B.toString() });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it("rejects generation for a meeting belonging to another organization", async () => {
      const foreignMeeting = await seedMeeting({
        organization: ORG_B,
        uploadedBy: malloryOtherOrg._id,
      });
      const res = await request(app)
        .post("/api/agenda-suggestions/generate")
        .send({ meetingId: foreignMeeting._id });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/agenda-suggestions/meeting/:meetingId", () => {
    it("allows authorized viewer to list suggestions for own org meeting", async () => {
      currentUser = aliceViewer;
      const meeting = await seedMeeting({ organization: ORG_A });
      await seedSuggestion({ meeting, organization: ORG_A });

      const res = await request(app).get(
        `/api/agenda-suggestions/meeting/${meeting._id}`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("rejects cross-organization access to meeting suggestions", async () => {
      currentUser = malloryOtherOrg;
      const meeting = await seedMeeting({ organization: ORG_A });
      await seedSuggestion({ meeting, organization: ORG_A });

      const res = await request(app).get(
        `/api/agenda-suggestions/meeting/${meeting._id}`,
      );

      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/agenda-suggestions/:id/item/:itemId", () => {
    it("allows same-org member to update suggestion item status", async () => {
      const meeting = await seedMeeting({ organization: ORG_A });
      const suggestion = await seedSuggestion({ meeting, organization: ORG_A });
      const itemId = suggestion.suggestions[0]._id;

      const res = await request(app)
        .put(`/api/agenda-suggestions/${suggestion._id}/item/${itemId}`)
        .send({ status: "accepted" });

      expect(res.status).toBe(200);
      expect(res.body.suggestions[0].status).toBe("accepted");
    });

    it("rejects cross-organization attempt to update suggestion item", async () => {
      currentUser = malloryOtherOrg;
      const meeting = await seedMeeting({ organization: ORG_A });
      const suggestion = await seedSuggestion({ meeting, organization: ORG_A });
      const itemId = suggestion.suggestions[0]._id;

      const res = await request(app)
        .put(`/api/agenda-suggestions/${suggestion._id}/item/${itemId}`)
        .send({ status: "accepted" });

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/agenda-suggestions/:id/apply", () => {
    it("allows same-org member to apply accepted suggestions to meeting", async () => {
      const meeting = await seedMeeting({ organization: ORG_A });
      const suggestion = await seedSuggestion({ meeting, organization: ORG_A });
      suggestion.suggestions[0].status = "accepted";
      await suggestion.save();

      const res = await request(app).post(
        `/api/agenda-suggestions/${suggestion._id}/apply`,
      );

      expect(res.status).toBe(200);
      expect(res.body.agendaItems).toHaveLength(1);
      expect(res.body.agendaItems[0].text).toBe("Discuss Architecture");
    });

    it("rejects cross-organization attempt to apply suggestions", async () => {
      currentUser = malloryOtherOrg;
      const meeting = await seedMeeting({ organization: ORG_A });
      const suggestion = await seedSuggestion({ meeting, organization: ORG_A });
      suggestion.suggestions[0].status = "accepted";
      await suggestion.save();

      const res = await request(app).post(
        `/api/agenda-suggestions/${suggestion._id}/apply`,
      );

      expect(res.status).toBe(403);
    });
  });
});
