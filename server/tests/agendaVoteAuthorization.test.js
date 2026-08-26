import { jest } from "@jest/globals";
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

const { default: agendaVoteRoutes } =
  await import("../routes/agendaVoteRoutes.js");
const { default: Meeting } = await import("../models/meetingModel.js");
const { default: AgendaVote } = await import("../models/agendaVoteModel.js");
const { default: express } = await import("express");

const app = express();
app.use(express.json());
app.use("/api/meetings", agendaVoteRoutes);

describe("Agenda Vote & Auto-Sort Authorization Tests (#1667)", () => {
  const ORG_A = new mongoose.Types.ObjectId();
  const ORG_B = new mongoose.Types.ObjectId();

  const OWNER_USER = {
    _id: new mongoose.Types.ObjectId(),
    organization: ORG_A,
    role: "member",
    email: "owner@orga.com",
  };

  const MEMBER_USER = {
    _id: new mongoose.Types.ObjectId(),
    organization: ORG_A,
    role: "member",
    email: "member@orga.com",
  };

  const ORG_ADMIN_USER = {
    _id: new mongoose.Types.ObjectId(),
    organization: ORG_A,
    role: "admin",
    email: "admin@orga.com",
  };

  const OUTSIDER_USER = {
    _id: new mongoose.Types.ObjectId(),
    organization: ORG_B,
    role: "member",
    email: "outsider@orgb.com",
  };

  let meetingA;
  let agendaItemId1;
  let agendaItemId2;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.TEST_MONGODB_URI);
    }
  });

  beforeEach(async () => {
    await Meeting.deleteMany({});
    await AgendaVote.deleteMany({});

    agendaItemId1 = new mongoose.Types.ObjectId();
    agendaItemId2 = new mongoose.Types.ObjectId();

    meetingA = await Meeting.create({
      title: "Sprint Planning",
      uploadedBy: OWNER_USER._id,
      organization: ORG_A,
      date: new Date(),
      status: "uploaded",
      agendaItems: [
        {
          _id: agendaItemId1,
          text: "Item 1",
          position: 0,
        },
        {
          _id: agendaItemId2,
          text: "Item 2",
          position: 1,
        },
      ],
      participants: [
        {
          user: OWNER_USER._id,
          name: "Owner User",
          email: OWNER_USER.email,
          role: "host",
        },
        {
          user: MEMBER_USER._id,
          name: "Member User",
          email: MEMBER_USER.email,
          role: "participant",
        },
      ],
    });
  });

  describe("Voting Permissions", () => {
    it("allows same-organization participant to cast a vote", async () => {
      currentUser = MEMBER_USER;

      const res = await request(app)
        .post(`/api/meetings/${meetingA._id}/agenda-votes/${agendaItemId1}`)
        .send({ vote: 1 });

      expect(res.status).toBe(200);
      expect(res.body.tally).toBeDefined();
      expect(res.body.tally[agendaItemId1.toString()]).toBe(1);
    });

    it("allows meeting owner to cast a vote", async () => {
      currentUser = OWNER_USER;

      const res = await request(app)
        .post(`/api/meetings/${meetingA._id}/agenda-votes/${agendaItemId1}`)
        .send({ vote: -1 });

      expect(res.status).toBe(200);
      expect(res.body.tally[agendaItemId1.toString()]).toBe(-1);
    });

    it("denies voting for non-member / cross-organization user (403)", async () => {
      currentUser = OUTSIDER_USER;

      const res = await request(app)
        .post(`/api/meetings/${meetingA._id}/agenda-votes/${agendaItemId1}`)
        .send({ vote: 1 });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/forbidden/i);
    });

    it("denies getting vote tally for cross-organization user (IDOR test)", async () => {
      currentUser = OUTSIDER_USER;

      const res = await request(app).get(
        `/api/meetings/${meetingA._id}/agenda-votes`,
      );

      expect(res.status).toBe(403);
    });

    it("denies vote removal for cross-organization user", async () => {
      currentUser = OUTSIDER_USER;

      const res = await request(app).delete(
        `/api/meetings/${meetingA._id}/agenda-votes/${agendaItemId1}`,
      );

      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid meeting ID format", async () => {
      currentUser = MEMBER_USER;

      const res = await request(app).get(
        `/api/meetings/invalid-id/agenda-votes`,
      );

      expect(res.status).toBe(400);
    });

    it("returns 404 if meeting does not exist", async () => {
      currentUser = MEMBER_USER;

      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(
        `/api/meetings/${fakeId}/agenda-votes`,
      );

      expect(res.status).toBe(404);
    });
  });

  describe("Auto-Sort Permissions", () => {
    it("denies auto-sort to non-host / non-admin user (403)", async () => {
      currentUser = MEMBER_USER;

      const res = await request(app).post(
        `/api/meetings/${meetingA._id}/agenda-votes/auto-sort`,
      );

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/only meeting hosts or admins/i);
    });

    it("allows meeting owner to trigger auto-sort", async () => {
      currentUser = OWNER_USER;

      const res = await request(app).post(
        `/api/meetings/${meetingA._id}/agenda-votes/auto-sort`,
      );

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/sorted successfully/i);
      expect(res.body.agendaItems).toBeDefined();
    });

    it("allows organization admin to trigger auto-sort", async () => {
      currentUser = ORG_ADMIN_USER;

      const res = await request(app).post(
        `/api/meetings/${meetingA._id}/agenda-votes/auto-sort`,
      );

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/sorted successfully/i);
    });

    it("denies auto-sort to cross-organization user (403)", async () => {
      currentUser = OUTSIDER_USER;

      const res = await request(app).post(
        `/api/meetings/${meetingA._id}/agenda-votes/auto-sort`,
      );

      expect(res.status).toBe(403);
    });
  });
});
