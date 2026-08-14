import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from "../apiClient";
import { meetingChecklistApi } from "../meetingChecklistApi";

describe("meetingChecklistApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the canonical /api prefix for get", async () => {
    await meetingChecklistApi.getChecklist("meeting-1");
    expect(api.get).toHaveBeenCalledWith("/api/meetings/meeting-1/checklist");
  });

  it("uses the canonical /api prefix for create", async () => {
    const data = { items: [{ text: "Prepare agenda" }] };
    await meetingChecklistApi.createChecklist("meeting-1", data);
    expect(api.post).toHaveBeenCalledWith(
      "/api/meetings/meeting-1/checklist",
      data,
    );
  });

  it("uses the canonical /api prefix for update", async () => {
    const data = { items: [{ text: "Updated agenda" }] };
    await meetingChecklistApi.updateChecklist("meeting-1", data);
    expect(api.put).toHaveBeenCalledWith(
      "/api/meetings/meeting-1/checklist",
      data,
    );
  });

  it("uses the canonical /api prefix for delete", async () => {
    await meetingChecklistApi.deleteChecklist("meeting-1");
    expect(api.delete).toHaveBeenCalledWith(
      "/api/meetings/meeting-1/checklist",
    );
  });

  it("uses the canonical /api prefix for toggle", async () => {
    await meetingChecklistApi.toggleItem("meeting-1", 2);
    expect(api.patch).toHaveBeenCalledWith(
      "/api/meetings/meeting-1/checklist/toggle",
      { itemIndex: 2 },
    );
  });

  it("uses the canonical /api prefix for readiness", async () => {
    await meetingChecklistApi.getReadiness("meeting-1");
    expect(api.get).toHaveBeenCalledWith(
      "/api/meetings/meeting-1/checklist/readiness",
    );
  });

  it("never produces a duplicated /api/api path", async () => {
    await meetingChecklistApi.getChecklist("meeting-2");
    await meetingChecklistApi.createChecklist("meeting-2", {
      items: [{ text: "Review notes" }],
    });
    await meetingChecklistApi.updateChecklist("meeting-2", {
      items: [{ text: "Review notes" }],
    });
    await meetingChecklistApi.deleteChecklist("meeting-2");
    await meetingChecklistApi.toggleItem("meeting-2", 0);
    await meetingChecklistApi.getReadiness("meeting-2");

    const calls = [
      ...api.get.mock.calls,
      ...api.post.mock.calls,
      ...api.put.mock.calls,
      ...api.delete.mock.calls,
      ...api.patch.mock.calls,
    ];

    for (const [path] of calls) {
      expect(path).not.toContain("/api/api/");
    }
  });
});
