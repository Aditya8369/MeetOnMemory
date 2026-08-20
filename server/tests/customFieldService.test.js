// import { jest } from "@jest/globals";
import mongoose from "mongoose";
import CustomFieldService from "../services/customFieldService.js";
import CustomFieldDefinition from "../models/customFieldDefinitionModel.js";
import CustomFieldValue from "../models/customFieldValueModel.js";

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();
const MEETING_A = new mongoose.Types.ObjectId();

describe("customFieldService", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.TEST_MONGODB_URI);
    }
  });

  beforeEach(async () => {
    await CustomFieldDefinition.deleteMany({});
    await CustomFieldValue.deleteMany({});
  });

  describe("createDefinition", () => {
    it("creates a valid text definition", async () => {
      const def = await CustomFieldService.createDefinition(ORG_A, {
        name: "Case Number",
        type: "text",
        required: true,
      });
      expect(def.name).toBe("Case Number");
      expect(def.type).toBe("text");
    });

    it("requires options for dropdown type", async () => {
      await expect(
        CustomFieldService.createDefinition(ORG_A, {
          name: "Status",
          type: "dropdown",
        }),
      ).rejects.toThrow("Dropdown fields require options");
    });
  });

  describe("setMeetingFields and validation", () => {
    let defText, defNumber, defDropdown;

    beforeEach(async () => {
      defText = await CustomFieldService.createDefinition(ORG_A, {
        name: "Project ID",
        type: "text",
        required: true,
      });
      defNumber = await CustomFieldService.createDefinition(ORG_A, {
        name: "Story Points",
        type: "number",
      });
      defDropdown = await CustomFieldService.createDefinition(ORG_A, {
        name: "Phase",
        type: "dropdown",
        options: ["Design", "Development", "Testing"],
      });
    });

    it("saves valid fields successfully", async () => {
      await CustomFieldService.setMeetingFields(MEETING_A, ORG_A, [
        { definitionId: defText._id.toString(), value: "PRJ-123" },
        { definitionId: defNumber._id.toString(), value: 5 },
        { definitionId: defDropdown._id.toString(), value: "Design" },
      ]);

      const values = await CustomFieldService.getMeetingFields(MEETING_A);
      expect(values).toHaveLength(3);
    });

    it("rejects missing required fields", async () => {
      await expect(
        CustomFieldService.setMeetingFields(MEETING_A, ORG_A, [
          { definitionId: defNumber._id.toString(), value: 5 },
        ]),
      ).rejects.toThrow("Field Project ID is required");
    });

    it("rejects invalid number", async () => {
      await expect(
        CustomFieldService.setMeetingFields(MEETING_A, ORG_A, [
          { definitionId: defText._id.toString(), value: "PRJ-123" },
          { definitionId: defNumber._id.toString(), value: "abc" },
        ]),
      ).rejects.toThrow("Field Story Points must be a number");
    });

    it("rejects invalid dropdown option", async () => {
      await expect(
        CustomFieldService.setMeetingFields(MEETING_A, ORG_A, [
          { definitionId: defText._id.toString(), value: "PRJ-123" },
          { definitionId: defDropdown._id.toString(), value: "Deployment" },
        ]),
      ).rejects.toThrow("Value Deployment is not a valid option for Phase");
    });

    it("ignores fields from other organizations", async () => {
      // Trying to set fields using ORG_B definitions, but passing ORG_B as context
      // wait, the service checks against definitions in the provided orgId.
      const defOrgB = await CustomFieldService.createDefinition(ORG_B, {
        name: "Secret",
        type: "text",
      });

      // ORG_A tries to set ORG_B's field
      await expect(
        CustomFieldService.setMeetingFields(MEETING_A, ORG_A, [
          { definitionId: defText._id.toString(), value: "PRJ-123" },
          { definitionId: defOrgB._id.toString(), value: "shh" },
        ]),
      ).resolves.not.toThrow();

      // Only ORG_A's field should be saved because defMap in setMeetingFields won't have defOrgB
      const values = await CustomFieldService.getMeetingFields(MEETING_A);
      expect(values).toHaveLength(1);
      expect(values[0].fieldDefinition._id.toString()).toBe(
        defText._id.toString(),
      );
    });
  });
});
