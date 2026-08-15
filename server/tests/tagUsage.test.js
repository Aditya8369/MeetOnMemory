import mongoose from "mongoose";
import Tag from "../models/tagModel.js";
import Meeting from "../models/meetingModel.js";
import {
  updateTagUsageForAssociationChange,
  reconcileTagUsageCounts,
  normalizeTagNames,
} from "../utils/tagUsage.js";

describe("tag usage counts (Issue #1554)", () => {
  const organization = new mongoose.Types.ObjectId();

  afterEach(async () => {
    await Tag.deleteMany({ organization });
    await Meeting.deleteMany({ organization });
  });

  test("normalizes duplicate associations before calculating a delta", async () => {
    expect(
      normalizeTagNames([" finance ", "finance", "Finance", "", null]),
    ).toEqual(["finance", "Finance"]);
  });

  test("increments only newly-created associations", async () => {
    await Tag.create([
      { name: "finance", organization, createdBy: organization, usageCount: 0 },
      { name: "policy", organization, createdBy: organization, usageCount: 2 },
    ]);

    await updateTagUsageForAssociationChange({
      organization,
      previousTags: ["finance", "policy"],
      currentTags: ["finance", "policy", "policy"],
    });

    const tags = await Tag.find({ organization }).sort({ name: 1 }).lean();
    expect(tags.map((tag) => tag.usageCount)).toEqual([0, 2]);
  });

  test("increments additions and decrements removals", async () => {
    await Tag.create([
      { name: "finance", organization, createdBy: organization, usageCount: 1 },
      { name: "policy", organization, createdBy: organization, usageCount: 3 },
    ]);

    await updateTagUsageForAssociationChange({
      organization,
      previousTags: ["finance", "policy"],
      currentTags: ["finance"],
    });

    const policy = await Tag.findOne({ organization, name: "policy" });
    expect(policy.usageCount).toBe(2);
  });

  test("reconciles counts from actual meeting associations", async () => {
    await Tag.create([
      {
        name: "finance",
        organization,
        createdBy: organization,
        usageCount: 99,
      },
      { name: "policy", organization, createdBy: organization, usageCount: 99 },
      { name: "unused", organization, createdBy: organization, usageCount: 99 },
    ]);

    await Meeting.create([
      {
        uploadedBy: organization,
        organization,
        title: "A",
        date: new Date(),
        tags: ["finance", "finance", "policy"],
      },
      {
        uploadedBy: organization,
        organization,
        title: "B",
        date: new Date(),
        tags: ["finance"],
      },
    ]);

    const result = await reconcileTagUsageCounts(organization);
    const byName = Object.fromEntries(
      result.map((item) => [item.name, item.usageCount]),
    );

    expect(byName).toEqual({ finance: 2, policy: 1, unused: 0 });
  });
});
