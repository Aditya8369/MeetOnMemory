import request from "supertest";
import { app } from "../server.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import User from "../models/userModel.js";
import Organization from "../models/organizationModel.js";
import ReportTemplate from "../models/reportTemplateModel.js";
import { createClerkTestToken, authHeader } from "./helpers/clerkTestAuth.js";
import * as reportGeneratorService from "../services/reportGeneratorService.js";

// Mock the report generator service
vi.mock("../services/reportGeneratorService.js", () => ({
  generateReport: vi.fn(),
}));

describe("Report Template CRUD & Export Routes (/api/reports) (#2278)", () => {
  let owner;
  let organization;
  let headers;

  beforeEach(async () => {
    vi.clearAllMocks();

    await Promise.all([
      User.deleteMany({ email: /report-test/ }),
      Organization.deleteMany({ name: "Report Org" }),
      ReportTemplate.deleteMany({}),
    ]);

    owner = await User.create({
      name: "Report Admin",
      email: `report-test-${Date.now()}@example.com`,
      password: "Password123!",
      role: "admin", // admin role allows viewing/managing reports
      clerkUserId: `user_report_${Date.now()}`,
    });

    organization = await Organization.create({
      name: "Report Org",
      slug: `report-org-${Date.now()}`,
      owner: owner._id,
    });

    owner.organization = organization._id;
    await owner.save();

    headers = authHeader(
      createClerkTestToken({
        clerkUserId: owner.clerkUserId,
        email: owner.email,
      }),
    );
  });

  it("performs Template CRUD correctly", async () => {
    // 1. Create template
    const createRes = await request(app)
      .post("/api/reports/templates")
      .set(headers)
      .send({
        name: "Monthly Summary",
        description: "Monthly dashboard metrics",
        sections: [
          {
            type: "ACTION_ITEMS",
            title: "Overdue Actions",
            order: 0,
          },
        ],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const templateId = createRes.body.data._id;
    expect(templateId).toBeDefined();

    // 2. Read templates list
    const listRes = await request(app)
      .get("/api/reports/templates")
      .set(headers);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].name).toBe("Monthly Summary");

    // 3. Read template by ID
    const getRes = await request(app)
      .get(`/api/reports/templates/${templateId}`)
      .set(headers);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.name).toBe("Monthly Summary");

    // 4. Update template
    const updateRes = await request(app)
      .put(`/api/reports/templates/${templateId}`)
      .set(headers)
      .send({
        name: "Monthly Summary v2",
        description: "Updated description",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.name).toBe("Monthly Summary v2");

    // 5. Delete template
    const deleteRes = await request(app)
      .delete(`/api/reports/templates/${templateId}`)
      .set(headers);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify it is gone
    const getDeletedRes = await request(app)
      .get(`/api/reports/templates/${templateId}`)
      .set(headers);
    expect(getDeletedRes.status).toBe(404);
  });

  it("POST /api/reports/generate/:id returns data from generator service", async () => {
    const template = await ReportTemplate.create({
      name: "Weekly Scan",
      organization: organization._id,
      createdBy: owner._id,
    });

    reportGeneratorService.generateReport.mockResolvedValue({
      templateName: "Weekly Scan",
      generatedAt: new Date().toISOString(),
      meetingCount: 5,
      sections: [],
    });

    const res = await request(app)
      .post(`/api/reports/generate/${template._id}`)
      .set(headers)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.templateName).toBe("Weekly Scan");
    expect(reportGeneratorService.generateReport).toHaveBeenCalled();
  });

  it("POST /api/reports/export/:id returns file download attachment", async () => {
    const template = await ReportTemplate.create({
      name: "Quarterly Review",
      organization: organization._id,
      createdBy: owner._id,
    });

    reportGeneratorService.generateReport.mockResolvedValue({
      templateName: "Quarterly Review",
      generatedAt: new Date().toISOString(),
      meetingCount: 12,
      sections: [
        {
          title: "Top Decisions",
          type: "DECISION_LOG",
          data: [{ decision: "Merge branches", owner: "Alice" }],
        },
      ],
    });

    const res = await request(app)
      .post(`/api/reports/export/${template._id}`)
      .set(headers)
      .send({ format: "csv" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(res.text).toContain("Merge branches");
  });
});
