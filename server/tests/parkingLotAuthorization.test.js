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

const { default: parkingLotRoutes } =
  await import("../routes/parkingLotRoutes.js");
const { default: Meeting } = await import("../models/meetingModel.js");
const { default: ParkingLotItem } =
  await import("../models/parkingLotItemModel.js");
const { default: User } = await import("../models/userModel.js");

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
  app.use("/api/v1/parking-lot", parkingLotRoutes);
});

beforeEach(async () => {
  currentUser = aliceMember;
  await User.deleteMany({});
  await seedUser({
    _id: aliceMember._id,
    organization: ORG_A,
    role: "member",
  });
  await seedUser({
    _id: aliceViewer._id,
    organization: ORG_A,
    role: "guest",
  });
  await seedUser({
    _id: malloryOtherOrg._id,
    organization: ORG_B,
    role: "admin",
  });
});

afterEach(async () => {
  await Meeting.deleteMany({});
  await ParkingLotItem.deleteMany({});
  await User.deleteMany({});
});

const seedUser = async ({
  _id = new mongoose.Types.ObjectId(),
  name = "Alice",
  email = `alice-${Date.now()}-${Math.random()}@example.com`,
  organization = ORG_A,
  role = "member",
} = {}) => {
  return User.create({
    _id,
    name,
    email,
    password: "password123",
    organization,
    role,
  });
};

const seedMeeting = async ({
  organization = ORG_A,
  uploadedBy = aliceMember._id,
  title = "Parking Lot Meeting",
} = {}) => {
  return Meeting.create({
    uploadedBy,
    organization,
    title,
    date: new Date(),
  });
};

const seedTopic = async ({
  organization = ORG_A,
  meeting,
  submittedBy = aliceMember._id,
  topic = "Future roadmap discussion",
} = {}) => {
  return ParkingLotItem.create({
    organization,
    sourceMeetingId: meeting._id,
    submittedBy,
    topic,
    status: "pending",
  });
};

describe("Parking lot authorization (#1536)", () => {
  describe("Authentication & Org Membership Guards", () => {
    it("returns 401 when request is unauthenticated", async () => {
      currentUser = null;
      const res = await request(app).get(
        `/api/v1/parking-lot/organization/${ORG_A}`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 403 when user has no organization membership", async () => {
      currentUser = noOrgUser;
      const res = await request(app).get(
        `/api/v1/parking-lot/organization/${ORG_A}`,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/parking-lot (addTopic)", () => {
    it("allows authorized member with edit permissions to add topic", async () => {
      const meeting = await seedMeeting({ organization: ORG_A });
      const res = await request(app).post("/api/v1/parking-lot").send({
        organizationId: ORG_A.toString(),
        sourceMeetingId: meeting._id.toString(),
        topic: "Security Review",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.item.topic).toBe("Security Review");
    });

    it("rejects topic addition when viewer lacks edit permission", async () => {
      currentUser = aliceViewer;
      const meeting = await seedMeeting({ organization: ORG_A });
      const res = await request(app).post("/api/v1/parking-lot").send({
        sourceMeetingId: meeting._id.toString(),
        topic: "Security Review",
      });

      expect(res.status).toBe(403);
    });

    it("rejects cross-organization topic addition", async () => {
      const meeting = await seedMeeting({ organization: ORG_A });
      const res = await request(app).post("/api/v1/parking-lot").send({
        organizationId: ORG_B.toString(),
        sourceMeetingId: meeting._id.toString(),
        topic: "Security Review",
      });

      expect(res.status).toBe(403);
    });

    it("rejects topic addition for a meeting belonging to another organization", async () => {
      const foreignMeeting = await seedMeeting({
        organization: ORG_B,
        uploadedBy: malloryOtherOrg._id,
      });

      const res = await request(app).post("/api/v1/parking-lot").send({
        sourceMeetingId: foreignMeeting._id.toString(),
        topic: "Security Review",
      });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/parking-lot/organization/:orgId", () => {
    it("allows authorized viewer to fetch parking lot for their organization", async () => {
      currentUser = aliceViewer;
      const meeting = await seedMeeting({ organization: ORG_A });
      await seedTopic({ organization: ORG_A, meeting });

      const res = await request(app).get(
        `/api/v1/parking-lot/organization/${ORG_A}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
    });

    it("rejects cross-organization attempt to read parking lot data", async () => {
      currentUser = malloryOtherOrg;
      const res = await request(app).get(
        `/api/v1/parking-lot/organization/${ORG_A}`,
      );

      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /api/v1/parking-lot/:id/status", () => {
    it("allows same-org member to update topic status", async () => {
      const meeting = await seedMeeting({ organization: ORG_A });
      const topicItem = await seedTopic({ organization: ORG_A, meeting });

      const res = await request(app)
        .patch(`/api/v1/parking-lot/${topicItem._id}/status`)
        .send({ status: "discarded" });

      expect(res.status).toBe(200);
      expect(res.body.item.status).toBe("discarded");
    });

    it("rejects cross-organization attempt to update topic status", async () => {
      currentUser = malloryOtherOrg;
      const meeting = await seedMeeting({ organization: ORG_A });
      const topicItem = await seedTopic({ organization: ORG_A, meeting });

      const res = await request(app)
        .patch(`/api/v1/parking-lot/${topicItem._id}/status`)
        .send({ status: "discarded" });

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/parking-lot/assign", () => {
    it("allows assigning topics within the same organization", async () => {
      const meeting = await seedMeeting({ organization: ORG_A });
      const topicItem = await seedTopic({ organization: ORG_A, meeting });

      const res = await request(app)
        .post("/api/v1/parking-lot/assign")
        .send({
          topicIds: [topicItem._id.toString()],
          meetingId: meeting._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].status).toBe("scheduled");
    });

    it("rejects assignment if any topic belongs to another organization", async () => {
      const meetingA = await seedMeeting({ organization: ORG_A });
      const meetingB = await seedMeeting({
        organization: ORG_B,
        uploadedBy: malloryOtherOrg._id,
      });

      const topicA = await seedTopic({
        organization: ORG_A,
        meeting: meetingA,
      });
      const topicB = await seedTopic({
        organization: ORG_B,
        meeting: meetingB,
        submittedBy: malloryOtherOrg._id,
      });

      const res = await request(app)
        .post("/api/v1/parking-lot/assign")
        .send({
          topicIds: [topicA._id.toString(), topicB._id.toString()],
          meetingId: meetingA._id.toString(),
        });

      expect(res.status).toBe(403);
    });
  });
});
