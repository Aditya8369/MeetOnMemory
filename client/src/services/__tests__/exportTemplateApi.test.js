import { describe, it, expect, vi, beforeEach } from "vitest";
import apiClient from "../apiClient";
import exportTemplateApi from "../exportTemplateApi";

vi.mock("../apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("exportTemplateApi Service (#2003)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls GET /api/export-templates in getTemplates", async () => {
    const mockData = [{ _id: "t-1", name: "Standard Template" }];
    apiClient.get.mockResolvedValue({
      data: { success: true, data: mockData },
    });

    const res = await exportTemplateApi.getTemplates();
    expect(apiClient.get).toHaveBeenCalledWith("/api/export-templates");
    expect(res).toEqual({ success: true, data: mockData });
  });

  it("calls GET /api/export-templates/:id in getTemplateById", async () => {
    const mockTemplate = { _id: "t-123", name: "Board Template" };
    apiClient.get.mockResolvedValue({
      data: { success: true, data: mockTemplate },
    });

    const res = await exportTemplateApi.getTemplateById("t-123");
    expect(apiClient.get).toHaveBeenCalledWith("/api/export-templates/t-123");
    expect(res).toEqual({ success: true, data: mockTemplate });
  });

  it("calls POST /api/export-templates in createTemplate", async () => {
    const payload = {
      name: "New Template",
      templateContent: "<h1>{{title}}</h1>",
    };
    apiClient.post.mockResolvedValue({
      data: { success: true, data: { ...payload, _id: "t-2" } },
    });

    const res = await exportTemplateApi.createTemplate(payload);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/export-templates",
      payload,
    );
    expect(res.success).toBe(true);
  });

  it("calls PUT /api/export-templates/:id in updateTemplate", async () => {
    const payload = { name: "Updated Name" };
    apiClient.put.mockResolvedValue({ data: { success: true, data: payload } });

    const res = await exportTemplateApi.updateTemplate("t-123", payload);
    expect(apiClient.put).toHaveBeenCalledWith(
      "/api/export-templates/t-123",
      payload,
    );
    expect(res.success).toBe(true);
  });

  it("calls DELETE /api/export-templates/:id in deleteTemplate", async () => {
    apiClient.delete.mockResolvedValue({ data: { success: true, data: {} } });

    const res = await exportTemplateApi.deleteTemplate("t-123");
    expect(apiClient.delete).toHaveBeenCalledWith(
      "/api/export-templates/t-123",
    );
    expect(res.success).toBe(true);
  });

  it("calls POST /api/export-templates/preview in previewTemplate", async () => {
    const payload = { templateContent: "<h1>Hi</h1>", meetingData: {} };
    apiClient.post.mockResolvedValue({
      data: { success: true, data: { html: "<h1>Hi</h1>" } },
    });

    const res = await exportTemplateApi.previewTemplate(payload);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/export-templates/preview",
      payload,
    );
    expect(res.data.html).toBe("<h1>Hi</h1>");
  });

  it("calls POST /api/export-templates/meeting/:meetingId with responseType blob in exportMeeting", async () => {
    const payload = { templateId: "t-1", format: "pdf", sectionOverrides: {} };
    apiClient.post.mockResolvedValue({ data: new Blob(["dummy pdf"]) });

    await exportTemplateApi.exportMeeting("meet-456", payload);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/export-templates/meeting/meet-456",
      payload,
      { responseType: "blob" },
    );
  });
});
