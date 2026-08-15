import mongoose from "mongoose";
import Tag from "../models/tagModel.js";
import Meeting from "../models/meetingModel.js";
import { updateTag } from "../controllers/tagController.js";

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();

const mockRes = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
};

const invoke = async (req) => {
  const res = mockRes();
  let error;
  await updateTag(req, res, (err) => {
    error = err;
  });
  return { res, error };
};

const user = { _id: USER_A, organization: ORG_A };

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
  }
});

describe("Tag rename cascade (Issue #1553)", () => {
  it("renames every occurrence of a tag in every meeting", async () => {
    const tag = await Tag.create({
      name: "old-tag",
      organization: ORG_A,
      createdBy: USER_A,
    });

    await Meeting.create([
      {
        title: "Meeting with repeated tag",
        organization: ORG_A,
        uploadedBy: USER_A,
        date: new Date(),
        tags: ["old-tag", "other", "old-tag"],
      },
      {
        title: "Second meeting",
        organization: ORG_A,
        uploadedBy: USER_A,
        date: new Date(),
        tags: ["old-tag"],
      },
      {
        title: "Other organization",
        organization: ORG_B,
        uploadedBy: USER_A,
        date: new Date(),
        tags: ["old-tag"],
      },
    ]);

    const { res, error } = await invoke({
      params: { id: tag._id.toString() },
      body: { name: "new-tag" },
      user,
    });

    expect(error).toBeUndefined();
    expect(res.statusCode).toBe(200);

    const orgMeetings = await Meeting.find({ organization: ORG_A }).lean();
    expect(orgMeetings).toHaveLength(2);
    expect(orgMeetings[0].tags).toEqual(
      expect.not.arrayContaining(["old-tag"]),
    );
    expect(orgMeetings[1].tags).toEqual(["new-tag"]);

    const repeated = orgMeetings.find((meeting) =>
      meeting.title.startsWith("Meeting"),
    );
    expect(repeated.tags).toEqual(["new-tag", "other", "new-tag"]);

    const otherOrg = await Meeting.findOne({ organization: ORG_B }).lean();
    expect(otherOrg.tags).toEqual(["old-tag"]);

    const renamedTag = await Tag.findById(tag._id).lean();
    expect(renamedTag.name).toBe("new-tag");
  });

  it("does not create a duplicate tag during rename", async () => {
    const tag = await Tag.create({
      name: "old-name",
      organization: ORG_A,
      createdBy: USER_A,
    });
    await Tag.create({
      name: "existing-name",
      organization: ORG_A,
      createdBy: USER_A,
    });

    const { res, error } = await invoke({
      params: { id: tag._id.toString() },
      body: { name: "existing-name" },
      user,
    });

    expect(res.statusCode).toBe(200);
    expect(error).toBeDefined();
    expect(await Tag.countDocuments({ organization: ORG_A })).toBe(2);
    expect((await Tag.findById(tag._id)).name).toBe("old-name");
  });

  it("keeps the rename scoped to the tag's organization", async () => {
    const tag = await Tag.create({
      name: "scoped-old",
      organization: ORG_A,
      createdBy: USER_A,
    });

    await Meeting.create([
      {
        title: "same org",
        organization: ORG_A,
        uploadedBy: USER_A,
        date: new Date(),
        tags: ["scoped-old", "scoped-old"],
      },
      {
        title: "different org",
        organization: ORG_B,
        uploadedBy: USER_A,
        date: new Date(),
        tags: ["scoped-old", "scoped-old"],
      },
    ]);

    const { error } = await invoke({
      params: { id: tag._id.toString() },
      body: { name: "scoped-new" },
      user,
    });

    expect(error).toBeUndefined();

    expect((await Meeting.findOne({ title: "same org" })).tags).toEqual([
      "scoped-new",
      "scoped-new",
    ]);
    expect((await Meeting.findOne({ title: "different org" })).tags).toEqual([
      "scoped-old",
      "scoped-old",
    ]);
  });
});
