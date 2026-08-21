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

const { default: carryForwardRoutes } =
  await import("../routes/carryForwardRoutes.js");
const { default: MeetingSeries } =
  await import("../models/meetingSeriesModel.js");
const { default: Meeting } = await import("../models/meetingModel.js");
const { default: CarryForwardConfig } =
  await import("../models/carryForwardConfigModel.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();

const aliceMember = {
  _id: USER_A,
  organization: ORG_A,
  role: "member",
};

const aliceGuest = {
  _id: USER_A,
  organization: ORG_A,
  role: "guest",
};

const noOrgUser = {
  _id: new mongoose.Types.ObjectId(),
  organization: null,
  role: "member",
};

let app;

const seedSeries = async ({
  organization = ORG_A,
  title = "Weekly Sync",
  createdBy = USER_A,
} = {}) => {
  return MeetingSeries.create({
    title,
    organization,
    createdBy,
    recurrencePattern: "weekly",
    startDate: new Date(),
    endDate: new Date(Date.now() + 100000000),
    time: "10:00",
  });
};

const seedMeeting = async ({
  series,
  organization = ORG_A,
  uploadedBy = USER_A,
  status = "uploaded",
  seriesOccurrence = 1,
} = {}) => {
  return Meeting.create({
    title: "Carry Forward Meeting",
    uploadedBy,
    organization,
    date: new Date(),
    series: series._id,
    seriesOccurrence,
    status,
    agendaItems: [{ text: "Existing item", status: "pending" }],
  });
};

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
  }

  app = express();
  app.use(express.json());
  app.use("/api/meeting-series", carryForwardRoutes);
});

beforeEach(() => {
  currentUser = aliceMember;
});

afterEach(async () => {
  await MeetingSeries.deleteMany({});
  await Meeting.deleteMany({});
  await CarryForwardConfig.deleteMany({});
});

describe("Carry-forward series ownership (#1666)", () => {
  describe("RBAC guards", () => {
    it("returns 401 when unauthenticated", async () => {
      currentUser = null;
      const series = await seedSeries();
      const res = await request(app).get(
        `/api/meeting-series/${series._id}/carry-forward/config`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 403 when the user has no organization", async () => {
      currentUser = noOrgUser;
      const series = await seedSeries();
      const res = await request(app).get(
        `/api/meeting-series/${series._id}/carry-forward/config`,
      );
      expect(res.status).toBe(403);
    });

    it("returns 403 when a guest tries to update config", async () => {
      currentUser = aliceGuest;
      const series = await seedSeries();
      const res = await request(app)
        .put(`/api/meeting-series/${series._id}/carry-forward/config`)
        .send({ carryForwardRules: { maxCarriedItems: 3 } });
      expect(res.status).toBe(403);
    });

    it("returns 403 when a guest tries to apply carry-forward", async () => {
      currentUser = aliceGuest;
      const series = await seedSeries();
      const res = await request(app)
        .post(`/api/meeting-series/${series._id}/carry-forward/apply`)
        .send({ currentMeetingId: new mongoose.Types.ObjectId() });
      expect(res.status).toBe(403);
    });
  });

  describe("Same-organization access", () => {
    it("allows a member to read config for their series", async () => {
      const series = await seedSeries({ organization: ORG_A });
      const res = await request(app).get(
        `/api/meeting-series/${series._id}/carry-forward/config`,
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.config.seriesId.toString()).toBe(series._id.toString());
    });
  });

  describe("Foreign series rejection", () => {
    it("rejects configuration GET for a foreign series", async () => {
      const foreign = await seedSeries({
        organization: ORG_B,
        title: "Other Org Series",
      });
      const res = await request(app).get(
        `/api/meeting-series/${foreign._id}/carry-forward/config`,
      );
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("rejects configuration PUT for a foreign series", async () => {
      const foreign = await seedSeries({ organization: ORG_B });
      const res = await request(app)
        .put(`/api/meeting-series/${foreign._id}/carry-forward/config`)
        .send({
          carryForwardRules: { maxCarriedItems: 1 },
          organizationId: ORG_B,
        });
      expect(res.status).toBe(404);
      expect(
        await CarryForwardConfig.findOne({ seriesId: foreign._id }),
      ).toBeNull();
    });

    it("rejects preview for a foreign series", async () => {
      const foreign = await seedSeries({ organization: ORG_B });
      const res = await request(app).get(
        `/api/meeting-series/${foreign._id}/carry-forward/preview`,
      );
      expect(res.status).toBe(404);
    });

    it("rejects apply for a foreign series", async () => {
      const foreign = await seedSeries({ organization: ORG_B });
      const meeting = await seedMeeting({
        series: foreign,
        organization: ORG_B,
      });
      const res = await request(app)
        .post(`/api/meeting-series/${foreign._id}/carry-forward/apply`)
        .send({ currentMeetingId: meeting._id });
      expect(res.status).toBe(404);

      const unchanged = await Meeting.findById(meeting._id);
      expect(unchanged.agendaItems).toHaveLength(1);
    });
  });

  describe("Nonexistent series", () => {
    it("rejects config for a series that does not exist", async () => {
      const res = await request(app).get(
        `/api/meeting-series/${new mongoose.Types.ObjectId()}/carry-forward/config`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("Client-supplied organizationId cannot bypass ownership", () => {
    it("does not grant access when body.organizationId matches the foreign series", async () => {
      currentUser = aliceMember;
      const foreign = await seedSeries({ organization: ORG_B });
      const res = await request(app)
        .put(`/api/meeting-series/${foreign._id}/carry-forward/config`)
        .send({
          organizationId: ORG_B.toString(),
          carryForwardRules: { includeUnfinishedAgenda: false },
        });

      expect(res.status).toBe(404);
      expect(res.body.config).toBeUndefined();
    });
  });
});
