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

const { default: pollRoutes } = await import("../routes/pollRoutes.js");
const { default: Meeting } = await import("../models/meetingModel.js");
const { default: Poll } = await import("../models/pollModel.js");
const { default: User } = await import("../models/userModel.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();

const alice = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "member",
};

const bob = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "member",
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
  app.use("/api/polls", pollRoutes);
});

beforeEach(async () => {
  currentUser = alice;
});

afterEach(async () => {
  await Poll.deleteMany({});
  await Meeting.deleteMany({});
  await User.deleteMany({});
});

const seedMeeting = async ({
  organization = ORG_A,
  uploadedBy = alice._id,
  title = "Team Meeting",
} = {}) => {
  return Meeting.create({
    uploadedBy,
    organization,
    title,
    date: new Date(),
  });
};

const seedPoll = async ({
  organization = ORG_A,
  pollType = "single",
  isClosed = false,
  expiresAt = null,
} = {}) => {
  const meeting = await seedMeeting({ organization });
  return Poll.create({
    meeting: meeting._id,
    organization,
    createdBy: alice._id,
    question: "Select preferred option",
    options: [
      { text: "Option 1", votes: [] },
      { text: "Option 2", votes: [] },
      { text: "Option 3", votes: [] },
    ],
    pollType,
    isClosed,
    expiresAt,
  });
};

describe("Poll re-vote and authorization (#1404)", () => {
  describe("Authentication & Org validation", () => {
    it("rejects unauthenticated vote attempts with 401", async () => {
      currentUser = null;
      const poll = await seedPoll();
      const res = await request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .send({ optionIds: [poll.options[0]._id.toString()] });

      expect(res.status).toBe(401);
    });

    it("rejects user with no organization with 403", async () => {
      currentUser = noOrgUser;
      const poll = await seedPoll();
      const res = await request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .send({ optionIds: [poll.options[0]._id.toString()] });

      expect(res.status).toBe(403);
    });

    it("rejects cross-organization vote attempts with 403", async () => {
      currentUser = malloryOtherOrg;
      const poll = await seedPoll({ organization: ORG_A });
      const res = await request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .send({ optionIds: [poll.options[0]._id.toString()] });

      expect(res.status).toBe(403);
    });
  });

  describe("Initial vote and valid re-vote flows", () => {
    it("records a valid initial single-choice vote", async () => {
      const poll = await seedPoll();
      const opt1 = poll.options[0]._id.toString();

      const res = await request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .send({ optionIds: [opt1] });

      expect(res.status).toBe(200);
      const stored = await Poll.findById(poll._id);
      expect(stored.options[0].votes.map(String)).toContain(
        alice._id.toString(),
      );
      expect(stored.options[1].votes).toHaveLength(0);
    });

    it("replaces user existing vote atomically upon valid re-vote", async () => {
      const poll = await seedPoll();
      const opt1 = poll.options[0]._id.toString();
      const opt2 = poll.options[1]._id.toString();

      // Initial vote on opt1
      await request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .send({ optionIds: [opt1] });

      // Re-vote on opt2
      const res = await request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .send({ optionIds: [opt2] });

      expect(res.status).toBe(200);

      const stored = await Poll.findById(poll._id);
      expect(stored.options[0].votes).toHaveLength(0);
      expect(stored.options[1].votes.map(String)).toEqual([
        alice._id.toString(),
      ]);
      expect(stored.options[2].votes).toHaveLength(0);

      const totalVotes = stored.options.reduce(
        (sum, o) => sum + o.votes.length,
        0,
      );
      expect(totalVotes).toBe(1);
    });

    it("prevents duplicate option ids in multi-choice re-voting", async () => {
      const poll = await seedPoll({ pollType: "multiple" });
      const opt1 = poll.options[0]._id.toString();
      const opt2 = poll.options[1]._id.toString();

      const res = await request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .send({ optionIds: [opt1, opt2, opt1] });

      expect(res.status).toBe(200);
      const stored = await Poll.findById(poll._id);
      expect(stored.options[0].votes).toHaveLength(1);
      expect(stored.options[1].votes).toHaveLength(1);
    });
  });

  describe("Lifecycle and expiration restrictions", () => {
    it("rejects vote changes on an expired poll and marks it closed", async () => {
      const poll = await seedPoll({
        expiresAt: new Date(Date.now() - 30000), // expired 30s ago
      });
      const opt1 = poll.options[0]._id.toString();

      const res = await request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .send({ optionIds: [opt1] });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expired/i);

      const stored = await Poll.findById(poll._id);
      expect(stored.isClosed).toBe(true);
    });

    it("rejects votes on an explicitly closed poll", async () => {
      const poll = await seedPoll({ isClosed: true });
      const opt1 = poll.options[0]._id.toString();

      const res = await request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .send({ optionIds: [opt1] });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/closed/i);
    });
  });

  describe("Voter isolation", () => {
    it("ensures re-voting only changes the authenticated user's vote and never modifies another user's vote", async () => {
      const poll = await seedPoll();
      const opt1 = poll.options[0]._id.toString();
      const opt2 = poll.options[1]._id.toString();

      // Alice votes on Option 1
      currentUser = alice;
      await request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .send({ optionIds: [opt1] });

      // Bob votes on Option 1
      currentUser = bob;
      await request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .send({ optionIds: [opt1] });

      // Alice re-votes on Option 2
      currentUser = alice;
      await request(app)
        .post(`/api/polls/${poll._id}/vote`)
        .send({ optionIds: [opt2] });

      const stored = await Poll.findById(poll._id);
      // Bob remains in Option 1
      expect(stored.options[0].votes.map(String)).toEqual([bob._id.toString()]);
      // Alice is in Option 2
      expect(stored.options[1].votes.map(String)).toEqual([
        alice._id.toString(),
      ]);
      expect(stored.options[2].votes).toHaveLength(0);
    });
  });
});
