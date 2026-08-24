import request from "supertest";
import { app } from "../server.js";
import { jest } from "@jest/globals";
import User from "../models/userModel.js";
import AiSummaryTemplate from "../models/aiSummaryTemplateModel.js";
import { createClerkTestToken, authHeader } from "./helpers/clerkTestAuth.js";

// Mock GenerativeAIService to avoid real network calls
jest.unstable_mockModule("../services/GenerativeAIService.js", () => ({
  generateMoMDetailed: jest.fn().mockResolvedValue({
    mom: {
      actionItems: [
        {
          title: "Sync with logistics head",
          assignees: ["Speaker 2"],
          dueDate: "Friday",
        },
      ],
      decisions: [{ title: "Allocate more budget to logistics Europe" }],
      summary:
        "North America hit quota. Europe lagging due to supply chain. Plan to resolve by Friday.",
    },
  }),
}));

let token;
let user;

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({ email: /test.*@example\.com/ }),
    AiSummaryTemplate.deleteMany({}),
  ]);

  user = await User.create({
    name: "Test User",
    email: `test-${Date.now()}@example.com`,
    password: "password123",
    role: "admin",
    organization: "650c82f0c7e2b819f8a3d123",
  });

  user.clerkUserId = `user_test_${user._id}`;
  await user.save();

  token = createClerkTestToken({
    clerkUserId: user.clerkUserId,
    email: user.email,
  });
});

describe("AI Summary Template API CRUD & set-default & test (#2280)", () => {
  it("should perform full CRUD operations correctly", async () => {
    // 1. Create a new template
    const createRes = await request(app)
      .post("/api/ai-summary-templates")
      .set(authHeader(token))
      .send({
        name: "Sales Call",
        description: "BANT format",
        customInstructions: "Extract BANT criteria",
      });

    expect(createRes.statusCode).toEqual(201);
    expect(createRes.body.name).toEqual("Sales Call");
    const templateId = createRes.body._id;
    expect(templateId).toBeDefined();

    // 2. Read all templates
    const listRes = await request(app)
      .get("/api/ai-summary-templates")
      .set(authHeader(token));

    expect(listRes.statusCode).toEqual(200);
    expect(listRes.body.length).toEqual(1);
    expect(listRes.body[0].name).toEqual("Sales Call");

    // 3. Read template by ID
    const getRes = await request(app)
      .get(`/api/ai-summary-templates/${templateId}`)
      .set(authHeader(token));

    expect(getRes.statusCode).toEqual(200);
    expect(getRes.body.name).toEqual("Sales Call");

    // 4. Update template
    const updateRes = await request(app)
      .put(`/api/ai-summary-templates/${templateId}`)
      .set(authHeader(token))
      .send({
        name: "Sales Call v2",
        description: "BANT format updated",
        customInstructions: "Extract BANT criteria and timeline",
      });

    expect(updateRes.statusCode).toEqual(200);
    expect(updateRes.body.name).toEqual("Sales Call v2");

    // 5. Delete template
    const deleteRes = await request(app)
      .delete(`/api/ai-summary-templates/${templateId}`)
      .set(authHeader(token));

    expect(deleteRes.statusCode).toEqual(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify template is deleted
    const getDeletedRes = await request(app)
      .get(`/api/ai-summary-templates/${templateId}`)
      .set(authHeader(token));
    expect(getDeletedRes.statusCode).toEqual(404);
  });

  it("should set as default and clear prior default templates", async () => {
    const tpl1 = await AiSummaryTemplate.create({
      name: "Template 1",
      customInstructions: "Instructions 1",
      organization: "650c82f0c7e2b819f8a3d123",
      createdBy: user._id,
      isDefault: true,
    });

    const tpl2 = await AiSummaryTemplate.create({
      name: "Template 2",
      customInstructions: "Instructions 2",
      organization: "650c82f0c7e2b819f8a3d123",
      createdBy: user._id,
      isDefault: false,
    });

    const res = await request(app)
      .put(`/api/ai-summary-templates/${tpl2._id}/default`)
      .set(authHeader(token));

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);

    // Verify database state: tpl2 is default, tpl1 is not
    const updatedTpl1 = await AiSummaryTemplate.findById(tpl1._id);
    const updatedTpl2 = await AiSummaryTemplate.findById(tpl2._id);

    expect(updatedTpl1.isDefault).toBe(false);
    expect(updatedTpl2.isDefault).toBe(true);
  });

  it("should test the template prompt and return dummy MOM response", async () => {
    const res = await request(app)
      .post("/api/ai-summary-templates/test")
      .set(authHeader(token))
      .send({
        customInstructions: "Extract BANT criteria",
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.summary).toBeDefined();
  });
});
