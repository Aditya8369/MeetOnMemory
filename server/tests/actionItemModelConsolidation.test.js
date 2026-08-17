import mongoose from "mongoose";
import ActionItem from "../models/actionItemModel.js";

describe("ActionItem Model Consolidation & Virtual Compatibility (#1669)", () => {
  const MEETING_ID = new mongoose.Types.ObjectId();
  const USER_ID = new mongoose.Types.ObjectId();
  const ORG_ID = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    await ActionItem.deleteMany({});
  });

  it("creates an ActionItem record using canonical fields", async () => {
    const item = await ActionItem.create({
      text: "Finalize system architecture",
      sourceMeetingId: MEETING_ID,
      organization: ORG_ID,
      owner: "Alice",
      status: "open",
      dueDate: new Date("2026-09-01"),
    });

    expect(item._id).toBeDefined();
    expect(item.text).toBe("Finalize system architecture");
    expect(item.sourceMeetingId.toString()).toBe(MEETING_ID.toString());
    expect(item.organization.toString()).toBe(ORG_ID.toString());
    expect(item.status).toBe("open");
  });

  it("supports legacy virtual aliases (title, meetingId, deadline)", async () => {
    const item = new ActionItem({
      title: "Legacy Title Alias Test",
      meetingId: MEETING_ID,
      deadline: new Date("2026-09-10"),
      assignedBy: USER_ID,
      status: "pending",
    });

    await item.save();

    const fetched = await ActionItem.findById(item._id);

    expect(fetched.title).toBe("Legacy Title Alias Test");
    expect(fetched.text).toBe("Legacy Title Alias Test");
    expect(fetched.meetingId.toString()).toBe(MEETING_ID.toString());
    expect(fetched.sourceMeetingId.toString()).toBe(MEETING_ID.toString());
    expect(fetched.deadline).toEqual(new Date("2026-09-10"));
    expect(fetched.dueDate).toEqual(new Date("2026-09-10"));
  });

  it("supports updates via virtual alias setters", async () => {
    const item = await ActionItem.create({
      text: "Initial text",
      sourceMeetingId: MEETING_ID,
    });

    item.title = "Updated title via alias";
    item.deadline = new Date("2026-10-15");
    await item.save();

    const updated = await ActionItem.findById(item._id);
    expect(updated.text).toBe("Updated title via alias");
    expect(updated.dueDate).toEqual(new Date("2026-10-15"));
  });

  it("supports dependency relationships (relatesTo)", async () => {
    const targetItem = await ActionItem.create({
      text: "Prerequisite task",
      sourceMeetingId: MEETING_ID,
    });

    const dependentItem = await ActionItem.create({
      text: "Dependent task",
      sourceMeetingId: MEETING_ID,
      relatesTo: [{ target: targetItem._id, confidence: 95 }],
    });

    expect(dependentItem.relatesTo).toHaveLength(1);
    expect(dependentItem.relatesTo[0].target.toString()).toBe(
      targetItem._id.toString(),
    );
    expect(dependentItem.relatesTo[0].confidence).toBe(95);
  });

  it("supports reminder tracking array (remindersSent)", async () => {
    const item = await ActionItem.create({
      text: "Reminder test task",
      sourceMeetingId: MEETING_ID,
      assignee: USER_ID,
      dueDate: new Date(Date.now() - 86400000), // yesterday
    });

    item.remindersSent.push({ type: "overdue", sentAt: new Date() });
    await item.save();

    const fetched = await ActionItem.findById(item._id);
    expect(fetched.remindersSent).toHaveLength(1);
    expect(fetched.remindersSent[0].type).toBe("overdue");
  });

  it("verifies single Mongoose model registration", () => {
    expect(mongoose.models.ActionItem).toBeDefined();
    expect(ActionItem.modelName).toBe("ActionItem");
  });
});
